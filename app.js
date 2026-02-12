(() => {
  const $ = (id) => document.getElementById(id);

  const patchPill = $("patchPill");
  const updatePill = $("updatePill");
  const trendPill = $("trendPill");

  const tabBtns = Array.from(document.querySelectorAll(".tab"));
  const topbar = document.querySelector(".topbar");
  const tabsNav = document.querySelector(".tabs");
  const viewMeta = $("viewMeta");
  const viewDraft = $("viewDraft");
  const viewMatchup = $("viewMatchup");
  const viewTierlist = $("viewTierlist");

  const grid = $("grid");
  const statusEl = $("status");
  const searchEl = $("search");
  const sortEl = $("sort");

  // META modal
  const modal = $("champModal");
  const modalClose = $("modalClose");
  const modalIcon = $("modalIcon");
  const modalName = $("modalName");
  const modalId = $("modalId");
  const modalTier = $("modalTier");
  const offRole = $("offRole");
  const modalWin = $("modalWin");
  const modalPick = $("modalPick");
  const modalBan = $("modalBan");
  const modalBans = $("modalBans");
  const modalCounters = $("modalCounters");
  const modalRoleSelect = $("modalRoleSelect");
  const modalTrendHint = $("modalTrendHint");

  // DRAFT
  const btnPickMe = $("btnPickMe");
  const draftRole = $("draftRole");
  const myPickCard = $("myPickCard");
  const enemySlot1 = $("enemySlot1");
  const enemySlot2 = $("enemySlot2");
  const draftBans = $("draftBans");
  const draftContext = $("draftContext");
  const draftSignals = $("draftSignals");
  const coachMode = $("coachMode");
  const riskProfile = $("riskProfile");
  const patchWeight = $("patchWeight");
  const patchWeightValue = $("patchWeightValue");
  const autoCoachOutput = $("autoCoachOutput");
  const draftGuide = $("draftGuide");
  const btnSmartSetup = $("btnSmartSetup");
  const btnClearEnemies = $("btnClearEnemies");
  const btnResetDraft = $("btnResetDraft");
  const phaseBtns = Array.from(document.querySelectorAll(".phase"));

  // MATCHUP + TIERLIST
  const matchupChampA = $("matchupChampA");
  const matchupChampB = $("matchupChampB");
  const matchupRole = $("matchupRole");
  const matchupResults = $("matchupResults");
  const tierlistRole = $("tierlistRole");
  const tierlistSections = $("tierlistSections");

  // Picker
  const picker = $("picker");
  const pickerClose = $("pickerClose");
  const pickerSearch = $("pickerSearch");
  const pickerGrid = $("pickerGrid");
  const modalCard = modal?.querySelector(".modalCard");
  const pickerCard = picker?.querySelector(".modalCard");

  const HERO_LIST_URL = "https://game.gtimg.cn/images/lgamem/act/lrlib/js/heroList/hero_list.js";

  let allChamps = [];
  let heroDb = {};
  let tagDb = {};
  let defaultWeakByRole = {};

  let risingTypes = new Set();
  let fallingTypes = new Set();
  let trendText = "–";

  // Draft state (persisted)
  let draftPhase = "auto";
  let myPickName = null;
  let enemy1 = null;
  let enemy2 = null;
  let coachLevel = "beginner";
  let riskMode = "balanced";
  let patchItemFocus = 55;
  let pickTarget = "me";
  let modalTriggerEl = null;
  let pickerTriggerEl = null;

  const TAG_LABEL = {
    assassin_burst: "Assassin",
    assassin_reset: "Assassin",
    hard_engage: "Engage",
    pointclick_cc: "Point&Click CC",
    hard_cc: "CC",
    anti_auto: "Anti-Autoattacks",
    anti_tank: "Anti-Tank",
    true_damage: "True Damage",
    poke: "Poke",
    mage_poke: "Poke",
    mage_burst: "Burst Mage",
    mage_control: "Control Mage",
    lane_bully: "Lane Bully",
    dive: "Dive",
    tank: "Tank",
    fighter: "Fighter",
    kite_poke: "Poke"
  };

  const ENEMY_SYNERGY_TO_BAN_TYPES = {
    hard_engage: ["assassin_burst", "pointclick_cc", "hard_cc"],
    pointclick_cc: ["assassin_burst", "mage_burst"],
    assassin_burst: ["pointclick_cc", "hard_cc"],
    tank: ["true_damage", "anti_tank"],
    poke: ["hard_engage", "assassin_burst"]
  };

  const PATCH_ITEM_PRESSURE = {
    anti_auto: 8,
    pointclick_cc: 7,
    hard_cc: 6,
    anti_tank: 6,
    true_damage: 6,
    assassin_burst: 5,
    hard_engage: 5,
    lane_bully: 4,
    poke: 4,
    mage_burst: 3
  };

  function setDialogFocus(target) {
    if (!target) return;
    if (typeof target.focus === "function") target.focus();
  }

  function restoreFocus(el) {
    if (!el || typeof el.focus !== "function") return;
    el.focus();
  }

  function labelTag(t){ return TAG_LABEL[t] || t; }

  function fmtPct(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return "–";
    return `${n.toFixed(2)}%`;
  }

  function metaScore(c) {
    const win = Number(c.stats?.CN?.win ?? 0);
    const pick = Number(c.stats?.CN?.pick ?? 0);
    const ban = Number(c.stats?.CN?.ban ?? 0);
    return (win * 1.2) + (pick * 0.9) + (ban * 0.5);
  }

  function normalizeMeta(meta) {
    const champs = Array.isArray(meta.champions) ? meta.champions : [];
    return champs.map((c) => ({
      hero_id: String(c.hero_id ?? ""),
      name: String(c.name ?? "Unknown"),
      icon: String(c.icon ?? ""),
      stats: c.stats ?? { CN: { win: 0, pick: 0, ban: 0 } },
    }));
  }

  function getChampionByName(name) {
    if (!name) return null;
    const n = String(name).toLowerCase();
    return allChamps.find(c => c.name.toLowerCase() === n) || null;
  }

  function heroInfo(hero_id) {
    return heroDb?.[String(hero_id)] || null;
  }

  function rolesForHero(hero_id) {
    const h = heroInfo(hero_id);
    const out = new Set();
    if (!h) return [];
    const lane = String(h.lane ?? "").toLowerCase();
    const roles = Array.isArray(h.roles) ? h.roles.map(r => String(r).toLowerCase()) : [];

    if (lane.includes("打野")) out.add("Jungle");
    if (lane.includes("中路")) out.add("Mid");
    if (lane.includes("下路")) out.add("ADC");
    if (lane.includes("辅助")) out.add("Support");
    if (lane.includes("单人") || lane.includes("上路")) out.add("Baron");

    for (const r of roles) {
      if (r.includes("射手")) out.add("ADC");
      if (r.includes("辅助")) out.add("Support");
      if (r.includes("法师")) out.add("Mid");
      if (r.includes("刺客")) out.add("Jungle");
      if (r.includes("战士") || r.includes("坦克")) out.add("Baron");
    }
    return Array.from(out);
  }

  // Main role badge (compact) shown on champion cards.
  // Uses the first detected role as "main".
  function mainRoleForHero(hero_id) {
    const roles = rolesForHero(hero_id);
    return roles[0] || "";
  }

  function roleShort(role) {
    if (role === "Jungle") return "JGL";
    if (role === "Mid") return "MID";
    if (role === "ADC") return "ADC";
    if (role === "Support") return "SUP";
    if (role === "Baron") return "TOP";
    return role ? role.toUpperCase().slice(0, 3) : "";
  }

  function roleBadgeHTML(role) {
    if (!role) return "";
    const key = role.toLowerCase();
    return `<span class="laneBadge lane-${key}">${roleShort(role)}</span>`;
  }

  function thresholdsForRole(role) {
    const pool = allChamps.filter(c => rolesForHero(c.hero_id).includes(role));
    const list = (pool.length ? pool : allChamps).map(c => metaScore(c)).sort((a,b)=>b-a);
    const q = (p) => list[Math.floor(p * (list.length-1))] ?? 0;
    return { ss: q(0.05), s: q(0.15), a: q(0.35), b: q(0.65) };
  }

  function tierForScore(score, th) {
    if (score >= th.ss) return "SS";
    if (score >= th.s) return "S";
    if (score >= th.a) return "A";
    if (score >= th.b) return "B";
    return "C";
  }
  function tierClass(tier) {
    return tier === "SS" ? "tierSS" : tier === "S" ? "tierS" : tier === "A" ? "tierA" : tier === "B" ? "tierB" : "tierC";
  }

  function champTypes(name) {
    const t = tagDb?.[name]?.type;
    return Array.isArray(t) ? t : [];
  }

  function pickedWeakVs(pickedName, role) {
    const explicit = tagDb?.[pickedName]?.weak_vs;
    if (Array.isArray(explicit) && explicit.length) return explicit;
    return defaultWeakByRole?.[role]?.weak_vs || [];
  }

  // Trend snapshot (global)
  function computeTypeStrength() {
    const strength = {};
    const count = {};
    for (const c of allChamps) {
      const types = champTypes(c.name);
      if (!types.length) continue;
      const ms = metaScore(c);
      for (const t of types) {
        strength[t] = (strength[t] || 0) + ms;
        count[t] = (count[t] || 0) + 1;
      }
    }
    for (const t of Object.keys(strength)) strength[t] = strength[t] / Math.max(1, count[t]);
    return strength;
  }
  function loadPrevSnapshot() {
    try { return JSON.parse(localStorage.getItem("rifto_type_snapshot") || "null"); } catch { return null; }
  }
  function saveSnapshot(strength) {
    try { localStorage.setItem("rifto_type_snapshot", JSON.stringify({ ts: Date.now(), strength })); } catch {}
  }
  function formatTrend(rise, fall) {
    const up = rise.length ? `${labelTag(rise[0])} ↑` : "";
    const down = fall.length ? `${labelTag(fall[0])} ↓` : "";
    return [up, down].filter(Boolean).join(" • ") || "–";
  }
  function updateTrends() {
    const current = computeTypeStrength();
    const prev = loadPrevSnapshot();
    risingTypes = new Set();
    fallingTypes = new Set();
    trendText = "–";

    if (prev && prev.strength) {
      const deltas = [];
      for (const t of Object.keys(current)) {
        if (prev.strength[t] === undefined) continue;
        deltas.push({ t, d: current[t] - prev.strength[t] });
      }
      deltas.sort((a,b)=>b.d-a.d);
      const rise = deltas.filter(x=>x.d>0).slice(0,3);
      const fall = deltas.filter(x=>x.d<0).slice(-3);
      for (const r of rise) risingTypes.add(r.t);
      for (const f of fall) fallingTypes.add(f.t);
      trendText = formatTrend(rise.map(x=>x.t), fall.map(x=>x.t));
    }
    trendPill.textContent = `Trend: ${trendText}`;
    modalTrendHint.textContent = `Trend: ${trendText}`;
    saveSnapshot(current);
  }

  function baseThreatScore(c) {
    const win = Number(c.stats?.CN?.win ?? 0);
    const pick = Number(c.stats?.CN?.pick ?? 0);
    const ban = Number(c.stats?.CN?.ban ?? 0);
    return (ban*1.0) + (pick*0.7) + (win*0.5) + (metaScore(c)*0.05);
  }

  function phaseWeights(phase) {
    if (phase === "enemy_fp") return { meta: 1.2, counter: 0.8, enemy: 0.9 };
    if (phase === "my_fp")    return { meta: 0.8, counter: 1.4, enemy: 0.9 };
    if (phase === "mid")      return { meta: 1.0, counter: 1.1, enemy: 1.2 };
    if (phase === "late")     return { meta: 0.9, counter: 1.2, enemy: 1.3 };
    return { meta: 1.0, counter: 1.0, enemy: 1.0 };
  }

  function effectiveDraftPhase() {
    if (draftPhase !== "auto") return draftPhase;
    const enemyCount = [enemy1, enemy2].filter(Boolean).length;
    if (enemyCount === 0) return "enemy_fp";
    if (enemyCount === 1) return "my_fp";
    return "mid";
  }

  function phaseLabel(phase) {
    if (phase === "enemy_fp") return "🟢 Frühe Bans";
    if (phase === "my_fp") return "🟡 Du pickst früh";
    if (phase === "mid") return "🟡 Team ergänzt";
    if (phase === "late") return "🔴 Letzte Bans";
    return "⚡ Auto";
  }

  function enemyThreatTypes() {
    const types = new Set();
    for (const n of [enemy1, enemy2]) {
      if (!n) continue;
      for (const t of champTypes(n)) types.add(t);
    }
    return types;
  }
  function enemySynergyBanTypes() {
    const out = new Set();
    const types = enemyThreatTypes();
    for (const t of types) {
      const arr = ENEMY_SYNERGY_TO_BAN_TYPES[t];
      if (!arr) continue;
      for (const x of arr) out.add(x);
    }
    return out;
  }
  function enemySynergyScore(candidateName) {
    const wanted = enemySynergyBanTypes();
    if (!wanted.size) return 0;
    const types = champTypes(candidateName);
    let hits = 0;
    for (const w of wanted) if (types.includes(w)) hits++;
    return hits * 10;
  }

  function patchItemPressureScore(candidateName) {
    const types = champTypes(candidateName);
    let score = 0;
    for (const t of types) score += PATCH_ITEM_PRESSURE[t] || 0;
    const focusBoost = patchItemFocus / 100;
    return score * focusBoost;
  }

  function riskMultiplier() {
    if (riskMode === "safe") return 0.88;
    if (riskMode === "aggressive") return 1.12;
    return 1.0;
  }

  function confidenceFor(score, patchSignal, enemySignal) {
    const normalized = Math.max(0, Math.min(100, score / 2.4));
    const confidence = Math.round((normalized * 0.6) + (patchSignal * 0.25) + (enemySignal * 0.15));
    return Math.max(35, Math.min(97, confidence));
  }

  function tagFromTypes(types = []) {
    for (const t of types) {
      if (t === "anti_auto" || t === "pointclick_cc") return "Stoppt Hyper-Carrys";
      if (t === "anti_tank" || t === "true_damage") return "Stark vs Frontline";
      if (t === "assassin_burst") return "One-Shot Threat";
      if (t === "hard_engage") return "Engage Druck";
      if (t === "lane_bully") return "Lane Dominanz";
    }
    return "Meta Gefahr";
  }

  function tagMatchScore(pickedName, role, candidateName) {
    const weaknesses = pickedWeakVs(pickedName, role);
    const types = champTypes(candidateName);
    let hits = 0;
    for (const w of weaknesses) if (types.includes(w)) hits++;

    let bonus = hits * 18;
    for (const w of weaknesses) {
      if (types.includes(w) && risingTypes.has(w)) bonus += 8;
      if (types.includes(w) && fallingTypes.has(w)) bonus -= 4;
    }
    return bonus;
  }

  function roleFilterPool(role, excludeHeroId) {
    const pool = allChamps.filter(c => c.hero_id !== excludeHeroId);
    const rolePool = pool.filter(c => rolesForHero(c.hero_id).includes(role));
    return rolePool.length ? rolePool : pool;
  }

  function buildReasonAgainstMyChamp(myName, role, banName) {
    const weak = pickedWeakVs(myName, role);
    const banTypes = champTypes(banName);

    for (const w of weak) {
      if (banTypes.includes(w)) {
        if (w === "anti_auto") return `Kontert ${myName} durch Anti-Autoattacks`;
        if (w === "pointclick_cc") return `Hält ${myName} mit Point&Click CC fest`;
        if (w === "assassin_burst") return `Assassin: tötet ${myName} sehr schnell`;
        if (w === "hard_engage") return `Engage + CC macht ${myName} angreifbar`;
        return `Gefährlich für ${myName}: ${labelTag(w)}`;
      }
    }

    const wanted = enemySynergyBanTypes();
    for (const w of wanted) {
      if (banTypes.includes(w)) return `Passt zu Enemy Picks – gefährlich für ${myName}`;
    }

    return `Starker ${role}-Pick gegen ${myName}`;
  }

  function smartBansForRole(picked, role, limit=3) {
    const candidates = roleFilterPool(role, picked.hero_id);
    const th = thresholdsForRole(role);
    const scored = candidates.map(c => {
      const score = baseThreatScore(c) + tagMatchScore(picked.name, role, c.name);
      return { name: c.name, icon: c.icon, score, why: buildReasonAgainstMyChamp(picked.name, role, c.name), tier: tierForScore(metaScore(c), th) };
    }).sort((a,b)=>b.score-a.score);

    const out = [];
    const seen = new Set();
    for (const x of scored) {
      if (seen.has(x.name)) continue;
      seen.add(x.name);
      out.push(x);
      if (out.length === limit) break;
    }
    return out;
  }

  function renderCounterList(targetEl, list) {
    targetEl.innerHTML = "";
    for (const c of list) {
      const el = document.createElement("div");
      el.className = "counterItem";
      el.innerHTML = `
        <img class="cIcon" src="${c.icon}" alt="${c.name}" loading="lazy" />
        <div class="cMain">
          <div class="cName">${c.name} <span class="tierBadge ${tierClass(c.tier)}" style="margin-left:8px">${c.tier}</span></div>
          <div class="cWhy">${c.why}${c.tag ? ` • ${c.tag}` : ""}${Number.isFinite(c.confidence) ? ` • Confidence ${c.confidence}%` : ""}</div>
        </div>
      `;
      targetEl.appendChild(el);
    }
  }

  function openMetaModal(champ) {
    modalTriggerEl = document.activeElement;
    modalIcon.src = champ.icon;
    modalIcon.alt = champ.name;
    modalName.textContent = champ.name;
    const roles = rolesForHero(champ.hero_id);
    modalId.textContent = roles.length ? roles.join(" • ") : "–";

    modalWin.textContent = fmtPct(champ.stats?.CN?.win ?? null);
    modalPick.textContent = fmtPct(champ.stats?.CN?.pick ?? null);
    modalBan.textContent = fmtPct(champ.stats?.CN?.ban ?? null);

    modalRoleSelect.value = roles[0] || "Jungle";
    updateMetaModalForRole(champ);

    modal.classList.remove("hidden");
    setDialogFocus(modalCard || modalClose);
  }

  function closeMetaModal() {
    modal.classList.add("hidden");
    restoreFocus(modalTriggerEl);
  }

  function updateMetaModalForRole(champ) {
    const role = modalRoleSelect.value;
    const roles = rolesForHero(champ.hero_id);
    offRole.classList.toggle("hidden", !(roles.length && !roles.includes(role)));

    const th = thresholdsForRole(role);
    const tier = tierForScore(metaScore(champ), th);
    modalTier.textContent = tier;
    modalTier.className = `tierBadge ${tierClass(tier)}`;

    const bans = smartBansForRole(champ, role, 3);
    const counters = bans; // placeholder: same list for now
    renderCounterList(modalBans, bans);
    renderCounterList(modalCounters, counters);
  }

  function renderMetaGrid(list) {
    grid.innerHTML = "";
    if (!list.length) {
      statusEl.textContent = "Keine Treffer.";
      statusEl.style.display = "block";
      return;
    }
    statusEl.style.display = "none";
    const frag = document.createDocumentFragment();
    const th = thresholdsForRole("Jungle");

    for (const c of list) {
      const tier = tierForScore(metaScore(c), th);
      const win = c.stats?.CN?.win ?? null;
      const pick = c.stats?.CN?.pick ?? null;
      const ban = c.stats?.CN?.ban ?? null;

      const card = document.createElement("button");
      card.className = "card";
      card.type = "button";
      card.innerHTML = `
        <div class="cardTop">
          <img class="icon" src="${c.icon}" alt="${c.name}" loading="lazy" />
          <div class="nameWrap">
            <div class="name">${c.name}</div>
            <div class="id">${roleBadgeHTML(mainRoleForHero(c.hero_id))}</div>
          </div>
          <span class="tierBadge ${tierClass(tier)}">${tier}</span>
        </div>
        <div class="stats">
          <div class="stat"><div class="k">Win</div><div class="v">${fmtPct(win)}</div></div>
          <div class="stat"><div class="k">Pick</div><div class="v">${fmtPct(pick)}</div></div>
          <div class="stat"><div class="k">Ban</div><div class="v">${fmtPct(ban)}</div></div>
        </div>
      `;
      card.addEventListener("click", () => openMetaModal(c));
      frag.appendChild(card);
    }
    grid.appendChild(frag);
  }

  function applyMetaFilters() {
    const q = (searchEl.value || "").trim().toLowerCase();
    const sort = sortEl.value;

    let list = allChamps;
    if (q) list = list.filter((c) => c.name.toLowerCase().includes(q));

    list = [...list].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "win") return (b.stats?.CN?.win ?? 0) - (a.stats?.CN?.win ?? 0);
      if (sort === "pick") return (b.stats?.CN?.pick ?? 0) - (a.stats?.CN?.pick ?? 0);
      if (sort === "ban") return (b.stats?.CN?.ban ?? 0) - (a.stats?.CN?.ban ?? 0);
      return metaScore(b) - metaScore(a);
    });

    renderMetaGrid(list);
  }

  function fillChampionSelect(selectEl, selectedName) {
    if (!selectEl) return;
    const options = allChamps
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));

    selectEl.innerHTML = options.map(c => `<option value="${c.name}">${c.name}</option>`).join("");
    if (!options.length) return;
    const hasSelected = selectedName && options.some(c => c.name === selectedName);
    selectEl.value = hasSelected ? selectedName : options[0].name;
  }

  function matchupMetric(c, key) {
    return Number(c?.stats?.CN?.[key] ?? 0);
  }

  function renderMatchupView() {
    if (!allChamps.length || !matchupResults) return;

    const champA = getChampionByName(matchupChampA?.value);
    const champB = getChampionByName(matchupChampB?.value);
    const role = matchupRole?.value || "";

    matchupResults.innerHTML = "";
    if (!champA || !champB) {
      matchupResults.innerHTML = `<div class="card"><div class="k">Info</div><div class="v">Wähle zwei Champions für den Vergleich.</div></div>`;
      return;
    }

    const winA = matchupMetric(champA, "win");
    const winB = matchupMetric(champB, "win");
    const pickA = matchupMetric(champA, "pick");
    const pickB = matchupMetric(champB, "pick");
    const banA = matchupMetric(champA, "ban");
    const banB = matchupMetric(champB, "ban");

    const roleA = role || rolesForHero(champA.hero_id)[0] || "Jungle";
    const roleB = role || rolesForHero(champB.hero_id)[0] || "Jungle";

    const recA = smartBansForRole(champA, roleA, 2);
    const recB = smartBansForRole(champB, roleB, 2);
    const recommended = [...recA, ...recB]
      .sort((x, y) => y.score - x.score)
      .filter((x, i, arr) => arr.findIndex(z => z.name === x.name) === i)
      .slice(0, 3);

    const thRole = role || "Jungle";
    const th = thresholdsForRole(thRole);
    const tierA = tierForScore(metaScore(champA), th);
    const tierB = tierForScore(metaScore(champB), th);

    matchupResults.innerHTML = `
      <article class="card">
        <div class="cardTop">
          <img class="icon" src="${champA.icon}" alt="${champA.name}" loading="lazy" />
          <div class="nameWrap">
            <div class="name">${champA.name}</div>
            <div class="id">${fmtPct(winA)} Win</div>
          </div>
          <span class="tierBadge ${tierClass(tierA)}">${tierA}</span>
        </div>
        <div class="tinyNote">Δ Winrate zu ${champB.name}: ${(winA - winB).toFixed(2)}%</div>
      </article>
      <article class="card">
        <div class="cardTop">
          <img class="icon" src="${champB.icon}" alt="${champB.name}" loading="lazy" />
          <div class="nameWrap">
            <div class="name">${champB.name}</div>
            <div class="id">${fmtPct(winB)} Win</div>
          </div>
          <span class="tierBadge ${tierClass(tierB)}">${tierB}</span>
        </div>
        <div class="tinyNote">Δ Winrate zu ${champA.name}: ${(winB - winA).toFixed(2)}%</div>
      </article>
      <article class="card">
        <div class="k">Pick/Ban Vergleich ${role ? `(${role})` : ""}</div>
        <div class="stats">
          <div class="stat"><div class="k">${champA.name} Pick</div><div class="v">${fmtPct(pickA)}</div></div>
          <div class="stat"><div class="k">${champA.name} Ban</div><div class="v">${fmtPct(banA)}</div></div>
          <div class="stat"><div class="k">Score</div><div class="v">${metaScore(champA).toFixed(1)}</div></div>
          <div class="stat"><div class="k">${champB.name} Pick</div><div class="v">${fmtPct(pickB)}</div></div>
          <div class="stat"><div class="k">${champB.name} Ban</div><div class="v">${fmtPct(banB)}</div></div>
          <div class="stat"><div class="k">Score</div><div class="v">${metaScore(champB).toFixed(1)}</div></div>
        </div>
      </article>
      <article class="card">
        <div class="k">Empfohlene Bans</div>
        <div class="counterList">
          ${recommended.map((c, idx) => `
            <div class="counterItem">
              <img class="cIcon" src="${c.icon}" alt="${c.name}" loading="lazy" />
              <div class="cMain">
                <div class="cName">${idx + 1}. ${c.name} <span class="tierBadge ${tierClass(c.tier)}" style="margin-left:8px">${c.tier}</span></div>
                <div class="cWhy">${c.why}</div>
              </div>
            </div>
          `).join("") || `<div class="tinyNote">Keine Ban-Empfehlung verfügbar.</div>`}
        </div>
      </article>
    `;
  }

  function thresholdsForList(list) {
    const scores = list.map(c => metaScore(c)).sort((a, b) => b - a);
    const q = (p) => scores[Math.floor(p * (scores.length - 1))] ?? 0;
    return { ss: q(0.05), s: q(0.15), a: q(0.35), b: q(0.65) };
  }

  function renderTierlistView() {
    if (!tierlistSections) return;
    const role = tierlistRole?.value || "";
    const pool = role ? allChamps.filter(c => rolesForHero(c.hero_id).includes(role)) : allChamps.slice();

    if (!pool.length) {
      tierlistSections.innerHTML = `<div class="card"><div class="k">Info</div><div class="v">Keine Champions für diese Rolle gefunden.</div></div>`;
      return;
    }

    const th = role ? thresholdsForRole(role) : thresholdsForList(pool);
    const groups = { SS: [], S: [], A: [], B: [], C: [] };
    for (const c of pool) groups[tierForScore(metaScore(c), th)].push(c);
    for (const tier of Object.keys(groups)) groups[tier].sort((a, b) => metaScore(b) - metaScore(a));

    const tiers = ["SS", "S", "A", "B", "C"];
    tierlistSections.innerHTML = tiers.map((tier) => `
      <section class="tier-section">
        <div class="secHead" style="margin-bottom:10px">
          <div class="secTitle">${tier}</div>
          <span class="tierBadge ${tierClass(tier)}">${groups[tier].length}</span>
        </div>
        <div class="grid" style="padding:0">
          ${groups[tier].map(c => `
            <article class="card">
              <div class="cardTop">
                <img class="icon" src="${c.icon}" alt="${c.name}" loading="lazy" />
                <div class="nameWrap">
                  <div class="name">${c.name}</div>
                  <div class="id">${roleBadgeHTML(mainRoleForHero(c.hero_id))}</div>
                </div>
                <span class="tierBadge ${tierClass(tier)}">${tier}</span>
              </div>
              <div class="stats">
                <div class="stat"><div class="k">Win</div><div class="v">${fmtPct(c.stats?.CN?.win)}</div></div>
                <div class="stat"><div class="k">Pick</div><div class="v">${fmtPct(c.stats?.CN?.pick)}</div></div>
                <div class="stat"><div class="k">Ban</div><div class="v">${fmtPct(c.stats?.CN?.ban)}</div></div>
              </div>
            </article>
          `).join("") || `<div class="tinyNote">Keine Champions in diesem Tier.</div>`}
        </div>
      </section>
    `).join("");
  }

  // Draft persistence
  function saveDraftState() {
    try {
      localStorage.setItem("rifto_draft_state", JSON.stringify({
        phase: draftPhase, myPickName, role: draftRole.value, enemy1, enemy2,
        coachLevel, riskMode, patchItemFocus
      }));
    } catch {}
  }
  function loadDraftState() {
    try {
      const raw = localStorage.getItem("rifto_draft_state");
      if (!raw) return;
      const s = JSON.parse(raw);
      if (s.phase) draftPhase = s.phase;
      if (s.myPickName) myPickName = s.myPickName;
      if (s.role) draftRole.value = s.role;
      enemy1 = s.enemy1 || null;
      enemy2 = s.enemy2 || null;
      coachLevel = s.coachLevel || coachLevel;
      riskMode = s.riskMode || riskMode;
      patchItemFocus = Number.isFinite(Number(s.patchItemFocus)) ? Number(s.patchItemFocus) : patchItemFocus;
    } catch {}
  }

  function setPhase(p) {
    draftPhase = p;
    for (const b of phaseBtns) b.classList.toggle("active", b.dataset.phase === p);
    saveDraftState();
    renderDraft();
  }

  function renderEnemySlot(btn, name, slotLabel) {
    const slotAria = btn.id === "enemySlot1" ? "Gegner-Slot 1" : "Gegner-Slot 2";
    if (!name) {
      btn.classList.remove("filled");
      btn.textContent = slotLabel;
      btn.setAttribute("aria-label", `${slotAria} setzen`);
      return;
    }
    const c = getChampionByName(name);
    btn.classList.add("filled");
    if (c) {
      btn.innerHTML = `<img src="${c.icon}" alt="${c.name}" /> <div>${c.name}</div>`;
      btn.setAttribute("aria-label", `${slotAria}: ${c.name}. Erneut tippen zum Entfernen`);
    } else {
      btn.textContent = name;
      btn.setAttribute("aria-label", `${slotAria}: ${name}. Erneut tippen zum Entfernen`);
    }
  }

  function renderMyPickCard() {
    const c = getChampionByName(myPickName);
    if (!c) {
      myPickCard.classList.add("empty");
      myPickCard.innerHTML = `<div class="emptyText">Kein Champion gewählt</div>`;
      return;
    }
    myPickCard.classList.remove("empty");
    const th = thresholdsForRole(draftRole.value);
    const t = tierForScore(metaScore(c), th);
    myPickCard.innerHTML = `
      <img class="pickIcon" src="${c.icon}" alt="${c.name}" />
      <div class="pickMain">
        <div class="pickName">${c.name}</div>
        <div class="pickSub">Rolle: ${draftRole.value}</div>
      </div>
      <span class="tierBadge ${tierClass(t)}">${t}</span>
    `;
  }

  function buildDraftBansTop3() {
    const my = getChampionByName(myPickName);
    if (!my) return [];
    const role = draftRole.value;
    const activePhase = effectiveDraftPhase();
    const w = phaseWeights(activePhase);
    const candidates = roleFilterPool(role, my.hero_id);

    const th = thresholdsForRole(role);
    const scored = candidates.map(c => {
      const counter = tagMatchScore(my.name, role, c.name) * w.counter;
      const patchScore = patchItemPressureScore(c.name);
      const enemyScore = enemySynergyScore(c.name) * w.enemy;
      const base = baseThreatScore(c) * w.meta;
      const total = (base + counter + enemyScore + patchScore) * riskMultiplier();
      const confidence = confidenceFor(total, patchScore, enemyScore);
      return {
        name: c.name,
        icon: c.icon,
        score: total,
        confidence,
        patchScore,
        enemyScore,
        tag: tagFromTypes(champTypes(c.name)),
        why: buildReasonAgainstMyChamp(my.name, role, c.name),
        tier: tierForScore(metaScore(c), th)
      };
    }).sort((a,b)=>b.score-a.score);

    const out = [];
    const seen = new Set();
    for (const x of scored) {
      if (seen.has(x.name)) continue;
      seen.add(x.name);
      out.push(x);
      if (out.length === 3) break;
    }
    return out;
  }

  function renderDraftSignals(list) {
    if (!draftSignals) return;
    const patchAvg = list.length ? Math.round(list.reduce((acc, x) => acc + x.patchScore, 0) / list.length) : 0;
    const enemyAvg = list.length ? Math.round(list.reduce((acc, x) => acc + x.enemyScore, 0) / list.length) : 0;
    const confidenceAvg = list.length ? Math.round(list.reduce((acc, x) => acc + x.confidence, 0) / list.length) : 0;
    draftSignals.innerHTML = `
      <div class="signalPill">Patch/Item Druck: <b>${patchAvg}</b></div>
      <div class="signalPill">Enemy Sync: <b>${enemyAvg}</b></div>
      <div class="signalPill">Confidence: <b>${confidenceAvg}%</b></div>
    `;
  }

  function renderAutoCoach(list) {
    if (!autoCoachOutput) return;
    if (!myPickName) {
      autoCoachOutput.innerHTML = `<div class="mstat"><div class="k">Coach</div><div class="v">Wähle zuerst deinen Champion.</div></div>`;
      return;
    }
    const top = list[0];
    if (!top) {
      autoCoachOutput.innerHTML = `<div class="mstat"><div class="k">Coach</div><div class="v">Keine Daten verfügbar.</div></div>`;
      return;
    }

    const modeTitle = coachLevel === "pro" ? "Pro Call" : "Beginner Call";
    const alt = list[1] ? `${list[1].name} (${list[1].confidence}%)` : "–";
    const deepHint = coachLevel === "pro"
      ? `Trade-off: Falls ${top.name} gebannt ist, priorisiere ${alt} und spiele safer bis Level-5 Power Spike.`
      : `Einfacher Plan: Ban ${top.name}, spiele dein Comfort-Pick und rotiere früh zu Objectives.`;

    autoCoachOutput.innerHTML = `
      <div class="counterItem coachCard">
        <div class="cMain">
          <div class="cName">${modeTitle}: Ban ${top.name} zuerst</div>
          <div class="cWhy">${top.why}</div>
          <div class="coachHint">${deepHint}</div>
        </div>
      </div>
    `;
  }

  function bestMyPickForRole(role) {
    const pool = roleFilterPool(role, null);
    if (!pool.length) return null;
    const sorted = [...pool].sort((a,b)=>metaScore(b)-metaScore(a));
    return sorted[0] || null;
  }

  function applySmartSetup() {
    if (!myPickName) {
      const best = bestMyPickForRole(draftRole.value);
      if (best) myPickName = best.name;
    }
    draftPhase = "auto";
    if (!enemy1) {
      const picks = roleFilterPool(draftRole.value, getChampionByName(myPickName)?.hero_id || null)
        .sort((a,b)=>baseThreatScore(b)-baseThreatScore(a));
      enemy1 = picks[0]?.name || null;
    }
    saveDraftState();
    setPhase(draftPhase);
    renderDraft();
  }

  function clearEnemyPicks() {
    enemy1 = null;
    enemy2 = null;
    saveDraftState();
    renderDraft();
  }

  function resetDraftAll() {
    draftPhase = "auto";
    myPickName = null;
    enemy1 = null;
    enemy2 = null;
    coachLevel = "beginner";
    riskMode = "balanced";
    patchItemFocus = 55;
    if (coachMode) coachMode.value = coachLevel;
    if (riskProfile) riskProfile.value = riskMode;
    if (patchWeight) patchWeight.value = String(patchItemFocus);
    if (patchWeightValue) patchWeightValue.textContent = `${patchItemFocus}%`;
    saveDraftState();
    setPhase(draftPhase);
    renderDraft();
  }

  function renderDraftGuide() {
    if (!draftGuide) return;
    if (!myPickName) {
      draftGuide.textContent = "Schritt 1: Wähle deinen Champion.";
      return;
    }
    if (!enemy1 && !enemy2) {
      draftGuide.textContent = "Schritt 2: Optional Enemy Picks setzen für genauere Smart-Bans.";
      return;
    }
    draftGuide.textContent = "Schritt 3: Nutze Top-3 Bans + Auto Coach als direkte Entscheidung.";
  }

  function renderDraft() {
    renderMyPickCard();
    renderEnemySlot(enemySlot1, enemy1, "+ Slot 1");
    renderEnemySlot(enemySlot2, enemy2, "+ Slot 2");

    const activePhase = effectiveDraftPhase();
    const currentPhaseLabel = phaseLabel(activePhase);
    const modeLabel = draftPhase === "auto" ? "⚡ Auto" : "🛠️ Manuell";

    const my = myPickName ? myPickName : "–";
    const enemies = [enemy1, enemy2].filter(Boolean).join(", ") || "keine";
    draftContext.textContent = `${modeLabel} • ${currentPhaseLabel} • ${draftRole.value} • Dein Pick: ${my} • Enemy: ${enemies}`;

    renderDraftGuide();
    draftBans.innerHTML = "";
    if (!myPickName) {
      draftBans.innerHTML = `<div class="mstat"><div class="k">Info</div><div class="v">Wähle zuerst deinen Champion.</div></div>`;
      renderDraftSignals([]);
      renderAutoCoach([]);
      return;
    }

    const list = buildDraftBansTop3();
    renderDraftSignals(list);
    renderAutoCoach(list);
    for (let i=0;i<list.length;i++) {
      const c = list[i];
      const el = document.createElement("div");
      el.className = "counterItem";
      el.innerHTML = `
        <img class="cIcon" src="${c.icon}" alt="${c.name}" loading="lazy" />
        <div class="cMain">
          <div class="cName">${i+1}️⃣ ${c.name} <span class="tierBadge ${tierClass(c.tier)}" style="margin-left:8px">${c.tier}</span></div>
          <div class="cWhy">${c.why} • ${c.tag}</div>
          <div class="coachHint">Confidence ${c.confidence}% · Patch/Item ${Math.round(c.patchScore)} · Enemy Sync ${Math.round(c.enemyScore)}</div>
        </div>
      `;
      draftBans.appendChild(el);
    }
  }

  // Picker
  function openPicker(target) {
    pickerTriggerEl = document.activeElement;
    pickTarget = target;
    pickerSearch.value = "";
    renderPickerGrid("");
    picker.classList.remove("hidden");
    setDialogFocus(pickerCard || pickerSearch);
    pickerSearch.focus();
  }
  function closePicker(){
    picker.classList.add("hidden");
    restoreFocus(pickerTriggerEl);
  }

  function renderPickerGrid(q) {
    const query = (q||"").trim().toLowerCase();
    let list = allChamps;
    if (query) list = list.filter(c => c.name.toLowerCase().includes(query));
    list = list.slice(0, 160);

    pickerGrid.innerHTML = "";
    const frag = document.createDocumentFragment();
    for (const c of list) {
      const card = document.createElement("button");
      card.className = "card";
      card.type = "button";
      card.innerHTML = `
        <div class="cardTop">
          <img class="icon" src="${c.icon}" alt="${c.name}" loading="lazy" />
          <div class="nameWrap">
            <div class="name">${c.name}</div>
            <div class="id">${roleBadgeHTML(mainRoleForHero(c.hero_id))}</div>
          </div>
        </div>
      `;
      card.addEventListener("click", () => {
        if (pickTarget === "me") {
          myPickName = c.name;
        } else if (pickTarget === "enemy1") {
          enemy1 = (enemy1 && enemy1.toLowerCase() === c.name.toLowerCase()) ? null : c.name;
        } else if (pickTarget === "enemy2") {
          enemy2 = (enemy2 && enemy2.toLowerCase() === c.name.toLowerCase()) ? null : c.name;
        }
        saveDraftState();
        renderDraft();
        closePicker();
      });
      frag.appendChild(card);
    }
    pickerGrid.appendChild(frag);
  }

  // Tabs
  function showTab(tab) {
    for (const b of tabBtns) b.classList.toggle("active", b.dataset.tab === tab);
    viewMeta.classList.toggle("hidden", tab !== "meta");
    viewDraft.classList.toggle("hidden", tab !== "draft");
    viewMatchup.classList.toggle("hidden", tab !== "matchup");
    viewTierlist.classList.toggle("hidden", tab !== "tierlist");
    if (tab === "matchup") renderMatchupView();
    if (tab === "tierlist") renderTierlistView();
    try { localStorage.setItem("rifto_active_tab", tab); } catch {}
  }
  function restoreTab() {
    try {
      const t = localStorage.getItem("rifto_active_tab");
      if (t) showTab(t);
    } catch {}
  }

  function syncStickyOffsets() {
    if (!topbar || !tabsNav) return;
    const h = Math.ceil(topbar.getBoundingClientRect().height || 64);
    document.documentElement.style.setProperty("--tabs-top", `${h}px`);
  }

  // Events
  tabBtns.forEach(b => b.addEventListener("click", () => showTab(b.dataset.tab)));
  window.addEventListener("resize", syncStickyOffsets);
  window.addEventListener("orientationchange", syncStickyOffsets);

  modalClose.addEventListener("click", closeMetaModal);
  modal.addEventListener("click", (e)=>{ if (e.target.classList.contains("modalBackdrop")) closeMetaModal(); });
  modalRoleSelect.addEventListener("change", () => {
    const c = getChampionByName(modalName.textContent);
    if (c) updateMetaModalForRole(c);
  });

  searchEl.addEventListener("input", applyMetaFilters);
  sortEl.addEventListener("change", applyMetaFilters);

  phaseBtns.forEach(b => b.addEventListener("click", ()=>setPhase(b.dataset.phase)));
  btnPickMe.addEventListener("click", ()=>openPicker("me"));
  enemySlot1.addEventListener("click", ()=>openPicker("enemy1"));
  enemySlot2.addEventListener("click", ()=>openPicker("enemy2"));
  draftRole.addEventListener("change", ()=>{ saveDraftState(); renderDraft(); });
  coachMode?.addEventListener("change", ()=>{ coachLevel = coachMode.value; saveDraftState(); renderDraft(); });
  riskProfile?.addEventListener("change", ()=>{ riskMode = riskProfile.value; saveDraftState(); renderDraft(); });
  patchWeight?.addEventListener("input", ()=>{
    patchItemFocus = Number(patchWeight.value || 0);
    if (patchWeightValue) patchWeightValue.textContent = `${patchItemFocus}%`;
    saveDraftState();
    renderDraft();
  });
  btnSmartSetup?.addEventListener("click", applySmartSetup);
  btnClearEnemies?.addEventListener("click", clearEnemyPicks);
  btnResetDraft?.addEventListener("click", resetDraftAll);
  matchupChampA?.addEventListener("change", renderMatchupView);
  matchupChampB?.addEventListener("change", renderMatchupView);
  matchupRole?.addEventListener("change", renderMatchupView);
  tierlistRole?.addEventListener("change", renderTierlistView);

  pickerClose.addEventListener("click", closePicker);
  picker.addEventListener("click", (e)=>{ if (e.target.classList.contains("modalBackdrop")) closePicker(); });
  pickerSearch.addEventListener("input", ()=>renderPickerGrid(pickerSearch.value));

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!picker.classList.contains("hidden")) {
      closePicker();
      return;
    }
    if (!modal.classList.contains("hidden")) closeMetaModal();
  });

  // Loaders
  async function loadJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
    return res.json();
  }

  async function load() {
    try {
      statusEl.textContent = "Lade Daten…";
      const ts = Date.now();

      const meta = await loadJson(`./meta.json?ts=${ts}`);
      patchPill.textContent = `Patch: ${meta.patch ?? "–"}`;
      updatePill.textContent = `Update: ${meta.lastUpdated ?? "–"}`;
      syncStickyOffsets();

      allChamps = normalizeMeta(meta);

      try {
        const heroList = await loadJson(`${HERO_LIST_URL}?ts=${ts}`);
        heroDb = (heroList && heroList.heroList) ? heroList.heroList : {};
      } catch { heroDb = {}; }

      try {
        const tags = await loadJson(`./champ_tags.json?ts=${ts}`);
        tagDb = tags || {};
        defaultWeakByRole = tagDb._defaults || {};
      } catch { tagDb = {}; defaultWeakByRole = {}; }

      updateTrends();

      statusEl.textContent = `Geladen: ${allChamps.length} Champions`;
      statusEl.style.display = "block";

      fillChampionSelect(matchupChampA);
      fillChampionSelect(matchupChampB, allChamps[1]?.name || allChamps[0]?.name);

      restoreTab();
      loadDraftState();
      if (coachMode) coachMode.value = coachLevel;
      if (riskProfile) riskProfile.value = riskMode;
      if (patchWeight) patchWeight.value = String(patchItemFocus);
      if (patchWeightValue) patchWeightValue.textContent = `${patchItemFocus}%`;
      setPhase(draftPhase);

      applyMetaFilters();
      renderDraft();
      renderMatchupView();
      renderTierlistView();
      syncStickyOffsets();
    } catch (err) {
      console.error(err);
      statusEl.textContent = `Fehler beim Laden: ${err?.message ?? err}`;
      statusEl.style.display = "block";
    }
  }

  syncStickyOffsets();
  load();
})();
