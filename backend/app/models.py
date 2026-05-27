from sqlalchemy import Column, Integer, String, Float, DateTime
from app.database import Base
from datetime import datetime, timezone

class Candidate(Base):
    __tablename__ = "candidates"
    
    id = Column(Integer, primary_key=True, index=True)
    file_name = Column(String, index=True)
    full_name = Column(String)
    mobile = Column(String)
    email = Column(String)
    nic = Column(String)
    birth_date = Column(String)
    age = Column(Integer)
    address = Column(String)
    linkedin = Column(String)
    skills = Column(String)
    education = Column(String)
    certifications = Column(String)
    languages = Column(String)
    current_job_title = Column(String)
    latest_company = Column(String)
    total_years_of_experience = Column(Float)
    previous_companies = Column(String)
    professional_summary = Column(String)
    ai_suitability_insight = Column(String)
    status = Column(String)

class ProcessingLog(Base):
    __tablename__ = "processing_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    file_name = Column(String)
    failure_reason = Column(String)
    
    # Modern, timezone-aware default timestamp
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))