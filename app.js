(()=>{const $=e=>document.getElementById(e);
// Pills
const patchPill=$("patchPill"),updatePill=$("updatePill"),trendPill=$("trendPill");

// Tabs/views
const tabBtns=[...document.querySelectorAll(".tab")];
const viewMeta=$("viewMeta"),viewDraft=$("viewDraft"),viewMatchup=$("viewMatchup"),viewTierlist=$("viewTierlist");

// META list
const grid=$("grid"),statusEl=$("status"),searchEl=$("search"),sortEl=$("sort");

// META modal
const modal=$("champModal"),modalClose=$("modalClose");
const modalIcon=$("modalIcon"),modalName=$("modalName"),modalLane=$("modalLane"),modalTier=$("modalTier");
const modalWin=$("modalWin"),modalPick=$("modalPick"),modalBan=$("modalBan");
const modalBans=$("modalBans"),modalLaneTiers=$("modalLaneTiers"),modalRoleSelect=$("modalRoleSelect"),offRole=$("offRole"),modalTrendHint=$("modalTrendHint");

// Draft
const btnPickMe=$("btnPickMe"),draftRole=$("draftRole"),myPickCard=$("myPickCard"),offMetaBox=$("offMetaBox");
const enemySlot1=$("enemySlot1"),enemySlot2=$("enemySlot2");
const allySlot1=$("allySlot1"),allySlot2=$("allySlot2"),allySlot3=$("allySlot3"),allySlot4=$("allySlot4");
const draftBans=$("draftBans"),draftContext=$("draftContext"),draftWarn=$("draftWarn"),draftFixes=$("draftFixes");
const phaseBtns=[...document.querySelectorAll(".phase")];

// Matchup
const btnMatchPick=$("btnMatchPick"),matchRole=$("matchRole"),matchPickCard=$("matchPickCard");
const matchHard=$("matchHard"),matchEven=$("matchEven"),matchGood=$("matchGood");

// Tierlist
const tierRole=$("tierRole"),tierFilter=$("tierFilter"),tierList=$("tierList");

// Picker
const picker=$("picker"),pickerClose=$("pickerClose"),pickerSearch=$("pickerSearch"),pickerGrid=$("pickerGrid");

const HERO_LIST_URL="https://game.gtimg.cn/images/lgamem/act/lrlib/js/heroList/hero_list.js";

let allChamps=[],heroDb={},tagDb={},defaultWeakByRole={},roleTags={};
let risingTypes=new Set(),fallingTypes=new Set(),trendText="–";

// State
let draftPhase="enemy_fp";
let myPickName=null,enemy1=null,enemy2=null;
let ally=[null,null,null,null];
let matchPickName=null;
let pickTarget="me";

// Labels
const TAG_LABEL={assassin_burst:"Assassin",assassin_reset:"Assassin",hard_engage:"Engage",pointclick_cc:"Point&Click CC",hard_cc:"CC",anti_auto:"Anti-Autoattacks",anti_tank:"Anti-Tank",true_damage:"True Damage",poke:"Poke",mage_poke:"Poke",mage_burst:"Burst Mage",mage_control:"Control Mage",lane_bully:"Lane Bully",dive:"Dive",tank:"Tank",fighter:"Fighter",kite_poke:"Poke",adc:"ADC"};
const OFF_META_LABEL={playable:"🟢 Spielbar",risky:"🟡 Riskant",bad:"🔴 Nicht empfohlen"};

// Helpers
const fmtPct=v=>{const n=Number(v);return Number.isFinite(n)?`${n.toFixed(2)}%`:"–"};
const metaScore=c=>{const win=Number(c.stats?.CN?.win??0),pick=Number(c.stats?.CN?.pick??0),ban=Number(c.stats?.CN?.ban??0);return win*1.2+pick*0.9+ban*0.5};
const normalizeMeta=meta=>(Array.isArray(meta.champions)?meta.champions:[]).map(c=>({hero_id:String(c.hero_id??""),name:String(c.name??"Unknown"),icon:String(c.icon??""),stats:c.stats??{CN:{win:0,pick:0,ban:0}}}));
const getChampionByName=name=>{if(!name)return null;const n=String(name).toLowerCase();return allChamps.find(c=>c.name.toLowerCase()===n)||null};
const heroInfo=id=>heroDb?.[String(id)]||null;
function labelTag(t){return TAG_LABEL[t]||t}
function champTypes(name){const t=tagDb?.[name]?.type;return Array.isArray(t)?t:[]}
function pickedWeakVs(name,role){const ex=tagDb?.[name]?.weak_vs;if(Array.isArray(ex)&&ex.length)return ex;return defaultWeakByRole?.[role]?.weak_vs||[]}

// Roles
function rolesForHero(id){
  const h=heroInfo(id);const out=new Set();if(!h)return[];
  const lane=String(h.lane??"").toLowerCase();
  const roles=Array.isArray(h.roles)?h.roles.map(r=>String(r).toLowerCase()):[];
  if(lane.includes("打野"))out.add("Jungle");
  if(lane.includes("中路"))out.add("Mid");
  if(lane.includes("下路"))out.add("ADC");
  if(lane.includes("辅助"))out.add("Support");
  if(lane.includes("单人")||lane.includes("上路"))out.add("Baron");
  for(const r of roles){
    if(r.includes("射手"))out.add("ADC");
    if(r.includes("辅助"))out.add("Support");
    if(r.includes("法师"))out.add("Mid");
    if(r.includes("刺客"))out.add("Jungle");
    if(r.includes("战士")||r.includes("坦克"))out.add("Baron");
  }
  return [...out];
}
function mainLaneText(id){
  const roles=rolesForHero(id);
  return roles.length?roles[0]:"–";
}

// Tier thresholds per role
function thresholdsForRole(role){
  const pool=role==="Global"?allChamps:allChamps.filter(c=>rolesForHero(c.hero_id).includes(role));
  const list=(pool.length?pool:allChamps).map(c=>metaScore(c)).sort((a,b)=>b-a);
  const q=p=>list[Math.floor(p*(list.length-1))]??0;
  return {ss:q(.05),s:q(.15),a:q(.35),b:q(.65)};
}
function tierForScore(s,t){return s>=t.ss?"SS":s>=t.s?"S":s>=t.a?"A":s>=t.b?"B":"C"}
function tierClass(t){return t==="SS"?"tierSS":t==="S"?"tierS":t==="A"?"tierA":t==="B"?"tierB":"tierC"}

// Trends (snapshot)
function computeTypeStrength(){
  const strength={},count={};
  for(const c of allChamps){
    const types=champTypes(c.name);if(!types.length)continue;
    const ms=metaScore(c);
    for(const t of types){strength[t]=(strength[t]||0)+ms;count[t]=(count[t]||0)+1}
  }
  for(const t of Object.keys(strength))strength[t]=strength[t]/Math.max(1,count[t]);
  return strength;
}
function loadPrevSnapshot(){try{return JSON.parse(localStorage.getItem("rifto_type_snapshot")||"null")}catch{return null}}
function saveSnapshot(s){try{localStorage.setItem("rifto_type_snapshot",JSON.stringify({ts:Date.now(),strength:s}))}catch{}}
function formatTrend(rise,fall){const up=rise.length?`${labelTag(rise[0])} ↑`:"";const down=fall.length?`${labelTag(fall[0])} ↓`:"";return[up,down].filter(Boolean).join(" • ")||"–"}
function updateTrends(){
  const current=computeTypeStrength();const prev=loadPrevSnapshot();
  risingTypes=new Set();fallingTypes=new Set();trendText="–";
  if(prev&&prev.strength){
    const deltas=[];
    for(const t of Object.keys(current)){
      if(prev.strength[t]===undefined)continue;
      deltas.push({t,d:current[t]-prev.strength[t]})
    }
    deltas.sort((a,b)=>b.d-a.d);
    const rise=deltas.filter(x=>x.d>0).slice(0,3);
    const fall=deltas.filter(x=>x.d<0).slice(-3);
    for(const r of rise)risingTypes.add(r.t);
    for(const f of fall)fallingTypes.add(f.t);
    trendText=formatTrend(rise.map(x=>x.t),fall.map(x=>x.t));
  }
  trendPill.textContent=`Trend: ${trendText}`;
  modalTrendHint.textContent=`Trend: ${trendText}`;
  saveSnapshot(current);
}

// Smart ban scoring
function baseThreatScore(c){
  const win=Number(c.stats?.CN?.win??0),pick=Number(c.stats?.CN?.pick??0),ban=Number(c.stats?.CN?.ban??0);
  return ban*1.0+pick*0.7+win*0.5+metaScore(c)*0.05;
}
function phaseWeights(p){
  if(p==="enemy_fp")return{meta:1.2,counter:.8,enemy:.9};
  if(p==="my_fp")return{meta:.8,counter:1.4,enemy:.9};
  if(p==="mid")return{meta:1.0,counter:1.1,enemy:1.2};
  if(p==="late")return{meta:.9,counter:1.2,enemy:1.3};
  return{meta:1.0,counter:1.0,enemy:1.0};
}
const ENEMY_SYNERGY_TO_BAN_TYPES={hard_engage:["assassin_burst","pointclick_cc","hard_cc"],pointclick_cc:["assassin_burst","mage_burst"],assassin_burst:["pointclick_cc","hard_cc"],tank:["true_damage","anti_tank"],poke:["hard_engage","assassin_burst"]};
function enemyThreatTypes(){
  const s=new Set();
  for(const n of [enemy1,enemy2]){if(!n)continue;for(const t of champTypes(n))s.add(t)}
  return s;
}
function enemySynergyBanTypes(){
  const out=new Set();
  for(const t of enemyThreatTypes()){
    const arr=ENEMY_SYNERGY_TO_BAN_TYPES[t];if(!arr)continue;for(const x of arr)out.add(x)
  }
  return out;
}
function enemySynergyScore(name){
  const wanted=enemySynergyBanTypes();if(!wanted.size)return 0;
  const types=champTypes(name);let hits=0;
  for(const w of wanted)if(types.includes(w))hits++;
  return hits*10;
}
function tagMatchScore(my,role,cand){
  const weak=pickedWeakVs(my,role);const types=champTypes(cand);
  let hits=0;for(const w of weak)if(types.includes(w))hits++;
  let bonus=hits*18;
  for(const w of weak){
    if(types.includes(w)&&risingTypes.has(w))bonus+=8;
    if(types.includes(w)&&fallingTypes.has(w))bonus-=4;
  }
  return bonus;
}
function rolePool(role,excludeId){
  const pool=allChamps.filter(c=>c.hero_id!==excludeId);
  const rp=pool.filter(c=>role==="Global"||rolesForHero(c.hero_id).includes(role));
  return rp.length?rp:pool;
}
function reasonAgainst(my,role,ban){
  const weak=pickedWeakVs(my,role);const types=champTypes(ban);
  for(const w of weak){
    if(types.includes(w)){
      if(w==="anti_auto")return `Kontert ${my} (Anti-Autoattacks)`;
      if(w==="pointclick_cc")return `Hält ${my} fest (Point&Click CC)`;
      if(w==="assassin_burst")return `Assassin tötet ${my} sehr schnell`;
      if(w==="hard_engage")return `Engage + CC macht ${my} angreifbar`;
      if(w==="hard_cc")return `${my} kommt kaum in Fights (viel CC)`;
      return `Gefährlich für ${my}: ${labelTag(w)}`;
    }
  }
  const wanted=enemySynergyBanTypes();
  for(const w of wanted){if(types.includes(w))return `Synergie mit Enemy Picks – gefährlich für ${my}`;}
  return `Starker ${role}-Pick gegen ${my}`;
}
function smartTop3(myName,role){
  const my=getChampionByName(myName);if(!my)return[];
  const w=phaseWeights(draftPhase);const th=thresholdsForRole(role);
  const cand=rolePool(role,my.hero_id);
  return cand.map(c=>{
    const score=baseThreatScore(c)*w.meta+tagMatchScore(my.name,role,c.name)*w.counter+enemySynergyScore(c.name)*w.enemy;
    return {name:c.name,icon:c.icon,score,why:reasonAgainst(my.name,role,c.name),tier:tierForScore(metaScore(c),th)};
  }).sort((a,b)=>b.score-a.score).slice(0,3);
}

// Off-meta evaluation (simple)
function offMetaRating(myName,role){
  const c=getChampionByName(myName);if(!c)return null;
  const roles=rolesForHero(c.hero_id);
  if(roles.includes(role))return null;
  // if champ has at least one other lane, it's off-meta; rate based on meta score percentile vs global
  const sc=metaScore(c);const th=thresholdsForRole("Global");
  const base=tierForScore(sc,th);
  if(base==="SS"||base==="S")return {lvl:"playable",txt:`Off-meta auf ${role}, aber Champion ist generell stark.`};
  if(base==="A")return {lvl:"risky",txt:`Off-meta auf ${role}. Kann klappen, aber ist riskant.`};
  return {lvl:"bad",txt:`Off-meta auf ${role}. Eher nicht empfohlen.`};
}

// Draft warnings + fixes
function teamTags(names){
  const types=[];for(const n of names){if(!n)continue;types.push(...champTypes(n))}
  const has=(tagArr)=>tagArr.some(t=>types.includes(t));
  const hardCC=has(roleTags.hard_cc||["hard_cc","pointclick_cc"]);
  const frontline=has(roleTags.frontline||["tank"]);
  const engage=has(roleTags.engage||["hard_engage"]);
  const ap=has(roleTags.ap||["mage_burst","mage_control","mage_poke"]);
  const poke=has(roleTags.poke||["poke","mage_poke","kite_poke"]);
  const early=has(roleTags.early||["lane_bully","dive"]);
  // crude damage split using types list
  const adCount = types.filter(t=>["fighter","assassin_burst","assassin_reset","adc"].includes(t)).length;
  const apCount = types.filter(t=>["mage_burst","mage_control","mage_poke"].includes(t)).length;
  return {hardCC,frontline,engage,ap,early,poke,adCount,apCount};
}
function recommendFix(role,needTag,excludeNames){
  const ex=new Set((excludeNames||[]).filter(Boolean).map(x=>x.toLowerCase()));
  const pool=rolePool(role,null).filter(c=>!ex.has(c.name.toLowerCase()));
  const wants=needTag; // a tag string like 'hard_cc' or 'tank' or 'mage_control' group; we map groups.
  const groupMap={
    need_cc:(roleTags.hard_cc||["hard_cc","pointclick_cc"]),
    need_front:(roleTags.frontline||["tank"]),
    need_engage:(roleTags.engage||["hard_engage"]),
    need_ap:(roleTags.ap||["mage_burst","mage_control","mage_poke"]),
    need_early:(roleTags.early||["lane_bully","dive"])
  };
  const wanted=groupMap[wants]||[wants];
  const th=thresholdsForRole(role);
  const scored=pool.map(c=>{
    const t=champTypes(c.name);
    const hit=wanted.some(x=>t.includes(x));
    const score=(hit?50:0)+metaScore(c);
    return {name:c.name,icon:c.icon,score,desc:"",tier:tierForScore(metaScore(c),th),hit};
  }).filter(x=>x.hit).sort((a,b)=>b.score-a.score).slice(0,3);
  return scored;
}
function draftWarning(){
  const my=myPickName;
  const team=[my,...ally].filter(Boolean);
  if(!my) return null;
  const tags=teamTags(team);
  // priority
  if(!tags.hardCC) return {key:"need_cc",title:"Eurem Team fehlt CC.",sub:"Pick einen Champion mit zuverlässigem CC."};
  if(!tags.frontline) return {key:"need_front",title:"Eurem Team fehlt Frontline.",sub:"Pick einen Tank/Bruiser, der Schaden frisst."};
  if(tags.apCount===0) return {key:"need_ap",title:"Eurem Team fehlt AP.",sub:"Gegner kann sonst früh Rüstung stacken."};
  if(!tags.engage) return {key:"need_engage",title:"Eurem Team fehlt Engage.",sub:"Schwer, Fights zu starten."};
  if(!tags.early) return {key:"need_early",title:"Euer Early Game ist schwach.",sub:"Risiko, früh zu snowballen."};
  return null;
}

// Render helpers
function renderCounterList(target,list,numbered=false){
  target.innerHTML="";
  for(let i=0;i<list.length;i++){
    const c=list[i];
    const el=document.createElement("div");
    el.className="counterItem";
    el.innerHTML=`<img class="cIcon" src="${c.icon}" alt="${c.name}" loading="lazy" />
      <div class="cMain">
        <div class="cName">${numbered?`${i+1}️⃣ `:""}${c.name} <span class="tierBadge ${tierClass(c.tier)}" style="margin-left:8px">${c.tier}</span></div>
        <div class="cWhy">${c.why||c.desc||""}</div>
      </div>`;
    target.appendChild(el);
  }
}
function renderPickCard(target,champName,role){
  const c=getChampionByName(champName);
  if(!c){target.classList.add("empty");target.innerHTML=`<div class="emptyText">Kein Champion gewählt</div>`;return}
  target.classList.remove("empty");
  const th=thresholdsForRole(role);const t=tierForScore(metaScore(c),th);
  target.innerHTML=`<img class="pickIcon" src="${c.icon}" alt="${c.name}" />
    <div class="pickMain">
      <div class="pickName">${c.name}</div>
      <div class="pickSub">Lane: ${role} • Main: ${mainLaneText(c.hero_id)}</div>
    </div>
    <span class="tierBadge ${tierClass(t)}">${t}</span>`;
}
function renderSlot(btn,name,label){
  if(!name){btn.classList.remove("filled");btn.textContent=label;return}
  const c=getChampionByName(name);btn.classList.add("filled");
  btn.innerHTML=c?`<img src="${c.icon}" alt="${c.name}" /><div>${c.name}</div>`:name;
}

// META modal lane tiers
function laneTierMap(champ){
  const lanes=["Baron","Jungle","Mid","ADC","Support"];
  const roles=rolesForHero(champ.hero_id);
  const out=[];
  for(const r of lanes){
    if(!roles.includes(r)){
      // off role: compute tier but mark ❌ when very bad
      const sc=metaScore(champ);
      const th=thresholdsForRole("Global");
      const t=tierForScore(sc,th);
      const mark = (t==="SS"||t==="S") ? "B" : (t==="A" ? "C" : "❌");
      out.push({lane:r,tier:mark});
    }else{
      const th=thresholdsForRole(r);
      out.push({lane:r,tier:tierForScore(metaScore(champ),th)});
    }
  }
  return out;
}
function renderLaneTiers(target,arr){
  target.innerHTML="";
  for(const row of arr){
    const el=document.createElement("div");
    el.className="ltRow";
    const badge = row.tier==="❌" ? `<span class="tierBadge tierC">❌</span>` : `<span class="tierBadge ${tierClass(row.tier)}">${row.tier}</span>`;
    el.innerHTML=`<div class="k">${row.lane}</div>${badge}`;
    target.appendChild(el);
  }
}

// META rendering
function renderMetaGrid(list){
  grid.innerHTML="";
  if(!list.length){statusEl.textContent="Keine Treffer.";statusEl.style.display="block";return}
  statusEl.style.display="none";
  const frag=document.createDocumentFragment();
  const th=thresholdsForRole("Global");
  for(const c of list){
    const tier=tierForScore(metaScore(c),th);
    const card=document.createElement("button");
    card.className="card";card.type="button";
    card.innerHTML=`<div class="cardTop">
      <img class="icon" src="${c.icon}" alt="${c.name}" loading="lazy" />
      <div class="nameWrap"><div class="name">${c.name}</div><div class="id">Main: ${mainLaneText(c.hero_id)}</div></div>
      <span class="tierBadge ${tierClass(tier)}">${tier}</span>
    </div>
    <div class="stats">
      <div class="stat"><div class="k">Win</div><div class="v">${fmtPct(c.stats?.CN?.win??null)}</div></div>
      <div class="stat"><div class="k">Pick</div><div class="v">${fmtPct(c.stats?.CN?.pick??null)}</div></div>
      <div class="stat"><div class="k">Ban</div><div class="v">${fmtPct(c.stats?.CN?.ban??null)}</div></div>
    </div>`;
    card.addEventListener("click",()=>openMetaModal(c));
    frag.appendChild(card);
  }
  grid.appendChild(frag);
}
function applyMeta(){
  const q=(searchEl.value||"").trim().toLowerCase();
  const sort=sortEl.value;
  let list=allChamps;
  if(q)list=list.filter(c=>c.name.toLowerCase().includes(q));
  list=[...list].sort((a,b)=>{
    if(sort==="name")return a.name.localeCompare(b.name);
    if(sort==="win")return (b.stats?.CN?.win??0)-(a.stats?.CN?.win??0);
    if(sort==="pick")return (b.stats?.CN?.pick??0)-(a.stats?.CN?.pick??0);
    if(sort==="ban")return (b.stats?.CN?.ban??0)-(a.stats?.CN?.ban??0);
    return metaScore(b)-metaScore(a);
  });
  renderMetaGrid(list);
}

// Modal open/update
function openMetaModal(champ){
  modalIcon.src=champ.icon;modalIcon.alt=champ.name;
  modalName.textContent=champ.name;
  modalLane.textContent=`Main Lane: ${mainLaneText(champ.hero_id)}`;
  modalWin.textContent=fmtPct(champ.stats?.CN?.win??null);
  modalPick.textContent=fmtPct(champ.stats?.CN?.pick??null);
  modalBan.textContent=fmtPct(champ.stats?.CN?.ban??null);

  const roles=rolesForHero(champ.hero_id);
  modalRoleSelect.value=roles[0]||"Jungle";
  updateModalForRole(champ);
  modal.classList.remove("hidden");
}
function updateModalForRole(champ){
  const role=modalRoleSelect.value;
  const roles=rolesForHero(champ.hero_id);
  offRole.classList.toggle("hidden",!(roles.length&&!roles.includes(role)));
  const th=thresholdsForRole(role);
  const tier=tierForScore(metaScore(champ),th);
  modalTier.textContent=tier;modalTier.className=`tierBadge ${tierClass(tier)}`;
  renderCounterList(modalBans, smartTop3(champ.name, role).map(x=>({...x,why:x.why})), true);
  renderLaneTiers(modalLaneTiers, laneTierMap(champ));
}

// Tabs
function showTab(tab){
  tabBtns.forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));
  viewMeta.classList.toggle("hidden",tab!=="meta");
  viewDraft.classList.toggle("hidden",tab!=="draft");
  viewMatchup.classList.toggle("hidden",tab!=="matchup");
  viewTierlist.classList.toggle("hidden",tab!=="tierlist");
  try{localStorage.setItem("rifto_active_tab",tab)}catch{}
}
function restoreTab(){try{const t=localStorage.getItem("rifto_active_tab");if(t)showTab(t)}catch{}}

