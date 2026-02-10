/* RIFTO app.js — FULL REPLACE
   Fixes:
   - Cards always clickable (data-hero-id + event delegation)
   - Tabs render real content (Meta/Draft/Matchup/Tierlist)
   - Lane selection updates tier badge (off-meta penalty)
*/

const state = {
  tab: "meta", // meta | draft | matchup | tierlist
  rank: "Dia+", // placeholder (future)
  lane: "All", // All | Baron | Jungle | Mid | ADC | Support
  selectedHeroId: null,
  selectedLaneForPick: "All", // lane context in modal
  enemyHeroId: null,
  search: "",
  sort: "tier", // tier | win | pick | ban
  data: {
    meta: null,       // meta.json
    tags: null,       // champ_tags.json
  },
};

const TIERS = ["SS","S","A","B","C","D"];

function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }
function laneNorm(x){ return (x||"").toString().trim().toLowerCase(); }

function tierFromScore(score){
  // score ranges in your data ~ 70..140
  if (score >= 115) return "SS";
  if (score >= 105) return "S";
  if (score >= 95)  return "A";
  if (score >= 85)  return "B";
  if (score >= 75)  return "C";
  return "D";
}
function downTier(tier, steps){
  const i = TIERS.indexOf(tier);
  if (i === -1) return tier;
  return TIERS[clamp(i + steps, 0, TIERS.length - 1)];
}

function getMainLane(heroId){
  const tags = state.data.tags;
  if (!tags) return null;
  const t = tags[String(heroId)];
  // supports either { mainLane:"Jungle" } or { main:"Jungle" }
  return t?.mainLane || t?.main || null;
}

function getLaneTier(ch, selectedLane){
  const baseTier = ch.tierGlobal || tierFromScore(ch.metaScore ?? 0);

  const main = laneNorm(getMainLane(ch.hero_id) || ch.mainLane);
  const lane = laneNorm(selectedLane);

  const isOffMeta = main && lane && main !== lane && lane !== "all";
  let penalty = 0;

  // Off-meta penalty tuned to “feel right”
  if (isOffMeta) {
    if (lane === "jungle" || lane === "adc") penalty = 2;
    else penalty = 1;
  }

  return downTier(baseTier, penalty);
}

function fmtPct(x){
  if (x === null || x === undefined || Number.isNaN(Number(x))) return "—";
  return `${Number(x).toFixed(2)}%`;
}

function bySort(list){
  const key = state.sort;
  const arr = [...list];

  const get = (c) => {
    if (key === "win") return c.stats?.CN?.win ?? 0;
    if (key === "pick") return c.stats?.CN?.pick ?? 0;
    if (key === "ban") return c.stats?.CN?.ban ?? 0;
    // tier sort: higher metaScore first
    return c.metaScore ?? 0;
  };

  arr.sort((a,b) => get(b) - get(a));
  return arr;
}

function filterList(list){
  const q = state.search.trim().toLowerCase();
  let out = list;

  if (q) {
    out = out.filter(c => (c.name||"").toLowerCase().includes(q));
  }

  if (state.lane !== "All") {
    const want = laneNorm(state.lane);
    out = out.filter(c => {
      const main = laneNorm(getMainLane(c.hero_id) || c.mainLane || "");
      return main === want;
    });
  }

  return out;
}

function computeMetaScore(c){
  // If metaScore already provided, keep it.
  if (typeof c.metaScore === "number") return c.metaScore;

  const win = Number(c.stats?.CN?.win ?? 0);
  const pick = Number(c.stats?.CN?.pick ?? 0);
  const ban = Number(c.stats?.CN?.ban ?? 0);

  // Simple but effective: win is strongest, pick/ban add “meta pressure”
  // clamp to avoid extremes
  const score =
    (win * 2.0) +
    (Math.min(pick, 30) * 1.2) +
    (Math.min(ban, 40) * 0.8);

  return Number(score.toFixed(1));
}

