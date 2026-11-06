# EUROCRAT — Game Design Document

*Living document. v0.12.0 · Nov 6, 2026. Working title. Available in English and Spanish.*

> Every city builder is a dictatorship: you click, a house appears, people move in.
> **Eurocrat** asks what building a new town would *really* take in contemporary Europe —
> and plays the answer for laughs.

## 1. Pitch

A satirical, turn-based **roguelike city builder**. You are a mid-level official sent from Brussels to deliver a brand-new "model European town" in a member state. You have a lot of money and almost no power: the land belongs to farmers and the municipality, permits are local, the mayor wants credit, the neighbours want nothing to change, and the Commission wants reports. Oh — and the funds expire.

References: *Constructor* (1997) for the humour, characters and dirty tricks; *Into the Breach* / *Slay the Spire* for short, hard, replayable runs with build-defining choices; *Papers, Please* for bureaucracy as gameplay.

## 2. Tone

- **Hyper-realistic premise, comic execution.** Every mechanic mirrors something that actually happens (land holdouts, zoning, permits, objections, archaeological finds, protected species, elections, use-it-or-lose-it funding, audits).
- **Laugh at everyone.** The Commission (acronyms, KPIs, forms), the national government, the mayor, the developer, the NIMBY neighbour — and the player. The satire should make people think, not preach.
- **Fictional institutions only.** No real EU names, flags or institutional logos. The Union has its own flag — the shape and proportions of Vietnam's (3:2, one centred five-point star), but a white star on European blue — used as its emblem on letterheads and as the flags that fly on the title screen. It is deliberately not the flag of Europe (no ring of twelve gold stars). Credits state that the game is satire, not affiliated with or endorsed by the EU.

## 3. The player

**Programme Officer, DG HUF.** Not a mayor, not a god. You can buy land, file paperwork, lobby, consult and report. You cannot simply build: every building needs land, a permit, contractors and time — and someone has to want to live there.

## 4. The Euroregion: one run, one region, one map that grows with it

v0.5 had four separate levels, which played like a campaign rather than a roguelike. Since v0.6 **a run is a single Euroregion** that grows, and since v0.7 **the map grows with it**: the map is only the land the region has, and every step adds land next to it, where you choose, directly on the map. **v0.10 keeps the whole region in play** (until v0.9 each finished settlement was frozen and you only built on the newest one).

- The run starts with **one 8×8 plot** (v0.10; until v0.9 it was a 2×2 hamlet, then 4×4, 8×8 and 16×16 settlements).
- Every time the region meets its target it reaches a **milestone**: you choose a reward and **add another 8×8 plot** next to the region. Everything you built stays in play, its people stay, and you can keep building anywhere in the region. Any failure ends the run. There is no size limit.
- **New land continues the old one.** A regional road that reaches the edge of the region goes on across the new plot, and so does the river. Each plot brings its own regional road if none arrives, so there is always a way in; it can have a river, woods and wetlands (protected), and it has an old village by its road.

**The target grows by one visible rule: land × density.** The target is the population of the whole region: *parcels × residents per parcel*, and the density goes up one step at each milestone (4, 5, 6, 7…). So each phase asks for the land you add plus a little more on the land you already have:

| Phase | Plots | Parcels | Density | Target | Months | Agenda | New rules | Can you lose? |
|---|---|---|---|---|---|---|---|---|
| I · Pilot Project | 1 | 64 | 4 | 256 | 8 | 2 | Buy a parcel, build housing and roads, end months; access (a road or a built neighbour), combos and debt (v0.10.2) | By running out of time, or debt over the limit |
| II · Expansion Phase | 2 | 128 | 5 | 640 | 14 | 3 | Permits can be rejected, the Mayor meter, jobs, farmers holding out | By running out of time, or debt over the limit |
| III · Partial Plan | 3 | 192 | 6 | 1,152 | 18 | 3 | Rustic land + urban plans, event cards, directives and deals, neighbours, compliance, school and health, the bank, extensions | Yes: also audits and two failed directives |
| IV · Model Town | 4 | 256 | 7 | 1,792 | 18 | 3 | Use-it-or-lose-it milestones (25% of the tranche by month 8, 60% by 14), developers, property market | Yes |
| V, VI, … | 5, 6… | 320, 384… | 8, 9… | 2,560 · 3,456 · … | 18 | 3 | None: the same bureaucracy, more land, denser | Yes |

**No screen shows what comes next** (v0.10.2): the phase screen gives this phase's target and how you can lose, never the targets ahead; locked buildings, perks, combos and achievements are ??? (no level, rank or name to reach). The player discovers and explores.

**Money comes in tranches.** Each phase releases a new grant tranche sized to what it asks for (*10% of the new residents in €M + 8* in phase I, 12% in II, 18% in III, 12% from IV on), and gives the phase its months. Rules switch on phase by phase, so the learning curve stays.

