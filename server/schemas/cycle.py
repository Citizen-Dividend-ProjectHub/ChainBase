from pydantic import BaseModel
from datetime import datetime


class CreateCycleRequest(BaseModel):
    scheduled_date: datetime
    amount_per_recipient: float
