# EUROCRAT — Game Design Document

*Living document. v0.9 · Oct 29, 2026. Working title. Available in English and Spanish.*

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

v0.5 had four separate levels, which played like a campaign rather than a roguelike. Since v0.6 **a run is a single Euroregion** that grows. In v0.7 **the map grows with it**: there is no map waiting to be bought. The map is only the land the region has. Every new settlement **adds land onto the map**, next to the region, and you choose where, directly on the map. (v0.6.0 generated each settlement as a separate site; v0.6.1 tried a fixed *Cities: Skylines*-style world. Neither felt right.)

- The run starts with a **2×2 hamlet**: four parcels floating on the cadastral grid.
- Every time a settlement meets its target it is **consolidated**, and you add the next, bigger one: 4×4, 8×8, 16×16, then 16×16 again and again, each with a higher target. Any failure ends the run. There is no size limit.
- **New land continues the old one.** A regional road that reaches the edge of the region goes on across the new plot, and so does the river. Each plot from 4×4 up also brings its own regional road if none arrives, so there is always a way in. From 8×8 up it can also have a river, woods and wetlands (protected), and every plot from 4×4 has an old village by its road.

| Settlement | Plot | Goal | New rules | Can you lose? |
|---|---|---|---|---|
| I · Pilot Project (always a hamlet) | 2×2 | 100 residents in 8 months | Buy a parcel, build housing, end months | Only by running out of time |
| II · Expansion Phase | 4×4 | 250 in 14 months | Access (roads / built neighbours, also across the edge of the plot), permits can be rejected, the Mayor meter, jobs, combos, farmers holding out | Only by running out of time |
| III · Partial Plan | 8×8 | 420 in 24 months | Rustic land + urban plans, event cards, directives, neighbours, compliance, school and health, the bank | Yes |
| IV · Model Town | 16×16 | 1,100 in 36 months | Use-it-or-lose-it milestones, developers, property market | Yes |
| V, VI, … | 16×16 | +30% target each time (1,430 · 1,760 · …) | None: the same bureaucracy, harder | Yes |

**Consolidating** (target met):
- What you built is written into the world map. It stays exactly where it was, as part of the region, but you no longer build there.
- It keeps paying the region **half of the taxes it paid in play** (the regional dividend, added to every later month).
- **Brussels recovers 50% of the unspent funds**; the other half comes with you, on top of the next grant. Debt also comes with you.
- Then you get a **perk** (1 of 3). Perks last for the whole run.
- Finally you **choose where the new land goes, on the map.** Four plots are offered around the settlement you just finished, with their terrain already visible under a blue veil and numbered: north, east, south and west, in a pinwheel so they never overlap (each flush with a different corner, pushed further out if something is in the way). Tap one (on the map or in the list), see what it borders and what is on it (road, river, village, protected land), and acquire it: that land joins the map.

**Settlement types.** Every new settlement has a random type with its own trait: Farming town (land −25%), Industrial town (+80 jobs, neighbours −1/month), Commuter town (+60 homes), Spa town (faster move-ins, +taxes), University town (+200 school places, +taxes), Historic town (Mayor +1/month, permits +1 month), Logistics hub (+50 jobs, +taxes, neighbours −1/month). The first settlement is always a Hamlet.

**Where you attach matters, twice:**
1. **Region combos** between the type of the new settlement and the type of each settlement it touches. Good ones include Commuter Belt (commuter + industrial), Technology Transfer, Heritage Trail, Farm to Table, Campus Town, Freight Hub, Market Town and Rural Roots. Bad ones include Smokestack View (industrial + spa), Lorries in the Old Town, Slurry Season (farming + commuter), Rust Belt (two industrial towns), Sleeper Sprawl, Freshers' Week and The Hamlet Objects. They are **discovered** like building combos: the attach card shows "region combo?" until you have seen one. The catalogue persists between runs.
2. **The edge is real.** The parcels of the region around your plot are its neighbours. Regional roads, villages, any built land and the streets of the consolidated region **give access**, and they **form ordinary adjacency combos** with what you build on your side: their factory next to your housing is still "Smoke in the Living Room".
3. **The land itself.** Where the road runs, where the river and the woods are: you see it before you choose.