**A milestone** (target met):
- **Brussels recovers 60% of the unspent money**; 40% comes with you, on top of the next tranche. Debt also comes with you.
- **A reward** (§9): three offers, each brought by a character (four for a perfect milestone).
- Then you **choose where the next plot goes, on the map.** Up to four plots are offered around the region, with their terrain visible under a blue veil and numbered. Tap one (on the map or in the bar), see what it borders and what is on it (road, river, village, protected land), and acquire it.

**Technically** the grid in play is the region's bounding square; the cells of that square that are not land are *void* (not drawn, not playable), so every rule applies to the whole region at once. Save format v11.

**Plot types.** Every plot has a random type with its own trait: Farming town (land −25%), Industrial town (+80 jobs, neighbours −1/month), Commuter town (+60 homes), Spa town (faster move-ins, +taxes), University town (+200 school places, +taxes), Historic town (Mayor +1/month, permits +1 month), Logistics hub (+50 jobs, +taxes, neighbours −1/month). **All the plots' traits add up** (v0.10). The tutorial's first plot is always a farming town.

**Where you attach matters, twice:**
1. **Region combos** between the types of plots that touch (all of them, since the whole region is in play). Good ones include Commuter Belt (commuter + industrial), Technology Transfer, Heritage Trail, Farm to Table, Campus Town, Freight Hub, Market Town. Bad ones include Smokestack View (industrial + spa), Lorries in the Old Town, Slurry Season (farming + commuter), Rust Belt (two industrial towns), Sleeper Sprawl, Freshers' Week. They are **discovered** like building combos; the catalogue persists between runs.
2. **The land itself.** Where the road runs, where the river and the woods are: you see it before you choose. Buildings form ordinary adjacency combos and give access **across plot edges** — it is one map.

- Every phase opens with a **phase screen** (its type, region combos, this phase's goal, how you lose and "what is new") and, up to phase IV, the **guide** (the mayor's hints, one rule at a time as it switches on).
- Rules that are not in play are **invisible**: no meter, tab or button for them.
- In phases I–II you cannot order works you cannot pay for, so there is no debt and no loan.
- **Between runs:** the combo catalogue (buildings and region) and the **records** (most milestones, largest Euroregion population).
- **Difficulty curve (v0.10).** A greedy test bot, 60 seeded runs: milestones per run 1 → 7% · 2 → 20% · 3 → 25% · 4 → 22% · 5 → 13% · 6+ → 13%, an average of about **3.7** (4.9 when it keeps its career, ranks and perks between runs). Starting a phase directly, with no perks: I 100% · II ~98% · III ~72% · IV ~42% · V ~13%.

### Fair, not random (v0.7)

