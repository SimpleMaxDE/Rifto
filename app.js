const state = {
  champs: [],
  meta: {},
  selectedChamp: null
};

async function loadJSON(path) {
  const res = await fetch(path);
  return await res.json();
}

async function init() {
  const [wrList, meta] = await Promise.all([
    loadJSON("wr_champions.json"),
    loadJSON("meta.json")
  ]);

  state.meta = meta;
  state.champs = wrList.map(name => {
    const stats = meta.statsByName?.[name] || {};
    return {
      name,
      win: stats.win ?? null,
      pick: stats.pick ?? null,
      ban: stats.ban ?? null,
      metaScore: calcMetaScore(stats)
    };
  });

  renderChampionSelect();
  renderTierList();
}

function calcMetaScore(stats = {}) {
  if (!stats.win) return 0;
  return (
    (stats.win * 0.5) +
    ((stats.pick || 0) * 0.3) +
    ((stats.ban || 0) * 0.2)
  );
}

function renderChampionSelect() {
  const select = document.getElementById("champSelect");
  select.innerHTML = `<option value="">Champion wählen…</option>`;

  state.champs.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.name;
    opt.textContent = c.name;
    select.appendChild(opt);
  });

  select.onchange = e => {
    state.selectedChamp = e.target.value;
    renderSmartBan();
  };
}

function renderTierList() {
  const list = document.getElementById("tierList");
  list.innerHTML = "";

  const sorted = [...state.champs].sort((a, b) => b.metaScore - a.metaScore);

  sorted.forEach(c => {
    const div = document.createElement("div");
    div.className = "champ-row";
    div.innerHTML = `
      <strong>${c.name}</strong>
      <span>Meta: ${c.metaScore.toFixed(1)}</span>
    `;
    list.appendChild(div);
  });
}

function renderSmartBan() {
  const box = document.getElementById("smartBan");
  if (!state.selectedChamp) {
    box.innerHTML = "<em>Wähle zuerst einen Champion</em>";
    return;
  }

  const bans = [...state.champs]
    .filter(c => c.name !== state.selectedChamp)
    .sort((a, b) => (b.ban || 0) - (a.ban || 0))
    .slice(0, 5);

  box.innerHTML = `
    <h3>Smart Bans gegen ${state.selectedChamp}</h3>
    <ul>
      ${bans.map(b => `
        <li>
          <strong>${b.name}</strong>
          – hohe Banrate (${b.ban ?? "–"}%)
        </li>
      `).join("")}
    </ul>
  `;
}

document.addEventListener("DOMContentLoaded", init);