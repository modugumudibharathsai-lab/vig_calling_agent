import os
from typing import Dict, Any, Optional
from fastapi import FastAPI, Form, Request, HTTPException
from fastapi.responses import Response
import httpx
from pydantic import BaseModel

BACKEND_API_URL = os.environ.get("BACKEND_API_URL", "http://127.0.0.1:8000")
USER_FORWARDING_PHONE = os.environ.get("USER_FORWARDING_PHONE", "+14155550100")

app = FastAPI(
    title="Telephony & Android Call Screening Integration Bridge",
    version="1.0.0",
    description="Bridge translating Twilio PSTN Voice webhooks and Android CallScreeningService payloads to the AI Call Agent backend."
)

# -------------------------------------------------------------
# 1. TWILIO PSTN WEBHOOK ADAPTER
# -------------------------------------------------------------
@app.post("/webhook/twilio/voice")
async def twilio_incoming_voice(From: Optional[str] = Form(None), CallSid: Optional[str] = Form(None)):
    """
    Twilio PSTN Incoming Call Entrypoint.
    Returns TwiML asking caller to state reason for calling while streaming speech.
    """
    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Gather input="speech" action="/webhook/twilio/transcription" timeout="3" speechTimeout="auto">
        <Say voice="Polly.Joanna-Neural">Hello, you have reached an AI-protected personal line. Please state your name and the reason for your call.</Say>
    </Gather>
    <Say voice="Polly.Joanna-Neural">We did not hear a response. Please call back later.</Say>
    <Hangup/>
</Response>
"""
    return Response(content=twiml, media_type="application/xml")

@app.post("/webhook/twilio/transcription")
async def twilio_transcription_handler(
    From: Optional[str] = Form("+10000000000"),
    CallSid: Optional[str] = Form("call-sample"),
    SpeechResult: Optional[str] = Form("")
):
    """
    Twilio Speech-to-Text Gather Result.
    Forwards transcript and caller ID to Python Backend, translates decision into TwiML.
    """
    caller_id = From or "Unknown"
    transcription = SpeechResult or ""

    # Call AI Backend /api/screen-call
    screen_payload = {
        "call_id": CallSid,
        "caller_id": caller_id,
        "transcription_chunk": transcription,
        "user_status": "in_meeting"
    }

    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.post(f"{BACKEND_API_URL}/api/screen-call", json=screen_payload)
            if resp.status_code == 200:
                result = resp.json()
                action = result.get("action")
                spoken = result.get("agent_spoken_response", "Thank you.")

                if action == "BLOCK_SPAM":
                    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Joanna-Neural">{spoken}</Say>
    <Reject reason="busy"/>
</Response>
"""
                elif action == "TRANSFER_TO_USER":
                    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Joanna-Neural">{spoken}</Say>
    <Dial timeout="25">{USER_FORWARDING_PHONE}</Dial>
</Response>
"""
                else:  # HANDLE_BY_AGENT
                    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Joanna-Neural">{spoken}</Say>
    <Gather input="speech" action="/webhook/twilio/transcription" timeout="4" speechTimeout="auto">
        <Say voice="Polly.Joanna-Neural">Is there any additional message you would like to leave for the recipient?</Say>
    </Gather>
    <Say voice="Polly.Joanna-Neural">Thank you. Your message has been sent to the recipient. Goodbye.</Say>
    <Hangup/>
</Response>
"""
                return Response(content=twiml, media_type="application/xml")
    except Exception as e:
        print(f"[Telephony Bridge] Error communicating with backend: {e}")

    # Fallback TwiML
    fallback = """<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Joanna-Neural">Thank you. Your message has been recorded. Have a great day.</Say>
    <Hangup/>
</Response>
"""
    return Response(content=fallback, media_type="application/xml")

# -------------------------------------------------------------
# 2. ANDROID CALLSCREENINGSERVICE JSON BRIDGE
# -------------------------------------------------------------
class AndroidCallScreenRequest(BaseModel):
    call_id: str
    caller_number: str
    call_direction: str = "INCOMING"
    timestamp: Optional[int] = None

class AndroidCallScreenResponse(BaseModel):
    call_id: str
    disallowCall: bool
    rejectCall: bool
    skipCallLog: bool
    skipNotification: bool
    silenceCall: bool
    action: str
    reason: str

@app.post("/webhook/android/screen", response_model=AndroidCallScreenResponse)
async def android_call_screening(req: AndroidCallScreenRequest):
    """
    Android CallScreeningService Webhook Hook.
    Takes incoming call payload from native Android app, runs fast caller lookup,
    and returns native CallResponse flags.
    """
    screen_payload = {
        "call_id": req.call_id,
        "caller_id": req.caller_number,
        "transcription_chunk": "Incoming native mobile call trigger",
        "user_status": "in_meeting"
    }

    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.post(f"{BACKEND_API_URL}/api/screen-call", json=screen_payload)
            if resp.status_code == 200:
                result = resp.json()
                action = result.get("action")
                reason = result.get("reasoning", "")

                if action == "BLOCK_SPAM":
                    return AndroidCallScreenResponse(
                        call_id=req.call_id,
                        disallowCall=True,
                        rejectCall=True,
                        skipCallLog=True,
                        skipNotification=True,
                        silenceCall=False,
                        action=action,
                        reason=reason
                    )
                elif action == "TRANSFER_TO_USER":
                    return AndroidCallScreenResponse(
                        call_id=req.call_id,
                        disallowCall=False,
                        rejectCall=False,
                        skipCallLog=False,
                        skipNotification=False,
                        silenceCall=False,
                        action=action,
                        reason=reason
                    )
                else:  # HANDLE_BY_AGENT -> Silence device ringer while AI agent screens
                    return AndroidCallScreenResponse(
                        call_id=req.call_id,
                        disallowCall=False,
                        rejectCall=False,
                        skipCallLog=False,
                        skipNotification=True,
                        silenceCall=True,
                        action=action,
                        reason="Silencing phone to allow background AI agent call screening."
                    )
    except Exception as e:
        print(f"[Android Bridge] Call error: {e}")

    # Safe fallback
    return AndroidCallScreenResponse(
        call_id=req.call_id,
        disallowCall=False,
        rejectCall=False,
        skipCallLog=False,
        skipNotification=False,
        silenceCall=False,
        action="TRANSFER_TO_USER",
        reason="Fallback: Pass call through"
    )

@app.get("/health")
def health():
    return {"status": "telephony_bridge_healthy", "backend_url": BACKEND_API_URL}
