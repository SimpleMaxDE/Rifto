const META_URL = "./meta.json";

let META = null;

const patchEl = document.getElementById("patch");
const lastUpdatedEl = document.getElementById("lastUpdated");

const tabs = document.getElementById("tabs");
const tierView = document.getElementById("tierView");
const pickView = document.getElementById("pickView");
const allView  = document.getElementById("allView");

const rankEl = document.getElementById("rank");
const posEl = document.getElementById("pos");
const sortEl = document.getElementById("sort");

const pickedEl = document.getElementById("picked");
const pickedSearchEl = document.getElementById("pickedSearch");

const recoEl = document.getElementById("reco");
const recoImgEl = document.getElementById("recoImg");
const recoNameEl = document.getElementById("recoName");
const recoSubEl = document.getElementById("recoSub");
const recoStatusEl = document.getElementById("recoStatus");
const recoBan1El = document.getElementById("recoBan1");
const recoBanWhyEl = document.getElementById("recoBanWhy");
const recoThreatsEl = document.getElementById("recoThreats");

const qEl = document.getElementById("q");
const allListEl = document.getElementById("allList");

const modal = document.getElementById("modal");
document.getElementById("closeBtn").onclick = closeModal;
modal.addEventListener("click", (e)=>{ if(e.target===modal) closeModal(); });

function fmtRate(x){
  if(typeof x !== "number") return "—";
  return x.toFixed(2) + "%";
}

function statusFromStats(s){
  const w = s?.win ?? 0;
  const b = s?.ban ?? 0;
  const p = s?.pick ?? 0;
  const presence = p + b;
  if (w >= 53.5 && presence >= 25) return "UNKILLBAR / OP";
  if (w >= 52.5 && presence >= 18) return "OP";
  if (w >= 51.5) return "Sehr stark";
  if (w >= 50.5) return "Gut spielbar";
  if (w >= 49.5) return "Situativ";
  return "Eher schwach";
}

function metaThreatScore(s){
  const w = s?.win ?? 0;
  const p = s?.pick ?? 0;
  const b = s?.ban ?? 0;
  return (w * 2.2) + (p * 0.7) + (b * 0.9);
}

// Deine Spielweise: Top/Mid/ADC viel, Jungle/Sup wenig
const POS_WEIGHT = { TOP:1.25, MID:1.20, BOT:1.15, JUNGLE:0.85, SUPPORT:0.80 };

function posBoost(ch){
  let boost = 1.0;
  const ps = ch.positions || [];
  for(const p of ps){
    if(POS_WEIGHT[p]) boost += (POS_WEIGHT[p]-1.0) * 0.6;
  }
  // Flex bonus
  if(ps.length >= 2) boost += 0.06;
  if(ps.length >= 3) boost += 0.10;
  return boost;
}

function metaScore(ch, rankKey){
  const s = ch.stats?.[rankKey];
  if(!s) return -1;
  return posBoost(ch) * metaThreatScore(s);
}

function tierLabel(score, s){
  // Make tier buckets similar to OP.GG style
  // Using score percentiles-ish cutoffs
  const st = statusFromStats(s);
  if(st.includes("UNKILLBAR")) return { tier:"S", cls:"tierS" };
  if(score >= 125) return { tier:"S", cls:"tierS" };
  if(score >= 112) return { tier:"A", cls:"tierA" };
  if(score >= 100) return { tier:"B", cls:"tierB" };
  return { tier:"C", cls:"tierC" };
}

// Icons: use LoL Data Dragon as placeholder (stable public CDN)
// meta.json provides ddragonVersion and optional iconKey mapping.
function champIcon(ch){
  const v = META?.ddragonVersion || "14.1.1";
  const key = ch.iconKey || ch.name;
  return `https://ddragon.leagueoflegends.com/cdn/${v}/img/champion/${encodeURIComponent(key)}.png`;
}

function setTab(tab){
  const buttons = [...tabs.querySelectorAll(".segBtn")];
  buttons.forEach(b=>b.classList.remove("active"));
  const btn = buttons.find(b=>b.dataset.tab===tab);
  if(btn) btn.classList.add("active");

  tierView.style.display = tab==="tier" ? "" : "none";
  pickView.style.display = tab==="pick" ? "" : "none";
  allView.style.display  = tab==="all"  ? "" : "none";

  if(tab==="tier") renderTier();
  if(tab==="pick") updateReco();
  if(tab==="all") renderAll();
}

