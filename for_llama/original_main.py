from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import logging
import os
import torch
import subprocess
from transformers import AutoModelForCausalLM, AutoTokenizer

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
# Load AI Model & Tokenizer
# -------------------------
MODEL_NAME = os.getenv("LLAMA_MODEL_NAME", "deepseek-ai/DeepSeek-R1-Distill-Llama-8B")
logger.info(f"Loading model: {MODEL_NAME}")

try:
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    model = AutoModelForCausalLM.from_pretrained(MODEL_NAME, device_map="auto")
    model.eval()
    logger.info("Model loaded successfully.")
except Exception as e:
    logger.error(f"Error loading model: {e}")
    raise RuntimeError("Failed to load AI model")

# -------------------------
# Helper Functions
# -------------------------
def generate_text(prompt: str, max_length: int = 256) -> str:
    try:
        inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
        output_ids = model.generate(
            inputs.input_ids,
            max_length=max_length,
            num_return_sequences=1,
            no_repeat_ngram_size=2,
            do_sample=True,
            temperature=0.7
        )
        return tokenizer.decode(output_ids[0], skip_special_tokens=True)
    except Exception as e:
        logger.error(f"Error during text generation: {e}")
        raise HTTPException(status_code=500, detail="Error during text generation")

def run_ollama(prompt: str) -> str:
    """
    Runs the Ollama command by sending the prompt via stdin.
    """
    try:
        process = subprocess.Popen(
            ["ollama", "run", "llama3"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        output, error = process.communicate(input=prompt)
        if process.returncode == 0:
            return output.strip()
        else:
            logger.error(f"Ollama processing error: {error.strip()}")
            raise HTTPException(status_code=500, detail="AI processing failed")
    except Exception as e:
        logger.error(f"Error running Ollama: {e}")
        raise HTTPException(status_code=500, detail="Error running Ollama")

# -------------------------
# API Endpoints
# -------------------------
@app.get("/")
def home():
    return {"message": "AI Resume & Cover Letter Generator API"}

@app.post("/analyze-job")
def analyze_job(request: AnalyzeJobRequest):
    prompt = (
        f"Analyze the following job description and extract the key skills, responsibilities, and requirements. "
        f"Also, provide suggested edits or improvements.\n\nJob Description:\n{request.job_description}\n\n"
        "Key Points and Suggestions:"
    )
    return {"analysis": generate_text(prompt, max_length=300)}

@app.post("/generate-resume")
def generate_resume(request: ResumeRequest):
    prompt = f"Generate a professional resume for this job: {request.job_description} based on the user details: {request.user_details}"
    try:
        resume_text = run_ollama(prompt)
        return {"resume": resume_text}
    except Exception as e:
        logger.error(f"AI processing failed in generate_resume: {e}")
        raise HTTPException(status_code=500, detail="AI processing failed")

@app.post("/generate-cover-letter")
def generate_cover_letter(request: CoverLetterRequest):
    prompt = f"Write a tailored cover letter for {request.company_details} using user details: {request.user_details}"
    try:
        cover_letter_text = run_ollama(prompt)
        return {"cover_letter": cover_letter_text}
    except Exception as e:
        logger.error(f"AI processing failed in generate_cover_letter: {e}")
        raise HTTPException(status_code=500, detail="AI processing failed")

@app.post("/regenerate-section")
def regenerate_section(request: RegenerateSectionRequest):
    prompt = f"""Rewrite the '{request.section}' section of a resume using updated candidate details.
Current Section:
{request.current_text}

Candidate Details:
{request.user_details}

Updated '{request.section}' Section:"""
    return {"section": generate_text(prompt)}

# -------------------------
# Run the Server
# -------------------------
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 4000))  # Use the PORT env variable if available
    uvicorn.run(app, host="0.0.0.0", port=port)