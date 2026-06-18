from fastapi import FastAPI, UploadFile, File
from database import conn, cursor
from fastapi.middleware.cors import CORSMiddleware
from ai import analyze_image

import shutil
import json

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():

    return {
        "status": "running",
        "message": "Radiology AI Backend Online"
    }


@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):

    save_path = f"../uploads/{file.filename}"

    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(
            file.file,
            buffer
        )

    result = analyze_image(save_path)

    try:

        result_json = json.loads(result)

        cursor.execute("""
        INSERT INTO reports
        (
            filename,
            findings,
            impression,
            confidence,
            recommendation
        )
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            file.filename,
            result_json.get("findings", ""),
            result_json.get("impression", ""),
            result_json.get("confidence", 0),
            result_json.get("recommendation", "")
        ))

        conn.commit()

        return {
            "filename": file.filename,
            "analysis": result_json
        }

    except Exception as e:

        return {
            "filename": file.filename,
            "error": str(e),
            "raw_response": result
        }


@app.get("/history")
def history():

    cursor.execute("""
    SELECT *
    FROM reports
    ORDER BY id DESC
    """)

    rows = cursor.fetchall()

    return rows
@app.get("/report/{report_id}")
def get_report(report_id: int):

    cursor.execute(
        "SELECT * FROM reports WHERE id=?",
        (report_id,)
    )

    report = cursor.fetchone()

    if report is None:
        return {"error": "Report not found"}

    return report