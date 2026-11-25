# Hockey: Puck it! — Product Roadmap & Idea Backlog

> Living project notebook. Add decisions and ideas here so they survive chat resets. Keep the main branch untouched until the project owner explicitly approves integration.

## Product direction — arcade hockey manager (2026-11-25)

> **This is the current top-level product decision and supersedes earlier plans for a playable / visually simulated on-ice match.** Hockey: Puck it! is an arcade-first club and roster manager. The player builds a team, collects hockey cards, upgrades athletes, manages resources, enters competitions, and grows the club. There will be **no rendered hockey match, live rink gameplay, or on-ice player control**. Match outcomes are resolved by the game simulation and presented through a compact, exciting result / stats screen.

### Reference: Hockey Battle 2 — what we are taking as a design reference
- Use the broad management loop as inspiration: build a club → collect players from packs → assemble a roster → train and improve players → enter seasons / cups / tournaments → earn rewards → reinvest in the roster and club.
- Include several parallel progression tracks: player development, team strength, club facilities / arena, daily tasks and longer events.
- Keep the interface direct and mobile-first, with the squad and player collection as primary destinations.
- Add competitive layers over time: regular tournaments, playoffs, leagues / clubs, friend-party modes, seasonal competitions and leaderboards.
- These are product inspirations, not a request to copy Hockey Battle 2's artwork, exact screens, economy values, names, or proprietary content. PUCK IT! keeps its own identity and visual language.
- Source basis: Hockey Battle 2's current store descriptions and listed modes/features (Google Play and Apple App Store, checked 2026-11-25).

### Core game loop
1. Earn currencies, experience and rewards from matches, competitions, tasks and events.
2. Open player packs / recruit athletes and expand the collection.
3. Build a lineup with positions and roles; manage substitutes and goalkeeper.
4. Train players, spend upgrade points, improve attributes and unlock role-specific development.
5. Improve equipment and club facilities to support progression and unlock useful bonuses.
6. Enter a season, cup, tournament or challenge; resolve the match automatically.
7. Review score, team/player stats, rewards and progression; use the rewards to strengthen the club.

### Product pillars and systems
- **Player cards and collection:** clear rarity tiers, strong card art, player identity, position, overall rating, attributes, level, progression and collection filters.
- **Roster management:** lineup by hockey positions (LW, C, RW, LD, RD, G), formation / line combinations, bench, captain and role assignment.
- **Player progression:** training, XP / levels, upgrade points, attribute growth (endurance, strength, agility, speed), role specialisation and longer-term talent development.
- **Packs and recruitment:** earnable packs, pack-opening reveal, duplicate handling / conversion, recruitment goals and a transparent reward economy.
- **Equipment:** skates, stick, jersey, helmet, shorts / pants; goalie-specific pads, trapper and stick. Equipment rarity and visual customisation must remain distinct from player rarity. Team jersey colour follows the club, not card rarity.
- **Club economy:** green Bucks and gold Pucks; clear sources and sinks; upgrades for arena, training base, academy / scouting, equipment shop and hall of fame. Facilities should provide understandable progression benefits.
- **Competitions:** season, regular tournament, cup, playoff / bracket, daily challenge and longer events. Add leagues / social modes after the solo loop is satisfying.
- **Tasks and retention:** daily and weekly objectives, quest chains, achievements, milestones and reward tracks.
- **Match resolution — no match visuals:** calculate results from roster strength, player attributes, positions, chemistry / line fit, tactics, condition and bounded randomness. Show pre-match comparison, simulated score, key stats, standout players and rewards. No 3D/2D rink match scene, skating animation, puck control or live match camera.
- **Presentation:** premium colourful stylised 3D / 2.5D sports-management UI, punchy card reveals and satisfying upgrade feedback. Visual polish supports management screens; it is not a reason to build a rendered match.

