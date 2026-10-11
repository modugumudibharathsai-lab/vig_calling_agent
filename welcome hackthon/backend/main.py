import asyncio
import os
import uuid
import datetime
from typing import Dict, List, Any, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from models import (
    CallScreenRequest,
    CallScreenResponse,
    UserSettings,
    Contact,
    CallAction,
    CallState,
    ContactCategory
)
from rules_engine import RulesEngine
from spam_evaluator import SpamEvaluator
from action_decider import ActionDecider

app = FastAPI(
    title="AI-Powered Personal Call Agent Backend",
    version="2.0.0",
    description="Intelligent call screening engine with RulesEngine, SpamEvaluator, ActionDecider, and WebSocket co-pilot streaming."
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Core singletons
rules_engine = RulesEngine()
spam_evaluator = SpamEvaluator()
action_decider = ActionDecider()

# In-memory application state
user_settings = UserSettings()
call_logs: List[Dict[str, Any]] = []

# Active WebSocket connections per call_id
class ConnectionManager:
    def __init__(self):
        # call_id -> list of WebSockets
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # global broadcast subscribers (e.g. main dashboard)
        self.dashboard_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket, call_id: str):
        await websocket.accept()
        if call_id == "dashboard":
            self.dashboard_connections.append(websocket)
        else:
            if call_id not in self.active_connections:
                self.active_connections[call_id] = []
            self.active_connections[call_id].append(websocket)

    def disconnect(self, websocket: WebSocket, call_id: str):
        if call_id == "dashboard":
            if websocket in self.dashboard_connections:
                self.dashboard_connections.remove(websocket)
        else:
            if call_id in self.active_connections:
                if websocket in self.active_connections[call_id]:
                    self.active_connections[call_id].remove(websocket)
                if not self.active_connections[call_id]:
                    del self.active_connections[call_id]

    async def broadcast_call(self, call_id: str, message: dict):
        # Send to specific call listeners
        if call_id in self.active_connections:
            for connection in list(self.active_connections[call_id]):
                try:
                    await connection.send_json(message)
                except Exception:
                    pass
        # Also broadcast to main dashboard listeners
        for dash_conn in list(self.dashboard_connections):
            try:
                await dash_conn.send_json(message)
            except Exception:
                pass

manager = ConnectionManager()

# -------------------------------------------------------------
# 1. CORE API: /api/screen-call
# -------------------------------------------------------------
@app.post("/api/screen-call", response_model=CallScreenResponse)
async def screen_call(req: CallScreenRequest):
    """
    Core screening pipeline:
    1. RulesEngine: Check contacts, schedule windows, Truecaller reputation.
    2. SpamEvaluator: Real-time sentiment, spam risk, and urgency score.
    3. ActionDecider: Evaluate matrix -> HANDLE_BY_AGENT, TRANSFER_TO_USER, BLOCK_SPAM.
    """
    call_id = req.call_id or str(uuid.uuid4())[:8]
    effective_status = req.user_status or user_settings.user_status

    # Step 1: RulesEngine
    caller_eval = await rules_engine.evaluate_caller(req.caller_id, user_settings)
    contact = caller_eval.get("contact")
    reputation = caller_eval.get("reputation")
    caller_category = caller_eval.get("category", ContactCategory.UNKNOWN)
    caller_name = contact.name if contact else (reputation.name or f"Unknown ({req.caller_id})")

    # Step 2: SpamEvaluator
    spam_eval = await spam_evaluator.evaluate(req.transcription_chunk)

    # Step 3: ActionDecider
    decision = action_decider.decide(
        caller_eval=caller_eval,
        spam_eval=spam_eval,
        settings=user_settings,
        user_status=effective_status
    )

    action = decision["action"]
    call_state = decision["call_state"]
    reasoning = decision["reasoning"]
    spoken_response = decision["spoken_response"]

    # Construct response payload
    response = CallScreenResponse(
        call_id=call_id,
        caller_id=req.caller_id,
        caller_name=caller_name,
        caller_category=caller_category,
        action=action,
        urgency_score=spam_eval.urgency_score,
        spam_risk=spam_eval.spam_risk,
        agent_spoken_response=spoken_response,
        reasoning=reasoning,
        call_state=call_state,
        meta={
            "sentiment": spam_eval.sentiment,
            "intent_summary": spam_eval.intent_summary,
            "key_phrases": spam_eval.key_phrases,
            "reputation_source": reputation.source,
            "truecaller_spam_score": reputation.spam_score,
            "user_status": effective_status,
            "agent_mode": user_settings.mode.value
        }
    )

    # Save to call logs
    log_entry = {
        "call_id": call_id,
        "timestamp": datetime.datetime.now().isoformat(),
        "caller_id": req.caller_id,
        "caller_name": caller_name,
        "caller_category": caller_category.value,
        "transcript": req.transcription_chunk,
        "action": action.value,
        "call_state": call_state.value,
        "urgency_score": spam_eval.urgency_score,
        "spam_risk": spam_eval.spam_risk,
        "agent_spoken_response": spoken_response,
        "reasoning": reasoning
    }
    call_logs.insert(0, log_entry)
    if len(call_logs) > 50:
        call_logs.pop()

    # Broadcast event via WebSockets to connected dashboards
    await manager.broadcast_call(call_id, {
        "type": "CALL_DECISION",
        "data": response.model_dump()
    })

    return response

