from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import auth_router, scenarios_router

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="CivicTreasury API",
    description="Individual capstone MVP: auth + UBI policy scenario CRUD.",
    version="1.0.0",
)

# Loosened for MVP/demo purposes — tighten allow_origins before any real production use.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(scenarios_router.router)


@app.get("/")
def root():
    return {"status": "ok", "service": "CivicTreasury API"}


@app.get("/health")
def health():
    return {"status": "healthy"}
