from pydantic import BaseModel


class RecipientRegisterRequest(BaseModel):
    full_name: str
    recipient_email: str
    password: str
    wallet_address: str


class RecipientLoginRequest(BaseModel):
    recipient_email: str
    password: str


class AdminLoginRequest(BaseModel):
    administrator_name: str
    password: str
