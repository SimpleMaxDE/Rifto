(() => {
  const $ = (id) => document.getElementById(id);

  const grid = $("grid");
  const statusEl = $("status");
  const patchPill = $("patchPill");
  const updatePill = $("updatePill");
  const searchEl = $("search");
  const sortEl = $("sort");

  // Modal
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

  const modalCounters = $("modalCounters");
  const modalBans = $("modalBans");
  const modalRoleSelect = $("modalRoleSelect");

  const HERO_LIST_URL = "https://game.gtimg.cn/images/lgamem/act/lrlib/js/heroList/hero_list.js";

  let allChamps = [];
  let heroDb = {};            // hero_id -> raw hero info from Tencent
  let currentModalChamp = null;

  function fmtPct(v) {
    if (v === null || v === undefined) return "–";
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
    return allChamps.find(c => c.name.toLowerCase() === String(name).toLowerCase());
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

    // CN keywords
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

  function tierForScore(score, thresholds) {
    if (score >= thresholds.ss) return "SS";
    if (score >= thresholds.s) return "S";
    if (score >= thresholds.a) return "A";
    if (score >= thresholds.b) return "B";
    return "C";
  }

  function thresholdsForRole(role) {
    const pool = allChamps.filter(c => rolesForHero(c.hero_id).includes(role));
    const list = (pool.length ? pool : allChamps).map(c => metaScore(c)).sort((a,b)=>b-a);
    const q = (p) => list[Math.floor(p * (list.length-1))] ?? 0;
    // Top 5% SS, next 10% S, next 20% A, next 30% B
    return { ss: q(0.05), s: q(0.15), a: q(0.35), b: q(0.65) };
  }

  function tierClass(tier) {
    return tier === "SS" ? "tierSS" : tier === "S" ? "tierS" : tier === "A" ? "tierA" : tier === "B" ? "tierB" : "tierC";
  }

  // Smart Ban for a role: prioritize high threat in that role
  // banScore = ban*1.0 + pick*0.7 + win*0.5 + metaScore*0.05
  function smartBansForRole(picked, role, limit=3) {
    const pool = allChamps.filter(c => c.hero_id !== picked.hero_id);
    const rolePool = pool.filter(c => rolesForHero(c.hero_id).includes(role));
    const candidates = rolePool.length ? rolePool : pool;

    const scored = candidates.map(c => {
      const win = Number(c.stats?.CN?.win ?? 0);
      const pick = Number(c.stats?.CN?.pick ?? 0);
      const ban = Number(c.stats?.CN?.ban ?? 0);
      const ms = metaScore(c);
      const score = (ban*1.0) + (pick*0.7) + (win*0.5) + (ms*0.05);

      // reasons: role oriented
      let why = `Starker ${role}-Pick im Meta.`;
      if (ban >= 25) why = `Sehr oft gebannt (${ban.toFixed(2)}%): höchster Threat in ${role}.`;
      else if (win >= 54) why = `Hohe Winrate (${win.toFixed(2)}%): snowballt zuverlässig.`;
      else if (pick >= 12) why = `Sehr häufig gepickt (${pick.toFixed(2)}%): du siehst ihn oft.`;

      return { name:c.name, icon:c.icon, score, why, win, pick, ban };
    });

    scored.sort((a,b)=>b.score-a.score);
    return scored.slice(0, limit);
  }

  // "Hard counter" shown as: if enemy wants to counter YOU in this role,
  // we show high-threat picks in the same role (until we have matchup data).
  function hardCountersForRole(picked, role, limit=3) {
    // Similar to bans but phrased as counter threats
    const list = smartBansForRole(picked, role, limit);
    return list.map(x => ({...x, why: x.why.replace("Starker", "Gefährlicher")}));
  }

  function renderPickList(targetEl, list, thresholds, label) {
    targetEl.innerHTML = "";
    for (const c of list) {
      const tier = tierForScore(metaScore(getChampionByName(c.name)), thresholds);
      const el = document.createElement("div");
      el.className = "counterItem";
      el.innerHTML = `
        <img class="cIcon" src="${c.icon}" alt="${c.name}" loading="lazy" />
        <div class="cMain">
          <div class="cName">${c.name} <span class="tierBadge ${tierClass(tier)}" style="margin-left:8px">${tier}</span></div>
          <div class="cWhy">${c.why}</div>
        </div>
      `;
      targetEl.appendChild(el);
    }
  }

  function openModal(c) {
    currentModalChamp = c;

    modalIcon.src = c.icon;
    modalIcon.alt = c.name;
    modalName.textContent = c.name;
    modalId.textContent = `#${c.hero_id}`;

    modalWin.textContent = fmtPct(c.stats?.CN?.win ?? null);
    modalPick.textContent = fmtPct(c.stats?.CN?.pick ?? null);
    modalBan.textContent = fmtPct(c.stats?.CN?.ban ?? null);

    // Choose default role: champion's typical role if we know it, else Jungle
    const roles = rolesForHero(c.hero_id);
    const defaultRole = roles[0] || "Jungle";
    modalRoleSelect.value = defaultRole;

    updateModalForRole();
    modal.classList.remove("hidden");
  }

  function updateModalForRole() {
    if (!currentModalChamp) return;
    const role = modalRoleSelect.value;
    const roles = rolesForHero(currentModalChamp.hero_id);
    const isOff = roles.length && !roles.includes(role);
    offRole.classList.toggle("hidden", !isOff);

    const thresholds = thresholdsForRole(role);
    const tier = tierForScore(metaScore(currentModalChamp), thresholds);
    modalTier.textContent = tier;
    modalTier.className = `tierBadge ${tierClass(tier)}`;

    const bans = smartBansForRole(currentModalChamp, role, 3);
    const counters = hardCountersForRole(currentModalChamp, role, 3);

    renderPickList(modalBans, bans, thresholds, "Ban");
    renderPickList(modalCounters, counters, thresholds, "Counter");
  }

  function closeModal(){ modal.classList.add("hidden"); }

  modalClose.addEventListener("click", closeModal);
  modal.addEventListener("click", (e)=>{ if (e.target.classList.contains("modalBackdrop")) closeModal(); });
  modalRoleSelect.addEventListener("change", updateModalForRole);

  function render(list) {
    grid.innerHTML = "";
    if (!list.length) {
      statusEl.textContent = "Keine Treffer.";
      statusEl.style.display = "block";
      return;
    }
    statusEl.style.display = "none";
    const frag = document.createDocumentFragment();

    // Default tier role: Jungle (global view). We can add a global role filter later.
    const thresholds = thresholdsForRole("Jungle");

    for (const c of list) {
      const win = c.stats?.CN?.win ?? null;
      const pick = c.stats?.CN?.pick ?? null;
      const ban = c.stats?.CN?.ban ?? null;

      const tier = tierForScore(metaScore(c), thresholds);

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
          <span class="tierBadge ${tierClass(tier)}" title="Tier (Jungle default)">${tier}</span>
        </div>

        <div class="stats">
          <div class="stat"><div class="k">Win</div><div class="v">${fmtPct(win)}</div></div>
          <div class="stat"><div class="k">Pick</div><div class="v">${fmtPct(pick)}</div></div>
          <div class="stat"><div class="k">Ban</div><div class="v">${fmtPct(ban)}</div></div>
        </div>
      `;
      card.addEventListener("click", () => openModal(c));
      frag.appendChild(card);
    }
    grid.appendChild(frag);
  }

  function applyFiltersAndRender() {
    const q = (searchEl.value || "").trim().toLowerCase();
    const sort = sortEl.value;

    let list = allChamps;
    if (q) list = list.filter((c) => c.name.toLowerCase().includes(q));

    list = [...list].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "win") return (b.stats?.CN?.win ?? 0) - (a.stats?.CN?.win ?? 0);
      if (sort === "pick") return (b.stats?.CN?.pick ?? 0) - (a.stats?.CN?.pick ?? 0);
      if (sort === "ban") return (b.stats?.CN?.ban ?? 0) - (a.stats?.CN?.ban ?? 0);
      // tier: use metaScore desc
      return metaScore(b) - metaScore(a);
    });

    render(list);
  }

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

      allChamps = normalizeMeta(meta);

      // Load Tencent hero_list for role/lane info (client-side, always up to date)
      try {
        const heroList = await loadJson(`${HERO_LIST_URL}?ts=${ts}`);
        heroDb = (heroList && heroList.heroList) ? heroList.heroList : {};
      } catch (e) {
        heroDb = {};
      }

      statusEl.textContent = `Geladen: ${allChamps.length} Champions`;
      statusEl.style.display = "block";

      applyFiltersAndRender();
    } catch (err) {
      console.error(err);
      statusEl.textContent = `Fehler beim Laden: ${err?.message ?? err}`;
      statusEl.style.display = "block";
    }
  }

  searchEl.addEventListener("input", applyFiltersAndRender);
  sortEl.addEventListener("change", applyFiltersAndRender);

  load();
})();
