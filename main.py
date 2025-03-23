from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import logging
import os
import google.generativeai as genai  # Correct import for the library

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace "*" with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------
# Google Gemini API Configuration using the genai client
# -------------------------
GEMINI_API_KEY = "AIzaSyAiQWpRNud_xy1Dx3VeDn6GG6yzFbE8eeo"  # Replace with your actual API key
genai.configure(api_key=GEMINI_API_KEY)  # Set up the API key
MODEL = "gemini-2.0-flash"  # Use the correct model name

# -------------------------
# Request Models
# -------------------------
class ResumeRequest(BaseModel):
    job_description: str
    user_details: str

class CoverLetterRequest(BaseModel):
    company_details: str
    user_details: str

class RegenerateSectionRequest(BaseModel):
    section: str         # e.g., "experience", "skills", etc.
    current_text: str
    user_details: str

class AnalyzeJobRequest(BaseModel):
    job_description: str

# -------------------------
# Helper Function: Call Google Gemini API using the genai client
# -------------------------
def call_gemini_api(prompt: str, max_length: int = None) -> str:
    try:
        model_instance = genai.GenerativeModel(MODEL)  # Create the model object
        # Simply call generate_content without the unsupported parameter
        response = model_instance.generate_content(prompt)
            
        if response and response.candidates:
            # Extract the text response (adjust extraction based on the actual response structure)
            return response.candidates[0].content.parts[0].text
        return "No response generated."
    except Exception as e:
        logger.error(f"Error calling Google Gemini API: {e}")
        raise HTTPException(status_code=500, detail="Error calling Google Gemini API")

# -------------------------
# API Endpoints
# -------------------------
@app.get("/")
def home():
    return {"message": "AI Resume & Cover Letter Generator API"}

@app.post("/analyze-job")
def analyze_job(request: AnalyzeJobRequest):
    prompt = (
        "Summarize the following job description in 3 concise bullet points covering the key skills, responsibilities, and requirements.\n\n"
        f"Job Description:\n{request.job_description}\n"
    )
    analysis = call_gemini_api(prompt, max_length=150)
    return {"analysis": analysis}

@app.post("/generate-resume")
def generate_resume(request: ResumeRequest):
    prompt = (
        "Generate a professional resume for the following job description and candidate details in first person."
        f"Job Description:\n{request.job_description}\n\n"
        f"Candidate Details:\n{request.user_details}\n\n"
        "If there is no job description and candidate details tell the user their details are needed. "
        "Format the resume in clearly separated sections labeled as follows:\n"
        "Personal Information\n"
        "Summary\n"
        "Skills\n"
        "Experience\n"
        "Projects\n"
        "Education\n\n"
        "Ensure that each section is comprehensive so that minimal editing is needed. "
        "Do not output any extra commentary; output only the resume text in markdown format. "
        "Use 'I' statements throughout.\n\n"
        "Resume:"
    )
    resume_text = call_gemini_api(prompt)
    return {"resume": resume_text}

@app.post("/generate-cover-letter")
def generate_cover_letter(request: CoverLetterRequest):
    prompt = (
        "Write a tailored cover letter in first person for the candidate using the details provided."
        "Ensure the cover letter is professional and personal, using 'I' statements.\n\n"
        f"Company Details:\n{request.company_details}\n\n"
        f"Candidate Details:\n{request.user_details}\n\n"
        "Do not output any extra commentary; output only the resume text in markdown format. "
        "Use 'I' statements throughout.\n\n"
        "Cover Letter:"
    )
    cover_letter_text = call_gemini_api(prompt)
    return {"cover_letter": cover_letter_text}

@app.post("/regenerate-section")
def regenerate_section(request: RegenerateSectionRequest):
    prompt = (
        f"Rewrite the '{request.section}' section of a resume using updated candidate details in first person. "
        "Ensure the rewritten section is clear, concise, and professionally formatted in markdown.\n\n"
        f"Current {request.section} Section:\n{request.current_text}\n\n"
        f"Candidate Details:\n{request.user_details}\n\n"
        f"Updated '{request.section}' Section:"
    )
    section_text = call_gemini_api(prompt)
    return {"section": section_text}

# -------------------------
# Run the Server
# -------------------------
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 10000))  # Default port 5000 or as defined in environment
    uvicorn.run(app, host="127.0.0.1", port=port)