function enrich(meta){
  const champs = (meta?.champions || []).map(c => {
    const cc = { ...c };
    cc.hero_id = String(cc.hero_id ?? cc.heroId ?? "");
    cc.metaScore = computeMetaScore(cc);
    cc.mainLane = getMainLane(cc.hero_id) || cc.mainLane || null;
    cc.tierGlobal = tierFromScore(cc.metaScore);
    return cc;
  });

  return { ...meta, champions: champs };
}

async function loadData(){
  const [meta, tags] = await Promise.all([
    fetch("./meta.json", { cache: "no-store" }).then(r => r.json()),
    fetch("./champ_tags.json", { cache: "no-store" }).then(r => r.json()).catch(()=>null),
  ]);

  state.data.meta = enrich(meta);
  state.data.tags = tags;
}

function $(sel){ return document.querySelector(sel); }

function setActiveTab(tab){
  state.tab = tab;
  render();
}

function openModal(heroId){
  state.selectedHeroId = String(heroId);
  // default lane context: main lane if exists, else All
  const champ = getChampion(heroId);
  const main = getMainLane(heroId) || champ?.mainLane || "All";
  state.selectedLaneForPick = main || "All";
  render(); // renders modal
}

function closeModal(){
  state.selectedHeroId = null;
  render();
}

function getChampion(heroId){
  const list = state.data.meta?.champions || [];
  return list.find(c => String(c.hero_id) === String(heroId)) || null;
}

/* ---------- SMART LOGIC (simple but “feels” smart) ---------- */

// Picks that typically punish the selected champ on selected lane.
// Uses tags + "meta pressure" to prefer actually strong champs.
function smartBansForPick(pickChamp, lane){
  const list = state.data.meta?.champions || [];
  if (!pickChamp) return [];

  const pickLane = laneNorm(lane === "All" ? (getMainLane(pickChamp.hero_id) || pickChamp.mainLane || "All") : lane);
  const pickName = (pickChamp.name||"").toLowerCase();

  // Basic archetype tags from champ_tags.json if present
  const tags = state.data.tags?.[String(pickChamp.hero_id)] || {};
  const weakTo = tags.weakTo || [];     // e.g. ["hardCC","burst","invade"]
  const hates = new Set(weakTo.map(x => String(x).toLowerCase()));

  function score(enemy){
    // Base: strong meta champs on that lane
    let s = (enemy.metaScore ?? 0);

    // Prefer enemies whose main lane matches pick lane (realistic matchup)
    const eMain = laneNorm(getMainLane(enemy.hero_id) || enemy.mainLane || "");
    if (pickLane && eMain === pickLane) s += 20;
    else if (pickLane && eMain && eMain !== pickLane) s -= 10;

    // If your champ hates hard CC, boost champs tagged hardCC
    const et = state.data.tags?.[String(enemy.hero_id)] || {};
    const eTags = (et.tags || []).map(x => String(x).toLowerCase());

    if (hates.has("hardcc") && eTags.includes("hardcc")) s += 25;
    if (hates.has("burst") && eTags.includes("burst")) s += 18;
    if (hates.has("antiheal") && eTags.includes("antiheal")) s += 10;
    if (hates.has("invade") && eTags.includes("invade")) s += 14;

    // Reduce mirror / same champ
    if (String(enemy.hero_id) === String(pickChamp.hero_id)) s -= 999;

    // tiny variety
    s += (enemy.stats?.CN?.ban ?? 0) * 0.2;

    return s;
  }

  // Candidate set: mostly same-lane champs + some global top meta
  const candidates = list
    .filter(c => c.hero_id && c.name)
    .filter(c => String(c.hero_id) !== String(pickChamp.hero_id));

  const ranked = candidates
    .map(e => ({ e, s: score(e) }))
    .sort((a,b) => b.s - a.s)
    .slice(0, 3)
    .map(x => x.e);

  // Build readable reason per ban
  return ranked.map((e, idx) => {
    const eMain = getMainLane(e.hero_id) || e.mainLane || "—";
    const why = `Starker ${eMain}-Pick gegen ${pickChamp.name}`;
    return { idx: idx+1, champ: e, why };
  });
}

