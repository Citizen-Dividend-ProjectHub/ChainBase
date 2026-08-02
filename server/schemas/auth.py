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


class RequestCardRequest(BaseModel):
    mailing_address: str


class UpdateProfileRequest(BaseModel):
    full_name: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class UpdateNotificationPrefsRequest(BaseModel):
    notify_email_disbursements: bool
    notify_email_verification: bool


class SetCardLockRequest(BaseModel):
    locked: bool


class AdminLoginRequest(BaseModel):
    administrator_name: str
    password: str
