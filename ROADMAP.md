# Roadmap — Eurocrat

Living project document · update it as the prototype evolves. The game design lives in [docs/GDD.md](docs/GDD.md).

## Overview

**Eurocrat** (working title): a satirical, turn-based roguelike city builder. You are a Brussels programme officer who must deliver a model European town with plenty of money and no power — buy the land, file the permits, survive the neighbours, spend the funds before they expire. Tone and references: *Constructor* (1997), with a hyper-realistic, comic look at how building actually works in contemporary Europe. The plan: validate the loop in the web/iPad prototype, then port to Godot to ship on the App Store and Steam.

## Current status — v0.11.0 (Nov 2, 2026) · more map, more dealing with people

- **Minimal HUD.** One thin strip on top (goal, months, money, inbox, menu; the meters as small pills you tap). The bottom bar is closed and opens over the map only when something asks for it: a parcel, the next plot, the end of the run — or its icon: the **agenda** (speech bubble, bottom left, with the free slots). **Events wait behind a blinking icon** (or End month) instead of covering the map. Closed, the run file and End month float in the corners; Esc or tapping the map closes the bar; the mayor's hints sit above it.
- **Districts on the map.** Every district has a placard with its type's icon and name — at the centre when zoomed out (tap it: type, buildings, homes, your parcels, region combos, ??? until discovered), small above its top corner when zoomed in.
- **Negotiating with stubborn owners.** Once met: lean on them through the mayor (halves the markup; Mayor −10), expropriate (base price, neighbours −12, yours in 4 months) or leave them in peace (neighbours +3).
- **Gossip at the village bar.** An agenda action once a month (a slot and a round): the regulars name stubborn owners before you meet them — more when the neighbours are happy, none when they are angry — and about a quarter of it is false.
- Tests: 26 rules tests, browser checks all green.

### v0.11.0 playtest fixes (Nov 3, 2026)