// Picker
function openPicker(target){pickTarget=target;pickerSearch.value="";renderPicker("");picker.classList.remove("hidden");pickerSearch.focus()}
function closePicker(){picker.classList.add("hidden")}
function renderPicker(q){
  const query=(q||"").trim().toLowerCase();
  let list=allChamps;
  if(query)list=list.filter(c=>c.name.toLowerCase().includes(query));
  list=list.slice(0,180);
  pickerGrid.innerHTML="";
  const frag=document.createDocumentFragment();
  for(const c of list){
    const card=document.createElement("button");
    card.className="card";card.type="button";
    card.innerHTML=`<div class="cardTop"><img class="icon" src="${c.icon}" alt="${c.name}" loading="lazy" />
      <div class="nameWrap"><div class="name">${c.name}</div><div class="id">Main: ${mainLaneText(c.hero_id)}</div></div></div>`;
    card.addEventListener("click",()=>{
      const name=c.name;
      if(pickTarget==="me") myPickName=name;
      else if(pickTarget==="enemy1") enemy1=(enemy1&&enemy1.toLowerCase()===name.toLowerCase())?null:name;
      else if(pickTarget==="enemy2") enemy2=(enemy2&&enemy2.toLowerCase()===name.toLowerCase())?null:name;
      else if(pickTarget==="ally1") ally[0]=(ally[0]&&ally[0].toLowerCase()===name.toLowerCase())?null:name;
      else if(pickTarget==="ally2") ally[1]=(ally[1]&&ally[1].toLowerCase()===name.toLowerCase())?null:name;
      else if(pickTarget==="ally3") ally[2]=(ally[2]&&ally[2].toLowerCase()===name.toLowerCase())?null:name;
      else if(pickTarget==="ally4") ally[3]=(ally[3]&&ally[3].toLowerCase()===name.toLowerCase())?null:name;
      else if(pickTarget==="match") matchPickName=name;
      saveState();renderAll();closePicker();
    });
    frag.appendChild(card);
  }
  pickerGrid.appendChild(frag);
}

