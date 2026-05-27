import uvicorn
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.config import settings
from app.database import engine, Base, AsyncSessionLocal
from app.models import Candidate
from app.services.queue_worker import worker_engine

app = FastAPI(title="AURA ATS Processing Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def on_startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with engine.connect() as conn:
        from sqlalchemy import text
        await conn.execute(text("PRAGMA journal_mode=WAL;"))
        await conn.execute(text("PRAGMA synchronous=NORMAL;"))
        print("AURA Database initialized and optimized.")

@app.post("/api/v1/scan")
async def trigger_folder_scan(payload: dict, bg_tasks: BackgroundTasks):
    folder_path = payload.get("folder_path")
    if not folder_path:
        raise HTTPException(status_code=400, detail="Missing required 'folder_path' parameter.")
    
    # Native FastAPI background task execution
    bg_tasks.add_task(worker_engine.process_folder, folder_path)
    return {"status": "accepted", "message": "Scan queued successfully."}

@app.get("/api/v1/candidates")
async def get_all_candidates():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Candidate).order_by(Candidate.id.desc()))
        candidates = result.scalars().all()
        return {"data": candidates}

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="127.0.0.1", port=settings.PORT, reload=True)