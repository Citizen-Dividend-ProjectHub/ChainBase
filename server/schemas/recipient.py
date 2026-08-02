from typing import Literal
from pydantic import BaseModel


class EnrollRecipientRequest(BaseModel):
    full_name: str
    recipient_email: str
    wallet_address: str


class ResolveDuplicateRequest(BaseModel):
    action: Literal["approve", "reject"]


class ResolveNameChangeRequest(BaseModel):
    action: Literal["approve", "reject"]


class RevokeRequestBody(BaseModel):
    reason: str
