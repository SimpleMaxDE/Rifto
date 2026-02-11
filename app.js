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
  const phaseBtns = Array.from(document.querySelectorAll(".phase"));

  // Picker
  const picker = $("picker");
  const pickerClose = $("pickerClose");
  const pickerSearch = $("pickerSearch");
  const pickerGrid = $("pickerGrid");

  const HERO_LIST_URL = "https://game.gtimg.cn/images/lgamem/act/lrlib/js/heroList/hero_list.js";

  let allChamps = [];
  let heroDb = {};
  let tagDb = {};
  let defaultWeakByRole = {};

  let risingTypes = new Set();
  let fallingTypes = new Set();
  let trendText = "–";

  // Draft state (persisted)
  let draftPhase = "enemy_fp";
  let myPickName = null;
  let enemy1 = null;
  let enemy2 = null;
  let pickTarget = "me";

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
          <div class="cWhy">${c.why}</div>
        </div>
      `;
      targetEl.appendChild(el);
    }
  }

  function openMetaModal(champ) {
    modalIcon.src = champ.icon;
    modalIcon.alt = champ.name;
    modalName.textContent = champ.name;
    modalId.textContent = `#${champ.hero_id}`;

    modalWin.textContent = fmtPct(champ.stats?.CN?.win ?? null);
    modalPick.textContent = fmtPct(champ.stats?.CN?.pick ?? null);
    modalBan.textContent = fmtPct(champ.stats?.CN?.ban ?? null);

    const roles = rolesForHero(champ.hero_id);
    modalRoleSelect.value = roles[0] || "Jungle";
    updateMetaModalForRole(champ);

    modal.classList.remove("hidden");
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
            <div class="id">${roleBadgeHTML(mainRoleForHero(c.hero_id))}<span class="hash">#${c.hero_id}</span></div>
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

  // Draft persistence
  function saveDraftState() {
    try {
      localStorage.setItem("rifto_draft_state", JSON.stringify({
        phase: draftPhase, myPickName, role: draftRole.value, enemy1, enemy2
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
    } catch {}
  }

  function setPhase(p) {
    draftPhase = p;
    for (const b of phaseBtns) b.classList.toggle("active", b.dataset.phase === p);
    saveDraftState();
    renderDraft();
  }

  function renderEnemySlot(btn, name, slotLabel) {
    if (!name) {
      btn.classList.remove("filled");
      btn.textContent = slotLabel;
      return;
    }
    const c = getChampionByName(name);
    btn.classList.add("filled");
    if (c) btn.innerHTML = `<img src="${c.icon}" alt="${c.name}" /> <div>${c.name}</div>`;
    else btn.textContent = name;
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
    const w = phaseWeights(draftPhase);
    const candidates = roleFilterPool(role, my.hero_id);

    const th = thresholdsForRole(role);
    const scored = candidates.map(c => {
      const score = (baseThreatScore(c) * w.meta) + (tagMatchScore(my.name, role, c.name) * w.counter) + (enemySynergyScore(c.name) * w.enemy);
      return { name: c.name, icon: c.icon, score, why: buildReasonAgainstMyChamp(my.name, role, c.name), tier: tierForScore(metaScore(c), th) };
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

  function renderDraft() {
    renderMyPickCard();
    renderEnemySlot(enemySlot1, enemy1, "+ Slot 1");
    renderEnemySlot(enemySlot2, enemy2, "+ Slot 2");

    const phaseLabel = draftPhase === "enemy_fp" ? "🎯 Enemy FP"
                    : draftPhase === "my_fp" ? "⭐ My FP"
                    : draftPhase === "mid" ? "🔄 Mid Draft"
                    : "🛑 Late Draft";

    const my = myPickName ? myPickName : "–";
    const enemies = [enemy1, enemy2].filter(Boolean).join(", ") || "keine";
    draftContext.textContent = `${phaseLabel} • ${draftRole.value} • Dein Pick: ${my} • Enemy: ${enemies}`;

    draftBans.innerHTML = "";
    if (!myPickName) {
      draftBans.innerHTML = `<div class="mstat"><div class="k">Info</div><div class="v">Wähle zuerst deinen Champion.</div></div>`;
      return;
    }

    const list = buildDraftBansTop3();
    for (let i=0;i<list.length;i++) {
      const c = list[i];
      const el = document.createElement("div");
      el.className = "counterItem";
      el.innerHTML = `
        <img class="cIcon" src="${c.icon}" alt="${c.name}" loading="lazy" />
        <div class="cMain">
          <div class="cName">${i+1}️⃣ ${c.name} <span class="tierBadge ${tierClass(c.tier)}" style="margin-left:8px">${c.tier}</span></div>
          <div class="cWhy">${c.why}</div>
        </div>
      `;
      draftBans.appendChild(el);
    }
  }

  // Picker
  function openPicker(target) {
    pickTarget = target;
    pickerSearch.value = "";
    renderPickerGrid("");
    picker.classList.remove("hidden");
    pickerSearch.focus();
  }
  function closePicker(){ picker.classList.add("hidden"); }

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
            <div class="id">#${c.hero_id}</div>
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

  modalClose.addEventListener("click", ()=>modal.classList.add("hidden"));
  modal.addEventListener("click", (e)=>{ if (e.target.classList.contains("modalBackdrop")) modal.classList.add("hidden"); });
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

  pickerClose.addEventListener("click", closePicker);
  picker.addEventListener("click", (e)=>{ if (e.target.classList.contains("modalBackdrop")) closePicker(); });
  pickerSearch.addEventListener("input", ()=>renderPickerGrid(pickerSearch.value));

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

      restoreTab();
      loadDraftState();
      setPhase(draftPhase);

      applyMetaFilters();
      renderDraft();
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
