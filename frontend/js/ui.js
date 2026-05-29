/**
 * ui.js
 * Funciones puras de renderizado del DOM.
 */

/* ── Constantes de etiquetas legibles ───────────────────────────── */
const CATEGORY_LABELS = {
  cuenta_bancaria:   "Cuenta bancaria",
  tarjeta:           "Tarjeta de crédito",
  cedula:            "Cédula de identidad",
  fecha_nacimiento:  "Fecha de nacimiento",
  nombre:            "Nombre propio",
  email:             "Correo electrónico",
  telefono:          "Teléfono",
  direccion:         "Dirección",
  lugar:             "Lugar",
  organizacion:      "Organización",
  informacion_medica:"Información médica",
};

/* ── Badge de nivel de riesgo ───────────────────────────────────── */
function renderBadge(level) {
  if (!level) return "";
  return `<span class="badge ${level}">${level}</span>`;
}

/* ── Anillo SVG de puntuación ───────────────────────────────────── */
function renderScoreRing(score = 0, level = "LOW") {
  const r = 36;
  const circumference = 2 * Math.PI * r;
  const filled = (score / 100) * circumference;
  const offset = circumference - filled;

  const colorMap = {
    CRITICAL: "var(--critical)",
    HIGH:     "var(--high)",
    MEDIUM:   "var(--medium)",
    LOW:      "var(--low)",
  };

  const color = colorMap[level] || "var(--accent)";

  return `
    <div class="score-ring">
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r="${r}"
          fill="none" stroke="var(--bg-3)" stroke-width="6"/>
        <circle cx="44" cy="44" r="${r}"
          fill="none" stroke="${color}" stroke-width="6"
          stroke-dasharray="${circumference}"
          stroke-dashoffset="${offset}"
          stroke-linecap="round"
          style="transform:rotate(-90deg);transform-origin:44px 44px"/>
      </svg>
      <div class="score-number" style="color:${color}">${score}</div>
    </div>
  `;
}

/* ── Lista de hallazgos ─────────────────────────────────────────── */
function renderFindings(findings = {}) {
  const entries = Object.entries(findings || {});
  if (entries.length === 0) {
    return `<p style="font-size:12px;color:var(--text-3);font-family:var(--font-mono)">
      Sin datos sensibles detectados
    </p>`;
  }

  return entries
    .sort(([, a], [, b]) => b.length - a.length)
    .map(([cat, items]) => {
      const label = CATEGORY_LABELS[cat] || cat;
      return `
        <div class="finding-row">
          <span class="finding-tag">[${cat.toUpperCase()}]</span>
          <span style="color:var(--text-2);font-size:12px">${label}</span>
          <span class="finding-count">${items.length}x</span>
        </div>
      `;
    })
    .join("");
}

/* ── Vista previa anonimizada ───────────────────────────────────── */
function renderAnonPreview(text = "") {
  if (!text) return "";

  const highlighted = text.replace(
    /\[(NOMBRE|CI|EMAIL|TELEFONO|CUENTA|TARJETA|FECHA|DIRECCION|LUGAR|ORGANIZACION|INFO_MEDICA)\]/g,
    '<span class="anon-tag">[$1]</span>'
  );

  return `<div class="anon-preview-box">${highlighted}</div>`;
}

/* ── Panel completo de resultado ────────────────────────────────── */
function renderResultPanel(data) {
  const panel = document.getElementById("result-panel");

  const risk = data?.risk || {};
  const riskLevel = risk.risk_level || "LOW";
  const riskScore = risk.score || 0;
  const reasons = risk.reasons || [];

  const now = new Date();
  const timeStr = now.toLocaleTimeString("es-BO", {
    hour: "2-digit",
    minute: "2-digit",
  });

  panel.innerHTML = `
    <div class="result-header">
      <div>
        <div class="result-filename">${escapeHtml(data?.file_name)}</div>
        <div class="result-time">Analizado hoy a las ${timeStr}</div>
      </div>
      ${renderBadge(riskLevel)}
    </div>

    <div class="result-body">
      <div class="result-col">
        <div class="col-title">Datos sensibles detectados</div>
        ${renderFindings(data?.findings)}

        <div class="col-title" style="margin-top:16px">Vista previa anonimizada</div>
        ${renderAnonPreview(data?.anonymized_text)}
      </div>

      <div class="result-col">
        <div class="col-title">Puntuación de riesgo</div>
        <div class="score-wrap">
          ${renderScoreRing(riskScore, riskLevel)}
          <div style="font-size:11px;color:var(--text-3);font-family:var(--font-mono);margin-top:6px">
            de 100 puntos
          </div>
        </div>

        <div class="col-title">Razones de clasificación</div>
        ${
          reasons.length
            ? reasons.map(r => `
                <div class="reason-item">${escapeHtml(r)}</div>
              `).join("")
            : "<div style='font-size:12px;color:var(--text-3)'>Sin razones registradas</div>"
        }
      </div>
    </div>

    <div class="result-actions">
      <button class="btn" onclick="resetUpload()">Analizar otro documento</button>
      <button class="btn primary" onclick="navigateTo('audit')">Ver en auditoría →</button>
    </div>
  `;

  panel.style.display = "block";
}

/* ── Fila de tabla de auditoría ─────────────────────────────────── */
function renderAuditRow(record) {
  const total = Object.values(record.findings || {})
    .reduce((sum, arr) => sum + arr.length, 0);

  return `
    <tr>
      <td class="mono">${escapeHtml(record.file_name)}</td>
      <td>${record.analyzed_at}</td>
      <td>${renderBadge(record.risk_level)}</td>
      <td class="mono">${record.risk_score}/100</td>
      <td class="mono">${total} dato${total !== 1 ? "s" : ""}</td>
    </tr>
  `;
}

/* ── Utilidad: escape HTML ──────────────────────────────────────── */
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}
function renderDashboardBars(byRisk) {
  const levels = [
    { key: "CRITICAL", color: "var(--critical)" },
    { key: "HIGH",     color: "var(--high)" },
    { key: "MEDIUM",   color: "var(--medium)" },
    { key: "LOW",      color: "var(--low)" }
  ];

  const max = Math.max(...Object.values(byRisk), 1);

  return levels.map(level => {
    const value = byRisk[level.key] || 0;
    const pct = (value / max) * 100;

    return `
      <div class="risk-bar-row">
        <div class="risk-bar-label">${level.key}</div>
        <div class="risk-bar-track">
          <div class="risk-bar-fill"
               style="width:${pct}%; background:${level.color}">
            <span class="risk-bar-value">${value}</span>
          </div>
        </div>
      </div>
    `;
  }).join("");
}
function renderProgressBars(analyses) {
  if (!analyses || !analyses.length) {
    return `<div class="empty">Sin datos suficientes</div>`;
  }

  // Agrupa categorías detectadas
  const categoryCount = {};

  analyses.forEach(a => {
    if (!a.entities) return;

    a.entities.forEach(ent => {
      const cat = ent.category || "OTHER";
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });
  });

  const max = Math.max(...Object.values(categoryCount), 1);

  return Object.entries(categoryCount)
    .map(([category, value]) => {
      const pct = (value / max) * 100;

      return `
        <div class="progress-row">
          <span class="progress-label">${category}</span>
          <div class="progress-track">
            <div class="progress-fill" style="width:${pct}%"></div>
          </div>
          <span class="progress-value">${value}</span>
        </div>
      `;
    })
    .join("");
}