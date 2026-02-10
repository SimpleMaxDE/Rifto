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
  const modalScore = $("modalScore");
  const modalWin = $("modalWin");
  const modalPick = $("modalPick");
  const modalBan = $("modalBan");
  const modalCounters = $("modalCounters");
  const modalRoleSelect = $("modalRoleSelect");

  let allChamps = [];
  let heroDb = {};            // hero_id -> { roles:[...], lane:"..." }
  let counterOverrides = {};  // optional: { "Master Yi": { "Jungle": [{name,weight,why}, ...] } }
  let currentModalChamp = null;

  function fmtPct(v) {
    if (v === null || v === undefined) return "–";
    const n = Number(v);
    if (!Number.isFinite(n)) return "–";
    return `${n.toFixed(2)}%`;
  }

  // MetaScore: Win matters most, then Pick, then Ban
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

  function rolesForHero(hero_id) {
    const h = heroDb?.[String(hero_id)];
    const roles = Array.isArray(h?.roles) ? h.roles : [];
    // map Chinese roles/lane to our 5 roles best-effort
    const lane = String(h?.lane ?? "").toLowerCase();
    const out = new Set();

    const norm = roles.map(r => String(r).toLowerCase());
    for (const r of norm) {
      if (r.includes("战士") || r.includes("fighter")) out.add("Baron");
      if (r.includes("坦克") || r.includes("tank")) out.add("Baron");
      if (r.includes("刺客") || r.includes("assassin")) out.add("Jungle");
      if (r.includes("射手") || r.includes("marksman")) out.add("ADC");
      if (r.includes("法师") || r.includes("mage")) out.add("Mid");
      if (r.includes("辅助") || r.includes("support")) out.add("Support");
    }
    if (lane.includes("打野")) out.add("Jungle");
    if (lane.includes("中路")) out.add("Mid");
    if (lane.includes("下路")) out.add("ADC");
    if (lane.includes("辅助")) out.add("Support");
    if (lane.includes("单人") || lane.includes("上路")) out.add("Baron");

    return Array.from(out);
  }

  function setRoleOptionsForChampion(c) {
    const roles = rolesForHero(c.hero_id);
    // fallback if unknown
    const preferred = roles.length ? roles : ["Baron","Jungle","Mid","ADC","Support"];
    const current = modalRoleSelect.value;

    modalRoleSelect.innerHTML = "";
    for (const r of ["Baron","Jungle","Mid","ADC","Support"]) {
      if (!preferred.includes(r)) continue;
      const opt = document.createElement("option");
      opt.value = r; opt.textContent = r;
      modalRoleSelect.appendChild(opt);
    }
    // keep current if possible else choose first
    if ([...modalRoleSelect.options].some(o => o.value === current)) {
      modalRoleSelect.value = current;
    } else {
      modalRoleSelect.value = modalRoleSelect.options[0]?.value || "Jungle";
    }
  }

  // AUTO counters for ALL champions (no matchup API):
  // 1) same role pool
  // 2) sort by CounterScore = metaScore + (ban * 0.6) + (win * 0.3)
  // 3) "why" is generated from stats (unique & useful for player)
  function autoCountersForRole(picked, role, limit=3) {
    const pool = allChamps.filter(c => c.hero_id !== picked.hero_id);
    const rolePool = pool.filter(c => rolesForHero(c.hero_id).includes(role));
    const candidates = (rolePool.length ? rolePool : pool);

    const scored = candidates.map(c => {
      const win = Number(c.stats?.CN?.win ?? 0);
      const ban = Number(c.stats?.CN?.ban ?? 0);
      const pick = Number(c.stats?.CN?.pick ?? 0);
      const ms = metaScore(c);
      const score = ms + (ban * 0.6) + (win * 0.3);

      // reason templates
      let why = `Starker ${role}-Pick im aktuellen Meta.`;
      if (ban >= 20) why = `Sehr oft gebannt (${ban.toFixed(2)}%): Viele finden ihn zu stark.`;
      else if (win >= 54) why = `Hohe Winrate (${win.toFixed(2)}%): gewinnt im Schnitt sehr häufig.`;
      else if (pick >= 12) why = `Hohe Pickrate (${pick.toFixed(2)}%): sehr präsent, gut um Tempo zu halten.`;

      return { name:c.name, icon:c.icon, score, why };
    });

    scored.sort((a,b) => b.score - a.score);
    return scored.slice(0, limit);
  }

  function buildCounters(pickedName, role) {
    const overrides = counterOverrides?.[pickedName]?.[role];
    if (Array.isArray(overrides) && overrides.length) {
      // merge overrides with meta to sort nicely
      const merged = overrides.map(r => {
        const champ = getChampionByName(r.name);
        if (!champ) return null;
        const ms = metaScore(champ);
        const total = (Number(r.weight ?? 1) * 100) + ms;
        return { name: champ.name, icon: champ.icon, score: total, why: r.why || "Hard Counter." };
      }).filter(Boolean).sort((a,b)=>b.score-a.score);
      return merged.slice(0,3);
    }
    // fallback: auto for all champs
    const picked = getChampionByName(pickedName);
    if (!picked) return [];
    return autoCountersForRole(picked, role, 3);
  }

  function renderCounters(pickedChampionName, role) {
    const list = buildCounters(pickedChampionName, role);

    if (!list.length) {
      modalCounters.innerHTML = `<div class="mstat"><div class="k">Hinweis</div><div class="v">Keine Counter gefunden.</div></div>`;
      return;
    }

    modalCounters.innerHTML = "";
    for (const c of list) {
      const el = document.createElement("div");
      el.className = "counterItem";
      el.innerHTML = `
        <img class="cIcon" src="${c.icon}" alt="${c.name}" loading="lazy" />
        <div class="cMain">
          <div class="cName">${c.name}</div>
          <div class="cWhy">${c.why}</div>
        </div>
        <div class="cScore" title="CounterScore">#${c.score.toFixed(0)}</div>
      `;
      modalCounters.appendChild(el);
    }
  }

  function openModal(c) {
    currentModalChamp = c;

    modalIcon.src = c.icon;
    modalIcon.alt = c.name;
    modalName.textContent = c.name;
    modalId.textContent = `#${c.hero_id}`;
    modalScore.textContent = metaScore(c).toFixed(1);

    modalWin.textContent = fmtPct(c.stats?.CN?.win ?? null);
    modalPick.textContent = fmtPct(c.stats?.CN?.pick ?? null);
    modalBan.textContent = fmtPct(c.stats?.CN?.ban ?? null);

    setRoleOptionsForChampion(c);
    renderCounters(c.name, modalRoleSelect.value);

    modal.classList.remove("hidden");
  }

  function closeModal() {
    modal.classList.add("hidden");
  }

  modalClose.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target.classList.contains("modalBackdrop")) closeModal();
  });

  modalRoleSelect.addEventListener("change", () => {
    if (!currentModalChamp) return;
    renderCounters(currentModalChamp.name, modalRoleSelect.value);
  });

  function render(list) {
    grid.innerHTML = "";

    if (!list.length) {
      statusEl.textContent = "Keine Treffer.";
      statusEl.style.display = "block";
      return;
    }

    statusEl.style.display = "none";
    const frag = document.createDocumentFragment();

    for (const c of list) {
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
            <div class="id">#${c.hero_id}</div>
          </div>
          <div class="score" title="MetaScore">${metaScore(c).toFixed(1)}</div>
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

      const av = sort === "win" ? (a.stats?.CN?.win ?? 0)
               : sort === "pick" ? (a.stats?.CN?.pick ?? 0)
               : sort === "ban" ? (a.stats?.CN?.ban ?? 0)
               : metaScore(a);

      const bv = sort === "win" ? (b.stats?.CN?.win ?? 0)
               : sort === "pick" ? (b.stats?.CN?.pick ?? 0)
               : sort === "ban" ? (b.stats?.CN?.ban ?? 0)
               : metaScore(b);

      return Number(bv) - Number(av);
    });

    render(list);
  }

  async function loadJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
    return res.json();
  }

  async function loadText(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
    return res.text();
  }

  function safeParseHeroList(text) {
    // supports either JSON file OR JS like: var hero_list = {...} or module export
    // try JSON first
    try { return JSON.parse(text); } catch(e) {}
    // try to extract first {...} block
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try { return JSON.parse(m[0]); } catch(e) {}
    return null;
  }

  async function load() {
    try {
      statusEl.textContent = "Lade Daten…";

      const ts = Date.now();
      const metaUrl = `./meta.json?ts=${ts}`;
      const heroDbUrl = `./wr_champions.json?ts=${ts}`;
      const overridesUrl = `./counter_overrides.json?ts=${ts}`;

      const meta = await loadJson(metaUrl);
      patchPill.textContent = `Patch: ${meta.patch ?? "–"}`;
      updatePill.textContent = `Update: ${meta.lastUpdated ?? "–"}`;

      allChamps = normalizeMeta(meta);

      // hero db (roles/lane). Your repo already has wr_champions.json
      try {
        const heroDbRaw = await loadJson(heroDbUrl);
        // allow either {heroId: {...}} or {heroList:{heroId:{...}}}
        const heroList = heroDbRaw.heroList || heroDbRaw;
        heroDb = heroList || {};
      } catch (e) {
        heroDb = {};
      }

      // optional overrides (not required)
      try {
        counterOverrides = await loadJson(overridesUrl);
      } catch(e) {
        counterOverrides = {};
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