// Very simple matchup grading (placeholder for later deeper logic)
function matchupGrade(a, b){
  if (!a || !b) return { grade: "—", text: "Wähle beide Champs" };
  // if enemy is higher metaScore, assume harder
  const diff = (b.metaScore ?? 0) - (a.metaScore ?? 0);
  if (diff >= 20) return { grade: "🔴 Schwer", text: `${b.name} ist aktuell deutlich stärker in der Meta.` };
  if (diff >= 8)  return { grade: "🟡 Spielbar", text: `${b.name} ist etwas stärker – spiel safe bis Items.` };
  return { grade: "🟢 Gut", text: `${a.name} kann ${b.name} gut handeln, wenn du sauber spielst.` };
}

/* ---------- RENDER ---------- */

function render(){
  const root = $("#app");
  if (!root) return;

  const meta = state.data.meta;
  if (!meta) {
    root.innerHTML = `<div style="padding:24px;color:#cbd5ff">Lade Daten…</div>`;
    return;
  }

  const champsAll = meta.champions || [];
  const champs = bySort(filterList(champsAll));

  root.innerHTML = `
    ${renderTopBar(meta)}
    ${renderTabs()}
    <main class="main">
      ${state.tab === "meta" ? renderMetaView(champs) : ""}
      ${state.tab === "draft" ? renderDraftView(champsAll) : ""}
      ${state.tab === "matchup" ? renderMatchupView(champsAll) : ""}
      ${state.tab === "tierlist" ? renderTierlistView(champsAll) : ""}
    </main>
    ${state.selectedHeroId ? renderModal() : ""}
  `;
}

function renderTopBar(meta){
  const patch = meta.patch || "—";
  const updated = meta.lastUpdated || "—";
  return `
    <header class="topbar">
      <div class="brand">
        <div class="logo">RIFTO</div>
        <div class="sub">Wild Rift – Draft Helper</div>
      </div>
      <div class="metaPills">
        <span class="pill">Patch: ${escapeHtml(patch)}</span>
        <span class="pill">Update: ${escapeHtml(updated)}</span>
      </div>
    </header>
  `;
}

function renderTabs(){
  const t = state.tab;
  return `
    <nav class="tabs">
      <button class="tab ${t==="meta"?"active":""}" data-tab="meta">META</button>
      <button class="tab ${t==="draft"?"active":""}" data-tab="draft">DRAFT</button>
      <button class="tab ${t==="matchup"?"active":""}" data-tab="matchup">MATCHUP</button>
      <button class="tab ${t==="tierlist"?"active":""}" data-tab="tierlist">TIERLIST</button>
    </nav>
  `;
}

function renderMetaView(champs){
  return `
    <section class="panel">
      <div class="panelHeader">
        <h2>Champions</h2>
        <div class="controls">
          <input class="search" placeholder="Champion suchen…" value="${escapeAttr(state.search)}" data-action="search"/>
          <select class="select" data-action="sort">
            <option value="tier" ${state.sort==="tier"?"selected":""}>Sort: Tier</option>
            <option value="win" ${state.sort==="win"?"selected":""}>Sort: Winrate</option>
            <option value="pick" ${state.sort==="pick"?"selected":""}>Sort: Pickrate</option>
            <option value="ban" ${state.sort==="ban"?"selected":""}>Sort: Banrate</option>
          </select>
          <select class="select" data-action="lane">
            ${["All","Baron","Jungle","Mid","ADC","Support"].map(l=>`<option value="${l}" ${state.lane===l?"selected":""}>${l}</option>`).join("")}
          </select>
        </div>
      </div>

      <div id="grid" class="grid">
        ${champs.map(renderCard).join("")}
      </div>
    </section>
  `;
}

