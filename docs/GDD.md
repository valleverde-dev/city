# EUROCRAT — Game Design Document

*Living document. v0.3 · Oct 25, 2026. Working title. Available in English and Spanish.*

> Every city builder is a dictatorship: you click, a house appears, people move in.
> **Eurocrat** asks what building a new town would *really* take in contemporary Europe —
> and plays the answer for laughs.

## 1. Pitch

A satirical, turn-based **roguelike city builder**. You are a mid-level official sent from Brussels to deliver a brand-new "model European town" in a member state. You have a lot of money and almost no power: the land belongs to farmers and the municipality, permits are local, the mayor wants credit, the neighbours want nothing to change, and the Commission wants reports. Oh — and the funds expire.

References: *Constructor* (1997) for the humour, characters and dirty tricks; *Into the Breach* / *Slay the Spire* for short, hard, replayable runs with build-defining choices; *Papers, Please* for bureaucracy as gameplay.

## 2. Tone

- **Hyper-realistic premise, comic execution.** Every mechanic mirrors something that actually happens (land holdouts, zoning, permits, objections, archaeological finds, protected species, elections, use-it-or-lose-it funding, audits).
- **Laugh at everyone.** The Commission (acronyms, KPIs, forms), the national government, the mayor, the developer, the NIMBY neighbour — and the player. The satire should make people think, not preach.
- **Fictional institutions only.** No real EU names, flags or emblems (legal + store-review risk). We parody: *The Union*, *DG HUF — Directorate-General for Harmonised Urban Futures*, the *MOTHER* programme (*Model Town for Harmonised European Resilience*), fictional member states (Valdoria, Brennmark, Esterra…).

## 3. The player

**Programme Officer, DG HUF.** Not a mayor, not a god. You can buy land, file paperwork, lobby, consult and report. You cannot simply build: every building needs land, a permit, contractors and time — and someone has to want to live there.

## 4. Core loop

One turn = **one month**. A run (one programme) = **36 months** ≈ 10–15 minutes.

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
- **Permit.** Needs road access: a road on any of the **8 neighbours** (diagonals count). Review time depends on the building and on how angry the neighbours are. Approval chance depends on Local support, Neighbours and Compliance. Building next to the old village annoys its residents.
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

## 5. Resources

| Resource | Meaning | Pressure |
|---|---|---|
| **Funds (€M)** | The programme grant (€130M), plus land sales and the tax share. | **Use it or lose it:** spending milestones at months 12 and 24 (20% / 50%); half of any shortfall is *decommitted*. Out of money → bridge loan. |
| **Debt** | The regional bank's bridge loans. | 2%/month interest; above €35M → game over. |
| **Agenda slots** | Your time: 3 per month. | Everything costs slots; politics competes with building. |
| **Local support** | The mayor and council. | Municipal land and permit approvals. Elections can reset it. |
| **Neighbours** | Public opinion in the area. | Slower permits, lawsuits; below 15 a court may annul the plan → game over. |
| **Compliance** | How happy the Commission is with your reporting. | Decays every month. Reports restore it. 0 → audit → game over. |
| **Contractors** | Simultaneous construction sites. | The real bottleneck late in the run. |

## 6. Directives (random missions)

Every few months the Commission issues a **directive**: an objective, a deadline and consequences. Examples: *"Absorption rate: spend €10M more within 5 months"*, *"Green Transition: deliver a park within 4 months"*, *"Stakeholder Engagement: hold a public consultation"*, *"KPI 3.2.b: 150 registered residents by month 18"*. Success → choose **1 of 3 perks**. Failure → a penalty (funds clawed back, compliance hit). **Fail 2 directives → programme suspended** (game over).

## 7. Event cards (dilemmas, not punishments)

Most months something happens. Each event arrives as a **card** told by a recurring **character**, with **2–3 choices** whose consequences are shown as chips (money, meters, months of delay, % risk). The affected parcel pulses on the map, and every character has its own sound.

Example — *Archaeological find* (Dr. Ottilie Steinbach, Heritage Office): **call the Heritage Office** (+3 months) · **pour concrete quietly** (35% risk: compliance −30, neighbours −15) · **build a little museum** (+2 months, −€1.5M, neighbours +10, mayor +5).

v0.3 deck (15): archaeological find, protected toad, municipal elections, neighbours' lawsuit, cost inflation, construction strike, Brussels delegation, delayed co-financing, premature inauguration, viral video, inheritance sale, new reporting template, developer offer, property crash, bank calls the loan, village fiesta.

