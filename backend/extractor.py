import fitz
from docx import Document

def extract_text(file_path: str, file_type: str) -> str:
    if file_type == 'pdf':
        doc= fitz.open(file_path)
        text = ""
        for page in doc:
            text += page.get_text()
        return text.strip()
    elif file_type == 'docx':
        doc= Document(file_path)
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        return "\n".join(paragraphs)
    else:
        raise ValueError("Unsupported file type. Only 'pdf' and 'docx' are supported.")
    