Playtest: the second settlement felt impossible and depended on luck (the bot averaged 3.6 rejected permits and 2 farmers raising prices per game). Now:
- **Permits are decided by political support, not dice.** Support (0–100) comes from the Mayor, the neighbours and compliance. A permit is approved if support is at least **50** when it is decided. The parcel sheet, the map badge (red) and the bell warn you in advance, and you can lobby or consult in time.
- **Stubborn owners** (from phase II): about a quarter of the new farmland belongs to owners who ask more — **+50…150%, rolled once per parcel** (v0.10.2). Nothing gives them away: they show up in person when you go for their land (v0.10.1), with their price, and from then on the parcel is marked. No surprise raises after that, no lost actions.
- **Housing levels (v0.12).** A housing block is born at level I (150 homes) and, from phase II, can be **renovated up a level at a time** from its card in the bar: a renovation permit (decided by its district's town hall, like any permit; the clerk's holidays apply), then months of works with 60 homes fewer meanwhile, then more homes. Each level asks something of its surroundings, and only the next one is shown: **level II** (250 homes, €5M, 3 months) needs a park, school or market beside it; **level III** (400 homes, €8M, 4 months; a tower: neighbours −3) needs a school and a health centre within two cells — and no towers next to a protected old town. Upkeep rises a little with each level, and the block looks its level on the map: terraces and perimeter blocks, then slabs and mid-rise, then the tower.
- **Town halls (v0.12).** Every district (each 8×8 plot) has its own **town hall** in its village, with its own lore (a founding year, a motto, a clerk at the counter), **one or two ordinances** and **its own relation with you (0–100)**, which **decides the permits of that district** (the founding district's relation is the Mayor meter). The district's placard shows a small face for that relation. Tap the town hall for its screen: the clerk, the ordinances (**??? until you ask at the counter or run into one**), your permits waiting there and what you can do about it:
  - *Ask about the rules* (1 slot, once a phase): every ordinance in force, explained.
  - *Pastries for the clerk* (1 slot, €0.3M, once a month): the relation +6, and a permit stuck waiting for the clerk goes ahead anyway.
  - *Lunch with the mayor* (moved here from the agenda): this town's mayor, +12 (+6 for a second lunch in the month).
  - *Call the mayor over the clerk's head* (1 slot): the clerk back today and your permits here decided next month; the relation −10.
  - *Formal complaint* (1 slot, when the clerk is away): back within a month; compliance +5, the relation −5.
  - *Propose repealing* a known bad ordinance (2 slots): the plenary votes in 3 months and repeals it if both the neighbours and this town hall are at 50+ then (no dice).
  - The **ordinances** (about 40% help): the permits clerk on holiday (permits wait a few months each phase — "until he's back from holiday, nobody can touch them"), a protected old town (works next to the village +25%), everything in triplicate (the permit fee ×3), the patron saint's fiesta (one month a phase without works), no industry, the long lunch (works +1 month), bilingual signs (every building +€0.2M); and the good ones: a one-stop shop (permits a month faster), an industrial tradition (factory permits approved on the spot). Expropriating in a district costs its town hall −8. The buildable town hall is gone (every village has one).
- **Negotiating with them (v0.11).** Once you have met an owner, besides paying their price you can **lean on them through the mayor** (1 slot, Mayor −10, needs the Mayor at 50+; halves their markup, once), **expropriate** (2 slots, the base price without markup paid now, neighbours −12; the parcel is yours after 4 months of courts, not for sale meanwhile) or **leave them in peace** (free, neighbours +3; they stop negotiating, you can still pay).
- **Gossip at the village bar (v0.11).** An agenda action, once a month: a slot and a round (€0.3M). The regulars name parcels with a stubborn owner before you meet them — up to 3 when the neighbours are happy (65+), 2 (40+), 1 (20+), nobody talks below 20. About a quarter of what they say is **false**: a "rumour" mark on a parcel whose owner turns out to be perfectly reasonable when you go for it.
- Randomness stays where it is fun and visible: event cards (each a choice), directives, the market.

## 5. Core loop

One turn = **one month**. A settlement lasts 8 to 36 months; a run (one Euroregion) lasts until a settlement fails, typically 3–5 settlements ≈ 30–60 minutes.

Each month:
1. You have **3 agenda slots** (your working time). Spend them on parcels (acquire, request permits, sell to developers), on planning (submit an urban plan) or on politics (lobby the mayor, public consultation, file a report).
2. Press **End month**. The world resolves: permits and plans get decided, construction advances, developers build (or stop), funds are spent and local taxes come in, residents move in (or don't), meters drift, a random **event card** may land, **directives** tick down.

### Parcel pipeline (the heart of the game)

```
Land ──acquire──▶ Owned (rustic) ──urban plan──▶ Owned (urban) ──request permit (type)──▶ Under review (N months)
                                                      └──sell to a developer──▶ Private works (their pace) ─▶ Built (no upkeep)
                                                     ├─ Rejected → reapply
                                                     └─ Approved ─▶ Waiting for contractor ─▶ Under construction (M months) ─▶ Built
```

- **Acquire.** Private farmland has an owner and a price; owners may *hold out* (price jumps). Municipal land is cheap but needs the mayor (Local support ≥ 40). Protected habitat can never be built on. **Rivers and lakes** (the old flood zones, v0.11.1) can be neither bought nor built on, and they can grow: an event floods the empty parcels on a bank unless you pay for sandbags.
- **Urban plan (rezoning).** Rustic land only takes roads and parks. One plan (2 slots, ~2 months, council approval) rezones every rustic parcel you own. Municipal land is already urban.
- **Permit.** Needs access on any of the **8 neighbours** (diagonals count): a road (even a planned one), a **finished** building or the old village — built-up land brings its own streets. Works in progress do not count, so the order you build in matters. Review time depends on the building and on how angry the neighbours are. Approval chance depends on Local support, Neighbours and Compliance. Building next to the old village annoys its residents.
- **Construction.** Limited **contractors** (sites at the same time). Cost is paid month by month.

### Buildings (v0.3)

| Building | Purpose |
|---|---|
| Road | Access. Nothing gets a permit without it. |
| Housing block | Homes for residents. |
| Factory | Jobs. Neighbours hate living next to it. |
| School | Needed once you have families (capacity per school). |
| Health centre | Needed as the town grows. |
| Park | Neighbours like it; residents move in faster. |

**Unlockable buildings (v0.8; by career level since v0.9.2)** — once your career reaches the level, available in every later run. Until then they are not in the bar; the run file lists them with their level and progress:

| Building | Career level | Purpose |
|---|---|---|
| Market | 2 | Some jobs and taxes, urban |
| Library | 3 | School places, neighbours like it |
| Police station | 5 | Neighbours and local support up |
| Social housing | 7 | Many cheap homes; neighbours grumble; needs access |
| Solar farm | 11 | Taxes from rustic land |
| Station | 14 | Some homes, residents move in faster |
| Data centre | 18 | Taxes, few jobs, neighbours dislike it |

(v0.8–v0.9 tied them to achievements — first housing block, five permits… — which a first run met almost entirely, so everything unlocked at once.)

14 combos use them (Market Street, Farmers' Market, Commute, Freight Yard, Reading Park, Study Hall, Safe Streets, Self-consumption, Green Cloud, Plaza Mayor, Community Garden; bad: Glare, Server Hum, Station Noise).

### Residents

People only move in if there is **housing**, **jobs** (each job supports ~1.6 residents) and **services** (school and health places). The town grows toward the lowest of those limits, a share of the gap each month. The chicken-and-egg problem — no jobs without people, no people without jobs — is the point: you need an anchor employer early.

### The economy: land value capture (v0.3)

A real new town is not paid for by grants alone; it is paid for by **turning farmland into building land**.
- Rezoned land is worth **×3** its rustic price (× the property market).
- **Sell urban plots to developers**: money in (it does *not* count as spending for the milestones), and they build housing with their money — at their pace, pausing when the market is cold, and possibly going bust in a crash (an abandoned concrete skeleton you can buy back).
- **Build yourself**: dearer and slower, but you control it.
- **Local taxes**: factories and residents pay taxes to the municipality; half comes back to the programme (an urban agreement), and a mayor with revenue is a happier mayor.
- **Bridge loans**: running out of money no longer ends the game. The regional bank lends in €5M steps at 2%/month; above €35M of debt it pulls the plug.
- **Use it or lose it**, softened: a warning 3 months before each milestone, and only half of the shortfall is decommitted.

### Combos (v0.4, Kairosoft-style; v0.7 highlight)

Buildings next to each other (8 neighbours) form **combos** — and some combos are bad. Effects apply per pair and are shown on the map as green (good) or red (bad) dotted links.

| Combo | Pieces | Effect |
|---|---|---|
| Green Views | Housing + Park | +20 homes, faster move-ins |
| Walk to School | Housing + School | +60 school places |
| Doctor on the Corner | Housing + Health centre | +120 patients |
| Neighbourhood | Housing + Housing | +15 homes |
| Industrial Estate | Factory + Factory | +40 jobs, +€0.05M taxes/month |
| Logistics Hub | Factory + Regional road | +25 jobs |
| Outdoor Classroom | School + Park | Neighbours +1/month |
| Riverside Park | Park + River | Neighbours +1/month, faster move-ins |
| Charming Old Quarter | Park + Old village | Mayor and neighbours +1/month |
| *Smoke in the Living Room* | Factory + Housing | −25 homes, neighbours −1/month |
| *The Village Revolts* | Factory + Old village | Neighbours −2/month |
| *Fumes at Playtime* | Factory + School | −80 school places, neighbours −1/month |
| *Racket in A&E* | Factory + Health centre | −100 patients |

**Discovery:** combos are hidden until you build one. Before that, the build menu only says *"combo?"* (good and bad look the same); afterwards it names them. Each first discovery gets its own card (the mayor for good ones, the neighbours' association for bad ones) and goes into a **combo catalogue that persists between runs** — knowledge, not power.

## 6. Resources

| Resource | Meaning | Pressure |
|---|---|---|
| **Funds (€M)** | A grant tranche per phase (sized to its target), plus land sales and the region's taxes. | **Use it or lose it** (from phase IV): spend 25% of the tranche by month 8 and 60% by month 14; half of any shortfall is *decommitted*. Out of money → bridge loan. |
| **Debt** | The regional bank's bridge loans. | 2%/month interest; above €35M → game over. |
| **Agenda slots** | Your time: 2 per month in phase I, 3 after (more with perks and rewards). | Everything costs slots; politics competes with building. |
| **Local support** | The mayor and council. | Municipal land and permit approvals. Elections can reset it. |
| **Neighbours** | Public opinion in the area. | Slower permits, lawsuits; below 15 a court may annul the plan → game over. |
| **Compliance** | How happy the Commission is with your reporting. | Decays every month. Reports restore it. 0 → audit → game over. |
| **Contractors** | Simultaneous construction sites. | The real bottleneck late in the run. |

## 7. Directives (random missions)

Every few months the Commission issues a **directive**: an objective, a deadline and consequences. Examples: *"Absorption rate: spend €10M more within 5 months"*, *"Green Transition: deliver a park within 4 months"*, *"Stakeholder Engagement: hold a public consultation"*, *"KPI 3.2.b: 150 registered residents by month 18"*. Success → choose **1 of 3 perks**. Failure → a penalty (funds clawed back, compliance hit). **Fail 2 directives in a phase → programme suspended** (game over).

**Deals with the characters (v0.10).** Some event cards are offers, not problems: *build 2 more housing blocks by month 9 and I'll get Brussels to give us more time* (the mayor), *file 2 reports by month 6 and I'll sign an extension* (Brussels), *a park by month 7 and the association pays the benches* (the neighbours), *3 works at once and my lads do overtime* (the union), *sell me a plot* (the developer), *stay out of debt* (the bank). Accept or decline; an accepted deal shows in the agenda with its progress. Kept: **more months for this phase** or money. Broken: that character's meter pays.

**Asking for an extension (v0.10).** From phase III the agenda has *Request an extension*: two slots and compliance −10, once per phase. Brussels grants **+3 months** if compliance is still 45 or more afterwards — no dice, the meter is on screen — and refuses otherwise.

## 8. Event cards (dilemmas, not punishments)

Most months something happens. Each event arrives as a **card** told by a recurring **character**, with **2–3 choices** whose consequences are shown as chips (money, meters, months of delay, % risk). The affected parcel pulses on the map, and every character has its own sound.

Example — *Archaeological find* (Dr. Ottilie Steinbach, Heritage Office): **call the Heritage Office** (+3 months) · **pour concrete quietly** (35% risk: compliance −30, neighbours −15) · **build a little museum** (+2 months, −€1.5M, neighbours +10, mayor +5).

v0.3 deck (15): archaeological find, protected toad, municipal elections, neighbours' lawsuit, cost inflation, construction strike, Brussels delegation, delayed co-financing, premature inauguration, viral video, inheritance sale, new reporting template, developer offer, property crash, bank calls the loan, village fiesta.

v0.10 adds 26 more (42 in all):
- **Between the plots of the region** (from two plots): the old district complains all the money goes to the new plot, a bus strike between towns, a shared health centre, the regional derby, a boundary dispute (the map is in crayon), town twinning.
- **Chained**: a decision now brings a second card months later — hire the consultants (their roadmap comes back), the mayor's cousin (the jacuzzi scandal), a journalist calls (the front page depends on whether you talked), the e-scooter pilot (scooters in the fountain), a heritage survey (a medieval oven and a phone box of great sentimental value).
- **Standalone**: potholes, heatwave, a film crew, a surprise audit (clean only if compliance is 50+).
- **The six deals** (§7).

**Characters:** Mayor Gilberto Plaza · Remedios Quintana (neighbours' association) · Dr. Ottilie Steinbach (Heritage) · Joost van der Formulier (DG HUF, Brussels) · Bruno Ladrillo (Ladrillo Holdings) · Konrad Grüngeld (Regional Savings Bank) · Paco Hormigón (construction union) · Benito Terrón (landowner).

### Making problems visible
- A **"What needs attention"** list at the top of the panel (tap an item to locate it on the map).
- Problem markers on the map (rejected permit, halted site, no access, paused developer, ruin).
- Tap a **meter** to see what it does and *why* it moved (last changes with their causes); ▲▼ shows last month's change.

## 9. Milestone rewards and perks (roguelike build)

**Milestone rewards (v0.10).** Every milestone brings **three offers, each from a character**; you take one:
- a **perk** (Brussels; 1 of 3, or 1 of 4 when gold) — always on offer;
- **bridge funding** for the next tranche (the bank);
- **a deputy mayor**: +1 agenda slot every month, for good (the mayor; at most two);
- **pre-approved permits**: the next 2 permits skip the review (the developer);
- **land in the next plot**: 3 parcels of it are already yours, as building land (the farmer);
- **a good press day**: all meters +15 (the neighbours);
- **debt restructuring**: half the debt forgiven (the bank, only in debt);
- **an expert report**: reveals an undiscovered combo (Heritage).

Some offers come as a **deal, with a catch**: more of the good thing, and a meter pays (more money but neighbours −15; two slots but compliance −12; five parcels but the mayor −12). A milestone reached **ahead of schedule** (a quarter of the months left), **with no debt** or **with three or more combos** this run turns one offer **gold** (bigger) per reason; all three at once add a fourth offer.

**Perks.** Picked 1 of 3 after each completed directive and from the perk reward, and kept for the whole run: *Friendly Notary* (cheaper land), *Fast-track Decree* (faster permits), *Prefab Supplier* (faster construction), *Extra Contractor*, *Cousin at the Ministry* (+1 agenda slot), *Translation Unit* (compliance decays slower), *Comms Agency* (neighbours improve monthly), *Local Fixer* (local support never drops below 30), *Golden Shovel* (one free construction)… Since v0.9 the pool grows with your rank (see §10b), with four more: *Cohesion Funds*, *Tax Adviser*, *Ombudsman*, *Revolving Doors*. They are always on show in the HUD.

## 10. Winning and losing

- **A phase is won** by reaching the region's resident target before its deadline: a milestone, a reward and a new plot. There is no final victory. The question is how big your Euroregion gets, measured in milestones and total population.
- **The run is lost** when: debt goes above the bank's limit · compliance hits 0 (audit) · a court annuls the plan · 2 directives fail · time runs out on a phase ("The programme will be evaluated"). The end-of-run card shows the region map, what it reached and the records.
- **Difficulty:** hard but fair. Every loss should be traceable to a decision. See §4 for the bot's curve.

## 10b. The career (v0.8): why play again

What carries over between runs, apart from the combo catalogue and the records:
- **Experience, as you play** (v0.9): buying land +2, a permit +3, an approval +3, a finished building +6 (a street +1), a good combo formed +8, a combo discovered for the first time +25, each month +1, a milestone +100, a plot sold +4, an agenda action +1, an urban plan +4; each achievement its own XP; at the end of a run, +1 per 20 residents of the region. "+5 XP" rises from the run file and its bar fills.
- **Levels** (v0.9.2: level n at 350·n·(n+1) XP: 700, 2,100, 4,200…; it was 50·n·(n+1) and a first run reached level 7), announced with a banner that also says what the level brings, and **ranks** at levels 2, 4, 6, 8, 11, 14 and 18 (8 ranks: Trainee → Commissioner). Each rank above the first adds +4% to every grant tranche. The bot, keeping its career: about one level per run, level ~6 after 5 runs, ~15 after 20. The new buildings arrive with levels (§5).
- **Perks by rank:** the six basic perks are always in the pool; the others join it as you rise (Comms Agency and Professional Lobbyist at rank 1, Local Fixer and Golden Shovel at 2, then four new ones: *Cohesion Funds* (+15% of every grant) at 3, *Tax Adviser* (+25% taxes) at 4, *Ombudsman* (neighbours never below 25) at 5, *Revolving Doors* (plots sell for 30% more) at 6). The rank you had when the run began decides the pool.
- **26 achievements** (first stone, Kafka, Pelotazo, Bailout Denied, Mascot…): experience, and a line in the career. Banners announce them during play; the career file on the title screen lists them, with the condition of each locked one.
- **The tutorial runs once** (it can be played again from Settings): since v0.10 it is a normal first plot (a farming town, no perk) with the mayor's hints. After it, **every run is random** (v0.9.2): *New Euroregion* starts at once at phase I with a drawn plot type, a starting perk from your rank's pool and a member state, revealed on the phase screen. There is nothing to choose before playing (v0.8–v0.9 dealt three dossiers to pick from). The guide can be turned back on in Settings.
- **Full-screen moments:** consolidation cuts a ribbon over confetti, then the *Union Gazette* reports it; game over stamps the dossier REJECTED and shreds it, then the Gazette and a summary of XP, promotions, achievements and unlocks.

## 11. Roguelike variety

Every run is a new **Euroregion**: a name, a chain of settlements with random types, member states and town names, procedural sites (farmland, municipal plots, protected habitat, a river, the old village by the regional road), the shape that your attach choices give the region, a random stream of events and directives, and a different set of perks.

Later: member states with their own rule quirks; more plot types and region combos; an atlas of plot types. (Events between plots, chained events and deals that extend deadlines arrived in v0.10.)

## 12. Art direction

From *Syndicate* neon to **Constructor-style** colourful isometric with a bureaucratic UI:
- Map: **isometric pixel art**, 64×32 px tiles shown at whole-pixel zoom steps (crisp, no blur). Bright European countryside: patchwork crop fields with hedges, a river with reed banks, woodland, an old village with a church; roads join automatically; the board sits on an earth slab. Buildings have a dark pixel outline and a soft shadow to the right (light from the upper left). Construction shows scaffolding and a tower crane; permits show a planning notice; approved plots get barrier tape. Pennants instead of flags — no real-world emblems.
- **Variety:** each building type has 3–6 architectural styles; a parcel's style, colourway and (satirical) name come from the run seed, so every town looks different but stays stable for the whole run (and across rotations).
- **Life:** ~15 fps animation layer over the static map — traffic, people, sheep, smoke, flags, water, ducks, fountain, swings, wind turbine, cranes, sparks, beacons, birds. Animation reads as feedback: traffic grows with population; construction sites visibly work; a finished building rises from the ground.
- **Time passing:** ending a month plays a 2.6-second night (three stepped darkness levels, lit windows, street lamps, headlights). Buildings completed that month rise at dawn.
- UI: a **pixel-art parody of an institutional portal of "the Union"**, in the imagery of Brussels institutions but with nothing real: institutional blue `#163f94`, navy ink `#0b1f4d`, Union yellow `#ffd200`, document paper `#fbf8ee`. The Union's own (fictional) emblem: **a flag in the proportions of Vietnam's** (3:2, one five-point star in the centre, outer radius 3/10 of the height) **but with a white star on European blue** `#003399`, on every letterhead (the game header shows only the logo). It is deliberately not the flag of Europe (no ring of twelve gold stars). Hard 2–3 px borders, offset shadows and raised keys instead of rounded corners and blur; segmented meters; case-file cards; official letters with letterhead, "Brussels · M7" date line, reference numbers and stamps; the map sits on a cadastral grid.
- **Logo:** EUROCRAT in Jersey 10, rasterised pixel for pixel (74×17 art pixels): white EURO, CRAT in the secondary yellow `#e6b400`, a 1 px navy outline and a stepped navy extrusion, on a transparent background. Files in `art/logo/` (SVG + PNG at 1×/4×/8×), made by `web-prototype/tools/make_logo.py`; the game shows it on the title screen and in the header, always at whole-pixel scales.
- Type: **Jersey 10** (titles, figures, buttons), **Pixelify Sans** (UI and body text), **Silkscreen** (stamps, reference numbers). All SIL OFL, subset and embedded.
- Icons: 65 hand-drawn **12×12 one-colour pixel icons**, tinted with the text colour (no emoji, no icon font). Character portraits are rasterised to 32×32 and outlined.

### Music

The soundtrack plays the bureaucracy for laughs, like everything else, and grows with the region. All tracks are original arrangements; the Ode to Joy is Beethoven's public-domain melody, never an official anthem arrangement.

| Screen | Track | Style |
|---|---|---|
| Title / menus | *Ode to Joy (Brussels Eurodance Mix)* | Cheap 90s Eurodance |
| Settlement I · Pilot Project | *Village Fete Waltz* | Musette waltz: accordion, glockenspiel, oom-pah tuba; the Ode in 3/4 |
| Settlement II · Expansion Phase | *Let's Build Together* | 80s Eurovision synth-pop, original melody |
| Settlement III · Partial Plan | *Lobby Bossa (Floor 7, Please)* | Elevator bossa nova: nylon guitar, flute, the lift's chime |
| Settlement IV · Model Town | *Harmonised Trance Anthem* | Euro-trance: supersaws, choir breakdown, the drop |
| Settlement V and later | One at random: *Your Call Is Important to Us* · *Sunny Subsidy* · *Plenary Session (Hands Up!)* · *Italo Directive* | Hold music, ambient house, hands-up Eurodance, Italo disco |
| Settlement consolidated | *Douze Points for Harmonisation* | Eurovision schlager with the key change |

From settlement V on, the track is drawn per run and settlement (it stays the same if you pause or reload) and never repeats the one before. The mood stays light on purpose — lobby, hold music, ambient and cheap Eurodance, never tense or sad (v0.10.1 retired phase III's minor-key office ambient for killing the mood).

Later: short stingers for stamps, approvals, failed directives and audits; a tension layer for the last months of a settlement.

## 13. Language

English and Spanish, switchable at any time (HUD button, pause menu or Settings on the title screen); the choice is remembered. Every string lives in one dictionary (`web-prototype/src/i18n/strings.js`); logs and cards store keys, so switching language re-renders everything.

## 14. Interface

Pixel-art frame in the imagery of a (fictional) Union portal: pixel fonts for titles, figures, buttons and stamps; a crisp system sans at 15–16px for everything you read.

**v0.9: everything on one screen, little text. No sheets. v0.9.2: screens instead of cards, desktop first, read left to right; things appear and leave with a fade (no slide, no tilt).**
**v0.11: more map.** The HUD is one thin strip on top (goal, months, money, inbox, menu; the meters as small segment pills, tap one for the detail; the perks live in the run file). **The bottom bar is closed** and lies over the map when open: a parcel, the next plot or the end of the run open it by themselves; the **agenda** opens from its icon (speech bubble, bottom left, with the free slots); a new **event waits behind a blinking icon** — the map stays clear and in play until you tap it (or End month). Closed, the run file and End month float in the bottom corners. Esc or tapping the map closes the bar. The mayor's hints sit just above the open bar.
**Districts on the map (v0.11).** Every district (each 8×8 plot) has a placard with its type's icon and its name: at the centre when zoomed out — tap it for the district: type, buildings, homes, your parcels and its region combos (??? until discovered) — and a small one above its top corner when zoomed in, so it never covers the buildings.

- **The map fills the screen; the HUD floats over it.** First the goal: residents toward the target (with what holds growth back) and the months left as pips; then the money, the inbox and the menu. The meters sit below as five segments each (tap one for why it moved). The perks of the run are always on show, top right, like relics (tap one for what it does).
- **One bar at the bottom** that never opens or closes, only changes what it shows: the **run file** on the left (experience bar and level), a **strip of cards** in the middle and **End month** on the right (with the agenda slots as pips). The strip shows:
  - nothing selected → the **agenda** (urban plan, lunch with the mayor, consultation, report, repay) and the directive;
  - a parcel → what you can do there: *Buy* (banknotes) for land; for your land, one card per building you can build with its look on this very parcel (the road as the road tile, joined to its neighbours), cost, months and a combo badge (+1, −1, ? for undiscovered); *Sell*. Locked buildings are not shown (v0.9.2). A building under way shows its state; a finished one its name and the combos it makes. Every card has the same size, with its cost line at the bottom, always visible;
  - land that is not yours (old village, regional road, protected land) → what it is and does (the village: not for sale, gives access, its 10 old residents count toward the goal, building beside it annoys them) and the combos it makes with each building, with their signs;
  - a consolidated settlement (tap it on the map; hover with a mouse for its name and dividend) → its type, residents, the dividend it pays, its region combos and the combos across the edge;
  - picking a building shows it as a **ghost on the map**, the neighbours it would make combos with are outlined (gold, red, or dashed for unknown) and labelled, and **Request permit** sits next to it on the map;
  - choosing the next plot → the settlement type and one card per plot (side, region combos, what is on the land); the chosen plot gets an *Acquire* button on the map, beside its number (v0.9.3);
  - an **event** → the character, the headline and the choices as cards with their effects as chips; the full letter is one tap away (*Read the letter*). The outcome shows there too.
- **The inbox** (top right) lists what needs attention (tap one to go there) and the latest news; after each month the important news lines appear on the map and fade.
- **New combos are banners**, not letters; so are achievements, levels and promotions. Banners sit below the HUD and fade out on their own (or on tap). Letters remain for the appointment, each settlement's card, directives and official notices: since v0.9.2 they are **wide screens** (v0.9.3: the settlement's comes as slides — your goal, where you are, what is new, your perks — with Next, Back and Skip), speaker and message on the left, the facts (type, goal, rules in two columns, perks) on the right, buttons bottom right; they stack on narrow screens.
- **Screens build up (v0.10).** On every screen (the phase slides, the appointment, directives, notices, rewards, the pause screen, achievements and their grids) each element fades in with a slight rise about 70 ms after the previous one (long grids speed up); no rotation, no bounce. A tap or a key shows everything at once — it never makes you wait — and with *reduce motion* nothing animates. The mayor's hint bubble hides while any screen is open and comes back when it closes.
- **The town's name** is shown whole under the logo and can be renamed (tap it; a dice suggests another name). The phase number sits next to the goal.
- **Pause screen** (Esc or the menu button): *Continue · Settings · Restart · Abandon · Main menu*, in a row, nothing else. *Settings*: music, language, the mayor's guide and the controls. *Restart* and *Abandon* ask first and count as a lost run; *Abandon* shows the end-of-run summary.
- **The run file** ("Expediente", Tab key): full screen, four tabs. v0.9.2: each collection is a grid that fits the screen (10–12 cards a row on a desktop, fewer on narrower screens) and scrolls down; every card the same size, its whole text on tap. *Combos* — the collection, with filters; undiscovered ones show their two pieces as silhouettes. *Perks* — this run's hand and the whole pool, some locked by rank. *Career* — level, rank and grant bonus, the achievements and the 8 buildings to unlock, each with a progress bar. *Region* — the Euroregion map and this settlement in numbers.
- **The map is the whole Euroregion**, and only that: it grows with every phase, and all of it is in play (v0.10). Every plot has a thin white outline, and a dashed yellow line marks the plot this phase added; both are painted on the ground, under the buildings (v0.9.2). Months on the map (permits, works, developers) are crisp labels with a clock. Zoom out to see it all. **Combos glow, Kairosoft-style:** the buildings of a discovered combo get a pulsing outline, gold with sparkles for good combos and red for bad ones, including the neighbour's building across the edge. While choosing the next plot, the candidates are highlighted and numbered on the map and listed in a sheet (what each one borders, its region combos, what is on the land); a region minimap also appears in the Town sheet and on the consolidation and end-of-run cards.
- **Studio card and title screen:** the game opens on "Groenendaal", fading in on black and out (a tap skips it). The title screen is a full-screen scene — an animated diorama of the model town over a cheering crowd (the event illustrations' little people, a few waving flags of Europe) with six bureaucrats dancing beside the town, and the logo dancing letter by letter with sparkles — and a classic vertical menu: **New Game** (the first time, the tutorial from the 2×2 hamlet; after that a random run) · **Continue** (disabled with no save, pre-selected when there is one) · **Achievements** (v0.9.3: a full screen of grids — rank, level, XP and records in a band; the achievements and the buildings to unlock, the ones not earned yet as ???) · **Settings** (language, music, the mayor's hints, play the tutorial again) · **Credits**. No subtitles · **Credits** (author, music and font rights, a satire disclaimer). Version bottom-left, copyright bottom-right. Arrow keys / W-S move, Enter picks, Esc goes back. The design canvas holds the reference mockups of the four views.

## 15. Controls (iPad first)

Tap a parcel: the bottom bar shows what you can do there; tap it again (or empty ground) to let go. **Drag** (one finger or mouse) to move the map; **pinch**, mouse wheel or the +/− buttons to zoom; rotate and centre buttons. The bar scrolls sideways (the mouse wheel works on it too). On PC: **WASD / arrows** move, **+/−** zoom, **Q / E** turn the map a quarter (with a short fade; R still works), **C** centre, **Space** ends the month, **Enter** confirms the building picked, **Tab** opens the run file, **Esc** lets go, closes or pauses. Turn-based, so nothing is time-pressured on screen.

## 16. Open questions

- Does the length of a run (3–5 settlements, 30–60 min) feel right, or should settlements be shorter?
- Should consolidated settlements ever come back into play (a crisis next door, a merger)?
- Should residents have personalities and complaints (*Constructor*-style tenants)?
- Meta-progression beyond the catalogue and records: should anything else carry over between runs?
- Should player actions also become cards (favours, consultants, dirty tricks)?
- Member states with their own rule quirks (each a different bureaucracy).
- **Settlement traits: fixed or procedural?** Today each type has one fixed trait (Commuter town +60 homes…); the alternative is a trait generated per run (effects from a pool that fits the type, variable size, sometimes a drawback). Region combos depend on recognisable types. Next step: an atlas of settlement types to decide.
- **Accumulated territory** (see the roadmap's ideas): keep building on the whole region, with plots of a fixed size instead of 2×2 → 16×16. Undecided.
- **The old village as a living neighbour** that has stories, makes combos and grows into your land.
