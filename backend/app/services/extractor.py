import warnings
warnings.filterwarnings("ignore")

import google.generativeai as genai
import PyPDF2
import json
from app.config import settings

# 1. Authenticate with your exact API key
genai.configure(api_key=settings.GEMINI_API_KEY)

# 2. Dynamically scan Google's servers for your permitted models
def get_permitted_model_name():
    try:
        available_models = []
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                available_models.append(m.name)
        
        # Priority 1: Standard 1.5 Flash (Fastest, best for JSON)
        for name in available_models:
            if "1.5-flash" in name and "latest" not in name:
                return name
        
        # Priority 2: Any Flash model available to your key
        for name in available_models:
            if "flash" in name:
                return name
                
        # Priority 3: Fallback to any available Pro model
        for name in available_models:
            if "pro" in name:
                return name
                
        # Absolute Fallback: Grab the first text-capable model on your account
        if available_models:
            return available_models[0]
            
    except Exception as e:
        print(f"Warning: Could not fetch model list ({e})")
        
    # Failsafe default
    return "models/gemini-1.5-flash"

# 3. Lock in the approved model
MODEL_NAME = get_permitted_model_name()
print(f"AURA Engine: System Locked. Using AI Model -> {MODEL_NAME}")
model = genai.GenerativeModel(MODEL_NAME)

def extract_text_from_pdf(file_path: str) -> str:
    """Reads the raw text out of a local PDF file."""
    text = ""
    try:
        with open(file_path, "rb") as file:
            reader = PyPDF2.PdfReader(file)
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
    except Exception as e:
        print(f"Failed to read PDF {file_path}: {e}")
    return text

async def analyze_cv_with_gemini(text: str) -> dict:
    """Asynchronously feeds text to the dynamic model and enforces JSON output."""
    prompt = """
    You are an elite, highly accurate ATS (Applicant Tracking System) AI. 
    Extract the candidate's details from the provided CV text.
    Return EXACTLY a valid JSON object. Do not add any conversational text or explanations.
    
    Keys to extract:
    - full_name (string)
    - email (string)
    - mobile (string)
    - current_job_title (string)
    - latest_company (string)
    - total_years_of_experience (number, float only)
    - skills (string, comma-separated list of top technical and professional skills)
    
    CV Text:
    """ + text

    try:
        response = await model.generate_content_async(prompt)
        clean_text = response.text.strip()
        
        # Google sometimes wraps JSON in markdown blocks. This strips it perfectly.
        if clean_text.startswith("```json"):
            clean_text = clean_text[7:]
        elif clean_text.startswith("```"):
            clean_text = clean_text[3:]
        
        if clean_text.endswith("```"):
            clean_text = clean_text[:-3]
            
        return json.loads(clean_text.strip())
        
    except Exception as e:
        print(f"Failed to parse AI output. AI may have hallucinated format: {e}")
        return {}