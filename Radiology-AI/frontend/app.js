/* =========================================================
   AI Radiology Assistant — app.js
   Frontend → FastAPI → Gemini AI → SQLite
   ========================================================= */

const API = "http://127.0.0.1:8000";

let selectedFile = null;
let zoom = 100;
let currentTool = "select";
let inverted = false;

/* ── Login ──────────────────────────────────────────────── */
function setRole(btn, role) {
  document.querySelectorAll(".role-tab").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
}

function togglePw() {
  const pw = document.getElementById("loginPassword");
  pw.type = pw.type === "password" ? "text" : "password";
}

function doLogin() {
  document.getElementById("loginPage").style.display  = "none";
  document.getElementById("appPage").style.display    = "flex";
}

function logout() {
  document.getElementById("appPage").style.display   = "none";
  document.getElementById("loginPage").style.display = "flex";
}

/* ── Image loading ─────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("imageInput");
  if (input) input.addEventListener("change", onFileSelected);

  const dz = document.getElementById("dropZone");
  if (dz) {
    dz.addEventListener("dragover", e => { e.preventDefault(); dz.classList.add("dragover"); });
    dz.addEventListener("dragleave", () => dz.classList.remove("dragover"));
    dz.addEventListener("drop", e => {
      e.preventDefault();
      dz.classList.remove("dragover");
      if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
    });
  }
});

function onFileSelected() {
  const input = document.getElementById("imageInput");
  if (input.files[0]) loadFile(input.files[0]);
}

function loadFile(file) {
  selectedFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    const preview = document.getElementById("preview");
    preview.src = e.target.result;
    preview.onload = () => {
      document.getElementById("dropZone").style.display       = "none";
      document.getElementById("imgContainer").style.display   = "flex";
      document.getElementById("emptyState").style.display     = "none";

      const mb = (file.size / 1024 / 1024).toFixed(1);
      document.getElementById("fileInfo").textContent  = "FILE — " + file.name;
      document.getElementById("sizeInfo").textContent  = "SIZE — " + mb + " MB";
      document.getElementById("dimsInfo").textContent  = "DIMS — " + preview.naturalWidth + " × " + preview.naturalHeight;
      document.getElementById("aiStatusBox").textContent = "Image loaded. Click 'Analyze with Gemini AI' to begin.";
    };
  };
  reader.readAsDataURL(file);
  addRecentItem(file.name);
}

function addRecentItem(name) {
  const list = document.getElementById("recentList");
  const item = document.createElement("div");
  item.className = "recent-item";
  item.innerHTML = `
    <span class="dot teal"></span>
    <div>
      <div class="recent-name">${name} <span class="recent-time">just now</span></div>
      <div class="recent-desc">Pending analysis…</div>
    </div>`;
  list.insertBefore(item, list.firstChild);
}

/* ── Sliders ───────────────────────────────────────────── */
function applyFilters() {
  const b = +document.getElementById("brightness").value;
  const c = +document.getElementById("contrast").value;
  const s = +document.getElementById("sharpness").value;
  document.getElementById("brightnessVal").textContent = b;
  document.getElementById("contrastVal").textContent   = c;
  document.getElementById("sharpnessVal").textContent  = s;
  const preview = document.getElementById("preview");
  if (preview)
    preview.style.filter = `brightness(${1 + b/100}) contrast(${1 + c/100}) ${s > 0 ? `saturate(${1 + s*0.01})` : ""}`;
}

function resetSliders() {
  ["brightness","contrast","sharpness"].forEach(id => {
    document.getElementById(id).value = 0;
    const el = document.getElementById(id + "Val");
    if (el) el.textContent = "0";
  });
  const preview = document.getElementById("preview");
  if (preview) preview.style.filter = "";
  inverted = false;
}

/* ── Window presets ────────────────────────────────────── */
const PRESETS = {
  default:    "",
  invert:     "invert(1)",
  bone:       "grayscale(1) contrast(1.5) brightness(1.1)",
  lung:       "grayscale(1) contrast(2) brightness(0.7)",
  softtissue: "grayscale(1) contrast(1.2) brightness(1.2)",
  vascular:   "grayscale(1) contrast(2.2) brightness(0.85)",
};

function setPreset(btn, name) {
  document.querySelectorAll(".preset").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  const preview = document.getElementById("preview");
  if (preview) preview.style.filter = PRESETS[name] || "";
  document.getElementById("presetInfo").textContent = "PRESET — " + btn.textContent;
  resetSliders();
}

