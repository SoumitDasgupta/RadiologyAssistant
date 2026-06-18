import google.generativeai as genai
from PIL import Image
import os
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY", "")

genai.configure(api_key=API_KEY)

model = genai.GenerativeModel("gemini-2.5-flash")


def analyze_image(image_path):

    image = Image.open(image_path)

    prompt = """
    You are an expert radiologist. Analyze this radiology image carefully.

    Return ONLY valid JSON — no markdown, no backticks, no explanation.

    {
        "findings": "Detailed description of all visible findings",
        "findings_list": [
            {"title": "Finding name", "details": "Location, size, characteristics"},
            {"title": "Finding name", "details": "Location, size, characteristics"}
        ],
        "impression": "Overall clinical impression and summary in 2-3 sentences",
        "confidence": 85,
        "recommendation": "Follow-up recommendations",
        "recommendations_list": [
            "Specific recommendation 1",
            "Specific recommendation 2"
        ]
    }

    Rules:
    - Output valid JSON only
    - No markdown
    - No backticks
    - No explanation outside JSON
    - confidence must be integer 0-100
    - findings_list must have 2-5 items
    - recommendations_list must have 1-4 items
    """

    response = model.generate_content([prompt, image])

    return response.text