tabs.addEventListener("click", (e)=>{
  const btn = e.target?.closest(".segBtn");
  if(btn) setTab(btn.dataset.tab);
});

rankEl.addEventListener("change", ()=>{ renderTier(); renderAll(); updateReco(); });
posEl.addEventListener("change", ()=>{ renderTier(); renderAll(); updateReco(); });
sortEl.addEventListener("change", ()=>{ renderTier(); renderAll(); });

qEl?.addEventListener("input", ()=>renderAll());

function filterByPos(ch){
  const pos = posEl.value;
  if(pos==="ALL") return true;
  return (ch.positions || []).includes(pos);
}

function sortKey(ch, rankKey){
  const s = ch.stats?.[rankKey];
  if(!s) return -1;
  const score = metaScore(ch, rankKey);
  if(sortEl.value==="score") return score;
  if(sortEl.value==="win") return s.win;
  if(sortEl.value==="pick") return s.pick;
  if(sortEl.value==="ban") return s.ban;
  return score;
}

function renderTier(){
  if(!META) return;
  const rankKey = rankEl.value;

  const items = META.champions
    .filter(filterByPos)
    .map(ch=>({ch, s: ch.stats?.[rankKey], score: metaScore(ch, rankKey)}))
    .filter(x=>x.score>=0 && x.s)
    .sort((a,b)=>sortKey(b.ch,rankKey)-sortKey(a.ch,rankKey))
    .slice(0, 60);

  tierView.innerHTML = `<div class="gridCards" id="tierGrid"></div>`;
  const grid = document.getElementById("tierGrid");

  items.forEach(({ch,s,score}, idx)=>{
    const t = tierLabel(score, s);

    const el = document.createElement("div");
    el.className = "cardChamp";
    el.onclick = ()=>openModal(ch);

    const icon = champIcon(ch);

    el.innerHTML = `
      <div class="cardTop">
        <div class="champLeft">
          <img class="champImg" src="${icon}" alt="${ch.name}" loading="lazy" onerror="this.style.opacity=.25" />
          <div style="min-width:0">
            <div class="champName">${idx+1}. ${ch.name}</div>
            <div class="champMeta">${(ch.positions||[]).join(" · ")} · ${statusFromStats(s)}</div>
          </div>
        </div>
        <div class="tierPill ${t.cls}">${t.tier}</div>
      </div>
      <div class="smallRow">
        <div class="miniStat">WR ${fmtRate(s.win)}</div>
        <div class="miniStat">Pick ${fmtRate(s.pick)}</div>
        <div class="miniStat">Ban ${fmtRate(s.ban)}</div>
      </div>
    `;
    grid.appendChild(el);
  });
}

function renderAll(){
  if(!META) return;
  const rankKey = rankEl.value;
  const q = (qEl?.value || "").trim().toLowerCase();

  const items = META.champions
    .filter(filterByPos)
    .filter(ch => !q || ch.name.toLowerCase().includes(q))
    .map(ch=>({ch, s: ch.stats?.[rankKey], score: metaScore(ch, rankKey)}))
    .sort((a,b)=>sortKey(b.ch,rankKey)-sortKey(a.ch,rankKey));

  allListEl.innerHTML = "";
  items.forEach(({ch,s,score})=>{
    const icon = champIcon(ch);
    const t = s ? tierLabel(score, s) : {tier:"—", cls:"tierC"};
    const el = document.createElement("div");
    el.className = "cardChamp";
    el.onclick = ()=>openModal(ch);
    el.innerHTML = `
      <div class="cardTop">
        <div class="champLeft">
          <img class="champImg" src="${icon}" alt="${ch.name}" loading="lazy" onerror="this.style.opacity=.25" />
          <div style="min-width:0">
            <div class="champName">${ch.name}</div>
            <div class="champMeta">${(ch.positions||[]).join(" · ")} · ${s ? `WR ${fmtRate(s.win)}` : "—"}</div>
          </div>
        </div>
        <div class="tierPill ${t.cls}">${t.tier}</div>
      </div>
      ${s ? `<div class="smallRow"><div class="miniStat">Pick ${fmtRate(s.pick)}</div><div class="miniStat">Ban ${fmtRate(s.ban)}</div></div>` : ``}
    `;
    allListEl.appendChild(el);
  });
}

