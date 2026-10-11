from typing import Optional, Dict, Any
from models import CallAction, CallState, ContactCategory, Contact, CallerReputation, SpamEvaluation, UserSettings

class ActionDecider:
    def decide(
        self,
        caller_eval: Dict[str, Any],
        spam_eval: SpamEvaluation,
        settings: UserSettings,
        user_status: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Synthesizes RulesEngine evaluation, SpamEvaluator scores, and User Status
        to determine definitive action: BLOCK_SPAM, TRANSFER_TO_USER, or HANDLE_BY_AGENT.
        """
        contact: Optional[Contact] = caller_eval.get("contact")
        reputation: CallerReputation = caller_eval.get("reputation")
        category: ContactCategory = caller_eval.get("category", ContactCategory.UNKNOWN)
        schedule = caller_eval.get("schedule", {})

        effective_status = user_status or settings.user_status or "in_meeting"

        # -------------------------------------------------------------
        # 1. EVALUATE BLOCK_SPAM
        # -------------------------------------------------------------
        if contact and contact.always_block:
            return {
                "action": CallAction.BLOCK_SPAM,
                "call_state": CallState.BLOCKED,
                "reasoning": f"Number is explicitly in your blocked contacts list ({contact.name}).",
                "spoken_response": "This call has been rejected by the recipient's call screening rules. Goodbye."
            }

        if category == ContactCategory.BLOCKLIST or reputation.spam_score >= settings.spam_threshold:
            return {
                "action": CallAction.BLOCK_SPAM,
                "call_state": CallState.BLOCKED,
                "reasoning": f"Flagged as high-risk spam by Truecaller/reputation index (Score: {reputation.spam_score}/100).",
                "spoken_response": "The AI screening agent has classified this call as automated telemarketing. Your number has been blocked. Goodbye."
            }

        if spam_eval.spam_risk >= settings.spam_threshold:
            return {
                "action": CallAction.BLOCK_SPAM,
                "call_state": CallState.BLOCKED,
                "reasoning": f"Real-time transcript analysis detected high spam probability ({spam_eval.spam_risk}/100): {spam_eval.intent_summary}.",
                "spoken_response": "Our AI security screen has flagged this call as a potential scam or unsolicited offer. Disconnecting now."
            }

        # -------------------------------------------------------------
        # 2. EVALUATE TRANSFER_TO_USER
        # -------------------------------------------------------------
        # VIP always transfer bypass
        if contact and contact.always_transfer:
            return {
                "action": CallAction.TRANSFER_TO_USER,
                "call_state": CallState.TRANSFERRED,
                "reasoning": f"Contact '{contact.name}' has VIP priority with always-transfer permission.",
                "spoken_response": f"Hello {contact.name.split()[0]}! Connecting you directly to the recipient right now. Please hold."
            }

        # Life / Critical Urgency Emergency Override
        if spam_eval.urgency_score >= settings.urgency_transfer_threshold:
            return {
                "action": CallAction.TRANSFER_TO_USER,
                "call_state": CallState.TRANSFERRED,
                "reasoning": f"High urgency alert triggered (Urgency: {spam_eval.urgency_score}/100). Bypassing screening due to critical priority.",
                "spoken_response": "I understand this is urgent. I am immediately ringing through to their phone. Please stay on the line."
            }

        # User is actively 'available' and caller is not suspicious
        if effective_status == "available" and spam_eval.spam_risk < 30:
            if category in [ContactCategory.VIP, ContactCategory.FAMILY, ContactCategory.COLLEAGUE, ContactCategory.TRUSTED]:
                return {
                    "action": CallAction.TRANSFER_TO_USER,
                    "call_state": CallState.TRANSFERRED,
                    "reasoning": f"User status is 'Available' and caller is recognized contact ({contact.name if contact else 'Trusted'}).",
                    "spoken_response": "Connecting your call right now. One moment please."
                }

        # -------------------------------------------------------------
        # 3. EVALUATE HANDLE_BY_AGENT (Default Safe AI Copilot)
        # -------------------------------------------------------------
        reasoning_pieces = []
        if effective_status != "available":
            reasoning_pieces.append(f"User is currently marked as '{effective_status}'")
        if schedule.get("active_window"):
            reasoning_pieces.append(f"active schedule: {schedule['active_window']}")
        if not contact:
            reasoning_pieces.append("caller is an unknown party")

        combined_reason = f"Screened by AI Agent: {'; '.join(reasoning_pieces) if reasoning_pieces else 'standard screening policy'}."

        # Generate intelligent contextual spoken response based on transcript keywords
        spoken = self._generate_agent_reply(spam_eval, contact, effective_status)

        return {
            "action": CallAction.HANDLE_BY_AGENT,
            "call_state": CallState.SCREENING,
            "reasoning": combined_reason,
            "spoken_response": spoken
        }

    def _generate_agent_reply(self, spam_eval: SpamEvaluation, contact: Optional[Contact], user_status: str) -> str:
        intent = spam_eval.intent_summary.lower()
        keys = " ".join(spam_eval.key_phrases).lower()

        # Delivery driver
        if "delivery" in intent or "package" in keys or "door" in keys or "gate" in keys:
            return "Hi there, I am screening this call for the resident who is currently in a meeting. If you have a delivery, please leave it by the front door. Thank you!"

        # Medical / Doctor
        if "doctor" in intent or "appointment" in keys or "clinic" in keys or "health" in keys:
            return "Hello, this is their personal AI assistant. They are unable to take the call at this second. Could you please confirm if this is regarding an upcoming appointment or a prescription?"

        # Colleague / Work
        if contact and contact.category == ContactCategory.COLLEAGUE:
            return f"Hi {contact.name.split()[0]}, they are tied up in {user_status.replace('_', ' ')}. I will notify them immediately with your message. What would you like me to pass along?"

        # General inquiry
        return "Hello! I am their AI call screening assistant. The recipient is unavailable right now. May I take your name and the purpose of your call so I can notify them?"
