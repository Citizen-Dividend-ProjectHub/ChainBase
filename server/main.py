from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

from db.pool import init_pool, close_pool
from routers import auth, recipients, cycles, disbursements, funding_pool, audit_log


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_pool()
    yield
    await close_pool()


app = FastAPI(title="ChainBase API", version="1.0.0", lifespan=lifespan)


# Return {"message": "..."} instead of FastAPI's default {"detail": "..."}
# so responses match the API contract in the guide.
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"message": exc.detail})


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"Unhandled error: {exc}")
    return JSONResponse(status_code=500, content={"message": "Internal Server Error"})


# ====================================
# Routers
# ====================================

app.include_router(auth.router,         prefix="/api/auth",         tags=["Auth"])
app.include_router(recipients.router,   prefix="/api/recipients",   tags=["Recipients"])
app.include_router(cycles.router,       prefix="/api/cycles",       tags=["Disbursement Cycles"])
app.include_router(disbursements.router,prefix="/api/disbursements",tags=["Disbursements"])
app.include_router(funding_pool.router, prefix="/api/funding-pool", tags=["Funding Pool"])
app.include_router(audit_log.router,    prefix="/api/audit-log",    tags=["Audit Log"])
