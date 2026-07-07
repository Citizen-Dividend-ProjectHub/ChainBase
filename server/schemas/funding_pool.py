from pydantic import BaseModel


class UpdateBalanceRequest(BaseModel):
    balance: float
