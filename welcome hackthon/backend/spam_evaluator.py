import os
import re
import json
from typing import Optional, List, Dict, Any
import httpx
from models import SpamEvaluation

# High-precision pattern markers
SPAM_PATTERNS = [
    (r"\b(irs|internal revenue service|department of treasury|federal police|arrest warrant)\b", 95, "Impersonation / Legal threat"),
    (r"\b(social security administration|ssn has been suspended|legal action)\b", 92, "Government imposter scam"),
    (r"\b(car warranty|vehicle protection plan|extended auto warranty)\b", 88, "Automated warranty robocall"),
    (r"\b(lower your interest rate|credit card debt relief|forgiveness program)\b", 82, "Unsolicited debt service"),
    (r"\b(lottery winner|you won|claim your prize|sweepstakes|cash grant)\b", 96, "Lottery advance fee scam"),
    (r"\b(crypto investment|guaranteed return|bitcoin profit|forex trading)\b", 90, "Crypto / Investment fraud"),
    (r"\b(solar panels|free energy audit|government subsidize solar)\b", 78, "Telemarketing solar pitch"),
    (r"\b(press 1 to speak to an agent|automated message|recorded message)\b", 75, "Robodialer pattern"),
    (r"\b(limited time offer|act now|dont hang up|final notice)\b", 70, "High-pressure sales pitch")
]

URGENCY_PATTERNS = [
    (r"\b(emergency|hospital|er|intensive care|ambulance|accident|injured)\b", 98, "Medical emergency"),
    (r"\b(in the hospital|doctor called|surgery|critical condition)\b", 95, "Family medical alert"),
    (r"\b(police|fire department|gas leak|break in|intruder|alarm trigger)\b", 95, "Safety / Physical security"),
    (r"\b(server down|production outage|p0 outage|database crash|data breach)\b", 85, "Critical infrastructure incident"),
    (r"\b(flight canceled|delayed at airport|stranded|passport lost)\b", 80, "Travel crisis"),
    (r"\b(delivery outside|standing at door|gate code|buzzer not working|package drop)\b", 60, "Time-sensitive delivery"),
    (r"\b(need to talk right now|call me back asap|urgent question|quick update)\b", 65, "Personal urgency"),
    (r"\b(appointment in 15 minutes|running late|reschedule today)\b", 55, "Time-sensitive schedule")
]

