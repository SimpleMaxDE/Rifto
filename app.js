(()=> {
  const $ = (id)=>document.getElementById(id);

  // Views / tabs
  const tabBtns = [...document.querySelectorAll(".tab")];
  const views = {
    meta: $("viewMeta"),
    draft: $("viewDraft"),
    matchup: $("viewMatchup"),
    tierlist: $("viewTierlist"),
  };

  function showView(name){
    for(const k in views) views[k].classList.toggle("hidden", k!==name);
    tabBtns.forEach(b=>b.classList.toggle("active", b.dataset.view===name));
  }
  tabBtns.forEach(btn=>btn.addEventListener("click", ()=>showView(btn.dataset.view)));

  // Modals
  const champModal = $("champModal");
  const modalClose = $("modalClose");
  modalClose?.addEventListener("click", ()=> champModal?.classList.add("hidden"));
  champModal?.addEventListener("click",(e)=>{ if(e.target===champModal) champModal.classList.add("hidden"); });

  const trendModal = $("trendModal");
  $("trendClose")?.addEventListener("click", ()=> trendModal?.classList.add("hidden"));
  trendModal?.addEventListener("click",(e)=>{ if(e.target===trendModal) trendModal.classList.add("hidden"); });

  // Data
  let meta=null;          // meta.json
  let wrList=null;        // hero_list.js parsed
  let champs=[];          // merged array
  let champById=new Map();
  let roleById=new Map(); // main lane (from wr list)
  const lanes = ["Baron","Jungle","Mid","ADC","Support"];

  // Helpers
  const pct = (v)=> (typeof v==="number" ? `${v.toFixed(2)}%` : "—");
  const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));

  function tierFromScore(win,pick,ban){
    // Simple & readable tier mapping: based on win + pressure (pick/ban)
    // Win is king; ban/pick add "meta attention".
    if(win==null) return "C";
    const att = (pick||0)*0.25 + (ban||0)*0.20;
    const score = win + att;
    if(score>=57.2) return "SS";
    if(score>=55.8) return "S";
    if(score>=54.2) return "A";
    if(score>=52.8) return "B";
    if(score>=51.5) return "C";
    return "D";
  }

  function laneNorm(s){
    if(!s) return null;
    const x=String(s).toLowerCase();
    if(x.includes("baron")||x.includes("solo")||x.includes("top")) return "Baron";
    if(x.includes("jungle")) return "Jungle";
    if(x.includes("mid")) return "Mid";
    if(x.includes("adc")||x.includes("dragon")||x.includes("bot")) return "ADC";
    if(x.includes("support")||x.includes("sup")) return "Support";
    return null;
  }

  function guessMainLane(hero){
    // from WR hero_list.js we have lane strings in CN. we also have roles.
    // We'll use roles mapping from CN roles string.
    // fallback: if hero.lane exists, map keywords.
    const lane = hero.lane || "";
    // very rough mapping based on common CN text
    if(lane.includes("单人")) return "Baron";
    if(lane.includes("打野")) return "Jungle";
    if(lane.includes("中路")) return "Mid";
    if(lane.includes("双人")||lane.includes("下路")) return "ADC";
    if(lane.includes("辅助")) return "Support";
    return null;
  }

  function buildTrendSummary(){
    // based on aggregate stats (simple, no weird language)
    const winTop = champs.slice().sort((a,b)=>(b.stats?.CN?.win||0)-(a.stats?.CN?.win||0))[0];
    const banTop = champs.slice().sort((a,b)=>(b.stats?.CN?.ban||0)-(a.stats?.CN?.ban||0))[0];
    const pickTop = champs.slice().sort((a,b)=>(b.stats?.CN?.pick||0)-(a.stats?.CN?.pick||0))[0];

    let text = "Kurz-Check basierend auf CN Stats:\n";
    if(winTop) text += `• Beste Winrate: ${winTop.name} (${pct(winTop.stats.CN.win)})\n`;
    if(pickTop) text += `• Meist gepickt: ${pickTop.name} (${pct(pickTop.stats.CN.pick)})\n`;
    if(banTop) text += `• Meist gebannt: ${banTop.name} (${pct(banTop.stats.CN.ban)})\n`;
    text += "\nHinweis: Trend ist eine vereinfachte Zusammenfassung (ohne Patchnotes‑Text).";
    return text;
  }

  function smartBans(myChamp, lane, enemyChamp=null){
    // Goal: give 3 bans that are:
    // 1) High threat in that lane (ban rate / tier)
    // 2) If enemy selected: prefer champions that synergize with enemy or punish my champ
    // Without matchup API, we use "logic tags" from roles + archetype guesses.
    const pool = champs.filter(c=>c.hero_id!==myChamp.hero_id);
    const lanePool = pool.filter(c=> (roleById.get(String(c.hero_id))||"")===lane || c.tiers?.[lane] ); // allow offmeta but prefer main
    const byThreat = (arr)=> arr
      .map(c=>{
        const w=c.stats?.CN?.win||0, p=c.stats?.CN?.pick||0, b=c.stats?.CN?.ban||0;
        const tier = tierFromScore(w,p,b);
        const tierBoost = (tier==="SS"?3:tier==="S"?2:tier==="A"?1:0);
        const laneBoost = (roleById.get(String(c.hero_id))===lane)?1:0;
        const attention = (b*0.35 + p*0.15);
        return {c, score: attention + tierBoost*8 + laneBoost*2};
      })
      .sort((x,y)=>y.score-x.score);

    const candidates = byThreat(lanePool.length?lanePool:pool);

    // very light archetype rules
    const myIsCarry = (lane==="ADC" || lane==="Mid");
    const myIsJgl = (lane==="Jungle");

    function reasonFor(b){
      const name = b.name;
      if(enemyChamp){
        return `Passt gut zu ${enemyChamp.name} und macht dein Game schwer.`;
      }
      if(myIsJgl) return "Hoher Druck im Jungle + schwer zu stoppen, wenn er ahead ist.";
      if(myIsCarry) return "Gefährlich für Carries: zu viel Threat/All‑in oder starke CC‑Optionen.";
      return "Starker Meta‑Pick in dieser Lane (hoher Einfluss + viel Präsenz).";
    }

    const out=[];
    for(const item of candidates){
      if(out.length>=3) break;
      out.push({name:item.c.name, hero_id:item.c.hero_id, icon:item.c.icon, tier:(item.c.tiers?.[lane]||item.c.tierGlobal||"A"), reason: reasonFor(item.c)});
    }
    return out;
  }

  function smartAnswers(myChamp, lane, enemyChamp=null){
    // Recommend 3 champs to pick INTO the situation.
    // Heuristic:
    // - Prefer same lane main champs
    // - Prefer high win and decent pick
    const pool = champs.filter(c=>roleById.get(String(c.hero_id))===lane && c.hero_id!==myChamp.hero_id);
    const ranked = pool
      .map(c=>{
        const w=c.stats?.CN?.win||0, p=c.stats?.CN?.pick||0, b=c.stats?.CN?.ban||0;
        const tier=tierFromScore(w,p,b);
        const base = w + p*0.12 - b*0.05;
        const tierBoost=(tier==="SS"?2.0:tier==="S"?1.2:tier==="A"?0.5:0);
        let score = base + tierBoost;
        if(enemyChamp){
          // if enemy chosen, prefer champs with high win (generic)
          score += 0.5;
        }
        return {c, score};
      })
      .sort((a,b)=>b.score-a.score);

    const out=[];
    for(const r of ranked){
      if(out.length>=3) break;
      out.push({name:r.c.name, hero_id:r.c.hero_id, icon:r.c.icon, reason:`Solider ${lane} Pick mit guter Winrate – fühlt sich zuverlässig an.`});
    }
    return out;
  }

  function laneTierFor(champ, lane){
    // If champ main lane is different, reduce tier a bit for offmeta
    const main = roleById.get(String(champ.hero_id)) || null;
    const baseTier = champ.tierGlobal || "B";
    if(!lane) return baseTier;
    if(main===lane) return champ.tiers?.[lane] || baseTier;
    // offmeta: degrade by 1-2 steps
    const order=["SS","S","A","B","C","D"];
    const idx=order.indexOf(champ.tiers?.[lane] || baseTier);
    const degraded = order[clamp(idx+1,0,order.length-1)];
    return degraded;
  }

  function computeLaneTiers(){
    // attach tierGlobal and tiers by lane (main lane = global, others degraded)
    champs.forEach(c=>{
      const w=c.stats?.CN?.win, p=c.stats?.CN?.pick, b=c.stats?.CN?.ban;
      c.tierGlobal = tierFromScore(w,p,b);
      c.tiers = {};
      const main = roleById.get(String(c.hero_id)) || guessMainLane(c) || "Mid";
      lanes.forEach(l=>{
        c.tiers[l] = (l===main)?c.tierGlobal:laneTierFor(c,l);
      });
    });
  }

  // UI render
  function renderGrid(){
    const grid=$("grid"), status=$("status");
    if(!grid||!status) return;
    const q = ($("search")?.value||"").trim().toLowerCase();
    const sort = $("sort")?.value || "tier";

    let list = champs.slice();
    if(q){
      list = list.filter(c=> c.name.toLowerCase().includes(q));
    }

    const tierRank = (t)=>({SS:6,S:5,A:4,B:3,C:2,D:1}[t]||0);

    list.sort((a,b)=>{
      const aw=a.stats?.CN||{}, bw=b.stats?.CN||{};
      if(sort==="win") return (bw.win||0)-(aw.win||0);
      if(sort==="pick") return (bw.pick||0)-(aw.pick||0);
      if(sort==="ban") return (bw.ban||0)-(aw.ban||0);
      // tier
      return tierRank(b.tierGlobal)-tierRank(a.tierGlobal);
    });

    status.textContent = `${list.length} Champions`;
    grid.innerHTML = "";

    for(const c of list){
      const main = roleById.get(String(c.hero_id)) || "—";
      const btn = document.createElement("button");
      btn.className="cardBtn";
      btn.type="button";
      btn.innerHTML = `
        <div class="cardTop">
          <div class="cardLeft">
            <img class="icon" src="${c.icon||""}" alt="">
            <div style="min-width:0">
              <div class="name">${c.name}</div>
              <div class="sub">Main: ${main}</div>
            </div>
          </div>
          <span class="tierBadge ${c.tierGlobal}">${c.tierGlobal}</span>
        </div>
        <div class="statsRow">
          <div class="miniStat"><div class="miniLabel">Win</div><div class="miniValue">${pct(c.stats?.CN?.win)}</div></div>
          <div class="miniStat"><div class="miniLabel">Pick</div><div class="miniValue">${pct(c.stats?.CN?.pick)}</div></div>
          <div class="miniStat"><div class="miniLabel">Ban</div><div class="miniValue">${pct(c.stats?.CN?.ban)}</div></div>
        </div>
      `;
      btn.addEventListener("click", ()=> openChampionModal(c, main));
      grid.appendChild(btn);
    }
  }

  function openChampionModal(champ, selectedLane){
    // Guard: modal elements must exist (prevents your "null" crash)
    const modal = champModal;
    const modalTitle = $("modalTitle");
    const modalIcon = $("modalIcon");
    const pillMain = $("pillMain");
    const pillSel = $("pillSel");
    const pillOff = $("pillOff");
    const modalTier = $("modalTier");
    const modalWin = $("modalWin");
    const modalPick = $("modalPick");
    const modalBan = $("modalBan");
    const modalReason = $("modalReason");
    const modalBans = $("modalBans");
    const modalAnswers = $("modalAnswers");
    const laneSel = $("modalLaneSelect");

    if(!modal || !modalTitle || !modalIcon || !pillMain || !pillSel || !pillOff || !modalTier || !modalWin || !modalPick || !modalBan || !modalReason || !modalBans || !modalAnswers || !laneSel){
      console.error("Modal elements missing");
      return;
    }

    const mainLane = roleById.get(String(champ.hero_id)) || selectedLane || "—";
    let lane = selectedLane || mainLane;

    // build lane selector
    laneSel.innerHTML = "";
    for(const l of lanes){
      const opt=document.createElement("option");
      opt.value=l; opt.textContent=l;
      laneSel.appendChild(opt);
    }
    laneSel.value = lane;

    function paint(){
      modalTitle.textContent = champ.name;
      modalIcon.src = champ.icon || "";
      modalIcon.alt = champ.name;

      pillMain.textContent = `Main: ${mainLane}`;
      pillSel.textContent = `Lane: ${lane}`;
      const off = (lane !== mainLane);
      pillOff.classList.toggle("hidden", !off);

      const t = champ.tiers?.[lane] || champ.tierGlobal || "B";
      modalTier.textContent = t;
      modalTier.className = `tierBadge ${t}`;

      modalWin.textContent = pct(champ.stats?.CN?.win);
      modalPick.textContent = pct(champ.stats?.CN?.pick);
      modalBan.textContent = pct(champ.stats?.CN?.ban);

      // Smart ban + answers for THIS lane
      const bans = smartBans(champ, lane);
      const ans  = smartAnswers(champ, lane);

      modalBans.innerHTML = "";
      bans.forEach((b,i)=>{
        const li=document.createElement("li");
        li.innerHTML = `<b>${i+1}. ${b.name}</b> — ${b.reason}`;
        modalBans.appendChild(li);
      });

      modalAnswers.innerHTML = "";
      ans.forEach((a,i)=>{
        const li=document.createElement("li");
        li.innerHTML = `<b>${i+1}. ${a.name}</b> — ${a.reason}`;
        modalAnswers.appendChild(li);
      });

      modalReason.textContent = off
        ? `Off‑meta: ${champ.name} spielt man normalerweise ${mainLane}. In ${lane} geht’s, aber du brauchst sauberes Spiel und gute Matchups.`
        : `Meta‑Pick in ${lane}: Werte + Präsenz sind stabil – damit gewinnst du zuverlässig Games.`;
    }

    laneSel.onchange = ()=>{ lane = laneSel.value; paint(); };
    paint();

    modal.classList.remove("hidden");
  }

  function fillSelect(sel, list){
    sel.innerHTML="";
    for(const c of list){
      const o=document.createElement("option");
      o.value=String(c.hero_id);
      o.textContent=c.name;
      sel.appendChild(o);
    }
  }

  function updateDraft(){
    const lane = $("draftLane")?.value || "Jungle";
    const myId = $("draftMyChamp")?.value;
    const enId = $("draftEnemyChamp")?.value;
    const my = champById.get(String(myId));
    const en = champById.get(String(enId));

    const mine=$("draftMine"), bans=$("draftBans"), ans=$("draftAnswers");
    if(!mine||!bans||!ans) return;

    if(!my){
      mine.textContent="Wähle einen Champion…";
      bans.textContent="—";
      ans.textContent="—";
      return;
    }

    mine.innerHTML = `<b>${my.name}</b> — Lane: <b>${lane}</b> (Main: ${roleById.get(String(my.hero_id))||lane})`;

    const banList = smartBans(my, lane, en);
    bans.innerHTML = banList.map((b,i)=>`<div>${i+1}. <b>${b.name}</b> — ${b.reason}</div>`).join("");

    const answers = smartAnswers(my, lane, en);
    ans.innerHTML = answers.map((a,i)=>`<div>${i+1}. <b>${a.name}</b> — ${a.reason}</div>`).join("");
  }

  function updateMatchup(){
    const lane = $("muLane")?.value || "Mid";
    const a = champById.get(String($("muA")?.value||""));
    const b = champById.get(String($("muB")?.value||""));
    const box = $("matchupBox");
    if(!box) return;
    if(!a || !b){
      box.querySelector(".mutext")?.remove?.();
      box.innerHTML = `<div class="cardTitle">Analyse</div><div class="mutext">Wähle zwei Champions.</div>`;
      return;
    }

    const ta = a.tiers?.[lane] || a.tierGlobal;
    const tb = b.tiers?.[lane] || b.tierGlobal;

    const aW = a.stats?.CN?.win||0, bW=b.stats?.CN?.win||0;
    const lead = (aW-bW);

    const text = lead>=0
      ? `${a.name} wirkt hier im Schnitt etwas stabiler als ${b.name} (Win‑Tendenz +${lead.toFixed(2)}). Spiel trotzdem nach Lane‑Plan.`
      : `${b.name} wirkt hier im Schnitt etwas stabiler als ${a.name} (Win‑Tendenz ${lead.toFixed(2)}). Achte auf sichere Trades.`;

    box.innerHTML = `
      <div class="cardTitle">Analyse</div>
      <div class="mutext"><b>Lane:</b> ${lane}</div>
      <div class="mutext"><b>${a.name}</b> Tier: <b>${ta}</b> — Win ${pct(a.stats?.CN?.win)} | Pick ${pct(a.stats?.CN?.pick)} | Ban ${pct(a.stats?.CN?.ban)}</div>
      <div class="mutext"><b>${b.name}</b> Tier: <b>${tb}</b> — Win ${pct(b.stats?.CN?.win)} | Pick ${pct(b.stats?.CN?.pick)} | Ban ${pct(b.stats?.CN?.ban)}</div>
      <div class="mutext" style="margin-top:10px">${text}</div>
    `;
  }

  function renderTierlist(){
    const lane = $("tlLane")?.value || "Global";
    const host = $("tierBlocks");
    if(!host) return;

    const getTier = (c)=> lane==="Global" ? (c.tierGlobal||"B") : (c.tiers?.[lane]||c.tierGlobal||"B");

    const buckets = {SS:[],S:[],A:[],B:[],C:[],D:[]};
    champs.forEach(c=> buckets[getTier(c)]?.push(c));

    // sort inside bucket by win desc
    for(const k of Object.keys(buckets)){
      buckets[k].sort((a,b)=>(b.stats?.CN?.win||0)-(a.stats?.CN?.win||0));
    }

    host.innerHTML="";
    for(const t of ["SS","S","A","B","C","D"]){
      const arr=buckets[t];
      const block=document.createElement("div");
      block.className="tierBlock";
      block.innerHTML = `
        <div class="tierHead">
          <h3>${t} Tier</h3>
          <span class="pill">${arr.length} Champs</span>
        </div>
        <div class="tierGrid" id="tg_${t}"></div>
      `;
      host.appendChild(block);
      const grid = block.querySelector(`#tg_${t}`);
      arr.slice(0, 48).forEach(c=>{
        const chip=document.createElement("div");
        chip.className="tierChip";
        chip.innerHTML = `<img src="${c.icon||""}" alt=""><div><div class="tierChipName">${c.name}</div><div class="sub">${pct(c.stats?.CN?.win)} Win</div></div>`;
        chip.addEventListener("click", ()=> openChampionModal(c, roleById.get(String(c.hero_id))||"Mid"));
        grid.appendChild(chip);
      });
    }
  }

  async function load(){
    try{
      // meta.json is generated by workflow; if missing, we still show UI
      const [metaRes, heroJsRes] = await Promise.all([
        fetch("meta.json", {cache:"no-store"}).catch(()=>null),
        fetch("https://game.gtimg.cn/images/lgamem/act/lrlib/js/heroList/hero_list.js", {cache:"no-store"}).catch(()=>null),
      ]);

      meta = metaRes && metaRes.ok ? await metaRes.json() : null;

      // parse hero_list.js
      let heroText = heroJsRes && heroJsRes.ok ? await heroJsRes.text() : "";
      // hero_list.js is JS; it contains hero_list_head + tail in our earlier approach.
      // Here we parse directly: find JSON-ish string inside "heroList":...
      // We'll just extract all HeadIcon urls and heroId/name; simplest:
      const heroes = [];
      const reHero = /"heroId":"(\d+)".*?"name":"(.*?)".*?"avatar":"(https:\\\/\\\/game\.gtimg\.cn\\\/images\\\/lgamem\\\/act\\\/lrlib\\\/img\\\/HeadIcon\\\/H_S_\d+\.png)".*?"lane":"(.*?)"/g;
      let m;
      while((m=reHero.exec(heroText))!==null){
        const id=m[1];
        // name in unicode sequences - keep raw then decode
        const rawName=m[2];
        let name=rawName;
        try{ name = JSON.parse('"'+rawName.replace(/"/g,'\\"')+'"'); }catch(e){}
        const avatar = m[3].replace(/\\\//g,"/");
        const laneCN = m[4];
        heroes.push({hero_id:id, name, icon:avatar, lane: laneCN});
      }

      // merge with meta champions stats if exists; else build minimal stats from nothing
      const statMap = new Map();
      if(meta?.champions?.length){
        meta.champions.forEach(c=> statMap.set(String(c.hero_id), c));
      }

      champs = heroes.map(h=>{
        const s = statMap.get(String(h.hero_id));
        const stats = s?.stats || {CN:{win:null,pick:null,ban:null}};
        return {
          hero_id: String(h.hero_id),
          name: s?.name || h.name || ("Hero "+h.hero_id),
          icon: s?.icon || h.icon,
          stats,
          lane: h.lane,
        };
      });

      // if meta has champs that aren't in heroes (rare), include them too
      if(meta?.champions?.length){
        meta.champions.forEach(c=>{
          if(!champs.find(x=>String(x.hero_id)===String(c.hero_id))){
            champs.push({hero_id:String(c.hero_id), name:c.name, icon:c.icon, stats:c.stats, lane:""});
          }
        });
      }

      champById = new Map(champs.map(c=>[String(c.hero_id), c]));

      // main lane mapping
      roleById = new Map();
      champs.forEach(c=>{
        const main = guessMainLane(c) || "Mid";
        roleById.set(String(c.hero_id), main);
      });

      computeLaneTiers();

      // top pills
      $("patchPill").textContent = `Patch: ${meta?.patch || "CN Live"}`;
      $("updatePill").textContent = `Update: ${meta?.lastUpdated || "—"}`;

      $("trendBtn")?.addEventListener("click", ()=>{
        $("trendText").textContent = buildTrendSummary();
        trendModal.classList.remove("hidden");
      });

      // search & sort
      $("search")?.addEventListener("input", renderGrid);
      $("sort")?.addEventListener("change", renderGrid);

      // Draft selects
      const sortedByName = champs.slice().sort((a,b)=>a.name.localeCompare(b.name));
      fillSelect($("draftMyChamp"), sortedByName);
      fillSelect($("draftEnemyChamp"), sortedByName);
      $("draftLane")?.addEventListener("change", updateDraft);
      $("draftMyChamp")?.addEventListener("change", updateDraft);
      $("draftEnemyChamp")?.addEventListener("change", updateDraft);

      // Matchup selects
      fillSelect($("muA"), sortedByName);
      fillSelect($("muB"), sortedByName);
      $("muLane")?.addEventListener("change", updateMatchup);
      $("muA")?.addEventListener("change", updateMatchup);
      $("muB")?.addEventListener("change", updateMatchup);

      // Tierlist
      $("tlLane")?.addEventListener("change", renderTierlist);

      // initial renders
      $("status").textContent = "Bereit";
      renderGrid();
      updateDraft();
      updateMatchup();
      renderTierlist();

    }catch(err){
      console.error(err);
      const st=$("status");
      if(st) st.textContent = "Fehler beim Laden. Schau in die Console.";
    }
  }

  load();
})();