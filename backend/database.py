import sqlite3
import json
from datetime import datetime

DB_PATH = "scanner.db"


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # Retorna filas como diccionarios
    return conn


def init_db():
    """
    Crea las tablas si no existen.
    Se llama una vez al arrancar la app.
    """
    conn = get_connection()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS analyses (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            file_name   TEXT NOT NULL,
            analyzed_at TEXT NOT NULL,
            risk_level  TEXT NOT NULL,
            risk_score  INTEGER NOT NULL,
            findings    TEXT NOT NULL,   -- JSON serializado
            reasons     TEXT NOT NULL,   -- JSON serializado
            anon_preview TEXT NOT NULL
        );
    """)
    conn.commit()
    conn.close()


def save_analysis(data: dict) -> dict:
    """
    Guarda un análisis en la base de datos.
    Retorna el registro completo con su ID asignado.
    """
    conn = get_connection()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    cursor = conn.execute(
        """
        INSERT INTO analyses
            (file_name, analyzed_at, risk_level, risk_score, findings, reasons, anon_preview)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            data["file_name"],
            now,
            data["risk"]["risk_level"],            
            data["risk"]["score"],
            json.dumps(data["findings"], ensure_ascii=False),
            json.dumps(data["risk"]["reasons"], ensure_ascii=False),
            data["anonymized_preview"],
        ),
    )
    conn.commit()
    record_id = cursor.lastrowid
    conn.close()

    return {**data, "id": record_id, "analyzed_at": now}


def get_all_analyses() -> list:
    """
    Retorna todos los análisis ordenados del más reciente al más antiguo.
    """
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM analyses ORDER BY id DESC"
    ).fetchall()
    conn.close()

    result = []
    for row in rows:
        result.append({
            "id": row["id"],
            "file_name": row["file_name"],
            "analyzed_at": row["analyzed_at"],
            "risk_level": row["risk_level"],
            "risk_score": row["risk_score"],
            "findings": json.loads(row["findings"]),
            "reasons": json.loads(row["reasons"]),
            "anon_preview": row["anon_preview"],
        })
    return result


def get_metrics() -> dict:
    """
    Agrega métricas para el dashboard.
    """
    conn = get_connection()
    rows = conn.execute("SELECT risk_level, risk_score FROM analyses").fetchall()
    conn.close()

    if not rows:
        return {
            "total": 0,
            "by_risk": {"CRITICO": 0, "ALTO": 0, "MEDIO": 0, "BAJO": 0},
            "high_risk_percentage": 0,
            "avg_score": 0,
        }

    by_risk = {"CRITICO": 0, "ALTO": 0, "MEDIO": 0, "BAJO": 0}
    total_score = 0

    for row in rows:
        level = row["risk_level"]
        by_risk[level] = by_risk.get(level, 0) + 1
        total_score += row["risk_score"]

    total = len(rows)
    high = by_risk.get("ALTO", 0) + by_risk.get("CRITICO", 0)

    return {
        "total": total,
        "by_risk": by_risk,
        "high_risk_percentage": round(high / total * 100, 1),
        "avg_score": round(total_score / total, 1),
    }