function renderCard(c){
  const main = getMainLane(c.hero_id) || c.mainLane || "—";
  const tier = c.tierGlobal || tierFromScore(c.metaScore ?? 0);

  const win = c.stats?.CN?.win;
  const pick = c.stats?.CN?.pick;
  const ban = c.stats?.CN?.ban;

  return `
    <button class="card" type="button" data-hero-id="${escapeAttr(c.hero_id)}" aria-label="${escapeAttr(c.name)}">
      <div class="cardTop">
        <img class="icon" src="${escapeAttr(c.icon)}" alt="${escapeAttr(c.name)}"/>
        <div class="cardName">
          <div class="nameRow">
            <div class="name">${escapeHtml(c.name)}</div>
            <span class="tierBadge">${tier}</span>
          </div>
          <div class="laneText">Main: ${escapeHtml(main)}</div>
        </div>
      </div>

      <div class="cardStats">
        <div class="statBox"><div class="k">Win</div><div class="v">${fmtPct(win)}</div></div>
        <div class="statBox"><div class="k">Pick</div><div class="v">${fmtPct(pick)}</div></div>
        <div class="statBox"><div class="k">Ban</div><div class="v">${fmtPct(ban)}</div></div>
      </div>
    </button>
  `;
}

function renderDraftView(all){
  const pick = state.selectedHeroId ? getChampion(state.selectedHeroId) : null;
  if (!pick) {
    return `
      <section class="panel">
        <h2>Draft</h2>
        <div class="hint">Wähle zuerst einen Champion (Tab META) – dann siehst du Smart Ban & Empfehlungen.</div>
      </section>
    `;
  }

  const lane = state.selectedLaneForPick === "All" ? (getMainLane(pick.hero_id) || pick.mainLane || "All") : state.selectedLaneForPick;
  const bans = smartBansForPick(pick, lane);

  return `
    <section class="panel">
      <h2>Draft</h2>
      <div class="draftBox">
        <div class="draftPick">
          <img class="iconBig" src="${escapeAttr(pick.icon)}" alt="${escapeAttr(pick.name)}"/>
          <div>
            <div class="draftTitle">${escapeHtml(pick.name)}</div>
            <div class="draftSub">Lane: ${escapeHtml(lane)}</div>
          </div>
        </div>

        <h3>Smart Ban (Top 3)</h3>
        <div class="banList">
          ${bans.map(b => `
            <button class="banRow" type="button" data-hero-id="${escapeAttr(b.champ.hero_id)}">
              <span class="banNum">${b.idx}</span>
              <img class="icon" src="${escapeAttr(b.champ.icon)}" alt="${escapeAttr(b.champ.name)}"/>
              <div class="banText">
                <div class="banName">${escapeHtml(b.champ.name)} <span class="tierSmall">${b.champ.tierGlobal}</span></div>
                <div class="banWhy">${escapeHtml(b.why)}</div>
              </div>
            </button>
          `).join("")}
        </div>
      </div>
    </section>
  `;
}

function renderMatchupView(all){
  const pick = state.selectedHeroId ? getChampion(state.selectedHeroId) : null;
  const enemy = state.enemyHeroId ? getChampion(state.enemyHeroId) : null;
  const m = matchupGrade(pick, enemy);

  return `
    <section class="panel">
      <h2>Matchup</h2>
      <div class="matchupGrid">
        <div class="matchCol">
          <div class="hintSmall">Dein Champ</div>
          ${pick ? renderTinyPick(pick) : `<div class="hint">Wähle deinen Champion im META Tab.</div>`}
        </div>

        <div class="matchCol">
          <div class="hintSmall">Gegner</div>
          ${enemy ? renderTinyPick(enemy) : `<div class="hint">Klicke auf einen Champion (oder Smart Ban) als Gegner.</div>`}
        </div>

        <div class="matchResult">
          <div class="grade">${m.grade}</div>
          <div class="gradeText">${escapeHtml(m.text)}</div>
        </div>
      </div>
    </section>
  `;
}

