/**
 * app.js
 * Orquesta toda la aplicación: navegación, eventos, flujo de análisis.
 *
 * Responsabilidades:
 * - Maneja los eventos del usuario (clic, drag, input)
 * - Llama a api.js para comunicarse con el backend
 * - Llama a ui.js para actualizar la interfaz
 * - Guarda el estado mínimo necesario en variables
 */

/* ── Estado global mínimo ───────────────────────────────────────── */
let currentPage = "scanner";
let lastResult = null;        // Último análisis realizado
let analyses = [];            // Cache del historial

/* ── Inicialización ─────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", async () => {
  await updateApiStatus();
  setupUploadZone();
  navigateTo("scanner");

  // Refresca el estado de la API cada 15 segundos
  setInterval(updateApiStatus, 15_000);
});

/* ── Navegación ─────────────────────────────────────────────────── */
function navigateTo(page) {
  currentPage = page;

  // Actualiza clases en el sidebar
  document.querySelectorAll(".nav-item").forEach(el => {
    el.classList.toggle("active", el.dataset.page === page);
  });

  // Muestra/oculta páginas
  document.querySelectorAll(".page").forEach(el => {
    el.classList.toggle("active", el.id === `page-${page}`);
  });

  // Carga datos según la página
  if (page === "audit")     loadAuditPage();
  if (page === "dashboard") loadDashboardPage();
}

/* ── Estado de la API ───────────────────────────────────────────── */
async function updateApiStatus() {
  const online = await checkApiStatus();
  const dot   = document.getElementById("api-dot");
  const label = document.getElementById("api-label");

  if (dot && label) {
    dot.className = `api-status-dot${online ? "" : " offline"}`;
    label.textContent = online ? "API CONNECTED" : "API DISCONNECTED";
  }
}

/* ── Zona de subida ─────────────────────────────────────────────── */
function setupUploadZone() {
  const zone = document.getElementById("upload-zone");
  if (!zone) return;

  zone.addEventListener("dragover", e => {
    e.preventDefault();
    zone.classList.add("dragging");
  });

  zone.addEventListener("dragleave", () => {
    zone.classList.remove("dragging");
  });

  zone.addEventListener("drop", e => {
    e.preventDefault();
    zone.classList.remove("dragging");
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });
}

function handleFileInput(input) {
  const file = input.files[0];
  if (file) handleFile(file);
  // Resetea el input para permitir seleccionar el mismo archivo de nuevo
  input.value = "";
}

/* ── Pipeline de análisis ───────────────────────────────────────── */
async function handleFile(file) {
  // Valida extensión en el cliente (validación extra en el servidor)
  const ext = file.name.split(".").pop().toLowerCase();
  if (!["pdf", "docx"].includes(ext)) {
    showError("Solo se aceptan archivos PDF o DOCX");
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    showError("El archivo excede el límite de 10MB");
    return;
  }

  // Muestra el panel de análisis con los pasos animados
  showAnalyzingPanel(file.name);

  try {
    const result = await analyzeDocument(file);
    lastResult = result;
    hideAnalyzingPanel();
    renderResultPanel(result);
    document.getElementById("result-panel").style.display = "block";

    // Actualiza las métricas en el topbar si están visibles
    updateTopMetrics();

  } catch (err) {
    hideAnalyzingPanel();
    showError(err.message || "Error al conectar con la API. ¿Está el backend corriendo?");
  }
}

/* ── Pasos animados durante el análisis ─────────────────────────── */
const STEP_LABELS = [
  "Extrayendo texto del documento",
  "Detectando datos sensibles",
  "Clasificando nivel de riesgo",
  "Generando versión anonimizada",
  "Guardando registro auditable",
];

let stepInterval = null;

