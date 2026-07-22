from typing import List, Optional
from pydantic import BaseModel


class IdVerification(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    document_number: Optional[str] = None
    issuing_state: Optional[str] = None


class DiditDecision(BaseModel):
    id_verifications: List[IdVerification] = []


class DiditWebhookPayload(BaseModel):
    event_id: str
    session_id: str
    status: str
    webhook_type: str
    decision: Optional[DiditDecision] = None
