from typing import Optional
from pydantic import BaseModel


class UpdateDisbursementRequest(BaseModel):
    status: str
    tx_hash: Optional[str] = None
