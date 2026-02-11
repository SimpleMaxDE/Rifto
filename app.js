// ===== RIFTO: Modal safety boot =====
(() => {
  const closeNow = () => {
    const bd = document.getElementById("modalBackdrop");
    if (!bd) return;
    bd.classList.remove("show");
    bd.style.display = "none";
    document.body.classList.remove("modalOpen");
    document.body.style.overflow = "";
  };

  // sofort + nach DOM load (doppelt hält besser)
  closeNow();
  document.addEventListener("DOMContentLoaded", closeNow);
  window.addEventListener("load", closeNow);

  // ESC schließt immer
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeNow();
  });

  // Klick auf Backdrop schließt (nicht wenn man auf Modal klickt)
  document.addEventListener("click", (e) => {
    const bd = document.getElementById("modalBackdrop");
    if (!bd) return;
    if (e.target === bd) closeNow();
  });
})();
(() => {
  const $ = (id) => document.getElementById(id);
  
  // --- Hard safety: Modal niemals "stuck open" beim Laden ---
  window.addEventListener("DOMContentLoaded", () => {
    const bd = document.getElementById("modalBackdrop");
    if (bd) bd.classList.add("hidden");
    document.body.style.overflow = "";
  });

  // Escape schließt Modal (auch wenn später JS irgendwo crasht)
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const bd = document.getElementById("modalBackdrop");
      if (bd) bd.classList.add("hidden");
      document.body.style.overflow = "";
    }
  });

  // Pills
  const patchPill = $("patchPill");
  const updatePill = $("updatePill");
  const trendPill = $("trendPill");

  // Tabs/views
  const tabBtns = [...document.querySelectorAll(".tab")];
  const views = {
    meta: $("viewMeta"),
    draft: $("viewDraft"),
    matchup: $("viewMatchup"),
    tierlist: $("viewTierlist"),
  };

  // META controls
  const statusEl = $("status");
  const gridEl = $("grid");
  const searchInput = $("searchInput");
  const sortSelect = $("sortSelect");

  // Modal
  const backdrop = $("modalBackdrop");
  const modalClose = $("modalClose");
  const modalIcon = $("modalIcon");
  const modalName = $("modalName");
  const modalTier = $("modalTier");
  const modalLanes = $("modalLanes");
  const modalWin = $("modalWin");
  const modalPick = $("modalPick");
  const modalBan = $("modalBan");
  const modalLaneSelect = $("modalLaneSelect");
  const modalOffmeta = $("modalOffmeta");
  const modalBans = $("modalBans");
  const modalReason = $("modalReason");
  const useAsMyChamp = $("useAsMyChamp");
  const useAsEnemyChamp = $("useAsEnemyChamp");

  // Draft
  const draftLane = $("draftLane");
  const pickMyChamp = $("pickMyChamp");
  const draftMyChamp = $("draftMyChamp");
  const draftBans = $("draftBans");
  const draftHint = $("draftHint");
  const draftModeBtns = [...document.querySelectorAll(".chip")];

  // Matchup
  const muMyName = $("muMyName");
  const muEnemyName = $("muEnemyName");
  const muMyLane = $("muMyLane");
  const muEnemyLane = $("muEnemyLane");
  const muPickMy = $("muPickMy");
  const muPickEnemy = $("muPickEnemy");
  const muCounters = $("muCounters");
  const muGoodPicks = $("muGoodPicks");
  const muAvoid = $("muAvoid");
  const muExplain = $("muExplain");

  // Tierlist
  const tlLane = $("tlLane");
  const tlSort = $("tlSort");
  const tlList = $("tlList");

  // State
  let META = null;
  let champs = []; // normalized
  let selected = null; // champ object for modal
  let currentTab = "meta";

  // Pick state for tools
  let myChamp = null;
  let enemyChamp = null;
  let draftMode = "enemyfp";

  // --- Helpers
  const LANES = ["Baron", "Jungle", "Mid", "ADC", "Support"];

  function pct(n) {
    if (n == null || Number.isNaN(n)) return "–";
    return `${Number(n).toFixed(2)}%`;
  }

  function tierClass(t) {
    if (t === "SS") return "tierBadge tSS";
    if (t === "S") return "tierBadge tS";
    if (t === "A") return "tierBadge tA";
    if (t === "B") return "tierBadge tB";
    return "tierBadge tC";
  }

  function computeMetaScore(win, pick, ban) {
    // simple but stable: win is most important, then pick, then ban.
    // clamp-ish to avoid insane skew.
    const w = (win ?? 0);
    const p = (pick ?? 0);
    const b = (ban ?? 0);
    return (w * 1.35) + (p * 0.55) + (b * 0.25);
  }

  function scoreToTier(score) {
    // tuned to your dataset style (SS heavy top)
    if (score >= 125) return "SS";
    if (score >= 110) return "S";
    if (score >= 95) return "A";
    if (score >= 82) return "B";
    return "C";
  }

  function degradeTier(tier, steps) {
    const order = ["SS","S","A","B","C"];
    let i = order.indexOf(tier);
    if (i < 0) i = 3;
    i = Math.min(order.length - 1, i + steps);
    return order[i];
  }

  function normalizeChamp(raw) {
    const stats = raw.stats?.CN ?? raw.stats ?? {};
    const win = Number(stats.win ?? stats.winrate ?? 0);
    const pick = Number(stats.pick ?? stats.pickrate ?? 0);
    const ban = Number(stats.ban ?? stats.banrate ?? 0);

    const score = computeMetaScore(win, pick, ban);
    const tier = scoreToTier(score);

    const lanes = (raw.lanes && raw.lanes.length ? raw.lanes : (raw.lane ? String(raw.lane).split(";") : []))
      .map(s => s.trim())
      .filter(Boolean)
      // normalize common chinese/aliases if they slipped in:
      .map(s => {
        const x = s.toLowerCase();
        if (x.includes("jungle") || x.includes("打野")) return "Jungle";
        if (x.includes("mid") || x.includes("中路")) return "Mid";
        if (x.includes("adc") || x.includes("下路") || x.includes("射手")) return "ADC";
        if (x.includes("support") || x.includes("辅助")) return "Support";
        if (x.includes("baron") || x.includes("单人") || x.includes("top")) return "Baron";
        return s;
      });

    // pick a "main lane" from lanes if exists
    const mainLane = lanes.find(l => LANES.includes(l)) || "–";

    return {
      hero_id: String(raw.hero_id ?? raw.heroId ?? ""),
      name: String(raw.name ?? raw.enName ?? raw.title ?? "Unknown"),
      icon: raw.icon ?? raw.avatar ?? "",
      win, pick, ban,
      score,
      tier,
      lanes,
      mainLane,
    };
  }

  function laneTierForChamp(ch, lane) {
    // if lane is Auto/Global -> base tier
    if (!lane || lane === "Auto" || lane === "Global") return { tier: ch.tier, offmeta: false };

    const ok = ch.lanes.includes(lane);
    if (ok) return { tier: ch.tier, offmeta: false };

    // Off-meta: degrade depending on how extreme
    // Jungle<->Lane swaps usually worse than Lane<->Lane
    const heavy = (lane === "Jungle" || ch.mainLane === "Jungle");
    const steps = heavy ? 2 : 1;
    return { tier: degradeTier(ch.tier, steps), offmeta: true };
  }

  function explainBan(my, lane, banChamp) {
    // short, LoL-like, newbie-friendly
    const reasons = [];
    if (banChamp.ban >= 25) reasons.push("wird sehr oft gebannt");
    if (banChamp.win >= 54) reasons.push("sehr hohe Winrate");
    if (banChamp.pick >= 18) reasons.push("sehr häufig gepickt");

    // lane pressure hint
    if (lane === "Jungle") reasons.push("stört dein Clear / invadet früh");
    if (lane === "Mid") reasons.push("drückt Lane + roamt schneller");
    if (lane === "ADC") reasons.push("gewinnt Trades / out-ranged dich");
    if (lane === "Support") reasons.push("starker Engage/Peel gegen dich");
    if (lane === "Baron") reasons.push("skaliert oder countert deine Duelle");

    // keep it short
    const base = reasons.slice(0, 2).join(" & ");
    return base ? `${banChamp.name}: ${base}.` : `${banChamp.name}: starker Pick gegen deinen Plan.`;
  }

  function pickCandidatesForLane(lane) {
    return champs
      .filter(c => lane === "Global" ? true : c.lanes.includes(lane))
      .sort((a,b) => b.score - a.score);
  }

  // Heuristic matchup: without true matchup-matrix, we do:
  // - Counters: same-lane, high tier, plus (ban high OR win high), not the same champ
  // - Good picks: same-lane, high win, decent pick, low ban (available)
  // - Avoid: enemy champ is high ban/high win -> avoid low tier picks (or picks with low win)
  function computeMatchup(my, myLane, enemy, enemyLane) {
    const lane = enemyLane || myLane || "Global";
    const pool = pickCandidatesForLane(lane === "Global" ? (myLane || "Global") : lane);

    const counters = pool
      .filter(c => c.hero_id !== enemy.hero_id)
      .sort((a,b) => (b.ban*0.8 + b.win*0.7 + b.score*0.6) - (a.ban*0.8 + a.win*0.7 + a.score*0.6))
      .slice(0, 5);

    const good = pool
      .filter(c => c.hero_id !== enemy.hero_id)
      .sort((a,b) => (b.win*1.1 + b.pick*0.6 - b.ban*0.3) - (a.win*1.1 + a.pick*0.6 - a.ban*0.3))
      .slice(0, 5);

    const avoid = pool
      .sort((a,b) => (a.win*1.0 - a.score*0.25) - (b.win*1.0 - b.score*0.25))
      .slice(0, 5);

    const note = `Hinweis: Das ist "smart heuristisch" (Meta + Lane + Verfügbarkeit). Für 1:1 OP.GG-Genauigkeit brauchen wir echte Matchup-Daten (Champ vs Champ).`;

    return { counters, good, avoid, note };
  }

  function smartBansFor(my, lane) {
    // bans should be "lane-relevant and dangerous now"
    const pool = pickCandidatesForLane(lane);
    const top = pool
      .filter(c => c.hero_id !== my.hero_id)
      .sort((a,b) => (b.ban*1.0 + b.win*0.9 + b.pick*0.35) - (a.ban*1.0 + a.win*0.9 + a.pick*0.35))
      .slice(0, 3);

    return top;
  }

  // --- Rendering
  function renderMetaGrid() {
    const q = (searchInput.value || "").trim().toLowerCase();
    const sort = sortSelect.value;

    let list = champs.slice();

    if (q) {
      list = list.filter(c => c.name.toLowerCase().includes(q));
    }

    if (sort === "tier") list.sort((a,b) => b.score - a.score);
    else if (sort === "win") list.sort((a,b) => b.win - a.win);
    else if (sort === "pick") list.sort((a,b) => b.pick - a.pick);
    else if (sort === "ban") list.sort((a,b) => b.ban - a.ban);
    else if (sort === "name") list.sort((a,b) => a.name.localeCompare(b.name));

    if (!list.length) {
      statusEl.textContent = "Keine Treffer.";
      gridEl.innerHTML = "";
      return;
    }

    statusEl.textContent = "";

    gridEl.innerHTML = list.map(c => {
      const laneText = c.mainLane && c.mainLane !== "–" ? `Main: ${c.mainLane}` : "Main: –";
      return `
        <button class="card" type="button" data-hero="${c.hero_id}">
          <div class="cardTop">
            <img class="icon" src="${c.icon}" alt="">
            <div>
              <div class="name">${c.name}</div>
              <div class="sub">${laneText}</div>
            </div>
            <span class="${tierClass(c.tier)}">${c.tier}</span>
          </div>
          <div class="metrics">
            <div class="metric">Win<b>${pct(c.win)}</b></div>
            <div class="metric">Pick<b>${pct(c.pick)}</b></div>
            <div class="metric">Ban<b>${pct(c.ban)}</b></div>
          </div>
        </button>
      `;
    }).join("");

    [...gridEl.querySelectorAll(".card")].forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-hero");
        const champ = champs.find(x => x.hero_id === id);
        if (champ) openModal(champ);
      });
    });
  }

  function renderStack(list, lane, my) {
    if (!list || !list.length) return `<div class="muted">–</div>`;
    return list.map((c, idx) => {
      const reason = my ? explainBan(my, lane, c) : "";
      return `
        <div class="stackItem">
          <img src="${c.icon}" alt="">
          <div>
            <div class="t">${idx+1}. ${c.name} <span class="${tierClass(c.tier)}" style="margin-left:8px">${c.tier}</span></div>
            ${reason ? `<div class="d">${reason}</div>` : ""}
          </div>
        </div>
      `;
    }).join("");
  }

  function openModal(champ) {
    selected = champ;

    modalIcon.src = champ.icon;
    modalName.textContent = champ.name;

    modalLaneSelect.value = "Auto";
    modalOffmeta.classList.add("hidden");

    modalWin.textContent = pct(champ.win);
    modalPick.textContent = pct(champ.pick);
    modalBan.textContent = pct(champ.ban);

    modalLanes.textContent = champ.lanes.length ? `Lanes: ${champ.lanes.join(" • ")}` : "Lanes: –";

    // default tier
    modalTier.className = tierClass(champ.tier);
    modalTier.textContent = champ.tier;

    // default bans based on main lane
    const lane = champ.mainLane && champ.mainLane !== "–" ? champ.mainLane : "Global";
    const bans = smartBansFor(champ, lane === "Global" ? "Mid" : lane); // fallback
    modalBans.innerHTML = renderStack(bans, lane, champ);
    modalReason.textContent = `Kurz: Das sind starke ${lane}-Picks, die deinen Plan hart stören.`;

    backdrop.classList.remove("hidden");
  }

  function closeModal() {
    backdrop.classList.add("hidden");
    selected = null;
  }

  function updateModalForLane() {
    if (!selected) return;
    const lane = modalLaneSelect.value;
    const actualLane = (lane === "Auto") ? (selected.mainLane || "Global") : lane;

    const lt = laneTierForChamp(selected, actualLane);
    modalTier.className = tierClass(lt.tier);
    modalTier.textContent = lt.tier;

    if (lt.offmeta) modalOffmeta.classList.remove("hidden");
    else modalOffmeta.classList.add("hidden");

    const bans = smartBansFor(selected, actualLane === "Global" ? "Mid" : actualLane);
    modalBans.innerHTML = renderStack(bans, actualLane, selected);

    modalReason.textContent = lt.offmeta
      ? `Off-meta Lane: Tier wird runtergestuft. Bans sind jetzt auf ${actualLane} angepasst.`
      : `Bans sind auf ${actualLane} angepasst.`;
  }

  // Draft
  function renderDraft() {
    const lane = draftLane.value;
    if (!myChamp) {
      draftMyChamp.textContent = "Kein Champion gewählt";
      draftBans.innerHTML = `<div class="muted">Wähle zuerst deinen Champion.</div>`;
      draftHint.textContent = "";
      return;
    }

    const lt = laneTierForChamp(myChamp, lane);
    draftMyChamp.innerHTML = `
      <div class="stackItem">
        <img src="${myChamp.icon}" alt="">
        <div>
          <div class="t">${myChamp.name} <span class="${tierClass(lt.tier)}" style="margin-left:8px">${lt.tier}</span></div>
          <div class="d">Lane: ${lane}${lt.offmeta ? " • Off-meta" : ""}</div>
        </div>
      </div>
    `;

    const bans = smartBansFor(myChamp, lane);
    draftBans.innerHTML = renderStack(bans, lane, myChamp);

    const modeTxt = {
      enemyfp: "Enemy First Pick: bannt besonders gefährliche/oft gepickte Threats.",
      myfp: "My First Pick: bannt Champs, die deinen Pick am härtesten stoppen.",
      middraft: "Mid Draft: balanced.",
      latedraft: "Late Draft: bannt Hard-Engage/Reset-Champs, die Teamfights drehen."
    }[draftMode] || "";

    draftHint.textContent = modeTxt;
  }

  // Matchup
  function renderMatchup() {
    if (!myChamp || !enemyChamp) {
      muCounters.innerHTML = `<div class="muted">Wähle deinen Champ + Enemy.</div>`;
      muGoodPicks.innerHTML = `<div class="muted">–</div>`;
      muAvoid.innerHTML = `<div class="muted">–</div>`;
      muExplain.textContent = "";
      return;
    }

    const res = computeMatchup(myChamp, muMyLane.value, enemyChamp, muEnemyLane.value);
    muCounters.innerHTML = renderStack(res.counters, muEnemyLane.value, null);
    muGoodPicks.innerHTML = renderStack(res.good, muEnemyLane.value, null);
    muAvoid.innerHTML = renderStack(res.avoid, muEnemyLane.value, null);
    muExplain.textContent = res.note;
  }

  // Tierlist
  function renderTierlist() {
    const lane = tlLane.value;
    const sort = tlSort.value;

    let list = champs.slice();
    if (lane !== "Global") list = list.filter(c => c.lanes.includes(lane));

    if (sort === "tier" || sort === "score") list.sort((a,b) => b.score - a.score);
    else if (sort === "win") list.sort((a,b) => b.win - a.win);
    else if (sort === "pick") list.sort((a,b) => b.pick - a.pick);
    else if (sort === "ban") list.sort((a,b) => b.ban - a.ban);

    tlList.innerHTML = list.slice(0, 80).map((c, i) => {
      const lt = laneTierForChamp(c, lane);
      return `
        <div class="tierRow" data-hero="${c.hero_id}">
          <div class="tierRowL">
            <img src="${c.icon}" alt="">
            <div>
              <div style="font-weight:900">${i+1}. ${c.name} <span class="${tierClass(lt.tier)}" style="margin-left:8px">${lt.tier}</span></div>
              <div class="tierRowMid">${lane === "Global" ? `Main: ${c.mainLane}` : `Lane: ${lane}${lt.offmeta ? " • Off-meta" : ""}`}</div>
            </div>
          </div>
          <div class="muted">Win ${pct(c.win)} • Pick ${pct(c.pick)} • Ban ${pct(c.ban)}</div>
        </div>
      `;
    }).join("");

    [...tlList.querySelectorAll(".tierRow")].forEach(row => {
      row.addEventListener("click", () => {
        const id = row.getAttribute("data-hero");
        const champ = champs.find(x => x.hero_id === id);
        if (champ) openModal(champ);
      });
    });
  }

  // Tab switching
  function setTab(name) {
    currentTab = name;
    tabBtns.forEach(b => b.classList.toggle("active", b.dataset.tab === name));
    Object.entries(views).forEach(([k, el]) => el.classList.toggle("hidden", k !== name));

    // render on enter
    if (name === "meta") renderMetaGrid();
    if (name === "draft") renderDraft();
    if (name === "matchup") renderMatchup();
    if (name === "tierlist") renderTierlist();
  }

  // Picker use modal
  function setAsMyChamp(ch) {
    myChamp = ch;
    muMyName.textContent = ch.name;
    renderDraft();
    renderMatchup();
  }
  function setAsEnemyChamp(ch) {
    enemyChamp = ch;
    muEnemyName.textContent = ch.name;
    renderMatchup();
  }

  // --- Load
  async function loadMeta() {
    statusEl.textContent = "Lade Daten…";

    const res = await fetch("meta.json", { cache: "no-store" });
    const data = await res.json();
    META = data;

    patchPill.textContent = `Patch: ${data.patch ?? "–"}`;
    updatePill.textContent = `Update: ${data.lastUpdated ?? "–"}`;
    trendPill.textContent = `Trend: ${data.trend ?? "–"}`;

    const raw = Array.isArray(data.champions) ? data.champions : Object.values(data.champions || {});
    champs = raw.map(normalizeChamp);

    statusEl.textContent = "";
    renderMetaGrid();
    renderDraft();
    renderTierlist();
  }

  // --- Events
  tabBtns.forEach(btn => btn.addEventListener("click", () => setTab(btn.dataset.tab)));

  searchInput.addEventListener("input", renderMetaGrid);
  sortSelect.addEventListener("change", renderMetaGrid);

  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) closeModal();
  });
  modalClose.addEventListener("click", closeModal);
  modalLaneSelect.addEventListener("change", updateModalForLane);

  useAsMyChamp.addEventListener("click", () => {
    if (!selected) return;
    setAsMyChamp(selected);
    closeModal();
  });
  useAsEnemyChamp.addEventListener("click", () => {
    if (!selected) return;
    setAsEnemyChamp(selected);
    closeModal();
  });

  pickMyChamp.addEventListener("click", () => {
    setTab("meta");
    statusEl.textContent = "👉 Klick einen Champion: Modal → „Als meinen Champ setzen“";
  });

  draftLane.addEventListener("change", renderDraft);
  draftModeBtns.forEach(b => b.addEventListener("click", () => {
    draftModeBtns.forEach(x => x.classList.remove("active"));
    b.classList.add("active");
    draftMode = b.dataset.mode;
    renderDraft();
  }));

  muPickMy.addEventListener("click", () => {
    setTab("meta");
    statusEl.textContent = "👉 Klick Champion → „Als meinen Champ setzen“";
  });
  muPickEnemy.addEventListener("click", () => {
    setTab("meta");
    statusEl.textContent = "👉 Klick Champion → „Als Enemy setzen“";
  });
  muMyLane.addEventListener("change", renderMatchup);
  muEnemyLane.addEventListener("change", renderMatchup);

  tlLane.addEventListener("change", renderTierlist);
  tlSort.addEventListener("change", renderTierlist);

  // Start
  setTab("meta");
  loadMeta().catch(err => {
    console.error(err);
    statusEl.textContent = "Fehler beim Laden von meta.json. Check GitHub Pages / Cache.";
  });
})();