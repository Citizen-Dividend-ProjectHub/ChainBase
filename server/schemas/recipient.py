from pydantic import BaseModel


class EnrollRecipientRequest(BaseModel):
    full_name: str
    recipient_email: str
    wallet_address: str
