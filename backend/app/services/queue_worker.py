import os
import asyncio
from app.services.extractor import extract_text_from_pdf, analyze_cv_with_gemini
from app.database import AsyncSessionLocal
from app.models import Candidate

class WorkerEngine:
    def __init__(self):
        self.is_scanning = False
        self.total_files = 0
        self.processed_files = 0
        self.current_file = ""

    async def process_folder(self, folder_path: str):
        """Processes files and updates state for live frontend polling."""
        self.is_scanning = True
        self.processed_files = 0
        self.current_file = "Initializing..."
        
        try:
            if not os.path.exists(folder_path):
                print("Error: Folder does not exist.")
                return
            
            pdf_files = [os.path.join(folder_path, f) for f in os.listdir(folder_path) if f.lower().endswith('.pdf')]
            self.total_files = len(pdf_files)
            
            if self.total_files == 0:
                print("No PDFs found in the selected directory.")
                return

            print(f"AURA Engine: Found {self.total_files} CVs. Beginning extraction...")
            
            for file_path in pdf_files:
                file_name = os.path.basename(file_path)
                self.current_file = file_name
                print(f"Processing: {file_name}...")
                
                try:
                    raw_text = extract_text_from_pdf(file_path)
                    if not raw_text.strip():
                        print(f"Warning: File {file_name} is empty.")
                        self.processed_files += 1
                        continue

                    ai_data = await analyze_cv_with_gemini(raw_text)
                    
                    async with AsyncSessionLocal() as db:
                        new_candidate = Candidate(
                            file_name=file_name,
                            full_name=ai_data.get("full_name"),
                            email=ai_data.get("email"),
                            mobile=ai_data.get("mobile"),
                            current_job_title=ai_data.get("current_job_title"),
                            latest_company=ai_data.get("latest_company"),
                            total_years_of_experience=ai_data.get("total_years_of_experience", 0.0),
                            skills=ai_data.get("skills")
                        )
                        db.add(new_candidate)
                        await db.commit()
                        
                except Exception as e:
                    print(f"CRITICAL ERROR processing {file_name}: {e}")
                
                self.processed_files += 1
                await asyncio.sleep(0.2) # Micro-pause for CPU stability

        finally:
            self.is_scanning = False
            self.current_file = "Complete"
            print("AURA Engine: Batch processing complete.")

worker_engine = WorkerEngine()