- Every settlement opens with a **settlement card** (its type, its region combos, the goal and "what is new") and, up to settlement IV, the **guide**.
- Rules that are not in play are **invisible**: no meter, tab or button for them.
- In settlements I–II you cannot order works you cannot pay for (money already promised to works is reserved), so there is no debt and no loan.
- **Between runs:** the combo catalogue (buildings and region) and the **records** (most settlements consolidated, largest Euroregion population). The title screen shows the best Euroregion.
- **Difficulty curve.** A greedy test bot plays 150 seeded runs. Settlements consolidated per run: 2 → 24% · 3 → 17% · 4 → 17% · 5 → 18% · 6 → 16% · 7+ → 8%, an average of about 4.1; most runs end in bankruptcy in the 16×16 settlements (debt carries over). Starting a settlement directly, with no perks: I 100% · II 100% · III ~59% · IV ~54%.

### Fair, not random (v0.7)

Playtest: the second settlement felt impossible and depended on luck (the bot averaged 3.6 rejected permits and 2 farmers raising prices per game). Now:
- **Permits are decided by political support, not dice.** Support (0–100) comes from the Mayor, the neighbours and compliance. A permit is approved if support is at least **50** when it is decided. The parcel sheet, the map badge (red) and the bell warn you in advance, and you can lobby or consult in time.
- **Stubborn owners are known from the start.** About a quarter of the farmland belongs to owners who ask 80% more; their parcels are marked "+80%" on the map (where you could build) and their price already includes it. No surprise raises, no lost actions.
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

- **Acquire.** Private farmland has an owner and a price; owners may *hold out* (price jumps). Municipal land is cheap but needs the mayor (Local support ≥ 40). Protected habitat can never be built on. Flood-zone land costs extra to build on.
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

**Unlockable buildings (v0.8)** — earned once through an achievement, available in every later run:

| Building | Unlocked by | Purpose |
|---|---|---|
| Market | First housing block | Some jobs and taxes, urban |
| Social housing | 2 settlements in a run | Many cheap homes; neighbours grumble; needs access |
| Library | 5 combos discovered | School places, neighbours like it |
| Police station | First lost run | Neighbours and local support up |
| Solar farm | 3 parks at once | Taxes from rustic land |
| Station | 3 settlements in a run | Some homes, residents move in faster |
| Data centre | Consolidate a settlement in debt | Taxes, few jobs, neighbours dislike it |
| Town hall | 5 permits approved | Local support; one per settlement |

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
| **Funds (€M)** | The programme grant (€130M), plus land sales and the tax share. | **Use it or lose it:** spending milestones at months 12 and 24 (20% / 50%); half of any shortfall is *decommitted*. Out of money → bridge loan. |
| **Debt** | The regional bank's bridge loans. | 2%/month interest; above €35M → game over. |
| **Agenda slots** | Your time: 3 per month. | Everything costs slots; politics competes with building. |
| **Local support** | The mayor and council. | Municipal land and permit approvals. Elections can reset it. |
| **Neighbours** | Public opinion in the area. | Slower permits, lawsuits; below 15 a court may annul the plan → game over. |
| **Compliance** | How happy the Commission is with your reporting. | Decays every month. Reports restore it. 0 → audit → game over. |
| **Contractors** | Simultaneous construction sites. | The real bottleneck late in the run. |

## 7. Directives (random missions)

Every few months the Commission issues a **directive**: an objective, a deadline and consequences. Examples: *"Absorption rate: spend €10M more within 5 months"*, *"Green Transition: deliver a park within 4 months"*, *"Stakeholder Engagement: hold a public consultation"*, *"KPI 3.2.b: 150 registered residents by month 18"*. Success → choose **1 of 3 perks**. Failure → a penalty (funds clawed back, compliance hit). **Fail 2 directives → programme suspended** (game over).

## 8. Event cards (dilemmas, not punishments)

Most months something happens. Each event arrives as a **card** told by a recurring **character**, with **2–3 choices** whose consequences are shown as chips (money, meters, months of delay, % risk). The affected parcel pulses on the map, and every character has its own sound.

Example — *Archaeological find* (Dr. Ottilie Steinbach, Heritage Office): **call the Heritage Office** (+3 months) · **pour concrete quietly** (35% risk: compliance −30, neighbours −15) · **build a little museum** (+2 months, −€1.5M, neighbours +10, mayor +5).

v0.3 deck (15): archaeological find, protected toad, municipal elections, neighbours' lawsuit, cost inflation, construction strike, Brussels delegation, delayed co-financing, premature inauguration, viral video, inheritance sale, new reporting template, developer offer, property crash, bank calls the loan, village fiesta.

