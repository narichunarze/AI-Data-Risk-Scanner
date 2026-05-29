import re
REPLACEMENTS = {
    "email": "[EMAIL]",
    "cellphone": "[CELLPHONE]",
    "identity_number": "[ID_NUMBER]",
    "account": "[ACCOUNT]",
    "name": "[NAME]",
    "address": "[ADDRESS]",
    "organization": "[ORGANIZATION]",
}

PATTERNS = {
    "email": r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
    "cellphone": r'\b(\+?591|0)?[-.\s]?[67]\d{7}\b',
    "identity_number": r'\b\d{6,8}[-\s]?[A-Z]{0,2}\b',
    "account": r'\b\d{10,20}\b',
    "name": r'\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*\b',
    "address": r'\b\d{1,5}\s\w+\s\w+\b',
    "organization": r'\b[A-Z][a-zA-Z0-9& ]{2,}\b',
}

def anonymize_text(text: str, findings: dict) -> str:
    anonymized = text
    for category, pattern in PATTERNS.items():
        if category in findings:
            tag = REPLACEMENTS.get(category, f"[{category.upper()}]")
            anonymized = re.sub(pattern, tag, anonymized, flags=re.IGNORECASE)
    
    for name in findings.get("name", []):
        anonymized = anonymized.replace(name, REPLACEMENTS["name"])

    return anonymized