**Characters:** Mayor Gilberto Plaza · Remedios Quintana (neighbours' association) · Dr. Ottilie Steinbach (Heritage) · Joost van der Formulier (DG HUF, Brussels) · Bruno Ladrillo (Ladrillo Holdings) · Konrad Grüngeld (Regional Savings Bank) · Paco Hormigón (construction union) · Benito Terrón (landowner).

### Making problems visible
- A **"What needs attention"** list at the top of the panel (tap an item to locate it on the map).
- Problem markers on the map (rejected permit, halted site, no access, paused developer, ruin).
- Tap a **meter** to see what it does and *why* it moved (last changes with their causes); ▲▼ shows last month's change.

## 8. Perks (roguelike build)

Picked 1 of 3 after each completed directive: *Friendly Notary* (cheaper land), *Fast-track Decree* (faster permits), *Prefab Supplier* (faster construction), *Extra Contractor*, *Cousin at the Ministry* (+1 agenda slot), *Translation Unit* (compliance decays slower), *Comms Agency* (neighbours improve monthly), *Local Fixer* (local support never drops below 30), *Golden Shovel* (one free construction)…

## 9. Winning and losing

- **Win — Inauguration:** reach **700 registered residents** before the programme ends (month 36). Score: residents, month, funds left minus debt, directives met.
- **Lose:** debt above the bank's limit · compliance hits 0 (audit) · a court annuls the plan · 2 failed directives · month 36 without reaching the target ("The programme will be evaluated").
- **Difficulty:** hard but fair. A greedy test bot that always picks the "by the book" option and never sells land wins ~37% of 200 seeded runs (v0.2: 8%); its losses are spread across bankruptcy, suspension and timeout. Every loss should be traceable to a decision.

## 10. Roguelike variety

Each run is a new **site** on a **12×12** map (random farmland, municipal plots, protected habitat, flood zone, the old village), a new **member state and town name**, a random stream of events and directives, and a different set of perks.

Later: member states with their own rule quirks; meta-progression between runs (e.g. contacts you keep); more building types (logistics hub, data centre, social housing, tram); a campaign with an ending.

## 11. Art direction

From *Syndicate* neon to **Constructor-style** colourful isometric with a bureaucratic UI:
- Map: **isometric pixel art**, 64×32 px tiles shown at whole-pixel zoom steps (crisp, no blur). Bright European countryside: patchwork crop fields with hedges, a river with reed banks, woodland, an old village with a church; roads join automatically; the board sits on an earth slab. Buildings have a dark pixel outline and a soft shadow to the right (light from the upper left). Construction shows scaffolding and a tower crane; permits show a planning notice; approved plots get barrier tape. Pennants instead of flags — no real-world emblems.
- UI: a **pixel-art parody of an institutional portal of "the Union"**, in the imagery of Brussels institutions but with nothing real: institutional blue `#163f94`, navy ink `#0b1f4d`, Union yellow `#ffd200`, document paper `#fbf8ee`. A fictional emblem (yellow portico on blue, no stars). Hard 2–3 px borders, offset shadows and raised keys instead of rounded corners and blur; segmented meters; case-file cards; official letters with letterhead, "Brussels · M7" date line, reference numbers and stamps; a title screen with an "official website of the Union — How do you know?" banner; the map sits on a cadastral grid.
- Type: **Jersey 10** (titles, figures, buttons), **Pixelify Sans** (UI and body text), **Silkscreen** (stamps, reference numbers). All SIL OFL, subset and embedded.
- Icons: 66 hand-drawn **12×12 one-colour pixel icons**, tinted with the text colour (no emoji, no icon font). Character portraits are rasterised to 32×32 and outlined.

## 12. Language

English and Spanish, switchable at any time (HUD button or menus); the choice is remembered. Every string lives in one dictionary (`I18N` in `index.html`); logs and cards store keys, so switching language re-renders everything.

## 13. Controls (iPad first)

Tap a parcel to select it and see its actions. Pinch / mouse wheel to zoom. Rotate button for the view. No gesture panning or rotation. Turn-based, so nothing is time-pressured on screen.

## 14. Open questions

- Does the run length (36 months / ~12 min) feel right?
- Should residents have personalities and complaints (*Constructor*-style tenants)?
- Meta-progression: what carries over between runs, if anything?
- Should player actions also become cards (favours, consultants, dirty tricks)?
- Member states with their own rule quirks (each a different bureaucracy).