### Priority order
1. **P0 — Lock the foundation:** product navigation, player data model, currencies, save / persistence, roster and card collection.
2. **P1 — Make the core loop playable:** packs, card details, lineup editing, training, attribute upgrades and a first automatic match-result simulator.
3. **P2 — Add meaningful progression:** equipment, facility upgrades, season / tournament bracket, daily tasks and rewards.
4. **P3 — Add depth and live-service structure:** scouting / academy, player talents, duplicates, events, leagues, social / party modes and leaderboards.
5. **P4 — Polish and balance:** card presentation, pack-opening feel, onboarding, economy tuning, accessibility, performance and mobile QA.

### Explicitly out of scope
- No rendered on-ice match or real-time hockey controls.
- No need to finish player skating / shooting / goalie animations for match gameplay.
- No building a full 3D town as a prerequisite for the manager loop. The winter town can remain a navigable visual hub / presentation layer, but every building must lead to a real management feature; it must not delay cards, roster, progression or competitions.
- Do not copy Hockey Battle 2's exact UI, art, text, assets or balancing.

### Next implementation milestone
- [ ] Audit the existing screens and data structures against this direction; identify what is already real, what is a prototype and what is missing.
- [ ] Reshape the primary navigation around Squad, Players / Collection, Training, Competitions and Club.
- [ ] Define a single player-card data model covering rarity, position, overall, four core attributes, level, XP, upgrade points, equipment slots and progression state.
- [ ] Make collection → card details → training / upgrade → lineup assignment a complete working loop.
- [ ] Implement a deterministic, inspectable first match simulation with a result screen; do not build match visuals.
- [ ] Update the roadmap after each verified milestone and keep experimental work isolated from main.

## New direction — interactive hockey town

- [x] Make the hockey town the main hub for returning players on the experimental branch.
- [x] Add a first interactive winter-town map with working entrances to the arena upgrades, club office/contracts, player collection, equipment/wardrobe, and locker room.
- [x] Keep direct shortcuts for squad, tournament, standings, club profile, settings, and starting a match.
- [ ] Replace the first CSS-built town illustration with a polished, consistent isometric 3D environment.
- [ ] Give every building a persistent visual upgrade level and visibly change its model as the club invests in it.
- [ ] Build a dedicated academy system for youth development, scouting, and training; do not treat the current player-collection shortcut as the finished academy.
- [ ] Add staged rink evolution: outdoor practice rink → upgraded rink with stands and lighting → enclosed arena → elite arena.
- [ ] Add ambient life to the town: subtle snowfall, lit windows, moving visitors, parked vehicles, and fans on match days.
- [ ] Keep the town map touch-friendly on mobile and avoid decorative controls that do not lead to a real feature.

## Current focus — 3D player

### Character model and rigging
- [x] Make the Purple Ice Guardian GLB the primary input for the experimental autorig workflow.
- [x] Run the autorig experiment and export diagnostic artifacts.
- [ ] Inspect the generated GLB previews in a 3D viewer; verify proportions, joints, and animation visually.
- [ ] Improve skinning until the character passes deformation QA.
- [ ] Add hockey-specific idle, skating, stick-handling, shooting, and celebration animations.
- [ ] Integrate the approved character into the player room on the experimental branch first.
- [ ] Keep the player model rotatable in the room.

### Helmet visor — design decision
- **Base/default visor:** universal dark smoked black / graphite. It must work with every team colour and every uniform.
- **Premium cosmetic variants:** reflective/mirrored finishes and other visual treatments.
- **Unlock routes:** some visor styles can be earned through achievements; selected premium styles may be offered as optional donations/purchases.
- **Fairness rule:** visor cosmetics are visual only — no gameplay advantage, visibility bonus, stats, or pay-to-win effects.
- [ ] Model the visor as a separate curved helmet component, not baked into the helmet mesh.
- [ ] Give it a realistic dark glossy material with controlled reflections; hide the player's eyes completely.
- [ ] Make visor material/finish configurable per player so cosmetic variants can be swapped without changing the helmet geometry.
- [ ] Create and test the base graphite visor first, then mirror/premium variants.