# -------------------------------------------------------------
# 2. WEBSOCKET REAL-TIME STREAMING
# -------------------------------------------------------------
@app.websocket("/ws/calls/{call_id}")
async def websocket_call_endpoint(websocket: WebSocket, call_id: str):
    await manager.connect(websocket, call_id)
    try:
        # Send initial connection state
        await websocket.send_json({
            "type": "CONNECTION_READY",
            "call_id": call_id,
            "current_mode": user_settings.mode.value,
            "user_status": user_settings.user_status,
            "active_calls_count": len(manager.active_connections)
        })

        while True:
            # Receive commands from frontend (e.g. manual override or live simulation)
            msg = await websocket.receive_json()
            msg_type = msg.get("type")

            if msg_type == "TRANSCRIPTION_CHUNK":
                # Incoming streaming transcript chunk from telephony bridge or simulator
                chunk = msg.get("chunk", "")
                caller_id = msg.get("caller_id", "Unknown")
                
                # Fast incremental evaluation
                caller_eval = await rules_engine.evaluate_caller(caller_id, user_settings)
                spam_eval = await spam_evaluator.evaluate(chunk)
                decision = action_decider.decide(
                    caller_eval=caller_eval,
                    spam_eval=spam_eval,
                    settings=user_settings,
                    user_status=user_settings.user_status
                )

                await manager.broadcast_call(call_id, {
                    "type": "STREAM_UPDATE",
                    "call_id": call_id,
                    "caller_id": caller_id,
                    "caller_name": caller_eval.get("reputation").name,
                    "chunk": chunk,
                    "urgency_score": spam_eval.urgency_score,
                    "spam_risk": spam_eval.spam_risk,
                    "call_state": decision["call_state"].value,
                    "action": decision["action"].value,
                    "agent_spoken_response": decision["spoken_response"]
                })

            elif msg_type == "FORCE_TRANSFER":
                # User intervention: Force direct line connect
                await manager.broadcast_call(call_id, {
                    "type": "MANUAL_OVERRIDE",
                    "call_id": call_id,
                    "action": CallAction.TRANSFER_TO_USER.value,
                    "call_state": CallState.TRANSFERRED.value,
                    "reasoning": "Intervention: User manually initiated call transfer from dashboard."
                })

            elif msg_type == "FORCE_BLOCK":
                # User intervention: Force terminate and block
                await manager.broadcast_call(call_id, {
                    "type": "MANUAL_OVERRIDE",
                    "call_id": call_id,
                    "action": CallAction.BLOCK_SPAM.value,
                    "call_state": CallState.BLOCKED.value,
                    "reasoning": "Intervention: User manually disconnected and blocked call from dashboard."
                })

    except WebSocketDisconnect:
        manager.disconnect(websocket, call_id)
    except Exception as e:
        print(f"[WebSocket Error] {e}")
        manager.disconnect(websocket, call_id)

@app.websocket("/ws/transcript")
async def websocket_transcript_mock(websocket: WebSocket):
    """WebSocket route at /ws/transcript for mock live transcription streaming."""
    await websocket.accept()
    await websocket.send_json({
        "type": "CONNECTION_ESTABLISHED",
        "channel": "/ws/transcript",
        "status": "READY",
        "timestamp": datetime.datetime.now().isoformat()
    })
    try:
        while True:
            data = await websocket.receive_text()
            # Respond with mock speech transcription analysis
            await websocket.send_json({
                "type": "TRANSCRIPT_CHUNK",
                "content": data,
                "timestamp": datetime.datetime.now().isoformat()
            })
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"[/ws/transcript error] {e}")

# -------------------------------------------------------------
# 3. SETTINGS & CONTACTS APIS
# -------------------------------------------------------------
@app.get("/api/settings")
async def get_settings():
    schedule_status = rules_engine.evaluate_schedule(user_settings)
    return {
        "settings": user_settings.model_dump(),
        "schedule_status": schedule_status
    }

@app.post("/api/settings")
async def update_settings(new_settings: UserSettings):
    global user_settings
    user_settings = new_settings
    return {"status": "success", "settings": user_settings.model_dump()}

@app.get("/api/contacts")
async def get_contacts():
    return list(rules_engine._contacts_cache.values())

@app.post("/api/contacts")
async def update_contacts(contacts: List[Contact]):
    success = rules_engine.save_contacts(contacts)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to save contacts")
    return {"status": "success", "count": len(contacts)}

