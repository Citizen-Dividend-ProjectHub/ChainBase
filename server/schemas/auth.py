from typing import Literal
from pydantic import BaseModel


class RecipientRegisterRequest(BaseModel):
    full_name: str
    recipient_email: str
    password: str


class RecipientLoginRequest(BaseModel):
    recipient_email: str
    password: str


class WalletRotationRequest(BaseModel):
    new_wallet_address: str


class SetWalletRequest(BaseModel):
    wallet_address: str
    wallet_type: Literal["embedded", "external"]


class AdminLoginRequest(BaseModel):
    administrator_name: str
    password: str
