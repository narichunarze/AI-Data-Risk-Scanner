def classify_risk(findings: dict) -> dict:

    WEIGHTS = {
        "name": 5,
        "email": 10,
        "cellphone": 15,
        "address": 10,
        "medical_info": 40,
        "financial_info": 40,
        "organization": 5,
    }

    score = 0
    reasons = []

    for category, items in findings.items():
        if not items:
            continue

        base_weight = WEIGHTS.get(category, 5)

        # impacto principal por existencia
        category_score = base_weight

        # impacto adicional leve por cantidad (máximo +50% del peso)
        density_bonus = min(len(items) * 2, base_weight * 0.5)

        category_score += density_bonus
        score += category_score

        reasons.append(f"{len(items)} {category}(s) detected")

    # límite máximo
    score = min(round(score), 100)

    # clasificación coherente
    if score >= 80:
        level = "CRITICAL"
        color = "red"
    elif score >= 60:
        level = "HIGH"
        color = "orange"
    elif score >= 30:
        level = "MEDIUM"
        color = "yellow"
    else:
        level = "LOW"
        color = "green"

    return {
        "risk_level": level,
        "score": score,
        "color": color,
        "reasons": reasons,
    }