**Characters:** Mayor Gilberto Plaza · Remedios Quintana (neighbours' association) · Dr. Ottilie Steinbach (Heritage) · Joost van der Formulier (DG HUF, Brussels) · Bruno Ladrillo (Ladrillo Holdings) · Konrad Grüngeld (Regional Savings Bank) · Paco Hormigón (construction union) · Benito Terrón (landowner).

### Making problems visible
- A **"What needs attention"** list at the top of the panel (tap an item to locate it on the map).
- Problem markers on the map (rejected permit, halted site, no access, paused developer, ruin).
- Tap a **meter** to see what it does and *why* it moved (last changes with their causes); ▲▼ shows last month's change.

## 9. Perks (roguelike build)

Picked 1 of 3 after each completed directive and after every consolidated settlement, and kept for the whole run: *Friendly Notary* (cheaper land), *Fast-track Decree* (faster permits), *Prefab Supplier* (faster construction), *Extra Contractor*, *Cousin at the Ministry* (+1 agenda slot), *Translation Unit* (compliance decays slower), *Comms Agency* (neighbours improve monthly), *Local Fixer* (local support never drops below 30), *Golden Shovel* (one free construction)… Since v0.9 the pool grows with your rank (see §10b), with four more: *Cohesion Funds*, *Tax Adviser*, *Ombudsman*, *Revolving Doors*. They are always on show in the HUD.

## 10. Winning and losing

- **A settlement is won** by reaching its resident target before its deadline: it is consolidated and the region grows. There is no final victory. The question is how big your Euroregion gets, measured in settlements consolidated and total population.
- **The run is lost** when: debt goes above the bank's limit · compliance hits 0 (audit) · a court annuls the plan · 2 directives fail · time runs out on a settlement ("The programme will be evaluated"). The end-of-run card shows the region map, what it reached and the records.
- **Difficulty:** hard but fair. Every loss should be traceable to a decision. See §4 for the bot's curve.

## 10b. The career (v0.8): why play again

What carries over between runs, apart from the combo catalogue and the records:
- **Experience, as you play** (v0.9): buying land +2, a permit +3, an approval +3, a finished building +6 (a street +1), a good combo formed +8, a combo discovered for the first time +25, each month +1, a consolidated settlement +100, a plot sold +4, an agenda action +1, an urban plan +4; each achievement its own XP; at the end of a run, +1 per 20 residents of the region. "+5 XP" rises from the run file and its bar fills.
- **Levels** (level n at 50·n·(n+1) XP: 100, 300, 600, 1,000…), announced with a banner, and **ranks** at levels 2, 4, 6, 8, 11, 14 and 18 (8 ranks: Trainee → Commissioner). Each rank above the first adds +4% to every settlement's grant.
- **Perks by rank:** the six basic perks are always in the pool; the others join it as you rise (Comms Agency and Professional Lobbyist at rank 1, Local Fixer and Golden Shovel at 2, then four new ones: *Cohesion Funds* (+15% of every grant) at 3, *Tax Adviser* (+25% taxes) at 4, *Ombudsman* (neighbours never below 25) at 5, *Revolving Doors* (plots sell for 30% more) at 6). The rank you had when the run began decides the pool.
- **26 achievements** (first stone, Kafka, Pelotazo, Bailout Denied, Mascot…), 8 of which unlock buildings (see §5). Banners announce them during play; the career file on the title screen lists them, with the condition of each locked one.
- **The tutorial runs once.** After it, *New Euroregion* deals **three dossiers**: a settlement type, a perk to start with and a member state. The guide can be turned back on in Settings.
- **Full-screen moments:** consolidation cuts a ribbon over confetti, then the *Union Gazette* reports it; game over stamps the dossier REJECTED and shreds it, then the Gazette and a summary of XP, promotions, achievements and unlocks.

## 11. Roguelike variety

Every run is a new **Euroregion**: a name, a chain of settlements with random types, member states and town names, procedural sites (farmland, municipal plots, protected habitat, a river with its flood zone, the old village by the regional road), the shape that your attach choices give the region, a random stream of events and directives, and a different set of perks.

Later: member states with their own rule quirks; more settlement types and region combos; cross-border events (a joint Interreg project, a border dispute between two of your settlements); missions that extend deadlines and chained events (v0.9).

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
| Settlement III · Partial Plan | *Regulatory Framework* | Tense office ambient: clock, typewriters, stamps, the Ode in minor |
| Settlement IV and later · Model Town | *Harmonised Trance Anthem* | Euro-trance: supersaws, choir breakdown, the drop |
| Settlement consolidated | *Douze Points for Harmonisation* | Eurovision schlager with the key change |

Later: short stingers for stamps, approvals, failed directives and audits; a tension layer for the last months of a settlement.

## 13. Language

English and Spanish, switchable at any time (HUD button, pause menu or Settings on the title screen); the choice is remembered. Every string lives in one dictionary (`web-prototype/src/i18n/strings.js`); logs and cards store keys, so switching language re-renders everything.

## 14. Interface

Pixel-art frame in the imagery of a (fictional) Union portal: pixel fonts for titles, figures, buttons and stamps; a crisp system sans at 15–16px for everything you read.

**v0.9: everything on one screen, sideways, little text. No sheets.**
- **The map fills the screen; the HUD floats over it.** First the goal: residents toward the target (with what holds growth back) and the months left as pips; then the money, the inbox and the menu. The meters sit below as five segments each (tap one for why it moved). The perks of the run are always on show, top right, like relics (tap one for what it does).
- **One bar at the bottom** that never opens or closes, only changes what it shows: the **run file** on the left (experience bar and level), a **strip of cards** in the middle and **End month** on the right (with the agenda slots as pips). The strip shows:
  - nothing selected → the **agenda** (urban plan, lunch with the mayor, consultation, report, repay) and the directive;
  - a parcel → what you can do there: *Buy* for land; for your land, one card per building with its look on this very parcel, cost, months and a combo badge (+1, −1, ? for undiscovered); locked buildings appear dark with how to unlock them; *Sell*. A building under way shows its state; a finished one its name and the combos it makes;
  - picking a building shows it as a **ghost on the map**, the neighbours it would make combos with are outlined (gold, red, or dashed for unknown) and labelled, and **Request permit** sits next to it on the map;
  - choosing the next plot → the settlement type and one card per plot (side, region combos, what is on the land), plus *Acquire*;
  - an **event** → the character, the headline and the choices as cards with their effects as chips; the full letter is one tap away (*Read the letter*). The outcome shows there too.
- **The inbox** (top right) lists what needs attention (tap one to go there) and the latest news; after each month the important news lines appear on the map and fade.
- **New combos are banners**, not letters; so are achievements, levels and promotions. Letters remain for the appointment, each settlement's card, directives and official notices, and they are shorter.
- **The run file** ("Expediente", E key): full screen, four tabs, everything scrolls sideways. *Combos* — the collection, with filters; undiscovered ones show their two pieces as silhouettes. *Perks* — this run's hand and the whole pool, some locked by rank. *Career* — level, rank and grant bonus, the achievements and the 8 buildings to unlock, each with a progress bar. *Region* — the Euroregion map and this settlement in numbers.
- **The map is the whole Euroregion**, and only that: it grows with every settlement. Consolidated settlements have a thin white outline, and a dashed yellow line marks the plot in play. Zoom out to see it all. **Combos glow, Kairosoft-style:** the buildings of a discovered combo get a pulsing outline, gold with sparkles for good combos and red for bad ones, including the neighbour's building across the edge. While choosing the next plot, the candidates are highlighted and numbered on the map and listed in a sheet (what each one borders, its region combos, what is on the land); a region minimap also appears in the Town sheet and on the consolidation and end-of-run cards.
- **Title screen:** a full-screen scene — an animated diorama of the model town over an avenue of waving flags of the Union — with the logo and a classic vertical menu: **New Euroregion** (starts a run from the 2×2 hamlet; shows the best Euroregion so far) · **Continue** (disabled with no save, pre-selected when there is one) · **Settings** (language, music) · **Credits** (author, music and font rights, a satire disclaimer). Version bottom-left, copyright bottom-right. Arrow keys / W-S move, Enter picks, Esc goes back. The design canvas holds the reference mockups of the four views.

## 15. Controls (iPad first)

Tap a parcel: the bottom bar shows what you can do there; tap it again (or empty ground) to let go. **Drag** (one finger or mouse) to move the map; **pinch**, mouse wheel or the +/− buttons to zoom; rotate and centre buttons. The bar scrolls sideways (the mouse wheel works on it too). On PC: **WASD / arrows** move, **+/−** zoom, **R** rotate, **C** centre, **Space** ends the month, **Enter** confirms the building picked, **E** opens the run file, **Esc** lets go, closes or pauses. Turn-based, so nothing is time-pressured on screen.

## 16. Open questions

- Does the length of a run (3–5 settlements, 30–60 min) feel right, or should settlements be shorter?
- Should consolidated settlements ever come back into play (a crisis next door, a merger)?
- Should residents have personalities and complaints (*Constructor*-style tenants)?
- Meta-progression beyond the catalogue and records: should anything else carry over between runs?
- Should player actions also become cards (favours, consultants, dirty tricks)?
- Member states with their own rule quirks (each a different bureaucracy).
