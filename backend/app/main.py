import uvicorn
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, delete

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
    
    # Executes seamlessly in the background
    bg_tasks.add_task(worker_engine.process_folder, folder_path)
    return {"status": "accepted", "message": "Scan queued successfully."}

# ==========================================
# NEW: LIVE POLLING STATUS ENDPOINT
# ==========================================
@app.get("/api/v1/scan/status")
async def get_scan_status():
    return {
        "is_scanning": worker_engine.is_scanning,
        "total": worker_engine.total_files,
        "processed": worker_engine.processed_files,
        "current_file": worker_engine.current_file
    }

@app.get("/api/v1/candidates")
async def get_all_candidates():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Candidate).order_by(Candidate.id.desc()))
        candidates = result.scalars().all()
        return {"data": candidates}

@app.delete("/api/v1/candidates")
async def purge_database():
    async with AsyncSessionLocal() as db:
        await db.execute(delete(Candidate))
        await db.commit()
        return {"status": "success", "message": "Database completely purged."}

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="127.0.0.1", port=settings.PORT, reload=True)