function renderTinyPick(c){
  return `
    <div class="tinyPick">
      <img class="icon" src="${escapeAttr(c.icon)}" alt="${escapeAttr(c.name)}"/>
      <div>
        <div class="tinyName">${escapeHtml(c.name)} <span class="tierSmall">${c.tierGlobal}</span></div>
        <div class="tinySub">Main: ${escapeHtml(getMainLane(c.hero_id) || c.mainLane || "—")}</div>
      </div>
      <button class="ghostBtn" type="button" data-action="setEnemy" data-hero-id="${escapeAttr(c.hero_id)}">als Gegner</button>
    </div>
  `;
}

function renderTierlistView(all){
  const grouped = {
    Baron: [], Jungle: [], Mid: [], ADC: [], Support: []
  };
  for (const c of all) {
    const lane = getMainLane(c.hero_id) || c.mainLane || "";
    const ln = laneNorm(lane);
    if (ln.includes("baron")) grouped.Baron.push(c);
    else if (ln.includes("jungle")) grouped.Jungle.push(c);
    else if (ln.includes("mid")) grouped.Mid.push(c);
    else if (ln.includes("adc")) grouped.ADC.push(c);
    else if (ln.includes("support")) grouped.Support.push(c);
  }

  const lanes = ["Baron","Jungle","Mid","ADC","Support"];
  return `
    <section class="panel">
      <h2>Tierlist</h2>
      <div class="hintSmall">Klick auf einen Champ öffnet Details. (Lane-Tier kommt als nächstes, wenn wir Lane-Stats haben)</div>
      <div class="tierCols">
        ${lanes.map(L => {
          const list = bySort(grouped[L]).slice(0, 20);
          return `
            <div class="tierCol">
              <div class="tierColTitle">${L}</div>
              ${list.map(c => `
                <button class="tierRow" type="button" data-hero-id="${escapeAttr(c.hero_id)}">
                  <img class="icon" src="${escapeAttr(c.icon)}" alt="${escapeAttr(c.name)}"/>
                  <span class="tierRowName">${escapeHtml(c.name)}</span>
                  <span class="tierSmall">${c.tierGlobal}</span>
                </button>
              `).join("")}
            </div>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function renderModal(){
  const champ = getChampion(state.selectedHeroId);
  if (!champ) return "";

  const main = getMainLane(champ.hero_id) || champ.mainLane || "All";
  const lane = state.selectedLaneForPick;
  const laneForTier = lane === "All" ? main : lane;
  const tier = getLaneTier(champ, laneForTier);

  const isOffMeta = laneNorm(laneForTier) !== laneNorm(main) && laneForTier !== "All";

  const bans = smartBansForPick(champ, laneForTier);

  return `
    <div class="modalOverlay" data-action="closeModal">
      <div class="modal" role="dialog" aria-modal="true" aria-label="Champion Details" data-stop>
        <button class="modalClose" type="button" data-action="closeModal">×</button>

        <div class="modalTop">
          <img class="iconBig" src="${escapeAttr(champ.icon)}" alt="${escapeAttr(champ.name)}"/>
          <div class="modalTitle">
            <div class="titleRow">
              <div class="title">${escapeHtml(champ.name)}</div>
              <span class="tierBadge">${tier}</span>
            </div>

            <div class="pillRow">
              <span class="pill">Main: ${escapeHtml(main)}</span>
              <span class="pill">Lane: ${escapeHtml(laneForTier)}</span>
              ${isOffMeta ? `<span class="pill warn">Off-meta</span>` : ``}
            </div>

            <div class="lanePickerRow">
              <label class="laneLabel">Lane</label>
              <select class="select" data-action="pickLane">
                ${["All","Baron","Jungle","Mid","ADC","Support"].map(l=>`<option value="${l}" ${lane===l?"selected":""}>${l}</option>`).join("")}
              </select>
            </div>
          </div>
        </div>

        <div class="modalStats">
          <div class="statBox"><div class="k">Winrate</div><div class="v">${fmtPct(champ.stats?.CN?.win)}</div></div>
          <div class="statBox"><div class="k">Pickrate</div><div class="v">${fmtPct(champ.stats?.CN?.pick)}</div></div>
          <div class="statBox"><div class="k">Banrate</div><div class="v">${fmtPct(champ.stats?.CN?.ban)}</div></div>
        </div>

        <div class="modalSection">
          <h3>Smart Ban (Top 3)</h3>
          <div class="banList">
            ${bans.map(b => `
              <button class="banRow" type="button" data-action="setEnemy" data-hero-id="${escapeAttr(b.champ.hero_id)}">
                <span class="banNum">${b.idx}</span>
                <img class="icon" src="${escapeAttr(b.champ.icon)}" alt="${escapeAttr(b.champ.name)}"/>
                <div class="banText">
                  <div class="banName">${escapeHtml(b.champ.name)} <span class="tierSmall">${getLaneTier(b.champ, getMainLane(b.champ.hero_id)||b.champ.mainLane||"All")}</span></div>
                  <div class="banWhy">${escapeHtml(b.why)}</div>
                </div>
                <span class="ghostTag">als Gegner</span>
              </button>
            `).join("")}
          </div>
          <div class="hintSmall">Tipp: Klick auf einen Ban setzt ihn im MATCHUP als Gegner.</div>
        </div>
      </div>
    </div>
  `;
}

/* ---------- EVENTS ---------- */

// Tabs
document.addEventListener("click", (e) => {
  const tabBtn = e.target.closest("[data-tab]");
  if (tabBtn) {
    setActiveTab(tabBtn.dataset.tab);
    return;
  }

  // Close modal click on overlay (but not inside modal)
  const actionEl = e.target.closest("[data-action]");
  if (actionEl) {
    const act = actionEl.dataset.action;

    if (act === "closeModal") {
      // only close if clicked overlay or close button
      if (e.target.classList.contains("modalOverlay") || actionEl.classList.contains("modalClose")) {
        closeModal();
      }
      return;
    }

    if (act === "setEnemy") {
      const heroId = actionEl.dataset.heroId || actionEl.getAttribute("data-hero-id");
      if (heroId) {
        state.enemyHeroId = String(heroId);
        state.tab = "matchup";
        render();
      }
      return;
    }
  }

  // MAIN FIX: Champion cards always clickable (Event Delegation)
  const card = e.target.closest("button.card[data-hero-id], button.tierRow[data-hero-id], button.banRow[data-hero-id]");
  if (card) {
    const heroId = card.dataset.heroId || card.getAttribute("data-hero-id");
    if (heroId) {
      openModal(heroId);
    }
  }
});

// Prevent overlay clicks from closing when inside modal
document.addEventListener("click", (e) => {
  if (e.target && e.target.hasAttribute("data-stop")) {
    e.stopPropagation();
  }
}, true);

// Inputs / selects
document.addEventListener("input", (e) => {
  const el = e.target;
  if (!el) return;

  if (el.matches('input[data-action="search"]')) {
    state.search = el.value || "";
    render();
  }
});

document.addEventListener("change", (e) => {
  const el = e.target;
  if (!el) return;

  if (el.matches('select[data-action="sort"]')) {
    state.sort = el.value;
    render();
    return;
  }
  if (el.matches('select[data-action="lane"]')) {
    state.lane = el.value;
    render();
    return;
  }
  if (el.matches('select[data-action="pickLane"]')) {
    state.selectedLaneForPick = el.value;
    render();
    return;
  }
});

/* ---------- HELPERS ---------- */

function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function escapeAttr(s){ return escapeHtml(s); }

/* ---------- BOOT ---------- */

(async function boot(){
  await loadData();
  render();
})();