## Player room and presentation
- [x] Build the first working 3D locker room with an enclosed room, locker banks, benches, club signage, pedestal, and responsive Three.js player viewer.
- [x] Display the 3D player as the visual centrepiece, with drag/touch rotation; smoke-tested by the project owner on iPhone Safari.
- [x] Add a first environmental polish pass: ceiling ribs, acoustic wall fins, detailed locker doors, floor presentation rings, and shaped jersey displays with subtle pulsing light.
- [x] Balance room lighting after visual review: reduce exposure and direct/ambient light so locker surfaces retain their blue-grey finish and the player's face is not blown out.
- [ ] Add a premium second pass for materials, finer player-facing details, and richer environmental storytelling.
- [x] Add visible recessed ceiling light panels with dedicated downlights and a warmer bench-side practical strip.
- [x] Add dimensional locker-door framing, latch details, and recessed lower boot bays.
- [x] Add side-wall hockey-stick racks as environmental equipment props.
- [x] Add an in-room brightness slider with a saved per-device setting for ambient, directional, spot, and practical lights.
- [ ] Rebuild the room's visual hierarchy with more substantial locker-bank architecture and clearer player-centred staging.
- [ ] Add player details and equipment presentation around the character.
- [ ] Build equipment customization with swappable helmet, visor, jersey, gloves, pants, skates, and stick assets; do not fake swaps by only changing UI labels.
- [ ] Preserve the selected premium stylized visual direction for cards and surrounding UI; keep match gameplay visuals distinct where appropriate.

## Match resolution — management simulation only
- [ ] Implement and balance automatic match resolution from roster, attributes, positions, line fit, tactics and condition.
- [ ] Present a clear pre-match comparison and a punchy post-match score / statistics / rewards screen.
- [ ] Ensure the result simulation is testable and reproducible; expose the key factors that influenced the result.
- [ ] Do not build or restore a rendered rink match, live player controls, skating / shooting / goalie animations, puck physics or match camera.
- [ ] Continue cinematic intro/audio polish while respecting browser audio-start requirements.

## Technical / release workflow
- Experimental work stays on `experiment/autorig-workbench` until explicitly approved.
- Do not merge or copy changes into `main` without explicit approval.
- A green CI workflow means the pipeline completed; it does **not** mean the generated rig passed deformation QA.
- Record each experiment's run URL, artifact link, audit metrics, and decision here.

## Latest autorig experiment — 2026-11-22
- Workflow run: https://github.com/QUOOCH/Hockey-Manager-Playtest/actions/runs/45027472510
- Input: `Meshy_AI_Purple_Ice_Guardian_1122090427_generate.glb`
- Workflow: completed successfully; artifact uploaded.
- Important: both player-specific skinning audits currently **FAIL**. This is not ready for game integration.
  - Hockey-specific Autorig: 182 combined tears, 388 bend tears, 0.11% bleed, 6.05% head metric, 233.2 stand folds.
  - Autorig baseline: 185 combined tears, 405 bend tears, 0.04% bleed, 5.92% head metric, 233.5 stand folds.
  - Mesh2Motion: 3,027 combined tears, 1,457 bend tears, 1.37% bleed, 4.56% head metric, 91.0 stand folds.
- Current best of these tests is the hockey-specific Autorig pass by a small margin, but it still fails strict QA. Next step is to inspect previews and improve mesh preparation / joint placement / skin weights before selecting a rig.
- Artifact: https://github.com/QUOOCH/Hockey-Manager-Playtest/actions/runs/45027472510/artifacts/14756846666


## Follow-up after artifact inspection — 2026-11-22
- [x] Downloaded and inspected the contents of artifact 14756846666.
- [x] Confirmed the selected hockey-specific Autorig output contains one skinned mesh (44,825 vertices), 66 bones, and no unskinned meshes.
- [ ] Visually inspect the GLB preview in a compatible 3D viewer before judging silhouette or animation quality.
- [ ] Investigate why 31 bones have no skin weights and whether those are intentional helper/leaf bones.
- [ ] Focus deformation repair on the remaining 182 combined tears, 388 bend tears, and 233.2 stand-fold score in the hockey-specific Autorig result.
- [ ] Compare the repaired rig against the baseline using the same audit thresholds; do not integrate until visual review and deformation QA pass.


