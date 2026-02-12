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
  const viewPatchnotes = $("viewPatchnotes");

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
  const matchupLane = $("matchupLane");
  const matchupChampA = $("matchupChampA");
  const matchupChampB = $("matchupChampB");
  const matchupAnalyse = $("matchupAnalyse");
  const matchupResults = $("matchupResults");
  const tierlistRole = $("tierlistRole");
  const tierlistSort = $("tierlistSort");
  const tierlistHighlights = $("tierlistHighlights");
  const tierlistSections = $("tierlistSections");
  const patchnotesSummary = $("patchnotesSummary");
  const patchnotesGrid = $("patchnotesGrid");

  // Picker
  const picker = $("picker");
  const pickerClose = $("pickerClose");
  const pickerSearch = $("pickerSearch");
  const pickerGrid = $("pickerGrid");
  const modalCard = modal?.querySelector(".modalCard");
  const pickerCard = picker?.querySelector(".modalCard");

  const HERO_LIST_URL = "https://game.gtimg.cn/images/lgamem/act/lrlib/js/heroList/hero_list.js";
  const WR_EQUIP_URL = "https://game.gtimg.cn/images/lgamem/act/lrlib/js/equip/equip.js";
  const WR_RUNE_URL = "https://game.gtimg.cn/images/lgamem/act/lrlib/js/rune/rune.js";
  const WR_SKILL_URL = "https://game.gtimg.cn/images/lgamem/act/lrlib/js/skill/skill.js";

  let allChamps = [];
  let heroDb = {};
  let tagDb = {};
  let defaultWeakByRole = {};
  let liveItemPatch = "–";
  let liveItemDb = null;
  let liveRuneDb = [];
  let liveSkillDb = [];
  let liveCatalogData = null;
  let localizationDb = { items: {}, runes: {}, summonerSpells: {} };
  let championAbilityDb = {};

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

  const DEFAULT_PATCH_NOTES = {
    patch: "7.0c",
    championBuffs: [
      { name: "Katarina", delta: 2.4, note: "Burst/Reset-Tempo verbessert." },
      { name: "Amumu", delta: 0.8, note: "Stabilere Frontline-Tools." }
    ],
    championNerfs: [
      { name: "Dr. Mundo", delta: -0.6, note: "Etwas weniger Druck in stabilen Frontline-Fights." }
    ],
    itemChanges: [
      { name: "Blade of the Ruined King", direction: "changed", impactTags: ["marksman", "fighter", "anti_tank"], delta: 1.2, note: "Itemprofil geändert, stärker matchup-abhängig." },
      { name: "Searing Crown", direction: "buff", impactTags: ["tank", "hard_engage"], delta: 0.8, note: "Tank-DPS im Front-to-Back verbessert." },
      { name: "Zeke's Convergence", direction: "buff", impactTags: ["tank_support", "support"], delta: 0.6, note: "Support-Engage-Synergie erhöht." }
    ]
  };

  let patchNotesData = JSON.parse(JSON.stringify(DEFAULT_PATCH_NOTES));
  let patchContext = patchNotesData.patch || "7.0c";

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


  const ROLE_OVERRIDES = {
    "gragas": ["Baron", "Jungle", "Mid"],
    "pantheon": ["Baron", "Jungle", "Mid", "Support"],
    "yasuo": ["Mid", "Baron", "ADC"],
    "vayne": ["ADC", "Baron"],
    "ziggs": ["Mid", "ADC"],
    "galio": ["Mid", "Support"],
    "nautilus": ["Support", "Jungle", "Baron"],
    "shen": ["Baron", "Support"],
    "morgana": ["Support", "Mid", "Jungle"],
    "seraphine": ["Support", "Mid", "ADC"],
    "pyke": ["Support", "Mid"],
    "lux": ["Support", "Mid"]
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

  function patchChampionBonus(champName) {
    const key = String(champName || "").toLowerCase();
    const map = championPatchMap();
    return map[key] || 0;
  }

  function patchItemSynergyBonus(c) {
    const name = c?.name || "";
    const tags = new Set(champTypes(name));
    const roles = new Set(rolesForHero(c?.hero_id));
    let bonus = 0;
    for (const change of (patchNotesData.itemChanges || [])) {
      const hits = change.impactTags.some((tag) => tags.has(tag) || roles.has(tag) || (tag === "support" && roles.has("Support")) || (tag === "marksman" && roles.has("ADC")));
      if (!hits) continue;
      bonus += Number(change.delta || 0);
    }
    return bonus;
  }

  function catalogVolatilityBonus(c) {
    if (!liveCatalogData?.diff) return 0;
    const champName = String(c?.name || "");
    let bonus = 0;
    if ((liveCatalogData.diff.newChampions || []).includes(champName)) bonus += 1.2;
    const shifts =
      (liveCatalogData.diff.newItems || []).length +
      (liveCatalogData.diff.newRunes || []).length +
      (liveCatalogData.diff.newSummonerSpells || []).length;
    bonus += Math.min(1.5, shifts * 0.05);
    return bonus;
  }

  function championPatchMap() {
    return Object.fromEntries([
      ...(patchNotesData.championBuffs || []).map((x) => [String(x.name || "").toLowerCase(), Number(x.delta || 0)]),
      ...(patchNotesData.championNerfs || []).map((x) => [String(x.name || "").toLowerCase(), Number(x.delta || 0)])
    ]);
  }

  function metaScore(c) {
    const win = Number(c.stats?.CN?.win ?? 0);
    const pick = Number(c.stats?.CN?.pick ?? 0);
    const ban = Number(c.stats?.CN?.ban ?? 0);
    const patchBonus = patchChampionBonus(c?.name);
    const itemPatchBonus = patchItemSynergyBonus(c);
    const volatilityBonus = catalogVolatilityBonus(c);
    return (win * 1.2) + (pick * 0.9) + (ban * 0.5) + patchBonus + itemPatchBonus + volatilityBonus;
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

  function buildHeroIconById(heroId) {
    return `https://game.gtimg.cn/images/lgamem/act/lrlib/img/HeadIcon/H_S_${heroId}.png`;
  }

  function mergeAllChampionsFromHeroDb() {
    if (!heroDb || !Object.keys(heroDb).length) return;
    const map = new Map(allChamps.map((c) => [String(c.hero_id), c]));
    for (const [heroId, hero] of Object.entries(heroDb)) {
      if (map.has(String(heroId))) continue;
      const name = String(hero?.name || hero?.title || `Hero ${heroId}`);
      allChamps.push({
        hero_id: String(heroId),
        name,
        icon: buildHeroIconById(heroId),
        stats: { CN: { win: 0, pick: 0, ban: 0 } }
      });
    }
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

    const byName = allChamps.find((c) => String(c.hero_id) === String(hero_id))?.name?.toLowerCase();
    if (byName && ROLE_OVERRIDES[byName]) {
      for (const r of ROLE_OVERRIDES[byName]) out.add(r);
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

  function renderTrendPill({ rise = [], fall = [], baselineHours = null } = {}) {
    if (!trendPill) return;
    const topRise = rise[0];
    const topFall = fall[0];

    if (!topRise && !topFall) {
      trendPill.classList.remove("trendPillRich");
      trendPill.textContent = "Trend: lernt noch…";
      trendPill.title = "Trend benötigt mindestens zwei Snapshots.";
      return;
    }

    const riseTxt = topRise ? `${labelTag(topRise.t)} +${topRise.d.toFixed(1)}` : "–";
    const fallTxt = topFall ? `${labelTag(topFall.t)} ${topFall.d.toFixed(1)}` : "–";
    const baseTxt = Number.isFinite(baselineHours) ? `Basis ${baselineHours}h` : "Basis n/a";

    trendPill.classList.add("trendPillRich");
    trendPill.innerHTML = `
      <span class="trendLabel">Trend</span>
      <span class="trendUp">↑ ${riseTxt}</span>
      <span class="trendDown">↓ ${fallTxt}</span>
      <span class="trendBase">${baseTxt}</span>
    `;
    trendPill.title = `Steigend: ${riseTxt} | Fallend: ${fallTxt} | ${baseTxt}`;
  }

  function updateTrends() {
    const current = computeTypeStrength();
    const prev = loadPrevSnapshot();
    risingTypes = new Set();
    fallingTypes = new Set();
    trendText = "–";

    let rise = [];
    let fall = [];
    let baselineHours = null;

    if (prev && prev.strength) {
      const deltas = [];
      for (const t of Object.keys(current)) {
        if (prev.strength[t] === undefined) continue;
        deltas.push({ t, d: current[t] - prev.strength[t] });
      }
      deltas.sort((a,b)=>b.d-a.d);
      rise = deltas.filter(x=>x.d>0).slice(0,3);
      fall = deltas.filter(x=>x.d<0).slice(-3);
      for (const r of rise) risingTypes.add(r.t);
      for (const f of fall) fallingTypes.add(f.t);
      const riseTxt = rise.length ? `${labelTag(rise[0].t)} ↑` : "";
      const fallTxt = fall.length ? `${labelTag(fall[0].t)} ↓` : "";
      trendText = [riseTxt, fallTxt].filter(Boolean).join(" • ") || "–";
      baselineHours = Math.max(1, Math.round((Date.now() - Number(prev.ts || 0)) / 36e5));
    }
    renderTrendPill({ rise, fall, baselineHours });
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

  function matchupRolePenalty(champ, role) {
    if (!role) return 0;
    return rolesForHero(champ.hero_id).includes(role) ? 0 : 8;
  }

  function matchupPower(champ, role) {
    const win = matchupMetric(champ, "win") * 1.1;
    const presence = matchupMetric(champ, "pick") + matchupMetric(champ, "ban");
    const base = metaScore(champ) + win + (presence * 0.25);
    return base - matchupRolePenalty(champ, role);
  }

  function difficultyFromDelta(delta) {
    if (delta >= 7) return "Leicht";
    if (delta >= 2) return "Spielbar";
    if (delta <= -7) return "Sehr schwer";
    if (delta <= -2) return "Schwer";
    return "Ausgeglichen";
  }

  function enemyAbilityRows(enemyName) {
    const row = championAbilityDb?.[enemyName];
    return Array.isArray(row?.spells) ? row.spells : [];
  }

  function pickEnemyAbility(enemyName, mode = "danger") {
    const spells = enemyAbilityRows(enemyName);
    if (!spells.length) return null;
    const by = (r) => spells.find((sp) => r.test(`${sp.name || ""} ${sp.description || ""}`.toLowerCase()));
    if (mode === "danger") {
      return by(/stun|knock|airborne|taunt|snare|charm|suppress|fear/) || spells.find((x) => x.slot === "R") || spells[0];
    }
    if (mode === "burst") {
      return by(/execute|burst|damage|critical|slash|strike|爆发/) || spells.find((x) => x.slot === "R") || spells[0];
    }
    return spells[0];
  }

  function abilityLabel(spell) {
    return spell?.name ? `${spell.slot} (${spell.name})` : "key ability";
  }

  function guideByEnemyTypes(types, myChamp, enemyChamp, delta) {
    const set = new Set(types || []);
    const lane = [];
    const fight = [];
    const spikes = [];
    const ccSpell = pickEnemyAbility(enemyChamp.name, "danger");
    const burstSpell = pickEnemyAbility(enemyChamp.name, "burst");

    if (set.has("assassin_burst") || set.has("assassin_reset")) {
      lane.push(`Bis Level 5 gegen ${enemyChamp.name} nur Short-Trades nach ${abilityLabel(burstSpell)} starten.`);
      fight.push(`Defensive-CD erst halten, bis ${enemyChamp.name} ${abilityLabel(burstSpell)} committed – dann Counter-Trade.`);
      spikes.push(`Ab erstem Def-Item kannst du gegen ${enemyChamp.name} deutlich länger traden.`);
    }
    if (set.has("hard_engage") || set.has("pointclick_cc") || set.has("hard_cc")) {
      lane.push(`Wave nicht ohne Vision tief drücken, weil ${enemyChamp.name} über ${abilityLabel(ccSpell)} Engage erzwingt.`);
      fight.push(`Seitlich hinter Frontline stehen, damit ${enemyChamp.name} mit ${abilityLabel(ccSpell)} keinen freien Start bekommt.`);
      spikes.push(`Mit Tenacity/QSS kannst du ${abilityLabel(ccSpell)} stark entschärfen.`);
    }
    if (set.has("poke") || set.has("mage_poke")) {
      lane.push(`Seitlich in Minions spielen und nur traden, wenn ${enemyChamp.name} ${abilityLabel(burstSpell)} verfehlt.`);
      fight.push(`Nicht pre-fight HP verlieren: erst resetten/healen, dann contesten.`);
      spikes.push(`Sobald Sustain/Resists stehen, verliert ${enemyChamp.name} deutlich Druck.`);
    }
    if (set.has("anti_tank") || set.has("true_damage")) {
      lane.push(`Keine langen Standing-Trades: lieber Hit-and-Run mit Cooldown-Fenstern.`);
      fight.push(`Nutze kurze Burst-Phasen, bevor ${enemyChamp.name} True-Damage voll ausspielt.`);
      spikes.push(`Def + Mobility ist hier stärker als blind HP stacken.`);
    }
    if (set.has("anti_auto")) {
      lane.push(`Auto-heavy Trades vermeiden; lieber Spell-Rotation + kite.`);
      fight.push(`DPS-Race meiden, stattdessen auf Cooldown-Punish spielen.`);
    }

    if (!lane.length) {
      lane.push(`0-6 Min: stabil farmen und nur traden, wenn ${enemyChamp.name} Kern-Spell verfehlt.`);
      spikes.push(`Ab 6 Min mit Vision zuerst rotieren, dann aggressiver traden.`);
    }
    if (!fight.length) {
      fight.push(`Teamfight-Regel: nur committen wenn ${enemyChamp.name}s ${abilityLabel(ccSpell)} auf Cooldown ist.`);
    }

    const firstSpells = enemyAbilityRows(enemyChamp.name).slice(0, 3);
    for (const sp of firstSpells) {
      if (!sp?.name) continue;
      const low = `${sp.name} ${sp.description || ""}`.toLowerCase();
      if (/dash|blink|jump|charge/.test(low)) {
        lane.push(`Halte dein CC/Slow bis ${enemyChamp.name} ${sp.slot} (${sp.name}) nutzt, dann punishen.`);
      }
      if (/heal|regen|shield/.test(low)) {
        spikes.push(`Gegen ${sp.slot} (${sp.name}) früh Anti-Heal einplanen.`);
      }
    }

    const tempo = delta >= 0
      ? `Du hast leichten Vorteil: Tempo hochhalten und Objective-Fights zuerst starten.`
      : `Du bist unter Druck: zuerst Wave/XP sichern, dann über Numbers-Advantage kämpfen.`;

    return {
      lane: lane.slice(0, 2),
      fight: fight.slice(0, 2),
      spikes: [tempo, ...spikes].slice(0, 2),
      myHint: `${myChamp.name} gewinnt dieses Matchup über saubere Cooldown-Fenster, nicht über Coinflip-All-Ins.`,
    };
  }

  function buildTimelinePlan(guide, myChamp, enemyChamp, lane, difficulty) {
    const leadRule = difficulty === "Leicht" || difficulty === "Spielbar"
      ? `Wenn du vorne bist: Tempo hochhalten, Vision setzen und kleine Vorteile sofort in Objectives umwandeln.`
      : `Wenn du hinten bist: erst Wave sicher spielen, dann nur auf sichere Fehler von ${enemyChamp.name} reagieren.`;

    return [
      {
        title: "0-4 Min (wichtigste Phase)",
        steps: [
          `1) First Goal: Farm + XP nicht verlieren auf ${lane}.`,
          `2) Nur kurze Trades wenn ${enemyChamp.name} wichtige Fähigkeit verfehlt.`,
          guide.lane[0] || `${myChamp.name} soll früh keine Coinflip-All-Ins nehmen.`
        ]
      },
      {
        title: "5-10 Min",
        steps: [
          `1) Map schauen bevor du fightest (Jungle/Rotation zuerst checken).`,
          guide.fight[0] || `Nur kämpfen, wenn ihr Zahlvorteil habt.`,
          `2) Baue jetzt dein Core-Item-Tempo auf.`
        ]
      },
      {
        title: "Ab 11 Min",
        steps: [
          leadRule,
          guide.spikes[0] || `Spiele Teamfights mit klarem Fokus auf Gegner-Fehler.`,
          `Priorität: Leben > Hero-Play. Konstante saubere Entscheidungen gewinnen das Match.`
        ]
      }
    ];
  }

  function inferChampProfile(champ, role, champTypesRaw) {
    const set = new Set(champTypesRaw || []);
    if (role === "ADC") return "marksman";
    if (role === "Support" && (set.has("hard_cc") || set.has("hard_engage"))) return "tank_support";
    if (role === "Support") return "enchanter";
    if (set.has("assassin_burst") || set.has("assassin_reset")) return "assassin";
    if (set.has("tank") || set.has("anti_auto")) return "tank";
    if (set.has("mage_burst") || set.has("mage_control") || set.has("mage_poke")) return "mage";
    if (set.has("fighter") || set.has("dive")) return "fighter";
    if (role === "Mid") return "mage";
    if (role === "Jungle") return "fighter";
    return "fighter";
  }

  function fallbackItemIcon() {
    return "https://game.gtimg.cn/images/lgamem/act/lrlib/img/HeadIcon/H_S_10001.png";
  }

  function normalizeText(v) {
    return String(v || "").trim().toLowerCase();
  }

  function itemCandidateVariants(candidates = []) {
    const map = localizationDb?.items || {};
    const reverse = {};
    for (const [zh, en] of Object.entries(map)) {
      const e = normalizeText(en);
      if (!e) continue;
      if (!reverse[e]) reverse[e] = [];
      reverse[e].push(zh);
    }

    const out = new Set();
    for (const c of candidates) {
      const raw = String(c || "").trim();
      if (!raw) continue;
      out.add(raw);
      const mapped = map[raw];
      if (mapped) out.add(mapped);
      const rev = reverse[normalizeText(raw)] || [];
      for (const zh of rev) out.add(zh);
    }
    return Array.from(out);
  }

  function containsCjk(v) {
    return /[\u3400-\u9fff]/.test(String(v || ""));
  }

  function localizedName(category, name, fallback = "") {
    const original = String(name || "").trim();
    if (!original) return fallback || "";
    const fromMap = localizationDb?.[category]?.[original];
    const isNumericPlaceholder = /^(Item|Rune|Spell)\s+\d+$/i.test(String(fromMap || "").trim());
    if (fromMap && !containsCjk(fromMap) && !isNumericPlaceholder) return fromMap;
    if (!containsCjk(original)) return original;
    return fallback || original;
  }

  function findWildRiftItem(candidates = []) {
    if (!liveItemDb?.length) return null;
    const exact = itemCandidateVariants(candidates).map(normalizeText).filter(Boolean);
    for (const c of exact) {
      const hit = liveItemDb.find((x) => normalizeText(x.name) === c || normalizeText(x.nativeName) === c);
      if (hit) return hit;
    }
    for (const c of exact) {
      const hit = liveItemDb.find((x) => normalizeText(x.name).includes(c) || normalizeText(x.nativeName).includes(c));
      if (hit) return hit;
    }
    return null;
  }

  function buildWrItem(candidates, why, fallbackName) {
    const found = findWildRiftItem(candidates);
    const translated = localizedName("items", found?.name, fallbackName || candidates[0] || "Item");
    return {
      name: translated,
      nativeName: found?.name || "",
      icon: found?.iconPath || fallbackItemIcon(),
      why,
      stats: found?.description || ""
    };
  }

  function chooseBootsByMatchup(enemyTypesRaw, profile) {
    const set = new Set(enemyTypesRaw || []);
    if (set.has("hard_cc") || set.has("pointclick_cc") || set.has("hard_engage")) {
      return buildWrItem(["水银之靴"], "Früh gegen CC/Engage priorisieren, um All-Ins zu überleben.", "Mercury Boots");
    }
    if (set.has("anti_auto") || set.has("fighter") || set.has("assassin_burst")) {
      return buildWrItem(["铁板靴"], "Früh gegen AD-Trade und Auto-Druck kaufen.", "Plated Steelcaps");
    }
    if (profile === "marksman") return buildWrItem(["贪婪之靴"], "DPS/Uptime-Boots für Carry-Fights.", "Gluttonous Greaves");
    if (profile === "mage" || profile === "enchanter") return buildWrItem(["法力之靴"], "Mehr AP-Tempo für Midgame-Skirmishes.", "Mana Boots");
    return buildWrItem(["明朗之靴"], "Sicherer Standard für häufige Ability-Rotationen.", "Ionian Boots");
  }

  function itemText(item) {
    const desc = Array.isArray(item?.description) ? item.description.join(" ") : String(item?.description || "");
    const labels = Array.isArray(item?.labels) ? item.labels.join(" ") : "";
    return `${String(item?.name || "")} ${desc} ${labels}`.toLowerCase();
  }

  function itemHasAny(text, words = []) {
    return words.some((w) => text.includes(w));
  }

  function isBootOrEnchantItem(item) {
    const name = String(item?.name || "");
    return name.includes("靴") || name.includes("附魔") || name.includes("·");
  }

  function fallbackTemplateBuild(profile) {
    if (profile === "mage") {
      return [
        buildWrItem(["卢登的回声"], "Konstanter AP-Burst im Core.", "Luden's Echo"),
        buildWrItem(["灭世者之帽"], "Starker Multiplikator für deine Combo.", "Rabadon's Deathcap"),
        buildWrItem(["虚空之杖"], "MR-Penetration gegen MR-Stack.", "Void Staff"),
        buildWrItem(["中娅沙漏", "中娅"], "Defensives Fenster gegen Burst/Engage.", "Zhonya's Hourglass"),
        buildWrItem(["莫雷洛秘典"], "Anti-Heal gegen Sustain-Comp.", "Morellonomicon")
      ];
    }
    return [
      buildWrItem(["黑色切割者"], "Starker AD-Allround-Core gegen viele Matchups.", "Black Cleaver"),
      buildWrItem(["死亡之舞"], "Überlebt Burst besser in Midgame-Fights.", "Death's Dance"),
      buildWrItem(["神圣分离者"], "Sehr stark in längeren Duellen vs Bruiser/Tank.", "Divine Sunderer"),
      buildWrItem(["斯特拉克的挑战护手", "挑战护手"], "Duellstärke + Teamfight-Survival.", "Sterak's Gage"),
      buildWrItem(["守护天使"], "Sicherheit für entscheidende Fights.", "Guardian Angel")
    ];
  }

  function scoreItemForMatchup(item, profile, myRole, myTypesRaw, enemyTypesRaw) {
    const text = itemText(item);
    const enemy = new Set(enemyTypesRaw || []);
    const mine = new Set(myTypesRaw || []);
    let score = 0;
    const reasons = [];

    const push = (points, reason) => {
      score += points;
      if (reason) reasons.push(reason);
    };

    if (profile === "marksman") {
      if (itemHasAny(text, ["攻击力", "暴击", "攻速", "吸血", "护甲穿透"])) push(16, "ADC-DPS-Stats");
    } else if (profile === "mage") {
      if (itemHasAny(text, ["法术强度", "法术穿透", "法力", "技能急速", "冷却"])) push(16, "AP-Core-Stats");
    } else if (profile === "assassin") {
      if (itemHasAny(text, ["攻击力", "护甲穿透", "移动速度", "技能急速", "冷却"])) push(16, "Burst/Pick-Stats");
    } else if (profile === "tank" || profile === "tank_support") {
      if (itemHasAny(text, ["生命值", "护甲", "魔法抗性", "减速", "格挡"])) push(16, "Frontline-Stats");
    } else if (profile === "enchanter") {
      if (itemHasAny(text, ["治疗", "护盾", "法力回复", "法术强度", "技能急速"])) push(16, "Support-Utility");
    } else {
      if (itemHasAny(text, ["攻击力", "生命值", "技能急速", "吸血"])) push(14, "Fighter-Allround");
    }

    if (myRole === "Baron" && itemHasAny(text, ["生命值", "护甲", "回复", "吸血"])) push(5, "Lane-Duel Sustain");
    if (myRole === "Mid" && itemHasAny(text, ["法力", "法术强度", "冷却"])) push(5, "Mid Tempo/Wave");
    if (myRole === "Jungle" && itemHasAny(text, ["移动速度", "技能急速", "穿透"])) push(5, "Jungle Tempo");
    if (myRole === "ADC" && itemHasAny(text, ["暴击", "攻速", "吸血"])) push(5, "ADC Teamfight DPS");
    if (myRole === "Support" && itemHasAny(text, ["护盾", "治疗", "回复", "生命值", "魔法抗性"])) push(5, "Support Lane Value");

    if (enemy.has("hard_cc") || enemy.has("pointclick_cc")) {
      if (itemHasAny(text, ["韧性", "解控", "免疫", "净化", "魔法抗性"])) push(11, "Anti-CC");
    }
    if (enemy.has("assassin_burst") || enemy.has("mage_burst")) {
      if (itemHasAny(text, ["护甲", "魔法抗性", "生命值", "免疫", "护盾"])) push(10, "Anti-Burst");
    }
    if (enemy.has("tank") || enemy.has("hard_engage")) {
      if (itemHasAny(text, ["穿透", "百分比", "破甲", "法术穿透", "重伤"])) push(10, "Vs Frontline");
    }
    if (enemy.has("anti_auto") || enemy.has("fighter")) {
      if (itemHasAny(text, ["护甲", "攻速", "减速", "反伤", "格挡"])) push(9, "Anti-Auto/Fighter");
    }
    if (enemy.has("poke") || enemy.has("mage_poke")) {
      if (itemHasAny(text, ["回复", "生命值", "魔法抗性", "吸血", "治疗"])) push(8, "Anti-Poke Sustain");
    }

    if (mine.has("anti_tank") && itemHasAny(text, ["穿透", "破甲", "百分比"])) push(6, "Champion-Synergie");
    if (mine.has("hard_engage") && itemHasAny(text, ["移动速度", "生命值", "护甲", "魔法抗性"])) push(6, "Engage-Synergie");
    if (mine.has("assassin_burst") && itemHasAny(text, ["穿透", "攻击力", "技能急速"])) push(6, "Assassin-Synergie");
    if (mine.has("mage_burst") && itemHasAny(text, ["法术强度", "法术穿透", "冷却"])) push(6, "Mage-Synergie");

    if (itemHasAny(text, ["唯一被动", "唯一主动", "装备急速"])) push(2, "Item Quality");

    return { score, reasons: Array.from(new Set(reasons)).slice(0, 2) };
  }

  function smartCoreBuild(myChamp, myRole, profile, myTypesRaw, enemyChamp, enemyTypesRaw) {
    if (!liveItemDb?.length) return fallbackTemplateBuild(profile);
    const pool = liveItemDb.filter((item) => item?.name && !isBootOrEnchantItem(item));
    const scored = pool.map((item) => {
      const decision = scoreItemForMatchup(item, profile, myRole, myTypesRaw, enemyTypesRaw);
      return { item, score: decision.score, reasons: decision.reasons };
    }).filter((x) => x.score > 8).sort((a, b) => b.score - a.score);

    const selected = [];
    const seen = new Set();
    for (const row of scored) {
      const name = String(row.item?.name || "");
      if (!name || seen.has(name)) continue;
      selected.push({
        name: localizedName("items", name, row.item?.nativeName || name),
        nativeName: name,
        icon: row.item?.iconPath || fallbackItemIcon(),
        why: `Vs ${enemyChamp.name}: ${row.reasons.join(" + ") || "Matchup-Wert"}`,
        stats: row.item?.description || ""
      });
      seen.add(name);
      if (selected.length >= 5) break;
    }

    return selected.length >= 5 ? selected : fallbackTemplateBuild(profile);
  }

  function adaptBuildToEnemy(enemyTypesRaw, profile, myRole) {
    const set = new Set(enemyTypesRaw || []);
    const out = [];
    if (set.has("hard_cc") || set.has("pointclick_cc")) {
      out.push(buildWrItem(["水银饰带", "银饰", "中娅沙漏"], "Gegen harte CC-Ketten einbauen.", "Quicksilver / Stasis"));
    }
    if (set.has("poke") || set.has("mage_poke") || set.has("mage_burst")) {
      out.push(buildWrItem(["振奋盔甲", "饮魔刀", "自然之力"], "Defensiv-Option gegen hohen Magic-Burst.", "MR Defensive"));
    }
    if (set.has("anti_auto") || set.has("fighter")) {
      out.push(buildWrItem(["冰霜之心", "兰顿之兆", "荆棘之甲"], "Gegen Auto-Attack-Druck priorisieren.", "Armor Counter"));
    }
    if ((profile === "marksman" || myRole === "ADC") && (set.has("tank") || set.has("hard_engage"))) {
      out.push(buildWrItem(["凡性的提醒"], "Früh gegen Frontline + Heal kaufen.", "Mortal Reminder"));
    }
    return out;
  }


  function startingItemForProfile(profile, myRole) {
    if (myRole === "Jungle") return buildWrItem(["灼灼星火", "Shimmering Spark"], "Jungle Start für schnelleres Clear/Tempo.", "Shimmering Spark");
    if (profile === "enchanter" || profile === "tank_support" || myRole === "Support") {
      return buildWrItem(["幽魂镰刀", "Spectral Sickle"], "Support Start für Gold-Generation und Harass.", "Spectral Sickle");
    }
    if (profile === "marksman") return buildWrItem(["长剑"], "Solider AD-Start für frühe Lane-Prio.", "Long Sword");
    if (profile === "mage" || profile === "enchanter") return buildWrItem(["增幅典籍"], "AP-Start für Wave/Trade-Control.", "Amplifying Tome");
    return buildWrItem(["红水晶"], "Stabiler Start für sichere Trades.", "Ruby Crystal");
  }

  function chooseBootEnchant(enemyTypesRaw, profile) {
    const set = new Set(enemyTypesRaw || []);
    if (set.has("hard_cc") || set.has("pointclick_cc")) {
      return buildWrItem(["水银饰带", "银饰"], "Gegen Hard-CC als Enchant priorisieren.", "Quicksilver Enchant");
    }
    if (profile === "tank" || profile === "tank_support" || set.has("hard_engage")) {
      return buildWrItem(["石像鬼石板甲", "石板甲"], "Für Frontline-Engages im Mid/Late.", "Gargoyle Enchant");
    }
    return buildWrItem(["中娅沙漏", "中娅"], "Sicherer Defensiv-Enchant gegen Burst.", "Stasis Enchant");
  }

  function roleLabelForBuild(role, profile) {
    if (role) return role;
    if (profile === "tank_support" || profile === "enchanter") return "Support";
    return "Standard";
  }

  function matchupFullItemBuild(myChamp, myRole, myTypesRaw, enemyChamp, enemyTypesRaw) {
    const profile = inferChampProfile(myChamp, myRole, myTypesRaw);
    const starter = startingItemForProfile(profile, myRole);
    const boots = chooseBootsByMatchup(enemyTypesRaw, profile);
    const enchant = chooseBootEnchant(enemyTypesRaw, profile);

    const coreTemplate = smartCoreBuild(myChamp, myRole, profile, myTypesRaw, enemyChamp, enemyTypesRaw);
    const coreItems = coreTemplate.slice(0, 3);
    const finalBuild = [...coreItems, ...coreTemplate.slice(3, 5), boots, enchant].slice(0, 6);
    const situational = adaptBuildToEnemy(enemyTypesRaw, profile, myRole).slice(0, 3);

    return {
      profile,
      roleLabel: roleLabelForBuild(myRole, profile),
      source: `Wild Rift Library (Tencent) Patch ${liveItemPatch}`,
      starter,
      boots,
      enchant,
      coreItems,
      finalBuild,
      situational,
      summary: `${myChamp.name}: ${myRole || profile} Build vs ${enemyChamp.name} (Start → Core → Boots/Enchant → Final).`
    };
  }

  async function loadLivePatchnotes(ts) {
    try {
      const live = await loadJson(`./data/patch_notes_live.json?ts=${ts}`);
      if (live && typeof live === "object") {
        patchNotesData = {
          patch: String(live.patch || DEFAULT_PATCH_NOTES.patch),
          championBuffs: Array.isArray(live.championBuffs) ? live.championBuffs : [],
          championNerfs: Array.isArray(live.championNerfs) ? live.championNerfs : [],
          itemChanges: Array.isArray(live.itemChanges) ? live.itemChanges : []
        };
      }
    } catch {
      patchNotesData = JSON.parse(JSON.stringify(DEFAULT_PATCH_NOTES));
    }
    patchContext = patchNotesData.patch || DEFAULT_PATCH_NOTES.patch;
  }

  async function loadLocalizationEn(ts) {
    try {
      const localized = await loadJson(`./data/localization_en.json?ts=${ts}`);
      localizationDb = {
        items: localized?.items || {},
        runes: localized?.runes || {},
        summonerSpells: localized?.summonerSpells || {}
      };
    } catch {
      localizationDb = { items: {}, runes: {}, summonerSpells: {} };
    }
  }

  async function loadChampionAbilities(ts) {
    try {
      const data = await loadJson(`./data/champion_abilities_en.json?ts=${ts}`);
      championAbilityDb = data?.champions || {};
    } catch {
      championAbilityDb = {};
    }
  }

  async function loadLiveRuneData() {
    if (liveCatalogData?.runes?.length) {
      liveRuneDb = liveCatalogData.runes;
      return;
    }
    try {
      const runeData = await loadJson(WR_RUNE_URL);
      liveRuneDb = Array.isArray(runeData?.runeList) ? runeData.runeList : [];
    } catch {
      liveRuneDb = [];
    }
  }

  async function loadLiveSkillData() {
    if (liveCatalogData?.summonerSpells?.length) {
      liveSkillDb = liveCatalogData.summonerSpells;
      return;
    }
    try {
      const skillData = await loadJson(WR_SKILL_URL);
      liveSkillDb = Array.isArray(skillData?.skillList) ? skillData.skillList : [];
    } catch {
      liveSkillDb = [];
    }
  }

  async function loadLiveItemData() {
    if (liveCatalogData?.items?.length) {
      liveItemDb = liveCatalogData.items.map((x) => ({
        name: localizedName("items", x.name, x.name),
        nativeName: x.name,
        iconPath: x.icon,
        description: x.description,
        labels: x.labels,
        price: x.price
      }));
      liveItemPatch = liveCatalogData?.versions?.items || "–";
      return;
    }
    try {
      const equipData = await loadJson(WR_EQUIP_URL);
      liveItemPatch = equipData?.version || "–";
      liveItemDb = Array.isArray(equipData?.equipList)
        ? equipData.equipList.map((x, idx) => ({
            ...x,
            nativeName: x?.name,
            name: localizedName("items", x?.name, x?.name || "Unknown Item")
          }))
        : null;
    } catch (err) {
      console.warn("Wild Rift item data unavailable, fallback names/icons only", err);
      liveItemPatch = "–";
      liveItemDb = null;
    }
  }

  async function loadLiveCatalog(ts) {
    try {
      const catalog = await loadJson(`./data/live_catalog.json?ts=${ts}`);
      if (!catalog || typeof catalog !== "object") {
        liveCatalogData = null;
        return;
      }
      liveCatalogData = catalog;
      if (Array.isArray(catalog.champions) && catalog.champions.length) {
        for (const champ of catalog.champions) {
          if (!champ?.hero_id) continue;
          if (!heroDb[String(champ.hero_id)]) {
            heroDb[String(champ.hero_id)] = {
              hero_id: String(champ.hero_id),
              name: champ.name,
              title: champ.title,
              lane: champ.lane,
              roles: champ.roles
            };
          }
        }
      }
    } catch {
      liveCatalogData = null;
    }
  }

  function renderMatchupView({ animate = false } = {}) {
    if (!allChamps.length || !matchupResults) return;

    const myChamp = getChampionByName(matchupChampA?.value);
    const enemyChamp = getChampionByName(matchupChampB?.value);

    matchupResults.innerHTML = "";
    if (!myChamp || !enemyChamp) {
      matchupResults.innerHTML = `<div class="card"><div class="k">Info</div><div class="v">Wähle deinen Champion + Gegner und drücke Analyse.</div></div>`;
      return;
    }

    const myWin = matchupMetric(myChamp, "win");
    const enemyWin = matchupMetric(enemyChamp, "win");
    const myPick = matchupMetric(myChamp, "pick");
    const enemyBan = matchupMetric(enemyChamp, "ban");

    const myPower = matchupPower(myChamp, "");
    const enemyPower = matchupPower(enemyChamp, "");
    const delta = myPower - enemyPower;
    const favored = delta >= 0 ? myChamp.name : enemyChamp.name;
    const difficulty = difficultyFromDelta(delta);

    const myRole = matchupLane?.value || rolesForHero(myChamp.hero_id)[0] || "Jungle";
    const myTypesRaw = champTypes(myChamp.name);
    const myTypes = myTypesRaw.map(labelTag);
    const enemyTypesRaw = champTypes(enemyChamp.name);

    const guide = guideByEnemyTypes(enemyTypesRaw, myChamp, enemyChamp, delta);
    const timelinePlan = buildTimelinePlan(guide, myChamp, enemyChamp, myRole, difficulty);
    const itemBuild = matchupFullItemBuild(myChamp, myRole, myTypesRaw, enemyChamp, enemyTypesRaw);
    const myAdvantageLabel = favored === myChamp.name ? "Besser" : "Schwer";
    const enemyAdvantageLabel = favored === enemyChamp.name ? "Besser" : "Schwer";

    matchupResults.innerHTML = `
      <section class="matchupBoard">
        <div class="matchupBoardGrid">
          <article class="mbCol mbDuel">
            <div class="mbDuelWrap">
              <div class="mbChampCard ally">
                <img src="${myChamp.icon}" alt="${myChamp.name}" loading="lazy" />
                <div class="mbChampName">${myChamp.name}</div>
                <div class="mbPill">${myAdvantageLabel}</div>
              </div>
              <div class="mbVS ${animate ? 'vsFlash' : ''}">VS</div>
              <div class="mbChampCard enemy">
                <img src="${enemyChamp.icon}" alt="${enemyChamp.name}" loading="lazy" />
                <div class="mbChampName">${enemyChamp.name}</div>
                <div class="mbPill">${enemyAdvantageLabel}</div>
              </div>
            </div>
          </article>

          <article class="mbCol">
            <div class="mbTitle">Match-Plan (${myRole}) für ${myChamp.name}</div>
            <div class="timelineStack">
              ${timelinePlan.map((phase)=>`
                <section class="timelineCard">
                  <div class="timelineTitle">${phase.title}</div>
                  <ul class="timelineList">
                    ${phase.steps.map((step)=>`<li>${step}</li>`).join('')}
                  </ul>
                </section>
              `).join('')}
            </div>
          </article>

          <article class="mbCol mbItems">
            <div class="mbTitle">Konkrete Item-Antwort gegen ${enemyChamp.name}</div>
            <div class="tinyNote">Rolle: ${itemBuild.roleLabel} • ${itemBuild.summary}</div>

            <div class="itemPhaseGrid">
              <div class="itemPhaseCard">
                <div class="itemPhaseTitle">Start</div>
                <div class="itemIconRow single">
                  <div class="itemBubble"><img src="${itemBuild.starter.icon}" alt="${itemBuild.starter.name}" loading="lazy" /><span>${itemBuild.starter.name}</span></div>
                </div>
              </div>

              <div class="itemPhaseCard">
                <div class="itemPhaseTitle">Core (1-3)</div>
                <div class="itemIconRow">
                  ${itemBuild.coreItems.map((it)=>`<div class="itemBubble"><img src="${it.icon}" alt="${it.name}" loading="lazy" /><span>${it.name}</span></div>`).join('')}
                </div>
              </div>

              <div class="itemPhaseCard">
                <div class="itemPhaseTitle">Boots → Enchant</div>
                <div class="itemBootsFlow">
                  <div class="itemBubble"><img src="${itemBuild.boots.icon}" alt="${itemBuild.boots.name}" loading="lazy" /><span>${itemBuild.boots.name}</span></div>
                  <div class="itemArrow">→</div>
                  <div class="itemBubble"><img src="${itemBuild.enchant.icon}" alt="${itemBuild.enchant.name}" loading="lazy" /><span>${itemBuild.enchant.name}</span></div>
                </div>
              </div>

              <div class="itemPhaseCard">
                <div class="itemPhaseTitle">Final Build</div>
                <div class="itemIconRow">
                  ${itemBuild.finalBuild.map((it)=>`<div class="itemBubble"><img src="${it.icon}" alt="${it.name}" loading="lazy" /><span>${it.name}</span></div>`).join('')}
                </div>
              </div>
            </div>

            ${itemBuild.situational.length ? `<div class="itemSwaps">${itemBuild.situational.map((x) => `<span>${x.name}</span>`).join('')}</div>` : ''}
          </article>
        </div>
      </section>
    `;
  }


  function renderPatchnotesView() {
    if (!patchnotesGrid || !patchnotesSummary) return;
    patchnotesSummary.textContent = `Patch ${patchContext}: Live ausgewertet für Champions, Items, Runen und Summoner Spells.`;

    const shortChampionPatchText = (entry, direction) => {
      const arrow = direction === "buff" ? "↑" : "↓";
      const delta = Number(entry?.delta || 0);
      const absDelta = Math.abs(delta).toFixed(1);
      const note = String(entry?.note || "").trim();
      const firstPart = note.split(/[.!?]/).map((x) => x.trim()).find(Boolean) || "Änderung erkannt";
      return `${arrow} ${absDelta}: ${firstPart}`;
    };

    const championBuffCards = (patchNotesData.championBuffs || []).map((x) => {
      const champ = getChampionByName(x.name);
      return `<article class="highlightCard pnCard pnUp"><div class="highlightTitle">Champion Buff</div><div class="highlightMain">${champ ? `<img src="${champ.icon}" alt="${x.name}" loading="lazy" />` : ''} ${x.name}</div><div class="tinyNote">${shortChampionPatchText(x, "buff")}</div></article>`;
    }).join('');

    const championNerfCards = (patchNotesData.championNerfs || []).map((x) => {
      const champ = getChampionByName(x.name);
      return `<article class="highlightCard pnCard pnDown"><div class="highlightTitle">Champion Nerf</div><div class="highlightMain">${champ ? `<img src="${champ.icon}" alt="${x.name}" loading="lazy" />` : ''} ${x.name}</div><div class="tinyNote">${shortChampionPatchText(x, "nerf")}</div></article>`;
    }).join('');

    const itemCards = (patchNotesData.itemChanges || []).map((x) => {
      const dir = x.direction === "buff" ? "pnUp" : x.direction === "nerf" ? "pnDown" : "pnNeutral";
      return `<article class="highlightCard pnCard ${dir}"><div class="highlightTitle">Item ${x.direction}</div><div class="highlightMain">${x.name}</div><div class="tinyNote">${x.note}</div></article>`;
    }).join('');

    const coverageCard = `<article class="highlightCard pnCard pnNeutral"><div class="highlightTitle">Live Catalog</div><div class="highlightMain">${allChamps.length} Champions</div><div class="tinyNote">${liveItemDb?.length || 0} Items • ${liveRuneDb.length} Runen • ${liveSkillDb.length} Summoner Spells</div></article>`;
    const newCatalogParts = [
      `+${liveCatalogData?.diff?.newChampions?.length || 0} Champions`,
      `+${liveCatalogData?.diff?.newItems?.length || 0} Items`,
      `+${liveCatalogData?.diff?.newRunes?.length || 0} Runen`,
      `+${liveCatalogData?.diff?.newSummonerSpells?.length || 0} Spells`
    ];
    const liveDeltaCard = `<article class="highlightCard pnCard pnNeutral"><div class="highlightTitle">Auto Delta</div><div class="highlightMain">Patch-Zyklus erkannt</div><div class="tinyNote">${newCatalogParts.join(" • ")}</div></article>`;

    patchnotesGrid.innerHTML = coverageCard + liveDeltaCard + championBuffCards + championNerfCards + itemCards;
  }

  function thresholdsForList(list) {
    const scores = list.map(c => metaScore(c)).sort((a, b) => b - a);
    const q = (p) => scores[Math.floor(p * (scores.length - 1))] ?? 0;
    return { ss: q(0.05), s: q(0.15), a: q(0.35), b: q(0.65) };
  }

  function tierPresence(c) {
    return matchupMetric(c, "pick") + matchupMetric(c, "ban");
  }

  function sortTierGroup(list, mode) {
    if (mode === "win") return list.sort((a,b)=>matchupMetric(b, "win") - matchupMetric(a, "win"));
    if (mode === "presence") return list.sort((a,b)=>tierPresence(b) - tierPresence(a));
    return list.sort((a,b)=>metaScore(b) - metaScore(a));
  }

  function renderTierHighlights(pool) {
    if (!tierlistHighlights) return;
    const byMeta = [...pool].sort((a,b)=>metaScore(b)-metaScore(a))[0];
    const byWin = [...pool].sort((a,b)=>matchupMetric(b, "win")-matchupMetric(a, "win"))[0];
    const byPresence = [...pool].sort((a,b)=>tierPresence(b)-tierPresence(a))[0];
    const card = (title, champ, value) => champ ? `
      <article class="highlightCard">
        <div class="highlightTitle">${title}</div>
        <div class="highlightMain"><img src="${champ.icon}" alt="${champ.name}" loading="lazy" /> ${champ.name}</div>
        <div class="tinyNote">${value}</div>
      </article>` : "";
    tierlistHighlights.innerHTML = [
      card("Top Meta", byMeta, `Score ${metaScore(byMeta).toFixed(1)}`),
      card("Beste Winrate", byWin, `${fmtPct(matchupMetric(byWin, "win"))}`),
      card("Höchste Presence", byPresence, `${tierPresence(byPresence).toFixed(2)}%`)
    ].join("");
  }

  function renderTierlistView() {
    if (!tierlistSections) return;
    const role = tierlistRole?.value || "";
    const sortMode = tierlistSort?.value || "meta";
    const pool = role ? allChamps.filter(c => rolesForHero(c.hero_id).includes(role)) : allChamps.slice();

    if (!pool.length) {
      if (tierlistHighlights) tierlistHighlights.innerHTML = "";
      tierlistSections.innerHTML = `<div class="card"><div class="k">Info</div><div class="v">Keine Champions für diese Rolle gefunden.</div></div>`;
      return;
    }

    renderTierHighlights(pool);

    const th = role ? thresholdsForRole(role) : thresholdsForList(pool);
    const groups = { SS: [], S: [], A: [], B: [], C: [] };
    for (const c of pool) groups[tierForScore(metaScore(c), th)].push(c);
    for (const tier of Object.keys(groups)) sortTierGroup(groups[tier], sortMode);

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
    viewPatchnotes?.classList.toggle("hidden", tab !== "patchnotes");
    if (tab === "matchup") renderMatchupView();
    if (tab === "tierlist") renderTierlistView();
    if (tab === "patchnotes") renderPatchnotesView();
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
  matchupLane?.addEventListener("change", renderMatchupView);
  matchupChampA?.addEventListener("change", renderMatchupView);
  matchupChampB?.addEventListener("change", renderMatchupView);
  matchupAnalyse?.addEventListener("click", ()=>renderMatchupView({ animate:true }));
  tierlistRole?.addEventListener("change", renderTierlistView);
  tierlistSort?.addEventListener("change", renderTierlistView);

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

      await loadLiveCatalog(ts);
      await Promise.all([
        loadLocalizationEn(ts),
        loadChampionAbilities(ts)
      ]);
      mergeAllChampionsFromHeroDb();

      try {
        const tags = await loadJson(`./champ_tags.json?ts=${ts}`);
        tagDb = tags || {};
        defaultWeakByRole = tagDb._defaults || {};
      } catch { tagDb = {}; defaultWeakByRole = {}; }

      await Promise.all([
        loadLivePatchnotes(ts),
        loadLiveItemData(),
        loadLiveRuneData(),
        loadLiveSkillData()
      ]);

      if (patchPill) patchPill.textContent = `Patch: ${patchContext}`;
      updateTrends();

      statusEl.textContent = `Geladen: ${allChamps.length} Champions • ${liveItemDb?.length || 0} Items • ${liveRuneDb.length} Runen`;
      statusEl.style.display = "block";

      const fallbackA = allChamps.find((c) => c.name === "Amumu")?.name || allChamps[0]?.name;
      const fallbackB = allChamps.find((c) => c.name === "Dr. Mundo")?.name || allChamps[1]?.name || allChamps[0]?.name;
      fillChampionSelect(matchupChampA, fallbackA);
      fillChampionSelect(matchupChampB, fallbackB);
      if (matchupLane && !matchupLane.value) matchupLane.value = "Jungle";

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
      renderPatchnotesView();
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
