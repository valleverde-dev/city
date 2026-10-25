// A simple greedy player used to sanity-check difficulty (v0.4 rules: combos, access through buildings).
// Runs inside the page: window.__eurocrat must exist. Returns a summary of one run.
// It is deliberately decent but not clever: it always picks the first ("by the book") choice on event cards.
window.__playOneRun = function(seed, opts){
  opts = opts || {};
  const g = window.__eurocrat; g.newGame(seed);
  const S = () => g.S, N = 12;
  const PERK_PREF = ['contractor','cousin','prefab','fasttrack','translation','notary','fixer','lobbyist','comms','shovel'];
  const planned = ty => S().grid.filter(p=>p.ty===ty && p.k!=='regional' && ['review','approved','building','built','private'].includes(p.st)).length;
  const desired = () => {
    const T = g.CFG.target - g.CFG.village + 20;
    const lim = { housing: planned('housing')*g.B.housing.homes, factory: planned('factory')*150*1.6 + 40,
                  school: 150 + planned('school')*300, clinic: 250 + planned('clinic')*600 };
    if(!planned('factory')) return 'factory';
    let best = null; for(const k in lim) if(lim[k] < T && (best===null || lim[k] < lim[best])) best = k;
    return best || 'park';
  };
  const rc = i => [Math.floor(i/N), i%N];
  const buyable = p => p.st==='land' && ['farm','muni','flood'].includes(p.k) && !(p.k==='muni' && S().local<40);
  let guard = 0;
  while(!S().over && guard++ < 80){
    while(S().cards.length) g.resolveCard();
    if(S().perkChoice){ const k = PERK_PREF.find(k=>S().perkChoice.includes(k)) || S().perkChoice[0]; g.choosePerk(k); }
    if(S().over) break;
    let loops = 0;
    while(S().slots > 0 && loops++ < 12){
      const s = S(), d = s.directive;
      if(s.comp < 30 || (d && d.kind==='reports')){ if(g.fileReport().ok) continue; }
      if(s.local < 42 && s.funds > 5){ if(g.lobby().ok) continue; }
      if((s.neigh < 28 || (d && d.kind==='consult')) && s.slots >= 2){ if(g.consult().ok) continue; }
      const rustic = s.grid.filter(p=>p.st==='owned' && !p.urban).length;
      if(rustic >= 3 && !s.plan && s.slots >= 2){ if(g.submitPlan().ok) continue; }
      const owned = s.grid.map((p,i)=>[p,i]).filter(([p,i])=>p.st==='owned' && g.hasAccess(...rc(i)));
      const lots = s.grid.map((p,i)=>[p,i]).filter(([p,i])=>buyable(p) && g.hasAccess(...rc(i)));
      // sell surplus urban land when cash runs low (optional strategy)
      if(opts.sell && s.funds < 25 && s.market >= 0.8){ const u = owned.find(([p])=>p.urban); if(u && g.sellPlot(u[1]).ok) continue; }
      const urbanOwned = owned.filter(([p])=>p.urban), rusticOwned = owned.filter(([p])=>!p.urban);
      const want = (d && d.kind==='park' && !planned('park')) ? 'park' : (d && d.kind==='school' ? 'school' : (d && d.kind==='roads' ? 'road' : desired()));
      if(lots.length < 2 && owned.length && planned('road') < 14){ const src = rusticOwned[0] || owned[0]; if(g.requestPermit(src[1],'road').ok) continue; }
      if(['road','park'].includes(want) && owned.length){ if(g.requestPermit((rusticOwned[0]||owned[0])[1], want).ok) continue; }
      // pick the parcel with the best adjacency combos for this building (good +1, bad -2), like a player reading the preview
      const score = i => g.comboPreview(i, want).reduce((t,c)=>t + (c.good ? 1 : -2), 0);
      if(urbanOwned.length && !['road','park'].includes(want)){ const best = urbanOwned.slice().sort((x,y)=>score(y[1])-score(x[1]))[0];
        if(g.requestPermit(best[1], want).ok) continue; }
      if(lots.length){ lots.sort((a,b)=>(b[0].k==='muni')-(a[0].k==='muni') || (a[0].k==='flood')-(b[0].k==='flood') || a[0].price-b[0].price);
        g.acquire(lots[0][1]); continue; }
      break;
    }
    while(S().cards.length) g.resolveCard();
    if(S().perkChoice) continue;
    g.endMonth();
  }
  const s = S();
  return {seed, win: !!(s.over && s.over.win), why: s.over ? s.over.why : 'none', month: s.month, residents: g.residents(), funds: Math.round(s.funds*10)/10, debt: s.debt, perks: s.perks.length};
};
