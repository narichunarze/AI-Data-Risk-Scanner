import re
import spacy

nlp=spacy.load("xx_ent_wiki_sm")


PATTERNS = {
    "email": r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
    "cellphone": r'\b(\+?591|0)?[-.\s]?[67]\d{7}\b',
    "identity_number": r'\b\d{6,8}[-\s]?[A-Z]{0,2}\b',
    "account": r'\b\d{10,20}\b',
}

def detect_sensitive_data(text: str) -> dict:
    findings = {}

    # Regex
    for category, pattern in PATTERNS.items():
        matches = re.findall(pattern, text, re.IGNORECASE)
        if matches:
            findings[category] = list(set(matches))

    # spaCy NER
    doc = nlp(text[:100000])
    for ent in doc.ents:
        if ent.label_ in ["PERSON"]:
            findings.setdefault("name", []).append(ent.text)
        elif ent.label_ in ["LOC", "GPE"]:
            findings.setdefault("address", []).append(ent.text)
        elif ent.label_ in ["ORG"]:
            findings.setdefault("organization", []).append(ent.text)

    return findings
