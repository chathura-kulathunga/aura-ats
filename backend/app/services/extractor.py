import warnings
warnings.filterwarnings("ignore")

import os
import json
import PyPDF2
from dotenv import load_dotenv
from openai import AsyncOpenAI

load_dotenv()

# 1. Authenticate with DeepSeek using the OpenAI SDK
api_key = os.getenv("DEEPSEEK_API_KEY")
client = AsyncOpenAI(api_key=api_key, base_url="https://api.deepseek.com")

# 2. Lock in DeepSeek Chat (Extremely fast)
MODEL_NAME = "deepseek-chat"
print(f"AURA Engine: System Locked. Using AI Model -> {MODEL_NAME}")

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
    """Feeds text to DeepSeek and enforces strict JSON output."""
    prompt = """
    Extract the candidate's details from the provided CV text.
    Return EXACTLY a valid JSON object.
    
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
        response = await client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": "You are an elite ATS AI designed to output pure JSON."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"} # DeepSeek natively locks to JSON!
        )
        
        clean_text = response.choices[0].message.content.strip()
        return json.loads(clean_text)
        
    except Exception as e:
        print(f"Failed to parse DeepSeek output: {e}")
        return {}