// Smart ban: meta-based game breaker (and lane weighted) – we can plug in matchup data later
function smartBan(picked, rankKey){
  let best=null, bestScore=-Infinity;

  for(const enemy of META.champions){
    if(enemy.name===picked.name) continue;
    const s = enemy.stats?.[rankKey];
    if(!s) continue;

    const score = metaScore(enemy, rankKey);
    if(score>bestScore){
      bestScore=score;
      best={enemy, s, score};
    }
  }
  if(!best) return {name:"—", reason:"Keine Daten"};

  const reason = `${statusFromStats(best.s)} · WR ${fmtRate(best.s.win)} · Pick ${fmtRate(best.s.pick)} · Ban ${fmtRate(best.s.ban)}`;
  return {name: best.enemy.name, reason};
}

function topThreats(rankKey, n=5){
  return META.champions
    .map(ch=>({ch, s: ch.stats?.[rankKey], score: metaScore(ch, rankKey)}))
    .filter(x=>x.score>=0 && x.s)
    .sort((a,b)=>b.score-a.score)
    .slice(0,n);
}

function fillPicked(){
  pickedEl.innerHTML = `<option value="">Champion auswählen…</option>`;
  META.champions.slice().sort((a,b)=>a.name.localeCompare(b.name,"de")).forEach(ch=>{
    const o=document.createElement("option");
    o.value=ch.name; o.textContent=ch.name;
    pickedEl.appendChild(o);
  });
}

pickedEl.addEventListener("change", ()=>updateReco());
pickedSearchEl.addEventListener("input", ()=>{
  const v = pickedSearchEl.value.trim().toLowerCase();
  if(!v) return;
  const found = META.champions.find(ch=>ch.name.toLowerCase()===v);
  if(found){
    pickedEl.value = found.name;
    updateReco();
  }
});

function updateReco(){
  if(!META) return;
  const name = pickedEl.value;
  if(!name){
    recoEl.style.display="none";
    return;
  }
  const rankKey = rankEl.value;
  const picked = META.champions.find(ch=>ch.name===name);
  if(!picked){ recoEl.style.display="none"; return; }

  const s = picked.stats?.[rankKey];
  recoNameEl.textContent = picked.name;
  recoSubEl.textContent = (picked.positions||[]).join(" · ") || "—";
  recoStatusEl.textContent = s ? statusFromStats(s) : "—";

  recoImgEl.src = champIcon(picked);
  recoImgEl.alt = picked.name;

  const sb = smartBan(picked, rankKey);
  recoBan1El.textContent = sb.name;
  recoBanWhyEl.textContent = sb.reason;

  const threats = topThreats(rankKey, 5);
  recoThreatsEl.textContent = threats.map(x=>x.ch.name).join(", ");

  recoEl.style.display="";
}

function openModal(ch){
  const rankKey = rankEl.value;
  const s = ch.stats?.[rankKey];
  const score = metaScore(ch, rankKey);

  document.getElementById("mImg").src = champIcon(ch);
  document.getElementById("mImg").alt = ch.name;
  document.getElementById("mName").textContent = ch.name;
  document.getElementById("mMeta").textContent = (ch.positions||[]).join(" · ") || "—";

  document.getElementById("mStatus").textContent = s ? statusFromStats(s) : "—";
  document.getElementById("mScore").textContent = score>=0 ? score.toFixed(1) : "—";
  document.getElementById("mStats").textContent = s ? `WR ${fmtRate(s.win)} · Pick ${fmtRate(s.pick)} · Ban ${fmtRate(s.ban)}` : "—";

  const sb = smartBan(ch, rankKey);
  document.getElementById("mSmart").textContent = sb.name;
  document.getElementById("mSmartWhy").textContent = sb.reason;

  modal.classList.add("show");
  modal.setAttribute("aria-hidden","false");
}

function closeModal(){
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden","true");
}

async function boot(){
  const res = await fetch(META_URL, { cache: "no-store" });
  META = await res.json();

  patchEl.textContent = `Patch: ${META.patch || "—"}`;
  lastUpdatedEl.textContent = `Update: ${META.lastUpdated || "—"} · Quelle: ${META.source || "—"}`;

  fillPicked();
  setTab("tier");
  renderAll();
}
boot();
