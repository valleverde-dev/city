import { S } from './state.js';

// =====================================================================
//  CONFIG — tuning knobs (see docs/GDD.md)
// =====================================================================
// =====================================================================
//  PHASES (v0.10) — a run is ONE region that keeps growing and stays in play. It starts with one 8×8 plot;
//  every time the region's population reaches the target there is a MILESTONE: a reward, a new 8×8 plot next
//  to the region, a new grant tranche and more months. The rules switch on phase by phase (f), so the
//  bureaucracy is learnt one layer at a time.
//  The target follows one visible rule: residents per parcel × parcels, and the density goes up one step
//  per milestone (4, 5, 6… residents per parcel → 256, 640, 1,152, 1,792…).
//    access: buildings need a road/built neighbour · permits: reviews can be rejected · local: the mayor matters
//    jobs: residents need jobs · combos · holdout: farmers raise prices · rustic: farmland needs an urban plan
//    events: crisis cards · directives · neigh/comp: neighbours and compliance meters · services: school + health
//    lose: audits and failed directives end the run · debt (v0.10.2, from phase I): loans, and bankruptcy past the cap
//    milestones: use-it-or-lose-it · market: developers, property market
// =====================================================================
export const VERSION = '0.12.0';   // keep in step with package.json (the build checks it)
export const BASE_F = {access:1, permits:1, local:1, jobs:1, combos:1, holdout:1, debt:1};
export const FULL_F = {...BASE_F, rustic:1, events:1, directives:1, neigh:1, comp:1, services:1, lose:1};
export const PLOT = 8;                     // every plot of the region is PLOT × PLOT parcels
export const DENSITY0 = 4;                 // residents per parcel asked in the first phase (+1 per milestone)
export const PHASES = [                    // per phase: rules, months, agenda slots, grant per new resident asked (€M)
  {months:8,  slots:2, per:0.10, f:{access:1, combos:1, debt:1}},   // roads and access (v0.10.1), combos and bankruptcy (v0.10.2) from the first phase
  {months:14, slots:3, per:0.12, f:{...BASE_F}},
  {months:18, slots:3, per:0.18, f:{...FULL_F}},
  {months:18, slots:3, per:0.12, f:{...FULL_F, milestones:1, market:1}},
];
// Phase k of a run (0-based): its plot size, the parcels of the whole region, the density and the target
export function stageCfg(k){
  const P = PHASES[Math.min(k, PHASES.length-1)], parcels = PLOT*PLOT*(k+1), density = DENSITY0 + k, target = parcels*density;
  const prev = k > 0 ? PLOT*PLOT*k*(DENSITY0 + k - 1) : 0, inc = target - prev;
  return {n:PLOT, k, parcels, density, target, inc, months:P.months, slots:P.slots, f:P.f, grant: Math.round(inc*P.per + 8)};
}
export const LEVELS = PHASES.map((_,k)=>stageCfg(k));   // the four phase templates (the rules stop changing after the fourth)
export const CFG_STAGE = { plot: PLOT, density0: DENSITY0 };
export const LV = () => stageCfg(S ? (S.stage ?? S.level ?? 0) : 0);
export const on = flag => !!LV().f[flag];
export const METER_FLAG = {local:'local', neigh:'neigh', comp:'comp'};
export const MILESTONES = { 8: 0.25, 14: 0.60 };   // share of the tranche that must be spent by then (phase IV on)
export const CFG = {
  contractors: 3,
  permitFee: 0.2, lobbyCost: 0.3, consultCost: 0.2, planCost: 0.5, planMonths: 2,
  decommitShare: 0.5,                      // share of the shortfall that is taken back
  complianceDecay: 5, localDecay: 1, noisePerSite: 1,
  jobsPerResident: 1/1.6, baseSchool: 150, baseHealth: 250, baseJobs: 40,
  urbanUplift: 3,                          // urban land is worth x3 its rustic price (land value capture)
  devMinMarket: 0.8,                       // developers only buy when the market is at least this hot
  taxShare: 0.5, taxPerFactory: 0.25, taxPerResident: 0.0008,
  loanStep: 5, debtCap: 35, interest: 0.02,
  approveAt: 50,                           // a permit is approved if political support is at least this when it is decided
  keepShare: 0.4,                          // share of unspent funds kept at a milestone (the rest goes back to Brussels)
};
Object.defineProperties(CFG, {
  months:{get:()=>LV().months + ((S && S.ext) || 0)},   // v0.10: + months won by missions and extensions
  grant:{get:()=>LV().grant}, target:{get:()=>LV().target}, slots:{get:()=>LV().slots},
  milestones:{get:()=> on('milestones') ? MILESTONES : {}},
});
export const B = {
  road:    {icon:'add_road',       cost:0.6, build:1, permit:1, upkeep:0.01},
  housing: {icon:'apartment',      cost:7,   build:3, permit:2, upkeep:0.06, homes:150, urban:true},
  factory: {icon:'factory',        cost:9,   build:4, permit:3, upkeep:0.06, jobs:150, urban:true},
  school:  {icon:'school',         cost:5,   build:3, permit:2, upkeep:0.06, school:300, urban:true},
  clinic:  {icon:'local_hospital', cost:6,   build:3, permit:2, upkeep:0.06, health:600, urban:true},
  park:    {icon:'park',           cost:1.5, build:2, permit:1, upkeep:0.02},
};
// Buildings unlocked through the career (achievements), v0.8. Effects, all per finished building:
//   homes / jobs / school / health: capacity · tax: €M a month · neigh / local: meter change a month · rate: faster move-ins
//   flag: the rule that must be in play to build it · rustic: can go on rustic land · unique: one per settlement
Object.assign(B, {
  market:   {icon:'storefront',     cost:4,   build:2, permit:1, upkeep:0.03, jobs:60, tax:0.04, urban:true, flag:'jobs'},
  social:   {icon:'volunteer',      cost:6.5, build:3, permit:2, upkeep:0.08, homes:220, neigh:-1, urban:true, flag:'access'},
  library:  {icon:'menu_book',      cost:3,   build:2, permit:1, upkeep:0.03, school:150, neigh:1, urban:true, flag:'access'},
  police:   {icon:'local_police',   cost:4,   build:2, permit:2, upkeep:0.05, neigh:1, local:1, urban:true, flag:'access'},
  solar:    {icon:'solar_power',    cost:5,   build:2, permit:2, upkeep:0.01, tax:0.07, rustic:true, flag:'access'},
  station:  {icon:'train',          cost:8,   build:4, permit:3, upkeep:0.06, homes:40, rate:0.06, urban:true, flag:'access'},
  data:     {icon:'dns',            cost:10,  build:3, permit:2, upkeep:0.04, jobs:40, tax:0.16, neigh:-1, urban:true, flag:'jobs'},
  townhall: {icon:'account_balance',cost:6,   build:3, permit:2, upkeep:0.05, local:2, urban:true, unique:true, flag:'access'},
});
export const BASE_TYPES = ['road','housing','factory','school','clinic','park'];
export const NEW_TYPES = ['market','social','library','police','solar','station','data'];   // v0.12: the town hall is no longer built (B.townhall stays for old saves)
export const BUILD_TYPES = [...BASE_TYPES, ...NEW_TYPES];
// The capacity effects of the original six, in the same generic fields
Object.assign(B.housing, {homes:150}); Object.assign(B.factory, {jobs:150}); Object.assign(B.school, {school:300}); Object.assign(B.clinic, {health:600});
export const KIND = { farm:'agriculture', muni:'how_to_vote', flood:'water', habitat:'forest', village:'cottage', regional:'add_road' };
export const PERKS = {
  notary:'history_edu', fasttrack:'bolt', prefab:'view_in_ar', contractor:'engineering', cousin:'family_restroom',
  translation:'translate', comms:'campaign', fixer:'handshake', shovel:'workspace_premium', lobbyist:'restaurant',
  cohesion:'savings', taxadvisor:'percent', ombudsman:'volunteer', revolving:'sell',   // v0.9: unlocked by rank
};
// Recurring characters (fictional). Portrait parameters are drawn as SVG in the UI.
export const CHARS = {
  mayor:     {name:'Gilberto Plaza',          look:{skin:'#f1c7a1', hair:'#3b2a1e', style:'side',  acc:'sash',    mouth:'smile', coat:'#2d3f6b'}},
  neighbour: {name:'Remedios Quintana',       look:{skin:'#f3d1b5', hair:'#cfcfcf', style:'bun',   acc:'glasses', mouth:'frown', coat:'#8e4f6d'}},
  heritage:  {name:'Dr. Ottilie Steinbach',   look:{skin:'#f5dccb', hair:'#a0522d', style:'long',  acc:'glasses', mouth:'flat',  coat:'#5b6b4a'}},
  brussels:  {name:'Joost van der Formulier', look:{skin:'#f0c9a8', hair:'#e2c35a', style:'short', acc:'tie',     mouth:'flat',  coat:'#33415c'}},
  developer: {name:'Bruno Ladrillo',          look:{skin:'#e0ac83', hair:'#1b1b1b', style:'slick', acc:'gold',    mouth:'grin',  coat:'#1c1c24'}},
  banker:    {name:'Konrad Grüngeld',         look:{skin:'#f2cfb3', hair:'#8a8a8a', style:'bald',  acc:'monocle', mouth:'flat',  coat:'#2a3a2f'}},
  union:     {name:'Paco Hormigón',           look:{skin:'#c98b5e', hair:'#2b1b10', style:'short', acc:'hardhat', mouth:'flat',  coat:'#e0712b', mustache:true}},
  farmer:    {name:'Benito Terrón',           look:{skin:'#d9a57a', hair:'#dddddd', style:'cap',   acc:'none',    mouth:'grin',  coat:'#5d7a3a', mustache:true}},
};
export const N_COUNTRIES = 5, N_REJECTIONS = 8;
export const TOWN_A = ['San','Villanueva del','Bad','Sankt','Pontevieja-sur-','Nieuw','Santa Maria do','Klein'];
export const TOWN_B = ['Expediente','Formular','Paragraph','Dossier','Tramite','Stempel','Protocolo','Annex'];
