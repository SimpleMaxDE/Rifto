(() => {
  const $ = (id) => document.getElementById(id);

  const grid = $("grid");
  const statusEl = $("status");
  const patchPill = $("patchPill");
  const updatePill = $("updatePill");
  const trendPill = $("trendPill");
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
  const modalTrendHint = $("modalTrendHint");

  const HERO_LIST_URL = "https://game.gtimg.cn/images/lgamem/act/lrlib/js/heroList/hero_list.js";

  let allChamps = [];
  let heroDb = {};
  let currentModalChamp = null;

  // Tag DB (champion-type rules)
  let tagDb = {};
  let defaultWeakByRole = {};
  let risingTypes = new Set();
  let fallingTypes = new Set();
  let trendText = "–";

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
    return { ss: q(0.05), s: q(0.15), a: q(0.35), b: q(0.65) };
  }

  function tierClass(tier) {
    return tier === "SS" ? "tierSS" : tier === "S" ? "tierS" : tier === "A" ? "tierA" : tier === "B" ? "tierB" : "tierC";
  }

  // --- Tag helpers ---
  function champTypes(name) {
    const t = tagDb?.[name]?.type;
    return Array.isArray(t) ? t : [];
  }

  function pickedWeakVs(pickedName, role) {
    const explicit = tagDb?.[pickedName]?.weak_vs;
    if (Array.isArray(explicit) && explicit.length) return explicit;
    return defaultWeakByRole?.[role]?.weak_vs || [];
  }


  // --- Trend / Patch-Shift detector (client-side, daily) ---
  // We compare today's "type strength" vs last stored snapshot in localStorage.
  // Type strength uses avg MetaScore over champs with that type tag (only if tagged).
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
    for (const t of Object.keys(strength)) {
      strength[t] = strength[t] / Math.max(1, count[t]);
    }
    return strength;
  }

  function loadPrevSnapshot() {
    try {
      const raw = localStorage.getItem("rifto_type_snapshot");
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }

  function saveSnapshot(strength) {
    try {
      const snap = { ts: Date.now(), strength };
      localStorage.setItem("rifto_type_snapshot", JSON.stringify(snap));
    } catch (e) {}
  }

  function formatTrend(rise, fall) {
    const up = rise.length ? `${rise[0]} ↑` : "";
    const down = fall.length ? `${fall[0]} ↓` : "";
    const both = [up, down].filter(Boolean).join(" | ");
    return both || "–";
  }

  function updateTrends() {
    const current = computeTypeStrength();
    const prev = loadPrevSnapshot();

    risingTypes = new Set();
    fallingTypes = new Set();

    if (prev && prev.strength) {
      const deltas = [];
      for (const t of Object.keys(current)) {
        if (prev.strength[t] === undefined) continue;
        const d = current[t] - prev.strength[t];
        deltas.push({ t, d });
      }
      deltas.sort((a,b)=>b.d-a.d);

      const rise = deltas.filter(x=>x.d>0).slice(0,3);
      const fall = deltas.filter(x=>x.d<0).slice(-3);

      for (const r of rise) risingTypes.add(r.t);
      for (const f of fall) fallingTypes.add(f.t);

      trendText = formatTrend(rise.map(x=>x.t), fall.map(x=>x.t));
    } else {
      trendText = "–";
    }

    // Show in UI
    if (trendPill) trendPill.textContent = `Trend: ${trendText}`;
    if (modalTrendHint) modalTrendHint.textContent = `Trend: ${trendText}`;

    // Save today's snapshot (so tomorrow it can compare). Also overwrites if a lot of time passed.
    saveSnapshot(current);
  }


  function tagMatchBonus(pickedName, role, candidateName) {
    const weaknesses = pickedWeakVs(pickedName, role);
    if (!weaknesses.length) return 0;

    const types = champTypes(candidateName);
    let hits = 0;
    for (const w of weaknesses) if (types.includes(w)) hits++;

    // bonus per matching weakness
    let bonus = hits * 15; // base
    // If the counter-type is currently trending up, boost further.
    for (const w of weaknesses) {
      if (risingTypes.has(w) && types.includes(w)) bonus += 8;
      if (fallingTypes.has(w) && types.includes(w)) bonus -= 4;
    }
    return bonus;
  }

  function baseThreatScore(c) {
    const win = Number(c.stats?.CN?.win ?? 0);
    const pick = Number(c.stats?.CN?.pick ?? 0);
    const ban = Number(c.stats?.CN?.ban ?? 0);
    // threat = seen often + wins + banned
    return (ban*1.0) + (pick*0.7) + (win*0.5);
  }

  // Smart Ban = role pool + meta threat + tag matching vs your pick
  function smartBansForRole(picked, role, limit=3) {
    const pool = allChamps.filter(c => c.hero_id !== picked.hero_id);
    const rolePool = pool.filter(c => rolesForHero(c.hero_id).includes(role));
    const candidates = rolePool.length ? rolePool : pool;

    const scored = candidates.map(c => {
      const ms = metaScore(c);
      const base = baseThreatScore(c) + (ms*0.05);
      const bonus = tagMatchBonus(picked.name, role, c.name);
      const score = base + bonus;

      const win = Number(c.stats?.CN?.win ?? 0);
      const pickr = Number(c.stats?.CN?.pick ?? 0);
      const banr = Number(c.stats?.CN?.ban ?? 0);

      let why = `Starker ${role}-Threat im aktuellen Meta.`;
      if (bonus > 0) {
        const w = pickedWeakVs(picked.name, role).slice(0,2).join(", ");
        why = `Passt als Counter-Typ (${w}) + stark im Meta.`;
      } else if (banr >= 25) why = `Sehr oft gebannt (${banr.toFixed(2)}%): höchster Threat in ${role}.`;
      else if (win >= 54) why = `Hohe Winrate (${win.toFixed(2)}%): snowballt zuverlässig.`;
      else if (pickr >= 12) why = `Sehr häufig gepickt (${pickr.toFixed(2)}%): du siehst ihn oft.`;

      return { name:c.name, icon:c.icon, score, why };
    });

    scored.sort((a,b)=>b.score-a.score);
    return scored.slice(0, limit);
  }

  // Hard Counter list = same as smart bans but phrased
  function hardCountersForRole(picked, role, limit=3) {
    const list = smartBansForRole(picked, role, limit);
    return list.map(x => ({...x, why: x.why.replace("Threat", "Counter-Threat")}));
  }

  function renderPickList(targetEl, list, thresholds) {
    targetEl.innerHTML = "";
    for (const c of list) {
      const champ = getChampionByName(c.name);
      const t = champ ? tierForScore(metaScore(champ), thresholds) : "C";
      const el = document.createElement("div");
      el.className = "counterItem";
      el.innerHTML = `
        <img class="cIcon" src="${c.icon}" alt="${c.name}" loading="lazy" />
        <div class="cMain">
          <div class="cName">${c.name} <span class="tierBadge ${tierClass(t)}" style="margin-left:8px">${t}</span></div>
          <div class="cWhy">${c.why}</div>
        </div>
      `;
      targetEl.appendChild(el);
    }
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

    renderPickList(modalBans, bans, thresholds);
    renderPickList(modalCounters, counters, thresholds);
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

    const roles = rolesForHero(c.hero_id);
    modalRoleSelect.value = roles[0] || "Jungle";

    if (modalTrendHint) modalTrendHint.textContent = `Trend: ${trendText}`;
    updateModalForRole();
    modal.classList.remove("hidden");
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
      return metaScore(b) - metaScore(a); // tier
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

      // Tencent hero_list (roles/lane)
      try {
        const heroList = await loadJson(`${HERO_LIST_URL}?ts=${ts}`);
        heroDb = (heroList && heroList.heroList) ? heroList.heroList : {};
      } catch (e) {
        heroDb = {};
      }

      // Tag DB (local file in your repo)
      try {
        const tags = await loadJson(`./champ_tags.json?ts=${ts}`);
        tagDb = tags || {};
        defaultWeakByRole = tagDb._defaults || {};
      } catch (e) {
        tagDb = {};
        defaultWeakByRole = {};
      }

      // compute trend after we have champs + tags
      updateTrends();

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