function showAnalyzingPanel(filename) {
  document.getElementById("upload-zone").style.display  = "none";
  document.getElementById("error-banner").style.display = "none";
  document.getElementById("result-panel").style.display = "none";

  const panel = document.getElementById("analyzing-panel");
  panel.style.display = "block";

  document.getElementById("analyzing-filename").textContent = filename;

  // Construye los pasos
  const stepList = document.getElementById("step-list");
  stepList.innerHTML = STEP_LABELS.map((label, i) =>
    `<div class="step" id="step-${i}">
      <div class="step-indicator">${i + 1}</div>
      <span>${label}</span>
    </div>`
  ).join("");

  // Anima los pasos secuencialmente
  let current = 0;
  document.getElementById(`step-${current}`).classList.add("running");

  stepInterval = setInterval(() => {
    const currentEl = document.getElementById(`step-${current}`);
    if (currentEl) {
      currentEl.classList.remove("running");
      currentEl.classList.add("done");
      currentEl.querySelector(".step-indicator").textContent = "✓";
    }
    current++;
    if (current < STEP_LABELS.length) {
      const nextEl = document.getElementById(`step-${current}`);
      if (nextEl) nextEl.classList.add("running");
    } else {
      clearInterval(stepInterval);
    }
  }, 700);
}

function hideAnalyzingPanel() {
  if (stepInterval) clearInterval(stepInterval);
  document.getElementById("analyzing-panel").style.display = "none";
}

/* ── Reset para analizar otro documento ─────────────────────────── */
function resetUpload() {
  document.getElementById("result-panel").style.display   = "none";
  document.getElementById("error-banner").style.display   = "none";
  document.getElementById("upload-zone").style.display    = "block";
}

/* ── Banner de error ────────────────────────────────────────────── */
function showError(msg) {
  document.getElementById("upload-zone").style.display = "block";
  const banner = document.getElementById("error-banner");
  banner.style.display = "flex";
  document.getElementById("error-msg").textContent = msg;
}

/* ── Página de auditoría ────────────────────────────────────────── */
async function loadAuditPage() {
  const tbody = document.getElementById("audit-tbody");
  tbody.innerHTML = `<tr><td colspan="5" class="empty">Cargando...</td></tr>`;

  try {
    analyses = await fetchAnalyses();

    if (!analyses.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5">
            <div class="empty">
              <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              Sin análisis registrados aún
            </div>
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = analyses.map(renderAuditRow).join("");

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="color:var(--critical);text-align:center;padding:24px;font-family:var(--font-mono);font-size:12px">
      Error al cargar: ${escapeHtml(err.message)}
    </td></tr>`;
  }
}

/* ── Página de dashboard ────────────────────────────────────────── */
async function loadDashboardPage() {
  try {
    const [metrics, allAnalyses] = await Promise.all([
      fetchMetrics(),
      fetchAnalyses(),
    ]);

    // Métricas superiores
    document.getElementById("d-total").textContent = metrics.total;
    document.getElementById("d-high").textContent =
      (metrics.by_risk.CRITICAL || 0) + (metrics.by_risk.HIGH || 0);
    document.getElementById("d-pct").textContent  = metrics.high_risk_percentage + "%";
    document.getElementById("d-avg").textContent  = metrics.avg_score;

    // Barra de riesgo
    document.getElementById("bars-container").innerHTML =
      renderDashboardBars(metrics.by_risk || {})

    // Progress bars de categorías
    document.getElementById("progress-container").innerHTML =
      renderProgressBars(allAnalyses);

    // Alerta si hay críticos
    const critCount = metrics.by_risk.CRITICAL || 0;
    const alertEl = document.getElementById("dashboard-alert");
    if (critCount > 0) {
      alertEl.style.display = "flex";
      document.getElementById("alert-count").textContent = critCount;
    } else {
      alertEl.style.display = "none";
    }

  } catch (err) {
    console.error("Error cargando dashboard:", err);
  }
}

/* ── Actualiza métricas en topbar del scanner ───────────────────── */
async function updateTopMetrics() {
  try {
    const m = await fetchMetrics();
    const el = document.getElementById("scanner-total");
    if (el) el.textContent = m.total;
  } catch {
    // Silencioso — no es crítico
  }
}
