const ROLES = ["Baron","Jungle","Mid","ADC","Support"];
let currentRole = "Global";
let champs = [];

function tierFromScore(score){
  if(score >= 125) return "SS";
  if(score >= 110) return "S";
  if(score >= 95) return "A";
  if(score >= 80) return "B";
  return "C";
}

function computeRoleScore(champ, role){
  const win  = champ.stats?.CN?.win  ?? 0;
  const pick = champ.stats?.CN?.pick ?? 0;
  const ban  = champ.stats?.CN?.ban  ?? 0;

  let score = win * 1.4 + pick * 0.5 + ban * 0.25;

  if(role !== "Global"){
    if(champ.lanes?.includes(role)){
      score += 10;
    } else {
      score -= 10;
    }
  }
  return score;
}

function renderMeta(){
  const grid = document.getElementById("grid");
  const q = (document.getElementById("search").value || "").toLowerCase();
  let list = champs
    .filter(c => c.name.toLowerCase().includes(q))
    .sort((a,b)=> computeRoleScore(b,currentRole) - computeRoleScore(a,currentRole));

  grid.innerHTML = list.map(c=>`
    <div class="card">
      <strong>${c.name}</strong><br/>
      Tier: ${tierFromScore(computeRoleScore(c,currentRole))}<br/>
      Win: ${c.stats?.CN?.win ?? 0}%
    </div>
  `).join("");
}

function renderTierlist(){
  const wrap = document.getElementById("tierlistContainer");
  const groups = {SS:[],S:[],A:[],B:[],C:[]};

  champs.forEach(c=>{
    const tier = tierFromScore(computeRoleScore(c,currentRole));
    groups[tier].push(c);
  });

  wrap.innerHTML = Object.entries(groups).map(([tier,list])=>`
    <div class="tierGroup">
      <h3>${tier}</h3>
      ${list.map(c=>`
        <div class="tierRow">
          ${c.name}
        </div>
      `).join("")}
    </div>
  `).join("");
}

async function loadMeta(){
  const res = await fetch("meta.json");
  const data = await res.json();
  champs = data.champions || [];
  renderMeta();
  renderTierlist();
}

document.getElementById("roleSelect").addEventListener("change",e=>{
  currentRole = e.target.value;
  renderMeta();
  renderTierlist();
});

document.getElementById("search").addEventListener("input",renderMeta);

loadMeta();
