from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from crud import spending as spending_crud
from db.pool import get_pool
from dependencies import get_current_admin, get_current_recipient
from spending.mcc_codes import get_category, is_restricted, SAMPLE_MCCS

router = APIRouter()


# ── Stripe webhook ────────────────────────────────────────────────────────────
@router.post("/webhooks/stripe", status_code=200)
async def stripe_webhook(request: Request, pool=Depends(get_pool)):
    payload = await request.json()

    if payload.get("type") != "issuing_transaction.created":
        return {"received": True}

    obj = payload.get("data", {}).get("object", {})
    mcc = str(obj.get("merchant_data", {}).get("category_code", ""))
    cardholder_id = obj.get("cardholder", "")

    if not mcc or not cardholder_id:
        return {"received": True}

    recipient = await spending_crud.get_recipient_by_cardholder(pool, cardholder_id)
    if not recipient:
        return {"received": True}

    period = spending_crud.current_period()
    restricted = is_restricted(mcc)
    await spending_crud.record_transaction(pool, recipient["recipient_id"], period, restricted)

    return {"received": True}


# ── Simulate a transaction (demo) ─────────────────────────────────────────────
class SimulateRequest(BaseModel):
    recipient_id: int
    mcc: str


@router.post("/spending/simulate")
async def simulate_transaction(
    body: SimulateRequest,
    pool=Depends(get_pool),
    user=Depends(get_current_admin),
):
    if body.mcc not in SAMPLE_MCCS:
        raise HTTPException(400, f"Unknown MCC. Try: {', '.join(list(SAMPLE_MCCS.keys())[:6])}")

    period = spending_crud.current_period()
    restricted = is_restricted(body.mcc)
    category = get_category(body.mcc)

    await spending_crud.record_transaction(pool, body.recipient_id, period, restricted)

    return {
        "mcc": body.mcc,
        "category": category,
        "restricted": restricted,
        "period": period,
        "message": f"{'⚠ Restricted' if restricted else '✓ Normal'} transaction recorded for recipient {body.recipient_id}",
    }


# ── Recipient purchase ────────────────────────────────────────────────────────
class PurchaseRequest(BaseModel):
    mcc: str
    amount: float


@router.post("/spending/purchase")
async def recipient_purchase(
    body: PurchaseRequest,
    pool=Depends(get_pool),
    user=Depends(get_current_recipient),
):
    if body.amount <= 0:
        raise HTTPException(400, "Amount must be greater than zero.")
    if body.mcc not in SAMPLE_MCCS:
        raise HTTPException(400, f"Unknown MCC. Try: {', '.join(list(SAMPLE_MCCS.keys())[:6])}")

    recipient_id = user["recipient_id"]
    period = spending_crud.current_period()
    restricted = is_restricted(body.mcc)
    category = get_category(body.mcc)

    result = await spending_crud.record_purchase(pool, recipient_id, period, restricted, body.amount)
    if result is None:
        balance = await spending_crud.get_balance(pool, recipient_id)
        raise HTTPException(402, f"Insufficient balance. You have ${balance:.2f} USDC available.")

    return {
        "mcc": body.mcc,
        "category": category,
        "restricted": restricted,
        "amount": body.amount,
        "new_balance": result["new_balance"],
        "period": period,
        "message": f"{'⚠ Restricted' if restricted else '✓'} ${body.amount:.2f} spent at {category}",
    }


# ── Recipient balance ─────────────────────────────────────────────────────────
@router.get("/spending/balance")
async def get_balance(
    pool=Depends(get_pool),
    user=Depends(get_current_recipient),
):
    balance = await spending_crud.get_balance(pool, user["recipient_id"])
    return {"balance": balance}


# ── Recipient spending history ────────────────────────────────────────────────
@router.get("/spending/me")
async def my_spending(
    period: str = None,
    pool=Depends(get_pool),
    user=Depends(get_current_recipient),
):
    p = period or spending_crud.current_period()
    row = await spending_crud.get_spending_for_recipient(pool, user["recipient_id"], p)
    return {"period": p, "record": row}


# ── Spending summary (admin) ───────────────────────────────────────────────────
@router.get("/spending")
async def get_spending_summary(
    period: str = None,
    pool=Depends(get_pool),
    user=Depends(get_current_admin),
):
    p = period or spending_crud.current_period()
    rows = await spending_crud.list_spending(pool, p)
    return {"period": p, "records": rows}