## Rig Lab — manual deformation inspection — 2026-11-22
- [x] Add a standalone browser-based GLB rig inspection page at `public/rig-lab.html` on `experiment/autorig-workbench`.
- [x] Support local GLB upload, orbit/touch camera, skeleton overlay, bone selection, per-axis local rotation sliders, and pose reset.
- [ ] Open the page on iPhone, load the white hockey_autorig GLB, and test shoulder, elbow, hip, knee, and spine bends.
- [ ] Record which bone names map to the visible joints and note any mesh tearing, collapsing, or twisting.
- [ ] Use the findings to guide the next skin-weight / rig repair iteration.
- Note: the lab is diagnostic only; it does not modify the source GLB, export a repaired model, or change the game runtime.
- Preview URL (without touching GitHub Pages or the live game): `https://raw.githack.com/QUOOCH/Hockey-Manager-Playtest/experiment/autorig-workbench/public/rig-lab.html`.
- The preview URL is a CDN route and still needs a real iPhone Safari smoke test; the live `main` branch and current game deployment remain untouched.


## Stylized player artwork and modular equipment — 2026-11-23
- Design decision: prioritize the approved Purple Ice Guardian master reference artwork over the current autorigged GLB's visual style. The player may be presented as a fixed-pose 2D / 2.5D illustration; full 360-degree rotation is not a requirement for the first version.
- Preserve the exact approved character identity, proportions, face, silhouette, lighting, and grip pose. Do not redesign the player between equipment selections.
- Equipment must be genuinely swappable as independent visual assets, not merely labels or UI colour changes.
- First prototype: layered full-body character artwork with fixed canvas coordinates and transparent equipment overlays / replacement masks.
- Initial independently swappable items: hockey stick, left/right skates, helmet, jersey, gloves, pants. Keep the existing two-hand stick grip and stick angle identical across stick variants; only the stick design/material changes.
- Build order: (1) inspect and segment the master reference into a stable character base and equipment regions; (2) prototype stick replacement first because its grip/position is a clear alignment test; (3) prototype skate replacement; (4) add jersey and remaining gear; (5) add in-room selection UI and persist choices.
- Technical fallback: if clean layered extraction from the reference is unreliable, create a matched set of redraws using the master image as a strict identity/pose/style anchor. Do not substitute unrelated generated characters or approximate the grip pose.
- [ ] Create a fixed-pose modular artwork proof-of-concept on the experimental branch; keep the main branch untouched.

- 2026-11-23 first visual proof: produced three fixed-pose stick appearance studies (graphite, PUCK IT violet, ice white) from the approved master reference. This confirms the target is a fixed-pose visual swap; current output is an offline design proof only, not yet wired into the locker-room UI. Next: turn the cleaned master + aligned equipment variants into repository assets and a real selector; validate glove overlap and exact hand contact before calling the stick swap production-ready.


### Fixed-pose equipment selector — first implementation
- Added a repository-hosted 4-frame WebP strip based on the canonical player artwork: master reference plus graphite, PUCK IT! violet, and ice-white stick variants.
- Added the first locker-room gear workshop UI with three selectable stick finishes and persisted selection in local storage.
- Kept the character art and all other equipment visually fixed; the first pass changes only the displayed equipment-strip frame.
- This is a visual prototype selector, not yet a true independent transparent equipment layer. Validate crop alignment, phone rendering, and interaction before expanding to skates, jersey, helmet, and gloves.

- Preview build passed on Vercel (READY) from commit 747067ba7fdc84c4e1be31944c1b28ec929cdc0e. Manual visual/touch QA on iPhone remains pending; do not merge to main yet.