// Persistence
function saveState(){try{localStorage.setItem("rifto_state",JSON.stringify({draftPhase,myPickName,enemy1,enemy2,ally,role:draftRole.value,matchPickName,matchRole:matchRole.value,tierRole:tierRole.value,tierFilter:tierFilter.value}))}catch{}}
function loadState(){try{const raw=localStorage.getItem("rifto_state");if(!raw)return;const s=JSON.parse(raw);
  if(s.draftPhase)draftPhase=s.draftPhase;
  if(s.myPickName)myPickName=s.myPickName;
  enemy1=s.enemy1||null; enemy2=s.enemy2||null;
  ally=Array.isArray(s.ally)?[s.ally[0]||null,s.ally[1]||null,s.ally[2]||null,s.ally[3]||null]:[null,null,null,null];
  if(s.role)draftRole.value=s.role;
  if(s.matchPickName)matchPickName=s.matchPickName;
  if(s.matchRole)matchRole.value=s.matchRole;
  if(s.tierRole)tierRole.value=s.tierRole;
  if(s.tierFilter)tierFilter.value=s.tierFilter;
}catch{}}

// Render Draft
function setPhase(p){
  draftPhase=p;
  phaseBtns.forEach(b=>b.classList.toggle("active",b.dataset.phase===p));
  saveState();renderDraft();
}
function renderDraft(){
  renderPickCard(myPickCard,myPickName,draftRole.value);
  renderSlot(enemySlot1,enemy1,"+ Enemy 1");
  renderSlot(enemySlot2,enemy2,"+ Enemy 2");
  renderSlot(allySlot1,ally[0],"+ Ally 1");
  renderSlot(allySlot2,ally[1],"+ Ally 2");
  renderSlot(allySlot3,ally[2],"+ Ally 3");
  renderSlot(allySlot4,ally[3],"+ Ally 4");

  const phaseLabel=draftPhase==="enemy_fp"?"🎯 Enemy FP":draftPhase==="my_fp"?"⭐ My FP":draftPhase==="mid"?"🔄 Mid Draft":"🛑 Late Draft";
  const enemies=[enemy1,enemy2].filter(Boolean).join(", ")||"keine";
  draftContext.textContent=`${phaseLabel} • ${draftRole.value} • Dein Pick: ${myPickName||"–"} • Enemy: ${enemies}`;

  // Off-meta box
  if(myPickName){
    const off=offMetaRating(myPickName,draftRole.value);
    if(off){
      offMetaBox.classList.remove("hidden");
      offMetaBox.innerHTML=`<div class="t">${OFF_META_LABEL[off.lvl]}</div><div class="s">${off.txt}</div>`;
    }else{
      offMetaBox.classList.add("hidden");
      offMetaBox.innerHTML="";
    }
  }else{
    offMetaBox.classList.add("hidden");
    offMetaBox.innerHTML="";
  }

  // Smart bans
  draftBans.innerHTML="";
  if(!myPickName){
    draftBans.innerHTML=`<div class="mstat"><div class="k">Info</div><div class="v">Wähle zuerst deinen Champion.</div></div>`;
  }else{
    renderCounterList(draftBans, smartTop3(myPickName,draftRole.value), true);
  }

  // Warning + clickable fixes
  draftFixes.innerHTML="";
  const warn = myPickName ? draftWarning() : null;
  if(!warn){
    draftWarn.classList.add("hidden");
    draftWarn.innerHTML="";
    return;
  }
  draftWarn.classList.remove("hidden");
  draftWarn.innerHTML=`<div class="t">⚠️ ${warn.title}</div><div class="s">${warn.sub}</div>`;
  const ex=[myPickName,...ally,enemy1,enemy2].filter(Boolean);
  const fixes = recommendFix(draftRole.value, warn.key, ex);
  for(const f of fixes){
    const card=document.createElement("div");
    card.className="fixCard";
    card.innerHTML=`<img src="${f.icon}" alt="${f.name}" />
      <div><div class="n">${f.name} <span class="tierBadge ${tierClass(f.tier)}" style="margin-left:8px">${f.tier}</span></div>
      <div class="d">Klick = als dein Pick setzen</div></div>`;
    card.addEventListener("click",()=>{myPickName=f.name;saveState();renderAll();});
    draftFixes.appendChild(card);
  }
}

