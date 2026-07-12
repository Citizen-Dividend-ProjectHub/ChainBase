from contextlib import asynccontextmanager
import pathlib

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles

from chain.client import init_chain_client
from core.config import settings
from db.pool import init_pool, close_pool
from routers import auth, recipients, cycles, disbursements, funding_pool, audit_log
from scheduler.scheduler import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_pool()
    if settings.scheduler_enabled:
        chain_client = init_chain_client()
        start_scheduler(chain_client)
    yield
    if settings.scheduler_enabled:
        stop_scheduler()
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

# ── Serve built React frontend ────────────────────────────────────────────────
DIST = pathlib.Path(__file__).parent.parent / "frontend" / "dist"

if DIST.is_dir():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        return FileResponse(DIST / "index.html")
