/**
 * api.js
 * Toda la comunicación con el backend FastAPI en un solo lugar.
 * Si el día de mañana cambias la URL del backend, solo cambias aquí.
 */

const API_BASE = "http://127.0.0.1:8000";
/**
 * Verifica que la API esté en línea.
 * Retorna true/false.
 */
async function checkApiStatus() {
  try {
    const res = await fetch(`${API_BASE}/`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Envía un archivo al endpoint /analyze.
 * Retorna el objeto de resultado o lanza un error con mensaje legible.
 */
async function analyzeDocument(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/analyze`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error("Error analyzing document");
  }

  const data = await res.json();

  console.log("Response:", data); // 👈 depuración

  return data;
}

/**
 * Obtiene todos los análisis para el log de auditoría.
 */
async function fetchAnalyses() {
  const res = await fetch(`${API_BASE}/analyses`);
  if (!res.ok) throw new Error("No se pudo cargar el historial");
  return res.json();
}

/**
 * Obtiene las métricas agregadas para el dashboard.
 */
async function fetchMetrics() {
  const res = await fetch(`${API_BASE}/metrics`);
  if (!res.ok) throw new Error("No se pudo cargar las métricas");
  return res.json();
}