// Matchup (heuristic)
function matchupLists(myName,role){
  const my=getChampionByName(myName); if(!my) return {hard:[],even:[],good:[]};
  const pool=rolePool(role,my.hero_id);
  const weak=pickedWeakVs(my.name,role);
  const myTypes=champTypes(my.name);
  const th=thresholdsForRole(role);
  const scored=pool.map(c=>{
    const types=champTypes(c.name);
    let danger=0,good=0;
    for(const w of weak) if(types.includes(w)) danger+=2;
    // if enemy lacks your counter traits, it's good
    for(const t of myTypes){
      if(t==="assassin_burst" && types.includes("mage_burst")) danger+=1;
      if(t==="poke" && types.includes("hard_engage")) danger+=1;
      if(t==="tank" && (types.includes("true_damage")||types.includes("anti_tank"))) danger+=2;
    }
    // good if you counter them: if they have 'assassin_burst' and you have 'pointclick_cc' etc (rough)
    if(types.includes("assassin_burst") && myTypes.includes("pointclick_cc")) good+=2;
    if(types.includes("tank") && (myTypes.includes("true_damage")||myTypes.includes("anti_tank"))) good+=2;
    const diff = (danger - good);
    return {name:c.name,icon:c.icon,score:diff, tier:tierForScore(metaScore(c),th),
            why: diff>=3?`Schwer für ${my.name} (Counter + Meta)`:diff<=-2?`Gut für ${my.name} (Vorteil)`: `Skill-Matchup gegen ${my.name}`};
  }).sort((a,b)=>b.score-a.score);
  const hard=scored.slice(0,3).map(x=>({...x,why:reasonAgainst(my.name,role,x.name)}));
  const good=scored.slice(-3).reverse().map(x=>({...x,why:`Du hast Vorteil gegen ${x.name} (besserer Trade/Range/Setup)`}));
  const even=scored.slice(3,6).map(x=>({...x,why:`Skill-Matchup: beide können gewinnen.`}));
  return {hard,even,good};
}
function renderMatchup(){
  renderPickCard(matchPickCard, matchPickName, matchRole.value);
  matchHard.innerHTML="";matchEven.innerHTML="";matchGood.innerHTML="";
  if(!matchPickName){
    matchHard.innerHTML=`<div class="mstat"><div class="k">Info</div><div class="v">Wähle einen Champion.</div></div>`;
    return;
  }
  const lists=matchupLists(matchPickName, matchRole.value);
  renderCounterList(matchHard, lists.hard);
  renderCounterList(matchEven, lists.even);
  renderCounterList(matchGood, lists.good);
}

