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
  const matchupGold = $("matchupGold");
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
  let liveItemLookup = new Map();
  let championAliasLookup = new Map();
  let liveRuneDb = [];
  let liveSkillDb = [];
  let liveCatalogData = null;
  let patchTruthData = null;
  let patchTruthItemByName = new Map();
  let patchTruthChampionByName = new Map();
  let localizationDb = { items: {}, runes: {}, summonerSpells: {} };
  let championAbilityDb = {};
  let championModelDb = {};
  let championModelVersion = "–";
  let matchupItemDb = [];
  let matchupChampionDb = {};

  const WR_ALIAS_TO_EN_CHAMPION = {
    sunwukong: "Wukong",
    liqing: "Lee Sin",
    kegemo: "Kog'Maw",
    weikezi: "Vel'Koz",
    nuola: "Norra"
  };

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

  function championDisplayName(catalogChamp, existingChampName = "") {
    const alias = normalizeText(catalogChamp?.alias || "");
    if (alias && WR_ALIAS_TO_EN_CHAMPION[alias]) return WR_ALIAS_TO_EN_CHAMPION[alias];
    if (existingChampName) return existingChampName;
    return String(catalogChamp?.name || catalogChamp?.title || "Unknown");
  }

  function getChampionByName(name) {
    if (!name) return null;
    const raw = String(name);
    const n = normalizeText(raw);
    const direct = allChamps.find((c) => normalizeText(c.name) === n);
    if (direct) return direct;

    const aliasTarget = championAliasLookup.get(normalizeLookupKey(raw));
    if (aliasTarget) {
      const aliased = allChamps.find((c) => normalizeText(c.name) === normalizeText(aliasTarget));
      if (aliased) return aliased;
    }
    return null;
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

  function toNumber(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
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

  function normalizeLookupKey(v) {
    return normalizeText(v).replace(/['"`´’‘\-_.()\[\]{}:;,+/\|!?]/g, "").replace(/\s+/g, "");
  }

  function registerItemLookup(item, aliases = []) {
    if (!item) return;
    const keys = [item.name, item.nativeName, item.itemId, ...(aliases || [])];
    for (const k of keys) {
      const nk = normalizeLookupKey(k || "");
      if (!nk) continue;
      if (!liveItemLookup.has(nk)) liveItemLookup.set(nk, item);
    }
  }

  function translatedItemName(nativeName) {
    const translated = localizedName("items", nativeName, nativeName);
    const bad = /^(item\s+\d+|unknown item)$/i.test(String(translated || "").trim());
    return bad ? nativeName : translated;
  }

  function findWildRiftItem(candidates = []) {
    if (!liveItemDb?.length) return null;
    const variants = itemCandidateVariants(candidates);
    for (const raw of variants) {
      const nk = normalizeLookupKey(raw);
      if (nk && liveItemLookup.has(nk)) return liveItemLookup.get(nk);
    }

    const exact = variants.map(normalizeText).filter(Boolean);
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
    const native = found?.nativeName || found?.name || "";
    const translated = native ? translatedItemName(native) : (fallbackName || candidates[0] || "Item");
    return {
      name: translated,
      nativeName: native,
      icon: found?.iconPath || fallbackItemIcon(),
      why,
      stats: found?.description || ""
    };
  }

  function statProfileFromItem(item = {}) {
    return {
      ad: toNumber(item?.ad),
      ap: toNumber(item?.magicAttack),
      hp: toNumber(item?.hp),
      armor: toNumber(item?.armor),
      mr: toNumber(item?.magicBlock),
      haste: toNumber(item?.cd),
      attackSpeed: toNumber(item?.attackSpeed),
      crit: toNumber(item?.critRate),
      armorPenFlat: toNumber(item?.armorPene),
      armorPenPct: toNumber(item?.armorPeneRate),
      magicPenFlat: toNumber(item?.magicPene),
      magicPenPct: toNumber(item?.magicPeneRate),
      moveFlat: toNumber(item?.moveSpeed),
      movePct: toNumber(item?.moveRate),
      hpRegen: toNumber(item?.hpRegen) + toNumber(item?.hpRegenRate),
      mana: toNumber(item?.mp),
      manaRegen: toNumber(item?.mpRegen),
      lifesteal: toNumber(item?.healthPerAttack),
      spellvamp: toNumber(item?.healthPerMagic)
    };
  }

  function hasItemNumericData(item = {}) {
    const stats = statProfileFromItem(item);
    return Object.values(stats).some((v) => Number(v) > 0);
  }

  function itemHasEffectData(item = {}) {
    return Array.isArray(item?.effects) && item.effects.length > 0;
  }

  function getChampionModel(champName) {
    return championModelDb?.[String(champName || "").trim()] || null;
  }

  function championCombatProfile(model) {
    if (!model?.stats) return null;
    const st = model.stats;
    const abilities = Array.isArray(model.abilities) ? model.abilities : [];
    const cooldownPressure = abilities.reduce((acc, ab) => {
      const cds = Array.isArray(ab?.cooldown) ? ab.cooldown : [];
      const nums = cds.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0);
      const low = nums.length ? Math.min(...nums) : 0;
      return acc + (low > 0 ? (12 / low) : 0);
    }, 0);
    const ratioPressure = abilities.reduce((acc, ab) => {
      const ratios = Array.isArray(ab?.ratios) ? ab.ratios : [];
      return acc + ratios.reduce((sum, row) => sum + (Array.isArray(row?.coeff) ? row.coeff.reduce((n, x) => n + (Number(x) || 0), 0) : 0), 0);
    }, 0);
    return {
      offense: (toNumber(st.ad) * 0.7) + (cooldownPressure * 8) + (ratioPressure * 5),
      durability: (toNumber(st.hp) * 0.08) + (toNumber(st.armor) * 1.3) + (toNumber(st.mr) * 1.3),
      keywords: new Set(Array.isArray(model.keywords) ? model.keywords : [])
    };
  }

  function scoreLabel(v) {
    return Number.isFinite(Number(v)) ? String(v) : "0";
  }

  function itemMissingFields(item = {}) {
    const fields = ["price", "ad", "hp", "armor", "magicBlock", "attackSpeed", "magicAttack", "cd", "from", "effects"];
    const missing = [];
    for (const f of fields) {
      const v = item?.[f];
      if (f === "from") {
        if (!Array.isArray(v)) missing.push(f);
      } else if (f === "effects") {
        if (!Array.isArray(v) || !v.length) missing.push(f);
      } else if (v === undefined || v === null || v === "") {
        missing.push(f);
      }
    }
    return missing;
  }

  function championMissingFields(model = {}) {
    const missing = [];
    const s = model?.stats || {};
    const requiredStats = ["hp", "armor", "mr", "ad", "attack_speed", "move_speed"];
    for (const key of requiredStats) {
      const v = s?.[key];
      if (!Number.isFinite(Number(v))) missing.push(`stats.${key}`);
    }
    const abilities = Array.isArray(model?.abilities) ? model.abilities : [];
    if (!abilities.length) missing.push("abilities");
    if (!Array.isArray(model?.passive?.effects) || !model.passive.effects.length) missing.push("passive.effects");
    for (const slot of ["Q", "W", "E", "R"]) {
      const ab = abilities.find((x) => x?.slot === slot);
      if (!ab) {
        missing.push(`ability.${slot}`);
        continue;
      }
      if (!Array.isArray(ab?.cooldown) || !ab.cooldown.length) missing.push(`ability.${slot}.cooldown`);
      if (!Array.isArray(ab?.ratios)) missing.push(`ability.${slot}.ratios`);
      if (!Array.isArray(ab?.effects) || !ab.effects.length) missing.push(`ability.${slot}.effects`);
    }
    return missing;
  }

  function effectScoreContributions(effects = [], enemyTypesRaw = []) {
    const enemy = new Set(enemyTypesRaw || []);
    const out = [];
    for (const fx of (Array.isArray(effects) ? effects : [])) {
      if (!fx || typeof fx !== "object") continue;
      let score = 0;
      const t = String(fx.effect_type || "");
      if (t === "damage") score += 8;
      if (t === "healing" || t === "shield") score += 7;
      if (t === "anti_heal") score += enemy.has("sustain") ? 16 : 8;
      if (t === "penetration") score += enemy.has("tank") ? 14 : 7;
      if (t === "tenacity") score += (enemy.has("hard_cc") || enemy.has("pointclick_cc")) ? 14 : 6;
      if (t === "cc") score += 6;
      if (String(fx.trigger || "").toLowerCase().includes("onhit")) score += 2;
      if (fx.damage_type === "true") score += 5;
      if (Array.isArray(fx.conditions) && fx.conditions.includes("vs_low_hp")) score += 3;
      out.push({
        name: String(fx.effect_name || fx.name || fx.source_line || fx.effect_id || "effect"),
        trigger: String(fx.trigger || ""),
        effectType: t || "modifier",
        value: Math.round(score)
      });
    }
    return out.sort((a, b) => b.value - a.value);
  }

  function buildCoverageReport() {
    const items = Array.isArray(liveItemDb) ? liveItemDb : [];
    const champs = Object.entries(championModelDb || {});
    const itemReasons = {};
    const champReasons = {};

    const itemFullStats = items.filter((it) => hasItemNumericData(it)).length;
    const itemWithBuildPath = items.filter((it) => Array.isArray(it?.from) && it.from.length > 0).length;
    const itemWithEffects = items.filter((it) => itemHasEffectData(it)).length;
    const itemWithAutoEffects = items.filter((it) => {
      const src = String(it?.effectSource || it?.effect_source || "");
      return itemHasEffectData(it) && (src === "auto" || src === "truth_auto");
    }).length;

    const top50 = items.slice(0, 50);
    const top50Effects = top50.filter((it) => itemHasEffectData(it)).length;
    const coreTokens = ["死亡之舞", "神圣分离者", "斯特拉克", "冰脉", "荆棘之甲", "黑色切割者"];
    const core = items.filter((it) => coreTokens.some((t) => String(it?.nativeName || it?.name || "").includes(t)));
    const coreEffects = core.filter((it) => itemHasEffectData(it)).length;
    const autoExamples = items
      .filter((it) => { const src = String(it?.effectSource || it?.effect_source || ""); return itemHasEffectData(it) && (src === "auto" || src === "truth_auto"); })
      .slice(0, 3)
      .map((it) => translatedItemName(it?.nativeName || it?.name));

    for (const it of items) {
      for (const reason of itemMissingFields(it)) itemReasons[reason] = (itemReasons[reason] || 0) + 1;
      if (it?.effect_parse_status && it.effect_parse_status !== "ok" && it.effect_parse_status !== "override") {
        const k = `item_parse:${it.effect_parse_status}`;
        itemReasons[k] = (itemReasons[k] || 0) + 1;
      }
    }

    let champStatsComplete = 0;
    let champAbilitiesComplete = 0;
    let champEffectsComplete = 0;
    for (const [, model] of champs) {
      const missing = championMissingFields(model);
      if (!missing.some((x) => x.startsWith("stats."))) champStatsComplete += 1;
      if (!missing.some((x) => x.startsWith("ability") || x === "abilities")) champAbilitiesComplete += 1;
      if (!missing.some((x) => x.includes(".effects") || x === "passive.effects")) champEffectsComplete += 1;
      for (const reason of missing) champReasons[reason] = (champReasons[reason] || 0) + 1;
      if (model?.passive?.effect_parse_status && model.passive.effect_parse_status !== "ok") {
        const k = `champ_parse:${model.passive.effect_parse_status}`;
        champReasons[k] = (champReasons[k] || 0) + 1;
      }
    }

    const top30 = champs.slice(0, 30);
    const top30Effects = top30.filter(([, model]) => !championMissingFields(model).some((x) => x.includes(".effects") || x === "passive.effects")).length;

    const topItemMissing = Object.entries(itemReasons).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topChampMissing = Object.entries(champReasons).sort((a, b) => b[1] - a[1]).slice(0, 5);

    return {
      items: {
        total: items.length,
        fullStats: itemFullStats,
        buildPathReady: itemWithBuildPath,
        withEffects: itemWithEffects,
        withAutoEffects: itemWithAutoEffects,
        top50WithEffects: top50Effects,
        coreWithEffects: coreEffects,
        coreTotal: core.length,
        autoExamples,
      },
      champions: {
        total: champs.length,
        statsReady: champStatsComplete,
        abilitiesReady: champAbilitiesComplete,
        effectsReady: champEffectsComplete,
        top30EffectsReady: top30Effects,
      },
      topMissingReasons: {
        items: topItemMissing,
        champions: topChampMissing,
      }
    };
  }

  function findChampionByNameLoose(name) {
    const n = normalizeText(name);
    return allChamps.find((c) => normalizeText(c?.name) === n)
      || allChamps.find((c) => normalizeText(c?.name).includes(n) || n.includes(normalizeText(c?.name)));
  }

  function runGoldenMatchupsReport() {
    const golden = [
      { my: "Amumu", enemy: "Dr. Mundo", lane: "Jungle", enemySwap: "Master Yi" },
      { my: "Yasuo", enemy: "Annie", lane: "Mid", enemySwap: "Galio" },
      { my: "Jinx", enemy: "Leona", lane: "ADC", enemySwap: "Lulu" }
    ];
    return golden.map((g) => {
      const my = findChampionByNameLoose(g.my);
      const enemy = findChampionByNameLoose(g.enemy);
      const swap = findChampionByNameLoose(g.enemySwap);
      if (!my || !enemy || !swap) {
        return { ...g, status: "fail", reason: "Champion mapping failed" };
      }
      const myTypesRaw = champTypes(my.name);
      const enemyTypesRaw = champTypes(enemy.name);
      const swapTypesRaw = champTypes(swap.name);

      const build900 = matchupFullItemBuild(my, g.lane, myTypesRaw, enemy, enemyTypesRaw, 900);
      const build2400 = matchupFullItemBuild(my, g.lane, myTypesRaw, enemy, enemyTypesRaw, 2400);
      const buildSwap = matchupFullItemBuild(my, g.lane, myTypesRaw, swap, swapTypesRaw, 1400);

      const cards = [build900?.scoredTier?.best, build900?.scoredTier?.alternative, build900?.scoredTier?.situational].filter(Boolean);
      const cardMissing = cards.map((x) => {
        const miss = [];
        for (const f of ["offensive", "defensive", "counter", "synergy", "goldEfficiency", "spikeTiming"]) {
          if (!Number.isFinite(Number(x?.categories?.[f]))) miss.push(`categories.${f}`);
        }
        if (!Array.isArray(x?.effects) || !x.effects.length) miss.push("effects");
        return { item: x?.name || x?.nativeName || "unknown", missing: miss, dataMissing: x?.dataMissing || null };
      });
      const hasNA = cardMissing.some((x) => x.missing.length > 0);
      const nextBuyShift = (build900?.nextBuy?.component?.itemId || build900?.nextBuy?.item?.itemId || build900?.nextBuy?.item?.name) !== (build2400?.nextBuy?.component?.itemId || build2400?.nextBuy?.item?.itemId || build2400?.nextBuy?.item?.name);
      const matchupShift = (build900?.scoredTier?.best?.nativeName || build900?.scoredTier?.best?.name) !== (buildSwap?.scoredTier?.best?.nativeName || buildSwap?.scoredTier?.best?.name);

      return {
        ...g,
        resolved: `${my.name} vs ${enemy.name}`,
        status: (!hasNA && nextBuyShift && matchupShift) ? "ok" : "fail",
        reason: hasNA
          ? `Contains N/A score card: ${cardMissing.filter((x)=>x.missing.length).map((x)=>`${x.item}[${x.missing.join("|")}]`).join("; ")}`
          : (!nextBuyShift ? "Next-buy did not change across gold states" : (!matchupShift ? "Best choice not matchup-sensitive" : "All checks passed")),
        missingFields: cardMissing
      };
    });
  }

  function renderDebugPanel(itemBuild, myChamp, enemyChamp) {
    const report = buildCoverageReport();
    const golden = runGoldenMatchupsReport();
    const allItems = [itemBuild.starter, ...(itemBuild.coreItems || []), ...(itemBuild.finalBuild || []), itemBuild.boots, itemBuild.enchant]
      .filter(Boolean)
      .map((it) => findWildRiftItem([it.nativeName || it.name]))
      .filter(Boolean);
    const uniqueItems = Array.from(new Map(allItems.map((x) => [x.itemId || x.name, x])).values());

    const champRows = [myChamp, enemyChamp].map((c) => {
      const model = getChampionModel(c?.name);
      const miss = championMissingFields(model);
      return `<li><b>${c?.name}</b> • src: champion_models.json@${championModelVersion} • missing_fields: ${miss.length ? miss.join(", ") : "none"}</li>`;
    }).join("");

    const itemRows = uniqueItems.map((it) => {
      const miss = itemMissingFields(it);
      const st = statProfileFromItem(it);
      const effectCount = Array.isArray(it?.effects) ? it.effects.length : 0;
      const src = `live_catalog/equip patch ${liveItemPatch} + ${it?.effectSource || "auto"}`;
      return `<li><b>${translatedItemName(it?.nativeName || it?.name)}</b> • src: ${src} • price=${toNumber(it?.price)} • ad=${st.ad} ap=${st.ap} hp=${st.hp} armor=${st.armor} mr=${st.mr} haste=${st.haste} as=${st.attackSpeed} • effects=${effectCount} • build_from=${Array.isArray(it?.from) ? it.from.join("/") : "-"} • missing_fields: ${miss.length ? miss.join(", ") : "none"}</li>`;
    }).join("");

    const topFx = [itemBuild.scoredTier?.best, itemBuild.scoredTier?.alternative, itemBuild.scoredTier?.situational]
      .filter(Boolean)
      .flatMap((x) => (Array.isArray(x.effectContrib) ? x.effectContrib : []).map((fx) => ({ ...fx, item: x.name })))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const dd = (Array.isArray(liveItemDb) ? liveItemDb : []).find((x) => /死亡之舞|death's dance/i.test(String(x?.nativeName || x?.name || "")));
    const ddProof = Array.isArray(dd?.effects) ? dd.effects.slice(0, 4) : [];
    const amumuModel = getChampionModel("Amumu") || getChampionModel(findChampionByNameLoose("Amumu")?.name);
    const amumuQ = (amumuModel?.abilities || []).find((x) => x?.slot === "Q");
    const amumuR = (amumuModel?.abilities || []).find((x) => x?.slot === "R");

    return `
      <details class="debugPanel">
        <summary>Show Data Used / Coverage Debug</summary>
        <div class="debugGrid">
          <div>
            <h4>Sources</h4>
            <ul>
              <li>Effect Strategy: <b>Hybrid</b> (Auto-Import + Curated Effect Library for high-impact/core items)</li>
              <li>Items: Tencent WR equip.js / live_catalog.json (patch ${liveItemPatch})</li>
              <li>Champions: champion_models.json (version ${championModelVersion})</li>
              <li>Patch Intel: patch_notes_live.json (${patchContext})</li>
            </ul>
            <h4>Champion Data Used</h4>
            <ul>${champRows}</ul>
            <h4>Item Data Used</h4>
            <ul>${itemRows || "<li>none</li>"}</ul>
          </div>
          <div>
            <h4>Coverage Report</h4>
            <ul>
              <li>Items full stats: ${report.items.fullStats}/${report.items.total}</li>
              <li>Items build path ready: ${report.items.buildPathReady}/${report.items.total}</li>
              <li>Items with effects ≥1: ${report.items.withEffects}/${report.items.total}</li>
              <li>Auto-filled effects coverage: ${report.items.withAutoEffects}/${report.items.total} (ohne curated)</li>
              <li>Core items with effects: ${report.items.coreWithEffects}/${report.items.coreTotal} (target 100%)</li>
              <li>Top50 items with effects: ${report.items.top50WithEffects}/50 (target ≥95%)</li>
              <li>Champ stats ready: ${report.champions.statsReady}/${report.champions.total}</li>
              <li>Champ abilities ready: ${report.champions.abilitiesReady}/${report.champions.total}</li>
              <li>Champ ability+passive effects: ${report.champions.effectsReady}/${report.champions.total}</li>
              <li>Top30 champs effect-ready: ${report.champions.top30EffectsReady}/30 (target ≥95%)</li>
            </ul>
            <h4>Top Missing Reasons</h4>
            <div class="tinyNote">Items: ${report.topMissingReasons.items.map(([k, v]) => `${k}(${v})`).join(", ") || "none"}</div>
            <div class="tinyNote">Champs: ${report.topMissingReasons.champions.map(([k, v]) => `${k}(${v})`).join(", ") || "none"}</div>
            <div class="tinyNote">Auto-filled examples (3): ${report.items.autoExamples.join(", ") || "none"}</div>
            <h4>Top Effect Contributors (Fight Window)</h4>
            <ul>
              ${topFx.map((f) => `<li>${f.item}: ${f.name} [${f.trigger}/${f.effectType}] +${f.value}</li>`).join("") || "<li>none</li>"}
            </ul>
            <h4>Proof: Death's Dance Effect Blocks</h4>
            <ul>
              ${ddProof.map((e) => `<li>${e.name} | trigger=${e.trigger} | values=${(e.values || []).join("/")} | cd=${e.cooldown ?? "-"} | cond=${(e.conditions || []).join("/") || "none"}</li>`).join("") || "<li>not found</li>"}
            </ul>
            <h4>Proof: Amumu Q/R Ability Data</h4>
            <ul>
              ${amumuQ ? `<li>Q: base=${amumuQ.base_damage || "-"} ratio=${JSON.stringify(amumuQ.ratios || [])} cd=${(amumuQ.cooldown || []).join('/')} cc=${amumuQ.cc_duration ?? '-'} dtype=${amumuQ.damage_type || '-'}</li>` : "<li>Q missing</li>"}
              ${amumuR ? `<li>R: base=${amumuR.base_damage || "-"} ratio=${JSON.stringify(amumuR.ratios || [])} cd=${(amumuR.cooldown || []).join('/')} cc=${amumuR.cc_duration ?? '-'} dtype=${amumuR.damage_type || '-'}</li>` : "<li>R missing</li>"}
            </ul>
            <h4>Golden Matchups (must be non-N/A)</h4>
            <ul>
              ${golden.map((g) => `<li class="${g.status === "ok" ? "debugOk" : "debugFail"}">${g.my}/${g.enemy} (${g.lane}): ${g.status.toUpperCase()} – ${g.reason}</li>`).join("")}
            </ul>
          </div>
        </div>
      </details>
    `;
  }

  function scoreItemCategories(item, profile, myRole, myTypesRaw, enemyTypesRaw, myChamp, enemyChamp) {
    const decision = scoreItemForMatchup(item, profile, myRole, myTypesRaw, enemyTypesRaw, myChamp, enemyChamp);
    const sig = decision.debug?.sig || itemSignals(item);
    const statProfile = statProfileFromItem(item);
    const enemy = new Set(enemyTypesRaw || []);
    const mySet = new Set(myTypesRaw || []);
    const price = Math.max(1, toNumber(item?.price));
    const itemDataReady = hasItemNumericData(item);
    const effectDataReady = itemHasEffectData(item);
    const myCombat = championCombatProfile(getChampionModel(myChamp?.name));
    const enemyCombat = championCombatProfile(getChampionModel(enemyChamp?.name));
    const championDataReady = Boolean(myCombat && enemyCombat);

    if (!itemDataReady || !championDataReady || !effectDataReady) {
      const missing = {
        itemStats: !itemDataReady,
        championStats: !championDataReady,
        itemEffects: !effectDataReady
      };
      const fallbackBase = Math.max(0, Number(decision.score || 0) * 6);
      return {
        categories: {
          offensive: Math.round(fallbackBase * 0.38),
          defensive: Math.round(fallbackBase * 0.22),
          counter: Math.round(fallbackBase * 0.2),
          synergy: Math.round(fallbackBase * 0.2),
          goldEfficiency: Math.round(Math.max(0, fallbackBase / Math.max(1, price) * 100)),
          spikeTiming: Math.round(Math.max(6, fallbackBase * 0.12))
        },
        total: fallbackBase,
        reasons: [`fallback_scoring_missing_data:${Object.entries(missing).filter(([,v])=>v).map(([k])=>k).join('|') || 'none'}`],
        dataReady: false,
        effectContrib: [],
        enemyTarget: "insufficient_data",
        championSynergy: "insufficient_data",
        topContributors: [{ label: "fallback", value: Math.round(fallbackBase) }],
        dataMissing: missing
      };
    }

    const effectContrib = effectScoreContributions(item?.effects || [], enemyTypesRaw);
    const effectOff = effectContrib.filter((x) => x.effectType === "damage" || x.effectType === "penetration").reduce((n, x) => n + x.value, 0);
    const effectDef = effectContrib.filter((x) => x.effectType === "healing" || x.effectType === "shield" || x.effectType === "tenacity").reduce((n, x) => n + x.value, 0);
    const effectCounter = effectContrib.filter((x) => x.effectType === "anti_heal" || x.effectType === "penetration" || x.effectType === "cc").reduce((n, x) => n + x.value, 0);

    const offensiveRaw =
      (sig.ad + sig.ap + sig.attackSpeed + sig.crit + sig.armorPen + sig.magicPen) * 3.1
      + (statProfile.ad * 0.07) + (statProfile.ap * 0.055)
      + (statProfile.attackSpeed * 0.2) + (statProfile.crit * 0.3)
      + (statProfile.armorPenFlat * 0.3) + (statProfile.armorPenPct * 0.8)
      + (statProfile.magicPenFlat * 0.3) + (statProfile.magicPenPct * 0.8)
      + (myCombat.offense * 0.22)
      + (enemyCombat.durability > 0 ? (myCombat.offense / enemyCombat.durability) * 12 : 0)
      + (effectOff * 0.9);

    const defensiveRaw =
      (sig.hp + sig.armor + sig.mr + sig.shield + sig.heal) * 3
      + (statProfile.hp * 0.02) + (statProfile.armor * 0.2) + (statProfile.mr * 0.2)
      + (statProfile.hpRegen * 1.8)
      + (enemy.has("assassin_burst") ? statProfile.hp * 0.007 : 0)
      + (enemy.has("mage_burst") ? statProfile.mr * 0.25 : 0)
      + (enemy.has("fighter") || enemy.has("anti_auto") ? statProfile.armor * 0.25 : 0)
      + (effectDef * 0.75);

    const counterRaw =
      (sig.grievous * 8) + (sig.tenacity * 10) + (sig.antiShield * 7)
      + (enemy.has("tank") ? (sig.percentDamage + sig.armorPen + sig.magicPen) * 4.5 : 0)
      + ((enemy.has("hard_cc") || enemy.has("pointclick_cc")) ? sig.tenacity * 8 : 0)
      + (enemy.has("mage_burst") ? sig.mr * 4 : 0)
      + (enemy.has("assassin_burst") ? (sig.armor + sig.hp + sig.shield) * 2 : 0)
      + (effectCounter * 0.85);

    const synergyRaw =
      (decision.score * 0.32)
      + ((profile === "marksman") ? (sig.ad + sig.attackSpeed + sig.crit) * 1.5 : 0)
      + ((profile === "mage") ? (sig.ap + sig.haste + sig.magicPen) * 1.55 : 0)
      + ((profile === "fighter") ? (sig.ad + sig.hp + sig.haste) * 1.25 : 0)
      + ((profile === "tank" || profile === "tank_support") ? (sig.hp + sig.armor + sig.mr + sig.haste) * 1.3 : 0)
      + ((profile === "enchanter") ? (sig.heal + sig.shield + sig.haste + sig.mana) * 1.5 : 0)
      + (mySet.has("true_damage") && (sig.haste > 0 || sig.attackSpeed > 0) ? 3 : 0)
      + (myCombat.keywords.has("burst") && sig.ap > 0 ? 4 : 0)
      + (myCombat.keywords.has("dps") && sig.attackSpeed > 0 ? 4 : 0)
      + (enemyCombat.keywords.has("sustain") && sig.grievous > 0 ? 5 : 0)
      + (enemyCombat.keywords.has("engage") && (sig.armor > 0 || sig.mr > 0) ? 3 : 0);

    const goldEfficiencyRaw = Math.max(0, ((offensiveRaw * 0.8) + defensiveRaw + counterRaw + synergyRaw) / price * 100);
    const spikeTimingRaw = Math.max(0, (decision.score * 1.2) + (price <= 1300 ? 18 : price <= 2200 ? 12 : 6) + (sig.activePlaymaking > 0 ? 3 : 0));

    const categories = {
      offensive: Math.round(Math.max(0, offensiveRaw)),
      defensive: Math.round(Math.max(0, defensiveRaw)),
      counter: Math.round(Math.max(0, counterRaw)),
      synergy: Math.round(Math.max(0, synergyRaw)),
      goldEfficiency: Math.round(Math.max(0, goldEfficiencyRaw)),
      spikeTiming: Math.round(Math.max(0, spikeTimingRaw))
    };
    const total =
      (categories.offensive * 0.24)
      + (categories.defensive * 0.17)
      + (categories.counter * 0.2)
      + (categories.synergy * 0.2)
      + (categories.goldEfficiency * 0.11)
      + (categories.spikeTiming * 0.08);

    const enemyTarget = decision?.debug?.enemyMatchup?.sustainLevel >= 2
      ? "enemy_sustain"
      : decision?.debug?.enemyMatchup?.tankLevel >= 3
        ? "enemy_tank"
        : decision?.debug?.enemyMatchup?.ccLevel >= 2
          ? "enemy_cc"
          : "enemy_damage";
    const championSynergy = decision?.debug?.myMatchup?.scalingType === "ap"
      ? "ap_scaling"
      : decision?.debug?.myMatchup?.scalingType === "ad"
        ? "ad_scaling"
        : "mixed_scaling";

    return {
      categories,
      total,
      reasons: decision.reasons || [],
      dataReady: true,
      effectContrib: effectContrib.slice(0, 5),
      enemyTarget,
      championSynergy,
      topContributors: (decision?.debug?.topContributors || []).slice(0, 3),
      dataMissing: { itemStats: false, championStats: false }
    };
  }


  function componentOptionsForItem(item) {
    if (!item) return [];
    const from = Array.isArray(item.from) ? item.from : [];
    return from
      .map((id) => findWildRiftItem([String(id)]))
      .filter(Boolean)
      .filter((x) => toNumber(x?.price) > 0);
  }

  function nextBuyDecision(itemBuild, gold, myMatchupProfile = {}, enemyMatchupProfile = {}) {
    const budget = Math.max(0, toNumber(gold));
    const progression = [itemBuild.starter, ...(itemBuild.coreItems || []), itemBuild.boots, itemBuild.enchant]
      .filter(Boolean)
      .map((it) => findWildRiftItem([it.nativeName || it.name, it.itemId]))
      .filter(Boolean);

    let fallback = null;
    for (const item of progression) {
      const cost = toNumber(item?.price);
      if (!fallback && cost > 0) fallback = item;
      if (!cost) continue;
      if (cost <= budget) {
        const efficiency = cost ? Math.round((cost / Math.max(1, budget)) * 100) : 0;
        return {
          type: "complete",
          item,
          efficiency,
          reason: `Direkter Powerspike (${cost} Gold) ist innerhalb deines Budgets.`
        };
      }

      const components = componentOptionsForItem(item)
        .filter((c) => toNumber(c?.price) <= budget);
      if (components.length) {
        const comp = components
          .map((c) => {
            const cp = statProfileFromItem(c);
            const immediateValue = (cp.ad * 0.8) + (cp.ap * 0.7) + (cp.hp * 0.22) + (cp.armor * 1.4) + (cp.mr * 1.4) + (cp.attackSpeed * 0.9) + (cp.haste * 1.1);
            const synergy =
              (myMatchupProfile?.scalingType === "ap" ? cp.ap * 0.9 : cp.ad * 0.9)
              + (myMatchupProfile?.fightWindow === "extended" ? (cp.attackSpeed * 0.7 + cp.haste * 0.8) : (cp.ad * 0.4 + cp.ap * 0.4))
              + ((enemyMatchupProfile?.tankLevel || 0) >= 3 ? (cp.armorPenFlat * 0.6 + cp.magicPenFlat * 0.6) : 0)
              + ((enemyMatchupProfile?.ccLevel || 0) >= 3 ? (cp.mr * 0.5 + cp.hp * 0.12) : 0);
            const goldEff = (immediateValue + synergy) / Math.max(1, toNumber(c?.price));
            return { c, goldEff };
          })
          .sort((a, b) => b.goldEff - a.goldEff)[0]?.c;
        if (!comp) continue;
        const progress = Math.round((toNumber(comp?.price) / Math.max(1, cost)) * 100);
        return {
          type: "component",
          item,
          component: comp,
          efficiency: progress,
          reason: `Beste Komponente für sofortigen Value und ${progress}% Fortschritt Richtung ${translatedItemName(item?.nativeName || item?.name)}.`
        };
      }
    }

    if (fallback) {
      return {
        type: "save",
        item: fallback,
        efficiency: Math.round((budget / Math.max(1, toNumber(fallback?.price))) * 100),
        reason: `Kein sinnvoller Sofortkauf: günstigste Komponente überschreitet Budget oder bringt keinen unmittelbaren Spike. Spare auf ${translatedItemName(fallback?.nativeName || fallback?.name)}.`
      };
    }
    return null;
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

  function scoreByKeywords(text, words = []) {
    return words.reduce((sum, w) => sum + (text.includes(w) ? 1 : 0), 0);
  }

  function numericSignalsFromText(text) {
    const plain = Array.from(text.matchAll(/(\d+(?:\.\d+)?)/g)).map((m) => Number(m[1]));
    const percents = Array.from(text.matchAll(/(\d+(?:\.\d+)?)\s*%/g)).map((m) => Number(m[1]));
    const cooldownHits = Array.from(text.matchAll(/(?:cooldown|冷却|cd)\s*[:：]?\s*(\d+(?:\.\d+)?)/gi)).map((m) => Number(m[1]));
    const burstHits = Array.from(text.matchAll(/(?:damage|伤害)\s*[:：+]?\s*(\d+(?:\.\d+)?)/gi)).map((m) => Number(m[1]));
    const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    return {
      numberCount: plain.length,
      avgFlat: avg(plain),
      maxFlat: plain.length ? Math.max(...plain) : 0,
      avgPercent: avg(percents),
      cooldownAvg: avg(cooldownHits),
      burstBaseAvg: avg(burstHits)
    };
  }

  function championAbilityProfile(championName) {
    const row = championAbilityDb?.[championName] || {};
    const passive = row?.passive?.description || "";
    const spells = Array.isArray(row?.spells) ? row.spells : [];
    const text = `${passive} ${spells.map((sp) => `${sp.name || ""} ${sp.description || ""}`).join(" ")}`.toLowerCase();

    const n = numericSignalsFromText(text);
    const byKw = (arr) => scoreByKeywords(text, arr);
    const spellCooldownAvg = (() => {
      const cds = [];
      for (const sp of spells) {
        const raw = String(sp?.cooldown || "");
        for (const m of raw.matchAll(/(\d+(?:\.\d+)?)/g)) cds.push(Number(m[1]));
      }
      return cds.length ? cds.reduce((a, b) => a + b, 0) / cds.length : n.cooldownAvg;
    })();

    return {
      spellCount: spells.length,
      cooldownAvg: spellCooldownAvg,
      burst: byKw(["burst", "execute", "detonate", "爆发", "斩杀", "high damage"]) + (n.burstBaseAvg > 140 ? 1 : 0),
      sustained: byKw(["attack speed", "on-hit", "every attack", "持续", "连击", "stack"]),
      adScaling: byKw(["attack damage", "bonus ad", "physical damage", "攻击力", "物理伤害"]),
      apScaling: byKw(["ability power", "magic damage", "法术强度", "魔法伤害"]),
      trueDamage: byKw(["true damage", "真实伤害"]),
      tankiness: byKw(["shield", "heal", "max health", "armor", "magic resist", "护盾", "治疗", "生命值"]),
      mobility: byKw(["dash", "blink", "jump", "speed", "位移", "冲刺"]),
      cc: byKw(["stun", "knock", "airborne", "slow", "taunt", "fear", "charm", "禁锢", "眩晕", "击飞"]),
      poke: byKw(["range", "projectile", "poke", "long range", "远程", "消耗"]),
      manaNeed: byKw(["mana", "法力"]) + (spellCooldownAvg <= 7 ? 1 : 0),
      numericDepth: n.numberCount + Math.min(4, Math.round(n.avgPercent / 10))
    };
  }

  function buildChampionMatchupProfile(champ, role = "", champTypesRaw = []) {
    const model = getChampionModel(champ?.name);
    const ability = championAbilityProfile(champ?.name || "");
    const stats = model?.stats || {};
    const abilities = Array.isArray(model?.abilities) ? model.abilities : [];
    let phys = 0;
    let magic = 0;
    let trueD = 0;
    let hardCcSeconds = 0;
    let sustainHits = 0;
    for (const ab of abilities) {
      const dt = String(ab?.damage_type || "none").toLowerCase();
      if (dt === "physical") phys += 1;
      else if (dt === "magic") magic += 1;
      else if (dt === "true") trueD += 1;
      const cc = Number(ab?.cc_duration);
      if (Number.isFinite(cc) && cc > 0) hardCcSeconds += cc;
      const effects = Array.isArray(ab?.effects) ? ab.effects : [];
      for (const fx of effects) {
        const t = String(fx?.effect_type || "").toLowerCase();
        if (t.includes("heal") || t.includes("shield")) sustainHits += 1;
      }
    }
    const totalDmg = Math.max(1, phys + magic + trueD);
    const dmgSplit = {
      physical: phys / totalDmg,
      magic: magic / totalDmg,
      true: trueD / totalDmg
    };
    const hpBase = toNumber(stats.hp);
    const resistScale = toNumber(stats.armor_per_level) + toNumber(stats.mr_per_level);
    const tankLevel = Math.min(5, Math.round((hpBase / 180) + (resistScale / 2.6)));
    const sustainLevel = Math.min(5, Math.round((sustainHits + ability.tankiness + ability.sustained) / 3));
    const ccLevel = Math.min(5, Math.round((hardCcSeconds / 1.2) + (ability.cc / 2)));
    const burstBias = ability.burst + (ability.cooldownAvg <= 7 ? 2 : 0);
    const extendedBias = ability.sustained + (ability.cooldownAvg > 7 ? 1 : 0) + sustainLevel;
    const fightWindow = burstBias >= extendedBias ? "burst" : "extended";
    const scalingRaw = (toNumber(stats.hp_per_level) * 0.15) + (toNumber(stats.ad_per_level) * 2) + resistScale;
    const scalingFocus = scalingRaw >= 28 ? "late" : scalingRaw >= 18 ? "mid" : "early";
    const primaryDamage = dmgSplit.magic > dmgSplit.physical ? "magic" : (dmgSplit.physical > dmgSplit.magic ? "physical" : "mixed");
    const scalingType = ability.apScaling >= ability.adScaling ? "ap" : "ad";
    const roleSet = new Set(champTypesRaw || []);
    const coreSynergies = [];
    if (scalingType === "ap") coreSynergies.push("ap");
    if (scalingType === "ad") coreSynergies.push("ad");
    if (fightWindow === "extended") coreSynergies.push("ability_haste", "sustained_damage");
    if (fightWindow === "burst") coreSynergies.push("penetration", "burst_window");
    if (role === "Jungle" || roleSet.has("hard_engage")) coreSynergies.push("engage");
    if (tankLevel >= 3) coreSynergies.push("frontline");

    return {
      damageSplit: dmgSplit,
      sustainLevel,
      tankLevel,
      fightWindow,
      ccLevel,
      scalingFocus,
      primaryDamage,
      scalingType,
      coreSynergies
    };
  }

  function runeMetaProfile(profile, myRole) {
    const runes = Array.isArray(liveRuneDb) ? liveRuneDb : [];
    const focus = { damage: 0, defense: 0, utility: 0, haste: 0, sustain: 0 };
    const keywordMap = {
      damage: ["伤害", "damage", "爆发", "penetration"],
      defense: ["护甲", "魔抗", "减伤", "resist", "health", "生命值"],
      utility: ["move", "移动", "control", "vision", "gold"],
      haste: ["cooldown", "haste", "冷却", "技能急速"],
      sustain: ["heal", "shield", "治疗", "护盾", "回复"]
    };

    for (const rune of runes) {
      const text = `${String(rune?.name || "")} ${String(rune?.description || "")}`.toLowerCase();
      for (const [bucket, words] of Object.entries(keywordMap)) {
        focus[bucket] += scoreByKeywords(text, words);
      }
    }

    if (profile === "marksman" || myRole === "ADC") focus.damage += 4;
    if (profile === "tank" || profile === "tank_support") focus.defense += 4;
    if (profile === "enchanter" || myRole === "Support") focus.utility += 3;
    if (profile === "mage") focus.haste += 3;

    return focus;
  }

  function itemSignals(item) {
    const text = itemText(item);
    const n = numericSignalsFromText(text);
    const truthTags = new Set(Array.isArray(item?.recommendationTags) ? item.recommendationTags : []);
    return {
      text,
      ad: scoreByKeywords(text, ["攻击力", "ad", "attack damage", "物理"]),
      ap: scoreByKeywords(text, ["法术强度", "ability power", "ap", "法强"]),
      crit: scoreByKeywords(text, ["暴击", "critical"]),
      atkspd: scoreByKeywords(text, ["攻速", "attack speed"]),
      haste: scoreByKeywords(text, ["技能急速", "冷却", "ability haste", "cooldown"]),
      pen: scoreByKeywords(text, ["穿透", "破甲", "法术穿透", "lethality", "penetration"]) + (truthTags.has("vs_armor_stack") || truthTags.has("vs_magic_resist") ? 1 : 0),
      hp: scoreByKeywords(text, ["生命值", "health", "hp"]),
      armor: scoreByKeywords(text, ["护甲", "armor"]) + (truthTags.has("anti_physical") ? 1 : 0),
      mr: scoreByKeywords(text, ["魔法抗性", "magic resist", "mr"]) + (truthTags.has("anti_magic") ? 1 : 0),
      healShield: scoreByKeywords(text, ["治疗", "护盾", "回复", "heal", "shield"]),
      mana: scoreByKeywords(text, ["法力", "mana"]),
      antiHeal: scoreByKeywords(text, ["重伤", "grievous"]) + (truthTags.has("anti_heal") ? 2 : 0),
      ccleanse: scoreByKeywords(text, ["净化", "解控", "免疫", "quicksilver", "stasis"]),
      trueDamage: scoreByKeywords(text, ["真实伤害", "true damage"]),
      onHit: scoreByKeywords(text, ["on-hit", "普攻", "每次攻击", "attack applies"]),
      moveSpeed: scoreByKeywords(text, ["移动速度", "movement speed", "ms"]),
      omnivamp: scoreByKeywords(text, ["全能吸血", "omnivamp", "lifesteal", "吸血"]),
      tenacity: scoreByKeywords(text, ["韧性", "tenacity"]),
      activePlaymaking: scoreByKeywords(text, ["主动", "active", "dash", "stasis"]),
      numericDetail: Math.min(10, n.numberCount),
      avgFlat: n.avgFlat,
      avgPercent: n.avgPercent,
      cooldownAvg: n.cooldownAvg
    };
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

  function normalizeStructuredItem(row = {}) {
    const st = row?.stats || {};
    return {
      itemId: row.item_id || "",
      nativeName: row.native_name || row.name || "",
      name: row.name || row.native_name || "",
      iconPath: row.icon || fallbackItemIcon(),
      description: `Category: ${row.shop_category || ""}`,
      labels: [],
      price: Number(row.total_cost || 0),
      from: Array.isArray(row?.build_path?.from) ? row.build_path.from : [],
      into: Array.isArray(row?.build_path?.into) ? row.build_path.into.join(",") : "",
      effects: Array.isArray(row.effects) ? row.effects : [],
      recommendationTags: [],
      effectSource: "truth",
      ad: toNumber(st.ad),
      hp: toNumber(st.hp),
      armor: toNumber(st.armor),
      magicBlock: toNumber(st.mr),
      attackSpeed: toNumber(st.attack_speed),
      critRate: toNumber(st.crit_chance),
      magicAttack: toNumber(st.ap),
      magicPene: toNumber(st.magic_pen_flat),
      magicPeneRate: toNumber(st.magic_pen_percent),
      armorPene: toNumber(st.armor_pen_flat),
      armorPeneRate: toNumber(st.armor_pen_percent),
      cd: toNumber(st.ability_haste),
      moveSpeed: toNumber(st.move_speed),
      moveRate: toNumber(st.move_speed_percent),
      hpRegen: toNumber(st.hp_regen),
      hpRegenRate: toNumber(st.hp_regen_percent),
      mp: toNumber(st.mana),
      mpRegen: toNumber(st.mana_regen),
      healthPerAttack: toNumber(st.lifesteal),
      healthPerMagic: toNumber(st.omnivamp)
    };
  }

  function normalizeStructuredChampion(row = {}) {
    const st = row?.base_stats || {};
    const abilities = Array.isArray(row?.abilities) ? row.abilities : [];
    return {
      id: row.champion_id || row.name,
      stats: {
        hp: toNumber(st.hp),
        hp_per_level: toNumber(st.hp_per_level),
        armor: toNumber(st.armor),
        armor_per_level: toNumber(st.armor_per_level),
        mr: toNumber(st.mr),
        mr_per_level: toNumber(st.mr_per_level),
        ad: toNumber(st.ad),
        ad_per_level: toNumber(st.ad_per_level),
        ap: toNumber(st.ap),
        attack_speed: toNumber(st.as),
        attack_speed_per_level: toNumber(st.as_per_level),
        move_speed: toNumber(st.move_speed)
      },
      passive: { effects: abilities.filter((x) => x?.slot === "P") },
      abilities: abilities.filter((x) => x?.slot !== "P").map((ab) => ({
        slot: ab.slot,
        name: ab.name,
        cooldown: Array.isArray(ab.cooldowns) ? ab.cooldowns : [],
        base_damage: Array.isArray(ab.base_damage) ? ab.base_damage.join("/") : "0",
        damage_type: ab.damage_type || "none",
        cc_duration: Array.isArray(ab.cc_durations) && ab.cc_durations.length ? ab.cc_durations[0] : null,
        ratios: Array.isArray(ab.ratios) ? ab.ratios : [],
        effects: [{ effect_type: ab.damage_type === "none" ? "utility" : "damage", values: ab.base_damage || [] }]
      })),
      keywords: Array.isArray(row.keywords) ? row.keywords : []
    };
  }

  async function loadStructuredMatchupData(ts) {
    const [itemData, champData] = await Promise.all([
      loadJson(`./data/items_7_0c.json?ts=${ts}`),
      loadJson(`./data/champions_7_0c.json?ts=${ts}`)
    ]);
    matchupItemDb = Array.isArray(itemData?.items) ? itemData.items : [];
    matchupChampionDb = {};
    for (const ch of (Array.isArray(champData?.champions) ? champData.champions : [])) {
      matchupChampionDb[ch.name] = ch;
    }
    liveItemDb = matchupItemDb.map(normalizeStructuredItem);
    liveItemLookup = new Map();
    for (const item of liveItemDb) registerItemLookup(item, [item.nativeName, item.name, item.itemId]);
    championModelDb = Object.fromEntries(
      Object.entries(matchupChampionDb).map(([name, row]) => [name, normalizeStructuredChampion(row)])
    );
    championModelVersion = "7.0C";
    liveItemPatch = "7.0C";
  }

  function scoreItemForMatchup(item, profile, myRole, myTypesRaw, enemyTypesRaw, myChamp, enemyChamp) {
    const sig = itemSignals(item);
    const text = sig.text;
    const enemy = new Set(enemyTypesRaw || []);
    const mine = new Set(myTypesRaw || []);
    const myAbilities = championAbilityProfile(myChamp?.name || "");
    const enemyAbilities = championAbilityProfile(enemyChamp?.name || "");
    const myMatchup = buildChampionMatchupProfile(myChamp, myRole, myTypesRaw);
    const enemyMatchup = buildChampionMatchupProfile(enemyChamp, "", enemyTypesRaw);
    const runeMeta = runeMetaProfile(profile, myRole);

    let score = 0;
    const reasons = [];
    const contributors = [];

    const push = (points, reason, bucket = "general") => {
      score += points;
      if (reason && points !== 0) reasons.push(reason);
      if (points !== 0) contributors.push({ label: reason || bucket, value: Math.round(points), bucket });
    };

    const profileNeeds = {
      marksman: { ad: 2.4, crit: 2.2, atkspd: 2.1, pen: 1.4, haste: 0.7, ap: -2.4, armor: 0.4, mr: 0.4 },
      mage: { ap: 2.5, haste: 1.7, pen: 1.6, mana: 1.3, ad: -2.2, crit: -1.5 },
      assassin: { ad: 2.3, pen: 2.0, haste: 1.6, moveSpeed: 1.0, ap: -1.2, hp: 0.5 },
      tank: { hp: 2.2, armor: 1.9, mr: 1.9, healShield: 1.1, ad: -1.2, crit: -2.1 },
      tank_support: { hp: 2.0, armor: 1.7, mr: 1.7, healShield: 1.4, haste: 0.9, crit: -2.0 },
      enchanter: { healShield: 2.5, haste: 1.8, ap: 1.3, mana: 1.1, hp: 0.8, crit: -2.1, pen: -1.1 },
      fighter: { ad: 1.9, hp: 1.6, haste: 1.2, armor: 0.8, mr: 0.8, pen: 0.9, ap: -1.1 }
    };
    const needs = profileNeeds[profile] || profileNeeds.fighter;

    const weightedProfileFit = Object.entries(needs).reduce((sum, [k, w]) => sum + (Number(sig[k] || 0) * w), 0);
    push(Math.round(weightedProfileFit * 3.2), "Profile-Fit");

    const offProfileHard =
      (profile === "marksman" && sig.ap >= 2 && (sig.ad + sig.crit + sig.atkspd) === 0) ||
      (profile === "mage" && (sig.ad + sig.crit + sig.atkspd) >= 2 && sig.ap === 0) ||
      ((profile === "tank" || profile === "tank_support") && (sig.crit + sig.pen) >= 2 && (sig.hp + sig.armor + sig.mr) <= 1);
    if (offProfileHard) push(-24, "Off-Profile-Hard");

    const abilityDamageBias = myAbilities.adScaling - myAbilities.apScaling;
    if (abilityDamageBias >= 2) push((sig.ad + sig.pen + sig.haste) * 3, "Champion-AD-Scaling");
    if (abilityDamageBias <= -2) push((sig.ap + sig.pen + sig.haste + sig.mana) * 3, "Champion-AP-Scaling");
    if (myAbilities.sustained >= 2) push((sig.atkspd + sig.onHit + sig.omnivamp) * 2, "Champion-Sustain-DPS");
    if (myAbilities.burst >= 2) push((sig.pen + sig.trueDamage + sig.activePlaymaking) * 2, "Champion-Burst-Window");
    if (myAbilities.cc >= 2) push((sig.haste + sig.moveSpeed + sig.hp) * 2, "Champion-CC-Cycle");

    if (enemy.has("hard_cc") || enemy.has("pointclick_cc") || enemyAbilities.cc >= 3) {
      push((sig.ccleanse + sig.tenacity + sig.mr + sig.hp) * 3, "Anti-CC");
    }
    if (enemy.has("assassin_burst") || enemy.has("mage_burst") || enemyAbilities.burst >= 2) {
      push((sig.armor + sig.mr + sig.hp + sig.healShield + sig.activePlaymaking) * 3, "Anti-Burst");
    }
    if (enemy.has("tank") || enemy.has("hard_engage")) {
      push((sig.pen + sig.trueDamage + sig.antiHeal) * 3, "Vs-Frontline");
      if (itemHasAny(text, ["百分比", "max health", "最大生命值"])) push(5, "Percent-Scaling");
    }
    if (enemy.has("anti_auto") || enemy.has("fighter") || enemyAbilities.sustained >= 2) {
      push((sig.armor + sig.hp + sig.healShield) * 2, "Vs-Sustained-AD");
    }
    if (enemy.has("poke") || enemy.has("mage_poke") || enemyAbilities.poke >= 2) {
      push((sig.healShield + sig.hp + sig.mr + sig.omnivamp) * 2, "Vs-Poke");
    }

    if (mine.has("anti_tank")) push((sig.pen + sig.trueDamage + sig.antiHeal) * 2, "Team-Need-AntiTank");
    if (mine.has("hard_engage")) push((sig.moveSpeed + sig.hp + sig.armor + sig.mr + sig.haste) * 2, "Team-Need-Engage");
    if (mine.has("assassin_burst")) push((sig.pen + sig.ad + sig.activePlaymaking) * 2, "Team-Need-Burst");
    if (mine.has("mage_burst")) push((sig.ap + sig.pen + sig.haste) * 2, "Team-Need-AP-Burst");

    const runeDamageWeight = runeMeta.damage / Math.max(1, (runeMeta.damage + runeMeta.defense + runeMeta.utility));
    const runeDefenseWeight = runeMeta.defense / Math.max(1, (runeMeta.damage + runeMeta.defense + runeMeta.utility));
    const runeUtilityWeight = runeMeta.utility / Math.max(1, (runeMeta.damage + runeMeta.defense + runeMeta.utility));
    push(Math.round((sig.ad + sig.ap + sig.pen + sig.crit + sig.atkspd) * runeDamageWeight * 4), "Rune-Meta-Damage");
    push(Math.round((sig.hp + sig.armor + sig.mr + sig.healShield) * runeDefenseWeight * 4), "Rune-Meta-Defense");
    push(Math.round((sig.haste + sig.moveSpeed + sig.mana) * runeUtilityWeight * 4), "Rune-Meta-Utility");

    const patches = Array.isArray(patchNotesData?.itemChanges) ? patchNotesData.itemChanges : [];
    const patchHit = patches.find((row) => {
      const name = normalizeText(row?.name || "");
      return name && (normalizeText(item?.name).includes(name) || normalizeText(item?.nativeName).includes(name));
    });
    if (patchHit?.direction === "buff") push(8, "Patch-Buff");
    if (patchHit?.direction === "nerf") push(-6, "Patch-Nerf");

    if (sig.numericDetail >= 6) push(2, "Detailed-Stat-Item");
    if (sig.avgPercent >= 6) push(2, "Percent-Value");
    if (sig.cooldownAvg > 0 && sig.cooldownAvg <= 20 && sig.activePlaymaking > 0) push(2, "Active-Timing-Value");

    if (enemyMatchup.sustainLevel >= 2) {
      push((sig.antiHeal * 5) + (sig.pen * 1.5), "Counter enemy sustain", "counter");
    }
    if (enemyMatchup.tankLevel >= 3) {
      push((sig.pen * 4) + (sig.trueDamage * 4) + (sig.onHit * 2), "Break frontline resistances", "counter");
    }
    if (enemyMatchup.ccLevel >= 2) {
      push((sig.tenacity * 4) + (sig.ccleanse * 5) + (sig.hp * 1.5) + (sig.mr * 1.2), "Survive enemy CC chain", "defense");
    }
    if (enemyMatchup.damageSplit.magic >= 0.45) {
      push((sig.mr * 3.2) + (sig.hp * 1.2), "Mitigate magic-heavy matchup", "defense");
    }
    if (enemyMatchup.damageSplit.physical >= 0.45) {
      push((sig.armor * 3.2) + (sig.hp * 1.2), "Mitigate physical-heavy matchup", "defense");
    }

    if (myMatchup.scalingType === "ap") push((sig.ap * 4) + (sig.haste * 2) + (sig.pen * 1.4), "Champion AP scaling synergy", "synergy");
    if (myMatchup.scalingType === "ad") push((sig.ad * 4) + (sig.pen * 1.8) + (sig.crit * 1.4), "Champion AD scaling synergy", "synergy");
    if (myMatchup.fightWindow === "extended") push((sig.atkspd * 2.5) + (sig.onHit * 3) + (sig.omnivamp * 2) + (sig.haste * 1.5), "Extended fight value", "offense");
    if (myMatchup.fightWindow === "burst") push((sig.pen * 2.5) + (sig.activePlaymaking * 2.2) + (sig.ap + sig.ad), "Burst window value", "offense");

    const uniqueReasons = Array.from(new Set(reasons));
    const topContributors = contributors.sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, 5);
    return { score, reasons: uniqueReasons.slice(0, 6), debug: { sig, myAbilities, enemyAbilities, myMatchup, enemyMatchup, runeMeta, topContributors } };
  }

  function smartCoreBuild(myChamp, myRole, profile, myTypesRaw, enemyChamp, enemyTypesRaw) {
    if (!liveItemDb?.length) return [];
    const pool = liveItemDb.filter((item) => item?.name && !isBootOrEnchantItem(item));
    const scored = pool
      .map((item) => {
        const scorePack = scoreItemCategories(item, profile, myRole, myTypesRaw, enemyTypesRaw, myChamp, enemyChamp);
        const fallbackDecision = scoreItemForMatchup(item, profile, myRole, myTypesRaw, enemyTypesRaw, myChamp, enemyChamp);
        return {
          item,
          score: Number.isFinite(Number(scorePack.total)) ? scorePack.total : fallbackDecision.score,
          reasons: scorePack.reasons?.length ? scorePack.reasons : fallbackDecision.reasons,
          categories: scorePack.categories,
          effectContrib: scorePack.effectContrib || [],
          enemyTarget: scorePack.enemyTarget || "enemy_damage",
          championSynergy: scorePack.championSynergy || "mixed_scaling",
          topContributors: scorePack.topContributors || [],
          effectReady: itemHasEffectData(item),
          dataReady: scorePack.dataReady,
          dataMissing: scorePack.dataMissing
        };
      })
      .filter((x) => x.score > 12)
      .filter((x) => x.effectReady)
      .sort((a, b) => b.score - a.score);

    const selected = [];
    const seen = new Set();
    for (const row of scored) {
      const name = String(row.item?.name || "");
      if (!name || seen.has(name)) continue;

      const sig = itemSignals(row.item);
      const offProfileRisk = (sig.ap >= 2 && profile === "marksman") || (sig.crit >= 2 && (profile === "mage" || profile === "enchanter"));
      if (offProfileRisk && selected.length < 4) continue;
      if (row.score < 18 && selected.length < 3) continue;

      selected.push({
        name: localizedName("items", name, row.item?.nativeName || name),
        nativeName: name,
        icon: row.item?.iconPath || fallbackItemIcon(),
        why: `Vs ${enemyChamp.name}: ${row.reasons.join(" + ") || "Matchup-Wert"} (${Math.round(row.score)})`,
        stats: row.item?.description || "",
        score: Math.round(row.score),
        categories: row.categories,
        effectContrib: row.effectContrib || [],
        enemyTarget: row.enemyTarget,
        championSynergy: row.championSynergy,
        topContributors: row.topContributors || [],
        dataReady: row.dataReady,
        dataMissing: row.dataMissing
      });
      seen.add(name);
      if (selected.length >= 5) break;
    }

    if (selected.length >= 5) return selected;
    return scored.slice(0, 5).map((row) => ({
      name: localizedName("items", row.item?.name, row.item?.nativeName || row.item?.name),
      nativeName: row.item?.name || row.item?.nativeName || "",
      icon: row.item?.iconPath || fallbackItemIcon(),
      why: `Vs ${enemyChamp.name}: ${row.reasons.join(" + ") || "Matchup-Wert"} (${Math.round(row.score)})`,
      stats: row.item?.description || "",
      score: Math.round(row.score),
      categories: row.categories,
      effectContrib: row.effectContrib || [],
      enemyTarget: row.enemyTarget,
      championSynergy: row.championSynergy,
      topContributors: row.topContributors || [],
      dataReady: true,
      dataMissing: {}
    }));
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

  function matchupFullItemBuild(myChamp, myRole, myTypesRaw, enemyChamp, enemyTypesRaw, gold = 0) {
    const profile = inferChampProfile(myChamp, myRole, myTypesRaw);
    const myMatchupProfile = buildChampionMatchupProfile(myChamp, myRole, myTypesRaw);
    const enemyMatchupProfile = buildChampionMatchupProfile(enemyChamp, "", enemyTypesRaw);
    const starter = startingItemForProfile(profile, myRole);
    const boots = chooseBootsByMatchup(enemyTypesRaw, profile);
    const enchant = chooseBootEnchant(enemyTypesRaw, profile);

    let coreTemplate = smartCoreBuild(myChamp, myRole, profile, myTypesRaw, enemyChamp, enemyTypesRaw);
    if (coreTemplate.length < 5) {
      const fallback = fallbackTemplateBuild(profile);
      coreTemplate = [...coreTemplate, ...fallback].slice(0, 5);
    }
    const coreItems = coreTemplate.slice(0, 3);
    const finalBuild = [...coreItems, ...coreTemplate.slice(3, 5), boots, enchant].slice(0, 6);
    const situational = [
      ...coreTemplate.slice(3, 5),
      ...adaptBuildToEnemy(enemyTypesRaw, profile, myRole)
    ].filter(Boolean).slice(0, 2);

    const scoredCandidates = coreTemplate.slice(0, 7);
    const scoredTier = {
      best: scoredCandidates[0] || null,
      alternative: scoredCandidates[1] || null,
      situational: scoredCandidates[2] || situational[0] || null
    };

    const nextBuy = nextBuyDecision({ starter, coreItems, boots, enchant }, gold, myMatchupProfile, enemyMatchupProfile);

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
      scoredTier,
      nextBuy,
      myMatchupProfile,
      enemyMatchupProfile,
      explanations: coreItems.map((it) => ({
        name: it.name,
        enemyTarget: it.enemyTarget || "enemy_damage",
        championSynergy: it.championSynergy || "mixed_scaling",
        topContributors: Array.isArray(it.topContributors) ? it.topContributors.slice(0, 3) : []
      })),
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


  async function loadPatchTruth(ts) {
    try {
      const truth = await loadJson(`./data/patch_7_0c_truth.json?ts=${ts}`);
      patchTruthData = truth && typeof truth === "object" ? truth : null;
      patchTruthItemByName = new Map();
      patchTruthChampionByName = new Map();
      for (const it of (patchTruthData?.items || [])) {
        const key = normalizeLookupKey(it?.name || "");
        if (key) patchTruthItemByName.set(key, it);
      }
      for (const ch of (patchTruthData?.champions || [])) {
        const key = normalizeLookupKey(ch?.name || "");
        if (key) patchTruthChampionByName.set(key, ch);
      }
    } catch {
      patchTruthData = null;
      patchTruthItemByName = new Map();
      patchTruthChampionByName = new Map();
    }
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

  async function loadChampionModels(ts) {
    try {
      const data = await loadJson(`./data/champion_models.json?ts=${ts}`);
      championModelDb = data?.champions || {};
      championModelVersion = data?.version || "–";
    } catch {
      championModelDb = {};
      championModelVersion = "–";
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
    if (matchupItemDb.length) {
      liveItemPatch = "7.0C";
      return;
    }
    liveItemLookup = new Map();
    const byKey = new Map();
    let patchFromCatalog = null;
    let patchFromLive = null;

    const upsert = (raw = {}) => {
      const nativeName = String(raw?.nativeName || raw?.name || "").trim();
      const itemId = String(raw?.itemId || raw?.item_id || raw?.equipId || raw?.id || raw?.itemId || "").trim();
      const key = itemId || normalizeLookupKey(nativeName);
      if (!key) return;

      const prev = byKey.get(key) || {};
      const translated = translatedItemName(nativeName || prev.nativeName || "Unknown Item");
      const truth = patchTruthItemByName.get(normalizeLookupKey(translated)) || patchTruthItemByName.get(normalizeLookupKey(nativeName));
      const truthEffects = Array.isArray(truth?.effects) ? truth.effects : [];
      const truthText = String(truth?.ocr_text_raw || "");
      const merged = {
        itemId: itemId || prev.itemId || "",
        nativeName: nativeName || prev.nativeName || "",
        name: translated,
        iconPath: raw?.iconPath || raw?.icon || prev.iconPath || fallbackItemIcon(),
        description: [raw?.description || prev.description || "", truthText].filter(Boolean).join("\n"),
        labels: raw?.labels || prev.labels || [],
        price: raw?.price || prev.price || 0,
        from: Array.isArray(raw?.from) ? raw.from : (prev.from || []),
        into: raw?.into || prev.into || "",
        effects: truthEffects.length ? truthEffects : (Array.isArray(raw?.effects) ? raw.effects : (prev.effects || [])),
        recommendationTags: Array.isArray(truth?.recommendation_tags) ? truth.recommendation_tags : (prev.recommendationTags || []),
        effectSource: truthEffects.length
          ? ((Number(truth?.effects_ocr_count || 0) > 0) ? "truth_auto" : "truth")
          : (raw?.effectSource || raw?.effect_source || prev.effectSource || "auto"),
        ad: toNumber(raw?.ad ?? raw?.stats?.ad ?? prev.ad),
        hp: toNumber(raw?.hp ?? raw?.stats?.hp ?? prev.hp),
        armor: toNumber(raw?.armor ?? raw?.stats?.armor ?? prev.armor),
        magicBlock: toNumber(raw?.magicBlock ?? raw?.stats?.mr ?? prev.magicBlock),
        attackSpeed: toNumber(raw?.attackSpeed ?? raw?.stats?.attack_speed ?? prev.attackSpeed),
        critRate: toNumber(raw?.critRate ?? raw?.stats?.crit_rate ?? prev.critRate),
        magicAttack: toNumber(raw?.magicAttack ?? raw?.stats?.ap ?? prev.magicAttack),
        magicPene: toNumber(raw?.magicPene ?? raw?.stats?.magic_pen_flat ?? prev.magicPene),
        magicPeneRate: toNumber(raw?.magicPeneRate ?? raw?.stats?.magic_pen_pct ?? prev.magicPeneRate),
        armorPene: toNumber(raw?.armorPene ?? raw?.stats?.armor_pen_flat ?? prev.armorPene),
        armorPeneRate: toNumber(raw?.armorPeneRate ?? raw?.stats?.armor_pen_pct ?? prev.armorPeneRate),
        cd: toNumber(raw?.cd ?? raw?.stats?.ability_haste ?? prev.cd),
        moveSpeed: toNumber(raw?.moveSpeed ?? raw?.stats?.move_speed_flat ?? prev.moveSpeed),
        moveRate: toNumber(raw?.moveRate ?? raw?.stats?.move_speed_pct ?? prev.moveRate),
        hpRegen: toNumber(raw?.hpRegen ?? raw?.stats?.hp_regen ?? prev.hpRegen),
        hpRegenRate: toNumber(raw?.hpRegenRate ?? raw?.stats?.hp_regen_pct ?? prev.hpRegenRate),
        mp: toNumber(raw?.mp ?? raw?.stats?.mana ?? prev.mp),
        mpRegen: toNumber(raw?.mpRegen ?? raw?.stats?.mana_regen ?? prev.mpRegen),
        healthPerAttack: toNumber(raw?.healthPerAttack ?? raw?.stats?.lifesteal ?? prev.healthPerAttack),
        healthPerMagic: toNumber(raw?.healthPerMagic ?? raw?.stats?.spell_vamp ?? prev.healthPerMagic)
      };
      byKey.set(key, merged);
      registerItemLookup(merged, [merged.nativeName, merged.name, merged.itemId]);
    };

    if (liveCatalogData?.items?.length) {
      patchFromCatalog = liveCatalogData?.versions?.items || null;
      for (const x of liveCatalogData.items) upsert(x);
    }

    try {
      const equipData = await loadJson(WR_EQUIP_URL);
      patchFromLive = equipData?.version || null;
      const equipList = Array.isArray(equipData?.equipList) ? equipData.equipList : [];
      for (const x of equipList) upsert(x);
    } catch (err) {
      console.warn("Live WR equip endpoint unavailable, using catalog snapshot", err);
    }

    liveItemPatch = patchFromLive || patchFromCatalog || "–";
    liveItemDb = Array.from(byKey.values());

    if (!liveItemDb.length) {
      console.warn("Wild Rift item data unavailable, fallback names/icons only");
      liveItemDb = null;
      liveItemLookup = new Map();
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
        championAliasLookup = new Map();
        const champById = new Map(allChamps.map((c) => [String(c.hero_id), c]));
        for (const champ of catalog.champions) {
          const heroId = String(champ?.hero_id || "");
          if (!heroId) continue;
          const icon = String(champ?.icon || buildHeroIconById(heroId));

          const existingHero = heroDb[heroId] || {};
          const displayName = championDisplayName(champ, existingChamp?.name || existingHero?.name || "");
          const truthChamp = patchTruthChampionByName.get(normalizeLookupKey(displayName));
          const truthLanes = Array.isArray(truthChamp?.lanes_detected_by_text) ? truthChamp.lanes_detected_by_text : [];
          heroDb[heroId] = {
            hero_id: heroId,
            name: displayName,
            title: champ?.title || existingHero?.title || "",
            lane: champ?.lane || existingHero?.lane || (truthLanes[0] || ""),
            roles: Array.isArray(champ?.roles) ? champ.roles : (existingHero?.roles || []),
            icon
          };

          const existingChamp = champById.get(heroId);
          if (existingChamp) {
            existingChamp.icon = icon;
          }

          const aliases = [champ?.name, champ?.alias, champ?.title, existingChamp?.name];
          for (const alias of aliases) {
            const key = normalizeLookupKey(alias || "");
            if (!key) continue;
            championAliasLookup.set(key, championDisplayName(champ, existingChamp?.name || ""));
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
    const goldNow = Math.max(0, toNumber(matchupGold?.value));
    const itemBuild = matchupFullItemBuild(myChamp, myRole, myTypesRaw, enemyChamp, enemyTypesRaw, goldNow);
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
            <div class="tinyNote">Patch: ${liveItemPatch} • Gold Input: ${goldNow > 0 ? `${goldNow}g` : "nicht gesetzt"}</div>

            ${itemBuild.nextBuy ? `
              <div class="nextBuyCard">
                <div class="itemPhaseTitle">Next Buy (gold-optimiert)</div>
                <div class="nextBuyRow">
                  ${itemBuild.nextBuy.component ? `<div class="itemBubble"><img src="${itemBuild.nextBuy.component.iconPath || fallbackItemIcon()}" alt="${translatedItemName(itemBuild.nextBuy.component.nativeName || itemBuild.nextBuy.component.name)}" loading="lazy" /><span>${translatedItemName(itemBuild.nextBuy.component.nativeName || itemBuild.nextBuy.component.name)}</span></div>` : `<div class="itemBubble"><img src="${itemBuild.nextBuy.item.iconPath || fallbackItemIcon()}" alt="${translatedItemName(itemBuild.nextBuy.item.nativeName || itemBuild.nextBuy.item.name)}" loading="lazy" /><span>${translatedItemName(itemBuild.nextBuy.item.nativeName || itemBuild.nextBuy.item.name)}</span></div>`}
                  <div class="nextBuyMeta">
                    <b>${itemBuild.nextBuy.type === "component" ? "Komponente" : itemBuild.nextBuy.type === "complete" ? "Complete Item" : "Save Gold"}</b>
                    <span>${itemBuild.nextBuy.reason}</span>
                    <span>Effizienz: ${itemBuild.nextBuy.efficiency}%</span>
                  </div>
                </div>
              </div>
            ` : ""}

            <div class="itemScoringRow">
              ${itemBuild.scoredTier.best ? `<div class="itemScoreCard"><h4>Best Choice</h4><div>${itemBuild.scoredTier.best.name}</div><small>Off ${scoreLabel(itemBuild.scoredTier.best.categories?.offensive)} • Def ${scoreLabel(itemBuild.scoredTier.best.categories?.defensive)} • Counter ${scoreLabel(itemBuild.scoredTier.best.categories?.counter)}</small></div>` : ""}
              ${itemBuild.scoredTier.alternative ? `<div class="itemScoreCard"><h4>Alternative</h4><div>${itemBuild.scoredTier.alternative.name}</div><small>Synergy ${scoreLabel(itemBuild.scoredTier.alternative.categories?.synergy)} • Gold ${scoreLabel(itemBuild.scoredTier.alternative.categories?.goldEfficiency)}</small></div>` : ""}
              ${itemBuild.scoredTier.situational ? `<div class="itemScoreCard"><h4>Situational</h4><div>${itemBuild.scoredTier.situational.name}</div><small>Spike ${scoreLabel(itemBuild.scoredTier.situational.categories?.spikeTiming)}</small></div>` : ""}
            </div>

            <details class="debugPanel" open>
              <summary>Matchup Engine Debug (Warum diese Items)</summary>
              <div class="debugGrid">
                <div>
                  <h4>Enemy Profil</h4>
                  <ul>
                    <li>Damage Split: P ${Math.round((itemBuild.enemyMatchupProfile?.damageSplit?.physical || 0) * 100)}% / M ${Math.round((itemBuild.enemyMatchupProfile?.damageSplit?.magic || 0) * 100)}% / T ${Math.round((itemBuild.enemyMatchupProfile?.damageSplit?.true || 0) * 100)}%</li>
                    <li>Sustain: ${itemBuild.enemyMatchupProfile?.sustainLevel || 0} • Tank: ${itemBuild.enemyMatchupProfile?.tankLevel || 0} • CC: ${itemBuild.enemyMatchupProfile?.ccLevel || 0}</li>
                    <li>Fight Window: ${itemBuild.enemyMatchupProfile?.fightWindow || "unknown"} • Scaling: ${itemBuild.enemyMatchupProfile?.scalingFocus || "unknown"}</li>
                  </ul>
                </div>
                <div>
                  <h4>My Profil</h4>
                  <ul>
                    <li>Damage Type: ${itemBuild.myMatchupProfile?.primaryDamage || "mixed"} • Scaling: ${itemBuild.myMatchupProfile?.scalingType || "mixed"}</li>
                    <li>Fight Window: ${itemBuild.myMatchupProfile?.fightWindow || "unknown"} • Core Synergy: ${(itemBuild.myMatchupProfile?.coreSynergies || []).join(", ") || "none"}</li>
                  </ul>
                </div>
              </div>
              <h4>Item Begründung (Top 3 Beiträge)</h4>
              <ul>
                ${(itemBuild.explanations || []).map((ex) => `<li><b>${ex.name}</b> → Gegnerziel: ${ex.enemyTarget} • Synergie: ${ex.championSynergy} • Beiträge: ${(ex.topContributors || []).map((c) => `${c.label} (${c.value})`).join(", ") || "none"}</li>`).join("")}
              </ul>
            </details>

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
  matchupGold?.addEventListener("input", renderMatchupView);
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

      await loadPatchTruth(ts);
      await loadLiveCatalog(ts);
      await Promise.all([
        loadLocalizationEn(ts),
        loadChampionAbilities(ts),
        loadChampionModels(ts)
      ]);
      await loadStructuredMatchupData(ts);
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
