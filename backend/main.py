from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import shutil, os, uuid
from classifier import classify_risk
from extractor import extract_text
from detector import detect_sensitive_data
from anonymizer import anonymize_text
from database import save_analysis, get_all_analyses, init_db

app= FastAPI(title="AI Data Risk Scanner API")


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5500",
        "http://127.0.0.1:5500"
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.get("/")
def root():
    return {"status": "API online"}

@app.post("/analyze")
async def analyze_file(file: UploadFile = File(...)):
    try:
        ext = file.filename.split(".")[-1].lower()
        if ext not in ["pdf", "docx"]:
            raise HTTPException(status_code=400, detail="Unsupported file type.")

        file_id = str(uuid.uuid4())
        file_path = os.path.join(UPLOAD_DIR, f"{file_id}.{ext}")

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        text = extract_text(file_path, ext)
        findings = detect_sensitive_data(text)
        risk = classify_risk(findings)
        anonymized = anonymize_text(text, findings)

        os.remove(file_path)

        analysis_data = {
            "file_name": file.filename,
            "risk": risk,
            "findings": findings,
            "anonymized_preview": anonymized[:500]  # preview corto
        }

        save_analysis(analysis_data)

        return analysis_data

    except Exception as e:
        print("ERROR:", str(e))
        raise HTTPException(status_code=500, detail=str(e))
        
@app.get("/analyses")
def get_analyses():
    return get_all_analyses()

@app.get("/metrics")
def get_metrics():
    try:
        analyses = get_all_analyses()

        if not analyses:
            return {
                "total": 0,
                "by_risk": {},
                "high_risk_percentage": 0,
                "avg_score": 0
            }

        by_risk = {}

        for a in analyses:
            # Soporta ambas estructuras
            if "risk_level" in a:
                level = a["risk_level"]
            elif "risk" in a and "risk_level" in a["risk"]:
                level = a["risk"]["risk_level"]
            else:
                continue

            by_risk[level] = by_risk.get(level, 0) + 1

        total = len(analyses)

        high_count = by_risk.get("ALTO", 0) + by_risk.get("CRITICO", 0)

        return {
            "total": total,
            "by_risk": by_risk,
            "high_risk_percentage": round(high_count / total * 100, 1),
            "avg_score": 0  # ajusta si luego calculas score real
        }

    except Exception as e:
        print("METRICS ERROR:", str(e))
        raise HTTPException(status_code=500, detail=str(e))

    