// Tierlist
function renderTierlist(){
  const role=tierRole.value;
  const filt=tierFilter.value;
  const th=thresholdsForRole(role==="Global"?"Global":role);
  const list = (role==="Global"?allChamps:allChamps.filter(c=>rolesForHero(c.hero_id).includes(role)));
  const rows=list.map(c=>{
    const tier=tierForScore(metaScore(c),th);
    return {name:c.name,icon:c.icon,hero_id:c.hero_id, tier, lane:mainLaneText(c.hero_id), score:metaScore(c)};
  }).sort((a,b)=>b.score-a.score);
  const filtered = filt==="all"?rows:rows.filter(r=>r.tier===filt);
  tierList.innerHTML="";
  for(const r of filtered){
    const el=document.createElement("div");
    el.className="tierRow";
    el.innerHTML=`<img src="${r.icon}" alt="${r.name}" /><div class="main"><div class="nm">${r.name}</div><div class="ln">Main: ${r.lane}</div></div><span class="tierBadge ${tierClass(r.tier)}">${r.tier}</span>`;
    el.addEventListener("click",()=>{
      const c=getChampionByName(r.name);
      if(c) openMetaModal(c);
      showTab("meta");
    });
    tierList.appendChild(el);
  }
}

// Render all
function renderAll(){renderDraft();renderMatchup();renderTierlist();applyMeta();}

