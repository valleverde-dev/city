# EUROCRAT — Game Design Document

*Living document. v0.2 · Oct 25, 2026. Working title.*

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
1. You have **4 agenda slots** (your working time). Spend them on parcels (acquire, request permits) or on politics (lobby the mayor, public consultation, file a report).
2. Press **End month**. The world resolves: permits progress or get decided, construction advances, funds are spent, residents move in (or don't), meters drift, a random **event** may land, **directives** tick down.

### Parcel pipeline (the heart of the game)

```
Land ──acquire──▶ Owned ──request permit (type)──▶ Under review (N months)
                                                     ├─ Rejected → reapply
                                                     └─ Approved ─▶ Waiting for contractor ─▶ Under construction (M months) ─▶ Built
```

- **Acquire.** Private farmland has an owner and a price; owners may *hold out* (price jumps). Municipal land is cheap but needs the mayor (Local support ≥ 40). Protected habitat can never be built on. Flood-zone land costs extra to build on.
- **Permit.** Needs road access (next to a road). Review time depends on the building and on how angry the neighbours are. Approval chance depends on Local support, Neighbours and Compliance. Building next to the old village annoys its residents.
- **Construction.** Limited **contractors** (sites at the same time). Cost is paid month by month.

### Buildings (v0.2)

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

## 5. Resources

| Resource | Meaning | Pressure |
|---|---|---|
| **Funds (€M)** | The programme grant. | **Use it or lose it:** spending milestones at months 12 and 24; any shortfall is *decommitted* (taken back). Run out of money → game over. |
| **Agenda slots** | Your time: 4 per month. | Everything costs slots; politics competes with building. |
| **Local support** | The mayor and council. | Municipal land and permit approvals. Elections can reset it. |
| **Neighbours** | Public opinion in the area. | Slower permits, lawsuits; below 15 a court may annul the plan → game over. |
| **Compliance** | How happy the Commission is with your reporting. | Decays every month. Reports restore it. 0 → audit → game over. |
| **Contractors** | Simultaneous construction sites. | The real bottleneck late in the run. |

## 6. Directives (random missions)

Every few months the Commission issues a **directive**: an objective, a deadline and consequences. Examples: *"Absorption rate: spend €10M more within 5 months"*, *"Green Transition: deliver a park within 4 months"*, *"Stakeholder Engagement: hold a public consultation"*, *"KPI 3.2.b: 150 registered residents by month 18"*. Success → choose **1 of 3 perks**. Failure → a penalty (funds clawed back, compliance hit). **Fail 2 directives → programme suspended** (game over).

## 7. Events

Random notices, roughly every other month: archaeological remains halt a site; a protected toad turns a parcel into habitat; municipal elections replace the mayor; neighbours sue; construction costs rise; a strike pauses all sites; a Brussels delegation visits; national co-financing is delayed; the regional president inaugurates something unfinished.

## 8. Perks (roguelike build)

Picked 1 of 3 after each completed directive: *Friendly Notary* (cheaper land), *Fast-track Decree* (faster permits), *Prefab Supplier* (faster construction), *Extra Contractor*, *Cousin at the Ministry* (+1 agenda slot), *Translation Unit* (compliance decays slower), *Comms Agency* (neighbours improve monthly), *Local Fixer* (local support never drops below 30), *Golden Shovel* (one free construction)…

## 9. Winning and losing

- **Win — Inauguration:** reach **600 registered residents** before the programme ends (month 36). Score: residents, month, funds returned, perks.
- **Lose:** funds run out · compliance hits 0 (audit) · a court annuls the plan · 2 failed directives · month 36 without reaching the target ("The programme will be evaluated").
- **Difficulty:** hard by default. A first run is expected to fail; each run teaches the bureaucracy.

## 10. Roguelike variety

Each run is a new **site** (random farmland, municipal plots, protected habitat, flood zone, the old village), a new **member state and town name**, a random stream of events and directives, and a different set of perks.

Later: member states with their own rule quirks; meta-progression between runs (e.g. contacts you keep); more building types (logistics hub, data centre, social housing, tram); a campaign with an ending.

## 11. Art direction

From *Syndicate* neon to **Constructor-style** colourful isometric with a bureaucratic UI:
- Map: **isometric pixel art**, 64×32 px tiles shown at whole-pixel zoom steps (crisp, no blur). Bright European countryside: patchwork crop fields with hedges, a river with reed banks, woodland, an old village with a church; roads join automatically; the board sits on an earth slab. Buildings have a dark pixel outline and a soft shadow to the right (light from the upper left). Construction shows scaffolding and a tower crane; permits show a planning notice; approved plots get barrier tape. Pennants instead of flags — no real-world emblems.
- UI: a parody of an institutional e-government portal — white panels, institutional blue, yellow highlights, rubber stamps, reference numbers, "Your request is being processed".
- Icons: Material Icons (no emoji). System fonts (no runtime font downloads).

## 12. Controls (iPad first)

Tap a parcel to select it and see its actions. Pinch / mouse wheel to zoom. Rotate button for the view. No gesture panning or rotation. Turn-based, so nothing is time-pressured on screen.

## 13. Open questions

- Does the run length (36 months / ~12 min) feel right?
- Should residents have personalities and complaints (*Constructor*-style tenants)?
- Meta-progression: what carries over between runs, if anything?
- Is the darksynth soundtrack still right for the new tone?