/* ── Tabs ──────────────────────────────────────────────── */
function setTab(btn, tab) {
  document.querySelectorAll(".vtab").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
}

/* ── Tools ─────────────────────────────────────────────── */
function setTool(btn, tool) {
  document.querySelectorAll(".tool-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  currentTool = tool;
}

/* ── Zoom ──────────────────────────────────────────────── */
function zoomIn()  { applyZoom(zoom + 10); }
function zoomOut() { applyZoom(zoom - 10); }
function fitView() { applyZoom(100); }

function applyZoom(z) {
  zoom = Math.max(20, Math.min(400, z));
  const preview = document.getElementById("preview");
  if (preview) { preview.style.transform = `scale(${zoom/100})`; preview.style.transformOrigin = "center center"; }
  document.getElementById("zoomLevel").textContent = zoom + "%";
  document.getElementById("zoomInfo").textContent  = "ZOOM — " + zoom + "%";
}

/* ── Nav actions ───────────────────────────────────────── */
function resetView() {
  resetSliders();
  applyZoom(100);
  clearAnnotations();
  document.querySelectorAll(".preset").forEach(b => b.classList.remove("active"));
  document.querySelector(".preset")?.classList.add("active");
  document.getElementById("presetInfo").textContent = "PRESET — Default";
}

function toggleHalf() {
  const p = document.getElementById("preview");
  if (!p) return;
  p.style.clipPath = p.style.clipPath ? "" : "inset(0 50% 0 0)";
}

function toggleInvert() {
  inverted = !inverted;
  const p = document.getElementById("preview");
  if (!p) return;
  p.style.filter = inverted ? (p.style.filter || "") + " invert(1)" : (p.style.filter || "").replace(/\s?invert\(1\)/g, "");
}

function togglePoints() {
  const layer = document.getElementById("annotations");
  if (layer) layer.style.display = layer.style.display === "none" ? "" : "none";
}

function clearAnnotations() {
  const layer = document.getElementById("annotations");
  if (layer) layer.innerHTML = "";
}

/* ── Theme ─────────────────────────────────────────────── */
function toggleTheme() {
  document.body.classList.toggle("light");
  document.querySelector(".theme-btn").textContent = document.body.classList.contains("light") ? "🌙 Dark" : "☀ Light";
}

/* ══════════════════════════════════════════════════════════
   ANALYZE — sends image to FastAPI → Gemini
══════════════════════════════════════════════════════════ */
async function analyzeImage() {
  if (!selectedFile) { alert("Please load an image first."); return; }

  const btn       = document.getElementById("analyzeBtn");
  const statusBox = document.getElementById("aiStatusBox");

  btn.disabled = true;
  btn.innerHTML = "⏳ Analyzing with Gemini...";
  statusBox.textContent = "Sending to Gemini AI...";

  try {
    const formData = new FormData();
    formData.append("file", selectedFile);

    const res = await fetch(`${API}/analyze`, { method: "POST", body: formData });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Server ${res.status}: ${err}`);
    }

    const data = await res.json();

    if (data.error) throw new Error(data.error + " — raw: " + data.raw_response);

    renderAnalysis(data.analysis);
    updateRecentItem(selectedFile.name, data.analysis);

  } catch (err) {
    console.error(err);
    statusBox.textContent = "❌ " + err.message;
  } finally {
    btn.disabled = false;
    btn.innerHTML = "<span>⊕</span> Analyze with Gemini AI";
  }
}

/* ── Render analysis results ────────────────────────────── */
function renderAnalysis(a) {
  if (!a) return;

  // Hide empty state
  document.getElementById("emptyState").style.display = "none";

  // Confidence
  const pct = typeof a.confidence === "number" ? a.confidence : parseInt(a.confidence) || 85;
  document.getElementById("confidenceBlock").style.display = "block";
  document.getElementById("confidencePct").textContent  = pct + "%";
  document.getElementById("confidenceBar").style.width  = pct + "%";

  // Summary / impression
  const summary = a.impression || a.summary || "";
  if (summary) {
    document.getElementById("summarySection").style.display = "block";
    document.getElementById("summaryText").textContent = summary;
  }

  // Findings
  const findings = a.findings_list || parseFindingsText(a.findings);
  if (findings && findings.length) {
    document.getElementById("findingsSection").style.display = "block";
    const list   = document.getElementById("findingsList");
    const colors = ["#f97316","#7c5cbf","#22c55e","#3b82f6","#eab308"];
    list.innerHTML = "";
    findings.forEach((f, i) => {
      const color = colors[i % colors.length];
      const card  = document.createElement("div");
      card.className = "finding-card";
      card.innerHTML = `
        <div class="finding-title">
          <span class="finding-dot" style="background:${color}"></span>
          ${f.title || f}
        </div>
        ${f.details ? `<div class="finding-details">${f.details}</div>` : ""}`;
      list.appendChild(card);
    });
    placeAnnotation(findings[0]?.title || String(findings[0]));
  }

  // Recommendations
  const recs = a.recommendations_list || parseRecsText(a.recommendation);
  if (recs && recs.length) {
    document.getElementById("recsSection").style.display = "block";
    document.getElementById("recsList").innerHTML = recs.map(r => `<li>${r}</li>`).join("");
  }

  document.getElementById("aiStatusBox").textContent = "✓ Analysis complete — " + (findings?.length || 0) + " finding(s) detected.";
}

/* ── Helpers ───────────────────────────────────────────── */
function parseFindingsText(text) {
  if (!text) return [];
  return text.split(/\n|;/).map(s => s.trim()).filter(Boolean).map(s => ({ title: s }));
}

function parseRecsText(text) {
  if (!text) return [];
  return text.split(/\n|;|\.(?=\s)/).map(s => s.trim()).filter(Boolean);
}

function placeAnnotation(label) {
  if (!label) return;
  clearAnnotations();
  const layer   = document.getElementById("annotations");
  const preview = document.getElementById("preview");
  if (!layer || !preview) return;

  const rect = preview.getBoundingClientRect();
  const cx   = rect.width  * 0.42;
  const cy   = rect.height * 0.37;

  const dot = document.createElement("div");
  dot.className = "annotation-dot";
  dot.style.cssText = `left:${cx}px; top:${cy}px;`;

  const bubble = document.createElement("div");
  bubble.className = "annotation-bubble";
  bubble.textContent = label.length > 24 ? label.slice(0, 24) + "…" : label;
  bubble.style.cssText = `left:${cx + 18}px; top:${cy - 24}px;`;

  layer.appendChild(dot);
  layer.appendChild(bubble);
}

function updateRecentItem(name, analysis) {
  const items = document.querySelectorAll(".recent-item");
  for (const item of items) {
    if (item.querySelector(".recent-name")?.textContent.includes(name)) {
      const desc = item.querySelector(".recent-desc");
      if (desc) desc.textContent = (analysis?.impression || "Analysis complete.").slice(0, 80) + "…";
      break;
    }
  }
}

/* ── Generate Report ───────────────────────────────────── */
function generateReport() {
  const summary  = document.getElementById("summaryText")?.textContent || "No summary.";
  const findings = [...document.querySelectorAll(".finding-title")].map(el => el.textContent.trim()).join("\n  - ");
  const recs     = [...document.querySelectorAll("#recsList li")].map(li => li.textContent.trim()).join("\n  - ");
  const conf     = document.getElementById("confidencePct")?.textContent || "N/A";

  const report = [
    "═══════════════════════════════════════",
    "       AI RADIOLOGY REPORT",
    "═══════════════════════════════════════",
    "Generated: " + new Date().toLocaleString(),
    "AI Model:  Gemini 2.5 Flash",
    "Confidence: " + conf,
    "",
    "CLINICAL IMPRESSION",
    "───────────────────",
    summary,
    "",
    "FINDINGS",
    "────────",
    findings ? "  - " + findings : "  None documented.",
    "",
    "RECOMMENDATIONS",
    "───────────────",
    recs ? "  - " + recs : "  None.",
    "",
    "═══════════════════════════════════════",
    "⚠  This report is AI-generated and must",
    "   be reviewed by a qualified radiologist.",
    "═══════════════════════════════════════",
  ].join("\n");

  const blob = new Blob([report], { type: "text/plain" });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), { href: url, download: "radiology_report.txt" });
  a.click();
  URL.revokeObjectURL(url);
}

/* ── Ask AI ────────────────────────────────────────────── */
function askAI() {
  const summary = document.getElementById("summaryText")?.textContent;
  if (!summary) { alert("Please analyze an image first."); return; }
  const q = prompt("Ask about the findings:");
  if (!q) return;
  alert("Based on the analysis:\n\n" + summary + "\n\nYour question: " + q + "\n\nPlease consult a qualified radiologist for clinical decisions.");
}