// Events
tabBtns.forEach(b=>b.addEventListener("click",()=>showTab(b.dataset.tab)));
modalClose.addEventListener("click",()=>modal.classList.add("hidden"));
modal.addEventListener("click",e=>{if(e.target.classList.contains("modalBackdrop"))modal.classList.add("hidden")});
modalRoleSelect.addEventListener("change",()=>{const c=getChampionByName(modalName.textContent);if(c)updateModalForRole(c)});

searchEl.addEventListener("input",applyMeta);
sortEl.addEventListener("change",applyMeta);

phaseBtns.forEach(b=>b.addEventListener("click",()=>setPhase(b.dataset.phase)));
btnPickMe.addEventListener("click",()=>openPicker("me"));
draftRole.addEventListener("change",()=>{saveState();renderDraft()});
enemySlot1.addEventListener("click",()=>openPicker("enemy1"));
enemySlot2.addEventListener("click",()=>openPicker("enemy2"));
allySlot1.addEventListener("click",()=>openPicker("ally1"));
allySlot2.addEventListener("click",()=>openPicker("ally2"));
allySlot3.addEventListener("click",()=>openPicker("ally3"));
allySlot4.addEventListener("click",()=>openPicker("ally4"));

btnMatchPick.addEventListener("click",()=>openPicker("match"));
matchRole.addEventListener("change",()=>{saveState();renderMatchup()});
tierRole.addEventListener("change",()=>{saveState();renderTierlist()});
tierFilter.addEventListener("change",()=>{saveState();renderTierlist()});