@app.get("/api/call-logs")
async def get_call_logs():
    return call_logs

# -------------------------------------------------------------
# 4. SIMULATION ENDPOINT (For instant interactive testing)
# -------------------------------------------------------------
class SimulateCallRequest(BaseModel):
    scenario: str  # "URGENT_FAMILY", "ROBOCALL_SPAM", "FOOD_DELIVERY", "DOCTOR_CLINIC"

SCENARIOS = {
    "URGENT_FAMILY": {
        "caller_id": "+14155550199",
        "caller_name": "Sarah Chen (Wife)",
        "chunks": [
            "Hey, are you there?",
            "Hey, are you there? Please pick up right now!",
            "Hey, are you there? Please pick up right now! There's an emergency, Tommy was injured at school and we're heading to the Stanford ER hospital right now!"
        ]
    },
    "ROBOCALL_SPAM": {
        "caller_id": "+18005559999",
        "caller_name": "RoboDialer Fraud Syndicate",
        "chunks": [
            "Attention: This is the Internal Revenue Service calling.",
            "Attention: This is the Internal Revenue Service calling. An urgent arrest warrant has been issued in your name.",
            "Attention: This is the Internal Revenue Service calling. An urgent arrest warrant has been issued in your name. Press 1 immediately or federal police will seize your assets."
        ]
    },
    "FOOD_DELIVERY": {
        "caller_id": "+18005550111",
        "caller_name": "DoorDash / FedEx Delivery",
        "chunks": [
            "Hi, I'm calling about your order delivery.",
            "Hi, I'm calling about your order delivery. I'm standing outside at the front entrance gate.",
            "Hi, I'm calling about your order delivery. I'm standing outside at the front entrance gate, the door code isn't opening the gate, should I leave it outside?"
        ]
    },
    "DOCTOR_CLINIC": {
        "caller_id": "+16505550143",
        "caller_name": "Dr. Miller (Stanford Health)",
        "chunks": [
            "Hello, this is Stanford Health Clinic calling.",
            "Hello, this is Stanford Health Clinic calling to confirm your upcoming appointment tomorrow morning.",
            "Hello, this is Stanford Health Clinic calling to confirm your upcoming appointment tomorrow morning at 9:30 AM with Dr. Miller. Please let us know if you need to reschedule."
        ]
    }
}

@app.post("/api/simulate-call")
async def simulate_call(req: SimulateCallRequest):
    scenario_data = SCENARIOS.get(req.scenario)
    if not scenario_data:
        raise HTTPException(status_code=400, detail="Invalid scenario name")

    call_id = f"sim-{uuid.uuid4().hex[:6]}"
    caller_id = scenario_data["caller_id"]

    # Launch background streamer task
    asyncio.create_task(_run_simulation_stream(call_id, caller_id, scenario_data["chunks"]))

    return {"status": "started", "call_id": call_id, "scenario": req.scenario}

async def _run_simulation_stream(call_id: str, caller_id: str, chunks: List[str]):
    # Initial state broadcast: SCREENING
    await manager.broadcast_call(call_id, {
        "type": "CALL_INITIATED",
        "call_id": call_id,
        "caller_id": caller_id,
        "call_state": CallState.SCREENING.value,
        "timestamp": datetime.datetime.now().isoformat()
    })

    full_transcript = ""
    for i, chunk in enumerate(chunks):
        await asyncio.sleep(1.0)
        full_transcript = chunk

        caller_eval = await rules_engine.evaluate_caller(caller_id, user_settings)
        spam_eval = await spam_evaluator.evaluate(full_transcript)
        decision = action_decider.decide(
            caller_eval=caller_eval,
            spam_eval=spam_eval,
            settings=user_settings,
            user_status=user_settings.user_status
        )

        await manager.broadcast_call(call_id, {
            "type": "STREAM_UPDATE",
            "call_id": call_id,
            "caller_id": caller_id,
            "chunk": full_transcript,
            "urgency_score": spam_eval.urgency_score,
            "spam_risk": spam_eval.spam_risk,
            "call_state": decision["call_state"].value,
            "action": decision["action"].value,
            "agent_spoken_response": decision["spoken_response"],
            "reasoning": decision["reasoning"],
            "meta": {
                "sentiment": spam_eval.sentiment,
                "intent_summary": spam_eval.intent_summary,
                "key_phrases": spam_eval.key_phrases
            }
        })

    # Final decision recording
    await asyncio.sleep(0.5)
    screen_req = CallScreenRequest(
        call_id=call_id,
        caller_id=caller_id,
        transcription_chunk=full_transcript,
        user_status=user_settings.user_status
    )
    await screen_call(screen_req)

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "contacts_loaded": len(rules_engine._contacts_cache),
        "manual_screening_enabled": user_settings.manual_screening_enabled,
        "mode": user_settings.mode.value
    }