- **HUD on iPad:** the Eurocrat logo is back above the city's name; "months left" is readable (18 px, navy); the run file, the agenda and End month share one height with room above and below their contents (the rank shows on two lines under the level); the map buttons keep clear of End month, safe area included.
- **Phones in landscape:** a compact layout for short screens (HUD, corner buttons and the open bar a size smaller — the open bar takes about 40% of the height instead of 60%).
- **Gold offers explained:** a line on the reward screen says that gold offers give more and why they were earned (ahead of schedule · no debt · combos galore — all three also bring a fourth offer), and each gold card shows what gold adds ("2 instead of 1"). The deputy mayor is never gold (it added nothing).
- **The perk collection counts the perks you have discovered** (as combos do), not the ones your rank allows.
- **Every event has an illustration:** 43 pixel-art scenes (160×90, painted in code with the game's palette, lightly animated: smoke, blinks, flags, flashes, fireworks), above the story; on short landscape screens, beside it.
- **Flood zones are rivers now:** water cannot be bought or built on (it was cheap land at +50% building cost). **The river can grow:** a new event (*The river is rising*, phase III on) — sandbags (−€0.4M, neighbours +2) or let the river take the empty parcel(s) on its bank, yours included.
- Tests: 27 rules tests, 196 browser checks. Balance (bot, 40 runs): 3.8 milestones per run with a new career.

## Previous — v0.10.2 (Nov 2, 2026) · discover, don't be told

The player has to discover and explore: **no screen shows what comes next.**
- **No targets ahead.** *Próximos objetivos* (the ladder of targets) is gone from the phase screen and from *Run file → Region*. Locked things are only ???: no level to reach, no XP bar, no hint of the rank or the name of the next one. The collection counters and the XP of each achievement stay.
- **Everything from phase I:** roads and access (a leftover of the 2×2 hamlet had kept them for phase II), **combos** and **bankruptcy** (debt over the limit ends the programme). Audits and failed directives still arrive in phase III.
- **How you lose, said clearly.** The goal slide of phases I–II: "If time runs out, or your debt goes over the limit, the programme ends." From phase III: "…and an audit, or two failed directives, also end it."
- **Game-over music:** *Programme Closed (Ode in D minor)* — the Ode to Joy, slow (63 BPM) and minor, on an out-of-tune tuba, the B section on a thin accordion, and a sad trombone "wah-wah-wah-waaah" before it loops. It starts with the stamp, plays softly under the Gazette and the summary, and gives way to the menu theme only back at the main menu. Abandoning a run plays it too.
- **Combos have a sound of their own** and a flash on the map: good, a bright rising arpeggio; bad, a comic falling "tuu-tuu"; the first discovery, the long version and the mayor's voice; a combo you already know, short and soft; several at once, each a little higher. The buildings flash white, then gold or red, and throw sparkles.
- **Tap an achievement medal** in *Run file → Career* to see what it is: earned, its name, description and XP; not earned, ??? and its XP.
- **"XP" everywhere** (no more "PX" in Spanish).
- **The Gazette with a single plot** shows only the residents reached (no plots or region count).
- **Stubborn owners ask +50…150%** — a different markup per parcel, rolled once, and shown only when you meet the owner (it was always +80%).
- **The founding district carries the city's name** (and follows it when the city is renamed, unless it has a name of its own).
- **Perks never taken are ???** in *Run file → Perks* (a locked one says only the rank it needs).
- **No Euroregion box** in *Run file → Region* while there is only the first plot.
- Balance (bot, 60 runs): about 3.6 milestones per run with a new career and 5.2 with a career that keeps playing; phases I and II are still always won. Tests: 24 rules tests, 177 browser checks.

## Previous — v0.10.1 (Nov 1, 2026) · new music

- **Phase III has a new theme:** *Lobby Bossa (Floor 7, Please)*, an elevator bossa nova. The old one (*Regulatory Framework*, a tense office ambient in D minor) was too sad and killed the mood.
- **From phase V on, a random new track per phase:** *Your Call Is Important to Us* (hold music), *Sunny Subsidy* (ambient house), *Plenary Session (Hands Up!)* (cheap Eurodance) or *Italo Directive* (80s Italo disco). The draw is fixed per run and phase (pausing or reloading keeps it) and never repeats the phase before.
- Phases I, II and IV keep their themes.

And the playtest feedback on v0.10:
- **Every free spot is offered.** When a milestone is reached, every 8×8 spot touching the region is on offer (it was capped at four), numbered clockwise from north.
- **Screens build up slower:** each element takes 1 s, 150 ms after the previous one (long grids speed up after the eighth). A tap or a key still shows everything. **Menus never cascade** (pause, settings, confirmations).
- **Undiscovered combos stay secret:** in the run file they are ??? (no name, no pieces, no silhouettes); land that is not yours lists only the combos you have discovered; unknown region combos are not mentioned on the plot cards or the phase screen. The "?" badge on a building card and "combo?" beside the ghost stay (they hint that building *there* would make something).
- **Districts.** Every plot is a district of the city, with its own name: on the map when zoomed out, next to the parcel reference in the bar, and listed in *Run file → Region*, where each can be renamed. Later districts get their own names.
- **Stubborn owners show up in person** when you go for their land: a scene with their face, name, who they are, their complaint and their price, in their voice. Nothing gives them away before (no "+%" on the map); after, the parcel carries an owner mark.
- **Events in two steps:** first the scene (the character and the whole story), then *Decide* — the choices as large decision cards with their effects — and a short outcome screen with its stamp. The story can be read again before deciding.
- **Synthesized voices.** Every character speaks a babble with their own timbre (pitch, speed, vowels, roughness), plus a gesture for the mood (a cough, "hmpf", a laugh, a shout, a sigh). *Settings → Voices* switches them off. Recorded voices can replace a character later without touching anything else.
- **Phase introductions rewritten** as a story that goes on: what just happened (early, just in time, with many combos, in debt, with angry neighbours — and who says it: the mayor, Brussels, the banker or Remedios), then why the new rules arrive, told in the story (phases II–IV), or one of ten lines that never repeat in a run (phase V on). The new district says hello on the "Where you are" slide.
- Balance (bot, 60 runs): about 3.8 milestones per run with a new career (v0.10: 3.7) and 5.4 with a career that keeps playing (v0.10: 4.9); phase I is still always won. Tests: 23 rules tests, 167 browser checks.

## Previous — v0.10.0 (Oct 31, 2026) · the region you keep building

The feedback from the v0.9 playtest, in one version:
- **Accumulated territory.** A run starts with **one 8×8 plot** (no 2×2 hamlet). Each milestone adds **another 8×8 plot** next to the region, chosen on the map, and **the whole region stays in play**: you keep building anywhere, the people and taxes stay. The target is one visible rule, **parcels × density** (density 4, 5, 6, 7… → 256, 640, 1,152, 1,792, 2,560…), and the phase screen and *Run file → Region* show the next three targets. Each phase releases its own **grant tranche** and months; a milestone keeps 40% of the unspent money. Technically the grid is the region's bounding square, with *void* cells outside the plots; save format v11.
- **Milestone rewards (A).** Three offers, each brought by a character: a perk, bridge funding, a deputy mayor (+1 agenda slot for good), pre-approved permits, land in the next plot, a good press day, debt restructuring, an expert report that reveals a combo. Some come as **deals with a catch** (more, and a meter pays). Reaching the milestone early, without debt or with 3+ combos makes offers **gold**; all three add a fourth offer.
- **No tutorial hamlet (B).** The first run is a normal first plot (a farming town, no perk) with the mayor's hints, which introduce each rule as it switches on. Every run starts at phase I; phases are numbered from I.
- **Deals, extensions and 26 new events.** The characters offer **deals** (build 2 housing blocks, file 2 reports, a park, 3 works at once, sell a plot, stay out of debt) that give **more months** or money, or cost goodwill if broken. From phase III you can **ask Brussels for an extension** (2 slots, compliance −10; +3 months if compliance stays ≥45; once per phase). New events **between plots** (the old district complains, bus strike, shared health centre, derby, boundary dispute, twinning), **chained** ones (consultants → their roadmap, the mayor's cousin → the jacuzzi, a journalist → the front page, e-scooters → chaos, a heritage survey → its findings) and a few standalone (potholes, heatwave, film crew, audit): 42 in all.
- **Screens build up (C).** On every screen each element fades in with a slight rise ~70 ms after the previous one; a tap or a key shows all at once; nothing animates with *reduce motion*.
- **Fix:** the mayor's hint bubble no longer peeks out behind open screens.
- Balance (bot, 60 runs): about 3.7 milestones per run with a new career, 4.9 with a career that keeps playing. Tests: 22 rules tests, 153 browser checks.

## Previous — v0.9.3 (Oct 31, 2026) · UX fixes from the iPad playtest

Interface only; the rules do not change (gameplay goes to v0.10):
- **Bottom bar on iPad:** the home-indicator area was added twice (by the page and by the bar), leaving a band under it; now the bar takes the larger of its own margin and the safe area, never both.
- **Cards keep their inner margin:** the cost line sits on the same baseline in every card with a fixed margin below it (the cards are a grid of fixed rows; in Safari, a clamped title pushed the cost into the margin). The whole text on hover.
- **Choosing the next plot:** the *Acquire plot N* button appears on the map beside the chosen plot (✓ / ✕, Enter confirms), like *Request permit*; the bar keeps the type and one card per plot, with the land on each at a legible size.
- **The settlement screen in slides:** your goal · where you are (type, neighbours and their region combos, funds carried) · what is new · your perks — one at a time with *Next* (*Get to work* on the last), *Back*, *Skip*, dots; → / Enter, ←, Esc. Empty slides are skipped.
- **Main menu:** *New Game · Continue · Achievements · Settings · Credits*, no subtitles. *Career file* is now *Achievements*, in the run file too.
- **Achievements screen:** full screen, read across — rank, level, XP, grant bonus and records in one band; then the achievements and the buildings to unlock as grids. What you have not earned shows **???** (no name, no description); buildings sorted by level. The run count no longer reads 0 next to a record (the records counted runs before the career existed).
- **Settings:** *Mayor's guide* is now *Mayor's hints* (the step-by-step tips), with a speech-bubble icon.
- **Sound on iPad:** audio is unlocked on a complete tap (touchend / click, not pointerdown) and retried until it really runs, the session is declared as media playback (so the silent mode does not mute it) and the music resumes after the app comes back. If the sound is still blocked, Settings says *Tap to enable the sound*.
- Tests: 20 rules tests, 144 browser checks.

## Previous — v0.9.2 (Oct 29, 2026) · playtest polish: a random start, screens instead of cards, progression that takes time

Playtest feedback on v0.9 (19 points), applied:
- **No dossier to choose.** After the tutorial, *New Euroregion* starts a random run at once: settlement type, starting perk (from your rank's pool) and member state are drawn and revealed on the settlement screen. The tutorial can be played again from *Settings*.
- **Buildings unlock by career level, not by achievements** (the old achievements were met in the first run, so almost everything was unlocked at once): market 2, library 3, police station 5, social housing 7, town hall 9, solar farm 11, station 14, data centre 18. The level curve is steeper (level n at 350·n·(n+1) XP): about one level per run, level ~6 after 5 runs, ~15 after 20. Achievements still give XP. A level-up or promotion banner says what it brings (building, perks, grant bonus).
- **Locked buildings are no longer in the bar**; their level and progress are in *Run file → Career*.
- **Screens, not cards.** Letters (appointment, settlement, directives, notices) are wide screens read left to right — speaker, title and what they say on the left; goal, type, rules and perks on the right; buttons bottom right — and stack on narrow screens. They **fade** in and out. (The tilt was a bug: three CSS animations shared the name `slam`, and the stamp's rotation won.)
- **Pause screen:** *Continue · Settings · Restart · Abandon · Main menu*, nothing else. *Settings* holds music, language, the mayor's guide and the controls. *Restart* and *Abandon* ask first; both count as a lost run (career settled, records kept).
- **Banners fade out on their own** (or on tap) and sit below the HUD. (Bug: they slid up by only 140% of their height from 150 px, so they stayed on screen over the HUD.)
- **The bottom bar:** same margin above and below the cards, no scrollbar eating it; every card has the cost line anchored at the bottom, never cut; **Buy** shows banknotes; the **Road** card shows the road tile, joined as it would be on that parcel.
- **Map labels** (months under review / building / developers) are drawn crisp in screen pixels with a clock instead of "m", so a 2 never reads as an 8. The plot's dashed border and the consolidated settlements' outlines are painted on the ground, under the buildings.
- **Land that is not yours explains itself:** the old village (not for sale, gives access, its 10 old residents count toward the goal, building beside it annoys its residents, and its combos with their signs), the regional road, protected land.
- **Consolidated settlements:** tap one to see it in the bar (type, residents, dividend, region combos and combos across the edge); with a mouse, hover for its name and dividend.
- **The town's name** is shown whole under the logo and can be **renamed** (tap it; a dice suggests another). The settlement number moved next to the goal.
- **Run file:** one grid that fits the screen (10–12 cards a row on a desktop, fewer on smaller screens), scrolling down; every card the same size, the whole text on tap. The tabs no longer leave the screen.
- **Controls:** **Q / E** turn the map a quarter (with a short fade; R still works), **Tab** opens the run file.
- Balance (bot, 200 runs): a brand-new career averages ~3.5 settlements per run (unchanged); a career that keeps playing ~5.2 (v0.9: 5.3, ranks now come later).
- Tests: 20 rules tests, 139 browser checks (+ random start, unlock levels, bar margins, road art, land and consolidated cards, Q/E, Tab, banners leaving, rename, pause screen, abandon).

**Pending from that playtest:** whether settlement types keep fixed traits or get procedural ones. First step: an *atlas of settlement types* (traits, region combos, audit), like the events atlas, to decide with it in front of us.

## Previous — v0.9.1 (Oct 29, 2026) · a livelier title screen

A small update on top of v0.9.0, no rule changes:
- **Dancing rays.** The light rays behind the logo have their own layer now: the fan sways and slowly turns, each ray breathes and flickers out of step with the others, and a halo pulses behind the logo. Still pixel art (three dithered light levels).
- **Animated logo.** It floats in whole-pixel steps, its glow breathes, and every few seconds a warm glint sweeps across the letters (masked to the letter faces, so the outline stays clean).
- Reduced motion: static rays, still logo.

## Previous — v0.9.0 (Oct 29, 2026) · a new interface: everything on one screen, sideways; live experience

Playtest feedback on v0.8: the UI was ugly and vertical (cards stacked in a side "sheet"), too much text, a glitch every time a sheet appeared (it closed and slid in again on every tap, and the guide bubble jumped in again on every action), and no place to see combos, experience and perks the roguelike way. Designed first as a mockup (iPad and iPhone), approved, then built:
- **No more sheets.** The map fills the screen and the **HUD floats over it**: the goal (residents, what holds growth back, months as pips) and the money first, the meters as segments, the perks always on show as **relics**.
- **One bottom bar** that never opens or closes: the **run file** (experience bar and level) · a **strip of cards** that changes with what you do · **End month** (agenda slots as pips). Nothing selected: the agenda and the directive. A parcel: buy, or one card per building (its look on this parcel, cost, months, a combo badge), locked ones dark with how to unlock them, sell. **Picking a building shows a ghost on the map** with the combos it would make outlined and labelled, and **Request permit** next to it. The next plot: one card per plot. **Events take the bar**: character, headline, choices with their effects as chips; the letter is one tap away. Everything scrolls sideways.
- **The run file ("Expediente")**, full screen, four tabs: *Combos* (the collection, filters, silhouettes for the undiscovered), *Perks* (this run's hand and the pool), *Career* (level, rank, achievements, the buildings to unlock with progress bars), *Region* (map and numbers).
- **Less text:** new combos are banners, not letters; the inbox is a small panel (what needs attention + news), and the month's news appear on the map and fade; shorter appointment letter, settlement rules and guide.
- **Live experience:** every step gives XP (+2 land, +3 permit, +6 building, +25 a new combo, +100 a settlement…), with **levels** (100, 300, 600, 1,000… XP) and **ranks** at certain levels; "+5 XP" rises from the run file and level-ups pop as banners.
- **Perks by rank:** six basic perks to start; the rest join the pool as you rise, plus four new ones (*Cohesion Funds*, *Tax Adviser*, *Ombudsman*, *Revolving Doors*). The pool is the one of the rank you had when the run began.
- Balance (bot, 200 runs): a brand-new career (rank 0, six perks) averages ~3.5 settlements per run (v0.8 had every perk from the start: ~4.1); a career that keeps playing averages ~5.3.
- Tests: 20 rules tests (+ live XP and levels, perks by rank and the new perks), 121 browser checks rewritten for the bar, the ghost and confirm, the run file and the inbox.

## Previous — v0.8.0 (Oct 28, 2026) · the civil servant's career, full-screen moments

Playtest feedback on v0.7: little reason to replay, too few buildings, the tutorial got in the way, wins and losses were small cards.
- **A career that carries over.** Every run gives experience (100 per settlement + residents/20, plus achievements), even a lost one. Experience raises your **rank** (8 ranks, from Trainee to Director-General); each rank adds +4% to every settlement's grant.
- **26 achievements**, checked at month end, consolidation and game over. 8 of them **unlock buildings for good**: market (first housing), social housing (2 settlements), library (5 combos), police station (first lost run), solar farm (3 parks), station (3 settlements), data centre (consolidate in debt), town hall (5 approved permits). Locked buildings show in the build list with how to unlock them.
- **8 new buildings** with their own pixel art and icons, and **14 new combos** around them (Market Street, Green Cloud, Plaza Mayor, Glare, Server Hum…).
- **Tutorial only once.** The first run is guided; after that *New Euroregion* offers a **quick start**: three dossiers (settlement type + perk + country) to draft from. The guide can be switched back on in Settings.
- **Career file** on the title screen: rank, XP bar, achievements and unlocks.
- **Full-screen moments.** Consolidating a settlement cuts a ribbon over a confetti sky, then the *Union Gazette* spins in with the headline. Losing stamps the dossier REJECTED, shakes the screen and feeds it to a shredder, then shows the Gazette and the run's summary: XP gained, promotions, achievements and unlocks. Achievements, unlocks and promotions also pop as banners during play.
- Balance unchanged (bot, 200 runs, no rank bonus): ~4.1 settlements per run.
- Tests: 18 rules tests, 113 browser checks.

## Previous — v0.7.0 (Oct 27, 2026) · the map grows with the region, fair rules, glowing combos

Playtest feedback on v0.6.1: the fixed world felt like buying land on a map that already exists, not building a region; the second settlement was too hard and too random; combo links looked odd.
- **The map grows with the region.** No world in advance: the map is the land the region has. Each new settlement adds land next to it, chosen on the map from four plots (N/E/S/W, in a pinwheel so they never overlap) whose terrain you see before choosing. New land continues the roads and the river that reach it; every plot from 4×4 has its own road and village.
- **Fair, not random.** Permits are approved if political support ≥ 50 when decided (shown in advance, with warnings); stubborn owners (+80%) are marked from the start instead of raising prices at random. The bot now passes settlement II every time; III ~59%, IV ~54%; runs average ~4.1 settlements.
- **Combos glow, Kairosoft-style:** a pulsing gold outline with sparkles (good) or red outline (bad) around the buildings of a combo, instead of dotted links.
- Tests: 16 rules tests, 107 browser checks.

## Previous — v0.6.1 (Oct 27, 2026) · one world map

Playtest feedback on v0.6: joining settlements as separate maps felt wrong, and the new territory did not respect the original map (each settlement was generated as a fresh, rotated site and only a strip of its neighbour was shown). v0.6.1 does it the *Cities: Skylines 2* way:
- **One world map per run** (48×48): regional roads from edge to edge, a river, woods and wetlands, old villages. Land you do not own is veiled.
- **Settlements are plots of that map.** The plot in play is that land, with its roads, river and villages. When it is consolidated, what you built is written back into the world and stays where it was.
- **The next plot is chosen on the map:** up to four highlighted, numbered plots next to the region. Tap one to see what it borders and what is on it, then acquire it.
- When no free land is left next to the region, the **Euroregion is complete** (a win).
- Rendering: the whole world is drawn (static layer + the plot in play) and only the visible part is repainted each frame. Building styles come from the world cell, so a building looks the same before and after consolidation.
- Tests: 15 rules tests (incl. "the new plot is the same land of the world") and 107 browser checks. Bot: about 2.9 settlements per run.

## Previous — v0.6.0 (Oct 27, 2026) · the Euroregion

Separate levels broke the roguelike logic: they played like a campaign. In v0.6 **a run is one Euroregion that grows**:
- **One run, one region.** It starts with a 2×2 hamlet. Every settlement that meets its target is **consolidated** (frozen into the region, still paying half its taxes as a regional dividend). The next one is **attached** on the side you choose: N ↗, E ↘, S ↙ or W ↖. Sizes go 4×4, 8×8, 16×16, then 16×16 again and again with a target 30% higher each time. Any failure ends the run. The rules still switch on one settlement at a time, as in v0.5.
- **Settlement types** (random): farming, industrial, commuter, spa, university, historic, logistics, each with a trait.
- **Region combos** (8 good, 7 bad) depend on where you attach, between the new settlement's type and its neighbours' types: Commuter Belt, Smokestack View, Slurry Season, Rust Belt… They are discovered like building combos and kept in the same catalogue.
- **A real border.** The neighbours' parcels along the edge give access and form ordinary combos with what you build on your side (drawn as a strip in v0.6.0; the whole world map from v0.6.1).
- **Money between settlements:** Brussels recovers 50% of the unspent funds and the other half carries over. Debt and perks carry over too, and you pick a perk at every consolidation.
- **Region map** (isometric minimap) in the Town sheet, on the consolidation card and on the attach card, which outlines the four candidate positions.
- **Records between runs:** most settlements and largest population, shown on the title screen (*New Euroregion*).
- **Balance** (bot, 150 runs): average ~3.3 settlements per run. 10% end in settlement II, 33% in III, then a long tail; very few pass the sixth.
- **Tests:** 14 rules tests in Node (consolidation, attach geometry, the border, region effects, records, the run's difficulty band) and 104 browser checks (a whole consolidation and attach through the UI, every new card in EN/ES).

## Previous — v0.5.1 (Oct 27, 2026) · architecture for scale

No gameplay changes: v0.5.1 makes the prototype ready to grow and to be ported.
- **Modules instead of one file.** The 4,600-line `src/index.html` is now ES modules by layer: `core/` (the rules), `i18n/`, `render/`, `ui/`, `audio/`, plus CSS and the real font files. The build (esbuild) still produces **one self-contained `dist/index.html`**, so the PWA, offline play and GitHub Pages work as before.
- **A portable core.** `src/core/` has no DOM, canvas, audio or `localStorage`; a layer check fails the build if that changes. It is the specification for the Godot port (file → GDScript autoload map in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)).
- **Tests without a browser.** Rules tests in Node (levels, rule flags, determinism, actions, a month passing, save/load, the difficulty band) and the balance bot running in Node with identical results to the browser.
- **Proven identical:** the smoke test (90 checks at the time) passes, the bot gives the same outcomes for the same seeds, the sprite export is pixel-identical and screenshots of title, level card, sheets and month end match the old build pixel for pixel (iPad and iPhone sizes).
- `/godot` is **frozen** at v0.1 until the port starts (see *Port triggers* below).

## Between v0.5.1 and v0.6 — title screen

- **Classic title screen**, from the design wireframe: the logo, a vertical menu — *New game* (the case files) · *Continue* · *Settings* (language, music) · *Credits* — and the version and copyright in the bottom corners, over the animated diorama and an avenue of waving flags. Keyboard: arrows / W-S, Enter, Esc. Replaces the "one-stop shop" panel and the news ticker.
- **The Union's own flag:** the shape and proportions of Vietnam's flag (3:2, one centred star, radius 3/10 of the height) but a white star on European blue. It replaces the portico emblem on the letterheads (the header shows only the logo), and every flag on the title screen (the avenue, the front row, the diorama's plazas) now flies it instead of the flag of Europe; the star rides the waving cloth as one piece so it stays legible. The portico's small icon became a ballot box (municipal land) and ruins (archaeology). The flag of Europe is no longer used anywhere.
- **Game logo:** EUROCRAT as a pixel-art asset with a transparent background (`art/logo/`: SVG + PNG 1×/4×/8×; `tools/make_logo.py` rebuilds it from the Jersey 10 font), CRAT in the secondary yellow. It replaces the EUROCRAT text on the title screen and in the header.
- The version shown comes from `core/config.js` (`VERSION`); the build fails if it differs from `package.json`.
- Smoke test: 96 checks (menu, its views, keyboard navigation, Continue pre-selected with a save).

## Previous — v0.5.0 (Oct 26, 2026)

Playtest feedback: "I don't know what to do", "too much information", "too hard". v0.5 answers all three:
- **Campaign of 4 levels** with maps of 2×2, 4×4, 8×8 and 16×16. Each level switches on new rules (and only shows the UI for the rules in play). Levels I–II cannot be lost.
- **Guide:** a level card with the goal and what is new, then the mayor (or Brussels) walks you through each step and highlights where to tap.
- **Progression:** completing a level unlocks the next and lets you carry 1 of 3 perks; the combo catalogue persists.
- **New interface:** full-screen map; bottom tab bar (Agenda · Town · End month · Inbox · Combos); sheets on demand; a bell for problems; directive pill on the map; compact meters on phones.
- **New title screen:** a full-screen scene instead of a dialog — a hand-composed, animated pixel diorama of the model town (with two plazas of EU flags) floating over an avenue of waving flags of Europe, a nearer row of big flags when there is room. Classic layout: the logo, a vertical menu — *New game* (the case files, i.e. the levels) · *Continue* (disabled with no save; selected when there is one) · *Settings* (language, music) · *Credits* (author, music and font rights, satire disclaimer) — and the version and copyright in the bottom corners. Arrow keys / W-S move, Enter picks, Esc goes back; the cover blocks map input. The version shown comes from `core/config.js`, which the build checks against `package.json`.
- **Moving the map:** drag with one finger or the mouse, pinch / wheel / +− to zoom, WASD / arrows on PC, keyboard shortcuts (R, C, Space, Esc).
- **Difficulty curve** (test bot, no carried perks): I 100% · II ~84% · III ~38% · IV ~35%.
- **Tests:** 89-check smoke test (a full level I played through the UI, level progression, panning, sheets, both languages, phone and iPad layouts).

## Previous — v0.4.0

- **Adjacency combos** (Kairosoft-style): 9 good and 4 bad combos between neighbouring buildings (8-way), discovered by building, with a catalogue that persists between runs, a "combo?" hint in the build menu, a discovery card and green/red links on the map.
- **Access through buildings:** a finished building (or the old village) gives access to its 8 neighbours, like a road.
- **Readability:** pixel fonts only for titles, figures, buttons and stamps; all reading text in a crisp sans at 15–16px with darker contrast. Event cards and notices open in the centre of the screen.
- **Difficulty:** target raised to 850 residents to compensate; the combo-aware bot wins ~35% of 200 runs.
- **Tests:** 71-check smoke test (combos, discovery, catalogue persistence, access rules, centred cards, text size and font).

## Previous — v0.3.0

- **Event cards with choices.** 15 events arrive as cards told by 8 recurring characters (portraits + their own sound), each with 2–3 options whose consequences are shown up front. The affected parcel pulses on the map.
- **Problems made visible.** "What needs attention" list (tap to locate), markers on the map, and every meter explains why it moved.
- **Realistic money.** Urban plans (rezoning), land value capture (urban land ×3), selling plots to developers who build at their own pace (and may stop or go bust), local tax share, bridge loans instead of instant bankruptcy, a warning before each spending milestone and only half the shortfall decommitted.
- **Map.** 12×12; road access counts diagonals; diagonal roads join visually on the pixel-art map.
- **Languages.** English and Spanish (HUD button or menus), 440 strings each.
- **Difficulty.** Target 700 residents, €130M grant. The test bot wins ~37% of 200 runs (v0.2: 8%), losses spread across bankruptcy, suspension and timeout.
- **Tests.** 55-check smoke test (both languages, every card renders without raw keys, diagonal access, plan, developers, loans, cards through the UI, layout). Runs in CI.
- **A living map.** 20 building styles (housing: slab, tower, terraced houses, perimeter block, timber eco-block, brutalist unit · factory: sawtooth works, logistics hub, agri-food silos, clean-tech plant with a wind turbine · school: brick, modern, old clock-tower · clinic: health centre with helipad, pavilion with ambulance, old hospital · park: wooded, duck pond, playground, fountain square), picked per parcel from the run's seed with random colourways and a satirical name shown in the parcel sheet ("Subsidiarity Towers", "Straight Banana Packers"…). An animation layer at ~15 fps adds traffic on straight roads (right-hand lanes, denser as the town grows, buses on the regional road), pedestrians and schoolchildren, grazing sheep, the protected toad hopping, chimney smoke and steam, waving pennants, shimmering river, ducks, a fountain, swings, a turning wind turbine, crane hooks lifting loads, welding sparks, blinking beacons, street lamps and passing birds. **Finished buildings rise from the ground** in a puff of dust, and **ending the month plays a short night**: the town darkens in three pixel steps, windows light up at random, lamps and headlights come on, and new buildings appear at dawn. Respects reduced motion; pauses when the tab is hidden (~3–4 ms per frame on a full 16×16 map). The **title-screen diorama** shares the same animation layer: its buildings get new random styles on every visit, traffic and people move, and its building sites keep finishing themselves — then the Commission requests changes and they go back to being building sites.
- **Pixel UI, institutional look.** The whole interface is now pixel art in the visual language of a (fictional) Union portal: blue header with a yellow rule, the Union's portico emblem, counters as inset tiles, segmented meters, case-file cards with hard shadows, raised pixel buttons, official letters on paper with a letterhead, date line, reference numbers and rubber stamps, stepped speech bubbles, pixelated character portraits, a title screen with an "official website of the Union" banner, and the map on a cadastral grid. 66 hand-drawn 12×12 icons replace Material Icons; three OFL pixel fonts (Jersey 10, Pixelify Sans, Silkscreen) are embedded. Compact two-row header on phones.
- Pixel-art map, Eurocrat soundtrack (menu / in-game / win), PWA, GitHub Pages → https://valleverde-dev.github.io/city/
- `/godot` still mirrors the v0.1 mechanics; port v0.3 once the loop is validated.

**Known issues**

- [x] ~~Material Icons load from Google Fonts~~ — replaced by embedded pixel icons and fonts; the game makes no network requests.
- [ ] Balance needs human playtesting (the bot is a sanity check, not a player).

## Next steps

### After v0.10

1. **Atlas of settlement types**, then decide: fixed traits or procedural ones.
2. Member states with their own rule quirks: a bureaucracy per country.
3. *Constructor*-style characters: named residents, complaints, a mayor with a face.
4. Port to Godot when a port trigger is met: `core/` first (with its tests), then rendering and UI.

### v0.12 or later (agreed)

- **Districts with their own rules:** local regulations per district (height limits, a protected old town, slower permits, a district mayor with a meter of their own).
- **Energy performance certificates (PEB/EPC, G → A):** buildings are born with a label and are **renovated** one letter at a time, which costs money, months of works (the building yields less meanwhile) and resources (an agenda slot, a renovation permit, a contractor). Better letters cut monthly costs, raise taxes and rents, attract people and please Brussels; dated directives ("all housing at E by month 24"), combos that need good letters, a sticker with the letter on each building.
- **Energy requirements:** buildings consume by type and letter; the city produces or imports (solar, wind, a grid link with limited capacity); shortages and blackouts, surplus sold; climate directives with deadlines.
- **Materials:** concrete, steel, timber, prefab, recycled — bought on a market with prices and shortages, or made locally; works stop without them; the choice affects cost, the energy letter and Brussels' mood. Introduced by phases, energy first.
- **Recorded voices**, if the synthesized ones fall short.
- **A combo for joining districts by road** (and a bad one when lorries end up in residential streets).
- **Longer event stories:** two or three paragraphs per event, in English and Spanish — five samples first, for approval.

### v0.12 — characters and intrigue (agreed Nov 2–3, 2026; the full list of characters, traits, perks and events goes to the author for review before any code)

- **The map as a place with people, Crusader Kings style.** Tapping things on the map opens a scene with characters: the village **bar** (a round of drinks, two or three regulars with names, faces and voices, each with a rumour — who owns what, which owner is stubborn, what the mayor is plotting; some false; less when the neighbours are angry — replacing the agenda action of v0.11), the **church** (the priest blesses a work or complains), the **square** (Remedios Quintana and the village's notables: fiestas, complaints, favours), the **farms** (meet the owner before buying: negotiate, flatter, lean on them) and **your own buildings** (the factory wants more shifts, the school is too small…). Every character has **traits** (greedy, spiteful, gossip, honest, vain…), an **opinion of you** and **relationships** with the others (cousins, feuds, favours owed): favours, blackmail and schemes. Traits and relationships are ??? until you talk to people.
- **New perks, good and bad.** New good ones (*Star architect*, *Friend at the Commission*, *Builder brother-in-law*…) and **negative perks** that arrive with events or the catch of a deal (*Auditor at your side*, *Bad press*, *Mayor on the campaign trail*, *Ghost payroll*…), in your hand in red; some expire, others must be got rid of. Discovered like the others.
- **Satirical events inspired by real cases, always with made-up names** (never real people, parties or companies): the adviser's adviser who "speeds up" permits; gifts from a Gulf delegation; the councillor caught partying during a lockdown he demanded, fleeing down a drainpipe; the director of *Ferrovías Transeuropeas* who wants "little jobs" for his "nieces".
- **The forum regulars of *Foromotores*** (made-up characters): Picapiedra (furious, in capitals, hates games made with AI), Panikero, el_caracoles, Perkys, el_litri, @Tonto, Susana (the only sensible one) and Samus (the troll who spreads hoaxes). Forum threads as a recurring event, hoaxes as a negative perk, and a last thread under the Gazette at game over.
- **More water:** a dam or a Brussels reservoir that makes a lake; renaturing a riverbank (you lose land, the neighbours are happy).

### Not scheduled

- **An intro cinematic after New Game**, in pixel art inside the game (scenes, camera moves, the characters, typewriter text, music; skippable, both languages), from a script the author will write.

### Ideas for later (no decision yet)

- **The old village as a living neighbour:** its own events and characters (Remedios Quintana is its voice: the patron saint's fiesta, the neighbour who will not sell the vegetable plot, the bar against the works), more combos (school, station), it **grows** onto free land next to it when relations are good or services are near (more residents, but it can take land you wanted and raise prices), empties and leaves ruins when things go badly, and perhaps is absorbed into the model town once connected to your services.
- **Consolidated settlements with a life of their own:** their own events (the first mayor complains all the money goes to the new town, a factory closes, a transport strike between two settlements), more region combos, also between consolidated settlements.

## Assets

### Graphics

- ✅ Pixel art chosen (Oct 2026) over flat vector and over satellite imagery (satellite tiles don't fit an isometric view and their licences don't allow shipping them in a commercial game).
- ✅ Pipeline: sprites are generated in code (`web-prototype/src/render/`) at 64×32 px per tile; `tools/export_sprites.py` writes `art/sprites/eurocrat_sprites.png` + `.json` atlas, ready to import in Godot (TileSet / AtlasTexture, filter = nearest).
- Next: animation frames (smoke, water, cranes), seasonal palettes per member state, hand-touched hero sprites (town hall, mayor's office).

### Art direction

- **v0.2: Constructor-style** colourful isometric map + a UI that parodies an institutional e-government portal (white panels, institutional blue, yellow highlights, rubber stamps). Fictional institutions only — no real EU names, flags or logos; the Union has its own flag (see GDD §1).
- v0.1 used a Syndicate (1993) neon look; it was dropped with the pivot.
- Recommendation: document this as a style guide (moodboard + palette + typefaces) to keep assets consistent as they scale.

### Music

- ✅ Soundtrack v2 for the Eurocrat tone, in `audio/` (OGG + M4A + MIDI, generated by `audio/compose.py`):
  - Menu: "Ode to Joy (Brussels Eurodance Mix)" — cheap 90s Eurodance with Beethoven's melody (public domain).
  - In game, one theme per phase: I "Village Fete Waltz", II "Let's Build Together" (80s Eurovision pop), III "Lobby Bossa (Floor 7, Please)" (v0.10.1, replacing the too-sad "Regulatory Framework"), IV "Harmonised Trance Anthem"; from phase V on, a random draw of "Your Call Is Important to Us" (hold music), "Sunny Subsidy" (ambient house), "Plenary Session (Hands Up!)" and "Italo Directive".
  - Win: "Douze Points for Harmonisation" — Eurovision-style schlager with the obligatory key change.
  - Game over (v0.10.2): "Programme Closed (Ode in D minor)" — the Ode slowed down and minor, out-of-tune tuba, a sad trombone at the end.
- ✅ Wired into the web prototype (menu / phase themes / milestones, crossfades, mute toggle) and the Godot skeleton (menu, level I theme in game; win theme preloaded for the port).
- v0.1's darksynth tracks were retired with the pivot.
- Later: short stingers (permit approved, directive failed, audit), a tension layer for the last months of a level, or re-voicing the MIDI with better instruments.
- Open to using other AIs (Gemini, ChatGPT, Atlas) for 3D asset generation too when the project needs it.

## Exports

### Godot

- **When to port:** once the game loop is validated in the web prototype (avoid porting too early and having to redo the design).
- **What carries over directly:** the rules live in `web-prototype/src/core/` as pure functions over one JSON state (grid, meters, rng), with no browser code (enforced by a layer check) and their own Node tests — port them file by file to GDScript autoloads (map in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)); the JSON state can stay identical so web saves load in Godot.
- **Why Godot:** native export to iOS and desktop (Windows/Mac/Linux) for Steam, and lighter than Unity for solo iteration.
- **Port triggers** (decide on these, not on anxiety): (1) the v0.5 playtest goes well — players finish level IV and ask for more; (2) bigger maps (32×32+) with a living town make the iPad web build slow; (3) Steam needs controller support, achievements or cloud saves as core features. Until then the web build stays the sandbox and `/godot` stays frozen.
- **Alternative kept open:** ship the web build itself, wrapped (Capacitor for iOS, Tauri/Electron for Steam). Reasonable for a turn-based 2D game; iOS would still need Xcode.

### GitHub

- Repository with `/web-prototype` (current version), `/godot` (port, once it starts) and this `ROADMAP.md` as a living reference. ✅ https://github.com/valleverde-dev/city

## Production

### itch.io (every release)

- ✅ `npm run build:itch` makes `release/eurocrat-<version>-web.zip` (no service worker or PWA tags; tested inside a cross-origin iframe like itch's).
- ✅ Tagging `vX.Y.Z` runs the Release workflow: tests, GitHub Release with the zip, and a butler push to itch.io once `BUTLER_API_KEY` + `ITCH_GAME` are set.
- To do: create the itch.io page (HTML5, 1280×800, mobile friendly, fullscreen button) and add the two settings.

### App Store

- Apple Developer account (USD 99/year).
- Even if the game is developed on the iPad, the final App Store submission requires Xcode, which only runs on a Mac. Options that avoid buying a Mac right away: cloud Mac services (MacStadium, etc.), macOS CI/CD runners (GitHub Actions, Codemagic) that build and sign the iOS build automatically, or borrowing/renting a Mac just for the publishing step.

### Steam

- Steamworks account (USD 100, recoupable).
- Desktop build generated directly from Godot (Windows/Mac/Linux) — without the Xcode limitation that applies to iOS.

## Suggested phases

1. **Web prototype:** ✅ v0.1 (basic loop) · ✅ v0.2 (Eurocrat roguelike loop) · ✅ v0.3 (cards, land economy, EN/ES) · ✅ v0.4 (combos, readability) · ✅ v0.5 (campaign of 4 levels, guide, sheets UI, panning) · ✅ v0.5.1 (modules, portable core, Node tests).
2. **Mechanics design (current):** ✅ v0.3 cards, characters, land economy, i18n · next: playtest, tutorial.
3. **Asset production:** consolidate the style guide, music, possible 3D assets.
4. **Godot port:** migrate logic and UI, with the GitHub repository already active.
5. **Production:** prepare builds for Steam (direct) and the App Store (solve the Xcode/Mac step).