class SpamEvaluator:
    def __init__(self):
        self.gemini_key = os.environ.get("GEMINI_API_KEY")
        self.openai_key = os.environ.get("OPENAI_API_KEY")

    def _evaluate_heuristic(self, text: str) -> SpamEvaluation:
        """High-speed heuristic NLP evaluator guaranteeing <20ms execution."""
        clean_text = text.lower()
        spam_score = 10
        urgency_score = 15
        spam_reasons = []
        urgency_reasons = []
        key_phrases = []

        # Check spam patterns
        for pattern, score, reason in SPAM_PATTERNS:
            matches = re.findall(pattern, clean_text)
            if matches:
                spam_score = max(spam_score, score)
                spam_reasons.append(reason)
                key_phrases.extend(matches)

        # Check urgency patterns
        for pattern, score, reason in URGENCY_PATTERNS:
            matches = re.findall(pattern, clean_text)
            if matches:
                urgency_score = max(urgency_score, score)
                urgency_reasons.append(reason)
                key_phrases.extend(matches)

        # Tone and Sentiment determination
        sentiment = "neutral"
        if urgency_score > 70:
            sentiment = "urgent"
        elif spam_score > 70:
            sentiment = "suspicious"
        elif "hello" in clean_text or "thanks" in clean_text or "hi" in clean_text:
            sentiment = "polite"

        # Deduplicate key phrases
        flat_keys = []
        for kp in key_phrases:
            if isinstance(kp, tuple):
                flat_keys.extend([k for k in kp if k])
            elif isinstance(kp, str):
                flat_keys.append(kp)
        unique_keys = list(set(flat_keys))[:6]

        if spam_score >= 70:
            intent_summary = f"Flagged Spam: {', '.join(spam_reasons) if spam_reasons else 'High spam indicators'}"
            reasoning = f"Detected high-confidence telemarketing/scam patterns: {', '.join(spam_reasons)}."
        elif urgency_score >= 70:
            intent_summary = f"Urgent Call: {', '.join(urgency_reasons) if urgency_reasons else 'Critical notice'}"
            reasoning = f"Detected critical urgency markers requiring immediate attention: {', '.join(urgency_reasons)}."
        elif urgency_score >= 50:
            intent_summary = "Time-sensitive operational inquiry (delivery/schedule)"
            reasoning = "Caller mentions delivery or immediate scheduling matter."
        else:
            intent_summary = "Standard inquiry / conversational message"
            reasoning = "Normal conversational speech with low risk and standard priority."

        return SpamEvaluation(
            urgency_score=min(100, max(0, urgency_score)),
            spam_risk=min(100, max(0, spam_score)),
            intent_summary=intent_summary,
            key_phrases=unique_keys,
            sentiment=sentiment,
            reasoning=reasoning
        )

    async def _evaluate_llm(self, text: str) -> Optional[SpamEvaluation]:
        """Calls Gemini or OpenAI if API credentials are configured."""
        prompt = f"""
You are an ultra-fast telecommunications call-screening intelligence agent.
Analyze the following live incoming telephone transcript chunk:

Transcript: "{text}"

Output ONLY a valid JSON object with the following keys:
- urgency_score: integer from 0 (not urgent) to 100 (life/critical emergency)
- spam_risk: integer from 0 (verified legitimate) to 100 (fraud/telemarketing/scam)
- intent_summary: concise string explaining caller's goal
- key_phrases: array of 2 to 5 crucial keywords from transcript
- sentiment: string ("urgent", "suspicious", "polite", "neutral")
- reasoning: one-sentence rationale for the scores

Do not include markdown codeblocks or extra text.
"""
        # Try Gemini API if key is present
        if self.gemini_key:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={self.gemini_key}"
                payload = {
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"temperature": 0.1, "maxOutputTokens": 256}
                }
                async with httpx.AsyncClient(timeout=1.2) as client:
                    resp = await client.post(url, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        raw_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                        # Strip any accidental ```json blocks
                        raw_text = re.sub(r"^```json\s*", "", raw_text)
                        raw_text = re.sub(r"```$", "", raw_text).strip()
                        parsed = json.loads(raw_text)
                        return SpamEvaluation(**parsed)
            except Exception as e:
                print(f"[SpamEvaluator] Gemini LLM call skipped or timed out: {e}")

        # Try OpenAI API if key is present
        if self.openai_key:
            try:
                url = "https://api.openai.com/v1/chat/completions"
                headers = {"Authorization": f"Bearer {self.openai_key}"}
                payload = {
                    "model": "gpt-4o-mini",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.1,
                    "max_tokens": 250,
                    "response_format": {"type": "json_object"}
                }
                async with httpx.AsyncClient(timeout=1.2) as client:
                    resp = await client.post(url, headers=headers, json=payload)
                    if resp.status_code == 200:
                        parsed = json.loads(resp.json()["choices"][0]["message"]["content"])
                        return SpamEvaluation(**parsed)
            except Exception as e:
                print(f"[SpamEvaluator] OpenAI LLM call skipped or timed out: {e}")

        return None

    async def evaluate(self, transcription_chunk: str) -> SpamEvaluation:
        """
        Executes fast evaluation:
        Runs fast LLM if available, falling back seamlessly to deterministic heuristic NLP engine.
        """
        if not transcription_chunk or len(transcription_chunk.strip()) == 0:
            return SpamEvaluation(
                urgency_score=0,
                spam_risk=0,
                intent_summary="Silent audio / No audible speech yet",
                key_phrases=[],
                sentiment="neutral",
                reasoning="Awaiting initial audio transcription."
            )

        # Attempt fast LLM analysis if credentials are set
        if self.gemini_key or self.openai_key:
            llm_result = await self._evaluate_llm(transcription_chunk)
            if llm_result:
                return llm_result

        # Zero-latency heuristic engine
        return self._evaluate_heuristic(transcription_chunk)
