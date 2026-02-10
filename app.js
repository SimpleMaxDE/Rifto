(() => {
  const $ = (id) => document.getElementById(id);

  const grid = $("grid");
  const statusEl = $("status");
  const patchPill = $("patchPill");
  const updatePill = $("updatePill");
  const searchEl = $("search");
  const sortEl = $("sort");

  // Modal refs
  const modal = $("champModal");
  const modalClose = $("modalClose");
  const modalIcon = $("modalIcon");
  const modalName = $("modalName");
  const modalId = $("modalId");
  const modalScore = $("modalScore");
  const modalWin = $("modalWin");
  const modalPick = $("modalPick");
  const modalBan = $("modalBan");

  let allChamps = []; // normalized list

  function fmtPct(v) {
    if (v === null || v === undefined) return "–";
    const n = Number(v);
    if (!Number.isFinite(n)) return "–";
    return `${n.toFixed(2)}%`;
  }

  // Simple "MetaScore" (can be improved later)
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

  function openModal(c) {
    modalIcon.src = c.icon;
    modalIcon.alt = c.name;
    modalName.textContent = c.name;
    modalId.textContent = `#${c.hero_id}`;
    modalScore.textContent = metaScore(c).toFixed(1);

    modalWin.textContent = fmtPct(c.stats?.CN?.win ?? null);
    modalPick.textContent = fmtPct(c.stats?.CN?.pick ?? null);
    modalBan.textContent = fmtPct(c.stats?.CN?.ban ?? null);

    modal.classList.remove("hidden");
  }

  function closeModal() {
    modal.classList.add("hidden");
  }

  modalClose.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target.classList.contains("modalBackdrop")) closeModal();
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
      card.setAttribute("data-name", c.name);

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
          <div class="stat">
            <div class="k">Win</div>
            <div class="v">${fmtPct(win)}</div>
          </div>
          <div class="stat">
            <div class="k">Pick</div>
            <div class="v">${fmtPct(pick)}</div>
          </div>
          <div class="stat">
            <div class="k">Ban</div>
            <div class="v">${fmtPct(ban)}</div>
          </div>
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

    if (q) {
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }

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

  async function load() {
    try {
      statusEl.textContent = "Lade Daten…";
      const url = `./meta.json?ts=${Date.now()}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`meta.json HTTP ${res.status}`);

      const meta = await res.json();

      patchPill.textContent = `Patch: ${meta.patch ?? "–"}`;
      updatePill.textContent = `Update: ${meta.lastUpdated ?? "–"}`;

      allChamps = normalizeMeta(meta);

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
