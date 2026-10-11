from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class CallAction(str, Enum):
    HANDLE_BY_AGENT = "HANDLE_BY_AGENT"
    TRANSFER_TO_USER = "TRANSFER_TO_USER"
    BLOCK_SPAM = "BLOCK_SPAM"

class CallState(str, Enum):
    IDLE = "IDLE"
    SCREENING = "SCREENING"
    TRANSFERRED = "TRANSFERRED"
    BLOCKED = "BLOCKED"
    COMPLETED = "COMPLETED"

class AgentMode(str, Enum):
    MANUAL = "MANUAL"
    SCHEDULED = "SCHEDULED"

class ContactCategory(str, Enum):
    VIP = "VIP"
    FAMILY = "FAMILY"
    COLLEAGUE = "COLLEAGUE"
    TRUSTED = "TRUSTED"
    UNKNOWN = "UNKNOWN"
    BLOCKLIST = "BLOCKLIST"

class Contact(BaseModel):
    phone_number: str
    name: str
    category: ContactCategory = ContactCategory.UNKNOWN
    company: Optional[str] = None
    notes: Optional[str] = None
    always_transfer: bool = False
    always_block: bool = False
    screen_first: bool = True

class ScheduleWindow(BaseModel):
    name: str
    start_time: str  # e.g., "22:00"
    end_time: str    # e.g., "07:00"
    days: List[str] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]
    action_override: Optional[CallAction] = CallAction.HANDLE_BY_AGENT
    allow_vip: bool = True

class UserSettings(BaseModel):
    mode: AgentMode = AgentMode.MANUAL
    manual_screening_enabled: bool = True
    user_status: str = "in_meeting"  # e.g. "available", "in_meeting", "focus_time", "sleeping", "driving"
    schedule_windows: List[ScheduleWindow] = Field(default_factory=lambda: [
        ScheduleWindow(name="Work Focus Window", start_time="09:00", end_time="17:00", days=["MON", "TUE", "WED", "THU", "FRI"], action_override=CallAction.HANDLE_BY_AGENT, allow_vip=True),
        ScheduleWindow(name="Night Do-Not-Disturb", start_time="22:00", end_time="07:30", days=["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"], action_override=CallAction.HANDLE_BY_AGENT, allow_vip=True)
    ])
    spam_threshold: int = 75
    urgency_transfer_threshold: int = 70

class CallerReputation(BaseModel):
    caller_id: str
    name: Optional[str] = None
    spam_score: int = 0  # 0 to 100
    spam_reports: int = 0
    is_verified_business: bool = False
    carrier: Optional[str] = None
    source: str = "local"  # "local", "truecaller", "mock"

class SpamEvaluation(BaseModel):
    urgency_score: int = Field(..., ge=0, le=100)
    spam_risk: int = Field(..., ge=0, le=100)
    intent_summary: str
    key_phrases: List[str] = []
    sentiment: str = "neutral"
    reasoning: str

class CallScreenRequest(BaseModel):
    caller_id: str
    transcription_chunk: str
    user_status: Optional[str] = None
    call_id: Optional[str] = None
    timestamp: Optional[str] = None

class CallScreenResponse(BaseModel):
    call_id: str
    caller_id: str
    caller_name: Optional[str] = None
    caller_category: ContactCategory
    action: CallAction
    urgency_score: int
    spam_risk: int
    agent_spoken_response: str
    reasoning: str
    call_state: CallState
    meta: Dict[str, Any] = {}