pickerClose.addEventListener("click",closePicker);
picker.addEventListener("click",e=>{if(e.target.classList.contains("modalBackdrop"))closePicker()});
pickerSearch.addEventListener("input",()=>renderPicker(pickerSearch.value));

// Load
async function loadJson(url){const res=await fetch(url,{cache:"no-store"});if(!res.ok)throw new Error(`${url} HTTP ${res.status}`);return res.json()}
async function load(){
  try{
    statusEl.textContent="Lade Daten…";
    const ts=Date.now();
    const meta=await loadJson(`./meta.json?ts=${ts}`);
    patchPill.textContent=`Patch: ${meta.patch??"–"}`;
    updatePill.textContent=`Update: ${meta.lastUpdated??"–"}`;
    allChamps=normalizeMeta(meta);

    try{const heroList=await loadJson(`${HERO_LIST_URL}?ts=${ts}`);heroDb=(heroList&&heroList.heroList)?heroList.heroList:{}}catch{heroDb={}}
    try{const tags=await loadJson(`./champ_tags.json?ts=${ts}`);tagDb=tags||{};defaultWeakByRole=tagDb._defaults||{};roleTags=tagDb._role_tags||{}}catch{tagDb={};defaultWeakByRole={};roleTags={}}

    updateTrends();
    statusEl.textContent=`Geladen: ${allChamps.length} Champions`;
    statusEl.style.display="block";

    restoreTab();
    loadState();
    setPhase(draftPhase);
    renderAll();
  }catch(err){
    console.error(err);
    statusEl.textContent=`Fehler beim Laden: ${err?.message??err}`;
    statusEl.style.display="block";
  }
}
load();
})();