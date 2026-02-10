// RIFTO robust app.js (self-healing DOM + clear logs)

const state = {
  champs: [],
  meta: {},
  selectedChamp: ""
};

function $(id) {
  return document.getElementById(id);
}

function ensureRoot() {
  // We try to find existing containers by common IDs.
  // If they don't exist, we create a minimal UI so the page always reacts.
  let select = $("champSelect") || $("championSelect") || $("champ-select");
  let smart = $("smartBan") || $("smart-ban") || $("smartban");
  let tier = $("tierList") || $("tier-list") || $("tierlist");

  const host = document.querySelector("main") || document.body;

  if (!select) {
    const wrap = document.createElement("div");
    wrap.style.margin = "12px 0";
    wrap.innerHTML = `
      <label style="display:block;opacity:.9;margin-bottom:6px;">Champion wählen</label>
      <select id="champSelect" style="width:100%;padding:10px;border-radius:12px;"></select>
    `;
    host.prepend(wrap);
    select = $("champSelect");
    console.log("[RIFTO] champSelect created");
  } else if (!select.id) {
    select.id = "champSelect";
  } else if (select.id !== "champSelect") {
    // normalize to our ID
    select.id = "champSelect";
  }

  if (!smart) {
    smart = document.createElement("div");
    smart.id = "smartBan";
    smart.style.marginTop = "16px";
    host.appendChild(smart);
    console.log("[RIFTO] smartBan created");
  } else if (smart.id !== "smartBan") {
    smart.id = "smartBan";
  }

  if (!tier) {
    tier = document.createElement("div");
    tier.id = "tierList";
    tier.style.marginTop = "16px";
    host.appendChild(tier);
    console.log("[RIFTO] tierList created");
  } else if (tier.id !== "tierList") {
    tier.id = "tierList";
  }

  return { select, smart, tier };
}

async function loadJSON(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${res.statusText}`);
  return await res.json();
}

function calcMetaScore(s = {}) {
  const win = Number(s.win ?? 0);
  const pick = Number(s.pick ?? 0);
  const ban = Number(s.ban ?? 0);
  if (!win && !pick && !ban) return 0;
  return (win * 0.55) + (pick * 0.25) + (ban * 0.20);
}

function renderSelect() {
  const select = $("champSelect");
  if (!select) return;

  select.innerHTML = `<option value="">Champion wählen…</option>`;
  state.champs.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.name;
    opt.textContent = c.name;
    select.appendChild(opt);
  });

  // IMPORTANT: bind change handler
  select.onchange = (e) => {
    state.selectedChamp = e.target.value;
    console.log("[RIFTO] Selected:", state.selectedChamp);
    renderSmartBan();
  };
}

function renderTierList() {
  const box = $("tierList");
  if (!box) return;

  const sorted = [...state.champs].sort((a, b) => (b.metaScore || 0) - (a.metaScore || 0));

  box.innerHTML = `
    <h3 style="margin:0 0 10px 0;">Tier List (MetaScore)</h3>
    <div style="display:grid;gap:8px;">
      ${sorted.slice(0, 60).map(c => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);">
          <span><strong>${c.name}</strong></span>
          <span style="opacity:.85;">${(c.metaScore || 0).toFixed(1)}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function renderSmartBan() {
  const box = $("smartBan");
  if (!box) return;

  if (!state.selectedChamp) {
    box.innerHTML = `<h3 style="margin:0 0 10px 0;">Smart Ban</h3><div style="opacity:.85;">Wähle zuerst einen Champion.</div>`;
    return;
  }

  // Very first version: ban value = ban% + pick% + win% weight
  const scored = state.champs
    .filter(c => c.name !== state.selectedChamp)
    .map(c => {
      const win = Number(c.win ?? 0);
      const pick = Number(c.pick ?? 0);
      const ban = Number(c.ban ?? 0);
      const score = (ban * 1.0) + (pick * 0.8) + (Math.max(0, win - 50) * 1.2);
      return { ...c, smartScore: score };
    })
    .sort((a, b) => b.smartScore - a.smartScore)
    .slice(0, 5);

  box.innerHTML = `
    <h3 style="margin:0 0 10px 0;">Smart Ban gegen ${state.selectedChamp}</h3>
    <div style="display:grid;gap:8px;">
      ${scored.map(c => `
        <div style="padding:10px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <strong>${c.name}</strong>
            <span style="opacity:.85;">Score ${c.smartScore.toFixed(1)}</span>
          </div>
          <div style="opacity:.85;margin-top:6px;font-size:13px;">
            Win: ${c.win ?? "—"}% · Pick: ${c.pick ?? "—"}% · Ban: ${c.ban ?? "—"}%
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

async function init() {
  console.log("[RIFTO] init start");
  ensureRoot();

  let wrList, meta;

  try {
    [wrList, meta] = await Promise.all([
      loadJSON("wr_champions.json"),
      loadJSON("meta.json"),
    ]);
  } catch (e) {
    console.error("[RIFTO] load error:", e);
    // Still render select with empty list so you see something
    state.champs = [];
    renderSelect();
    renderTierList();
    renderSmartBan();
    return;
  }

  state.meta = meta;

  // Accept both schemas:
  // A) meta.statsByName = { "Fiora": {win,pick,ban}, ... }
  // B) meta.champions = [{name, stats:{CN:{win,pick,ban}}}, ...]
  const statsByName = meta.statsByName || {};
  const championsArray = Array.isArray(meta.champions) ? meta.champions : [];

  function getStatsFor(name) {
    if (statsByName[name]) return statsByName[name];
    const found = championsArray.find(x => x && x.name === name);
    if (found?.stats?.CN) return found.stats.CN;
    if (found?.stats?.DIA) return found.stats.DIA;
    return {};
  }

  state.champs = (Array.isArray(wrList) ? wrList : []).map(name => {
    const s = getStatsFor(name);
    const win = s.win ?? null;
    const pick = s.pick ?? null;
    const ban = s.ban ?? null;
    return { name, win, pick, ban, metaScore: calcMetaScore({ win, pick, ban }) };
  });

  console.log("[RIFTO] champs loaded:", state.champs.length);

  renderSelect();
  renderTierList();
  renderSmartBan();
}

document.addEventListener("DOMContentLoaded", init);
