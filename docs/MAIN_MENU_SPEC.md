# PUCK IT! — Main Menu UX Specification

Status: approved design direction, 2026-11-25
Branch: experiment/autorig-workbench
Product: arcade-first hockey club manager; no rendered match gameplay.

## Approved direction
- Hybrid club dashboard: premium stylised 3D/2.5D presentation combined with compact, useful management panels.
- Visual reference: user-provided Hockey Battle 2 home-screen screenshot. Take its information density, clear card hierarchy, dark hockey atmosphere, and compact bottom navigation as inspiration; do not copy its art or exact UI.
- The home screen is combined/scrollable: essential club information and the hero player appear first; secondary activities continue below.
- Main character: the approved Purple Ice Guardian player model/artwork.
- Hero character behavior: fixed facing direction, no automatic rotation and no user-driven rotation on the home screen. Only subtle idle motion (small breathing/weight shift/head or equipment movement) and gentle lighting; preserve the approved pose and silhouette.
- Main menu is a functional dashboard, not the winter town map. The town may remain an optional presentation layer but must not block core manager navigation.
- Match CTA leads to pre-match information, automatic match simulation, then score/stats/rewards. Never to a rendered on-ice match.

## Mobile screen hierarchy
1. Top profile strip: club crest, club name, manager level and compact XP progress; settings/inbox affordances.
2. Resource strip: Bucks and gold Pucks, with clear balances and optional shop/plus entry.
3. Team power strip: overall squad strength and concise progress / league context.
4. Hero player card: large 3D Purple Ice Guardian as the visual focal point; player name, position, rating and a few key stats. Tapping the player opens player details / card. Do not make the model itself a rotating control.
5. Primary next-match panel / CTA: opponent or competition context, round/status and reward preview; vivid PUCK IT red action button. If space requires, integrate CTA as a clear lower section of the hero card rather than competing with the player model.
6. Two prominent feature cards: Competitions and Packs / Recruitment.
7. Secondary activity grid below the fold: Tasks, Rewards / Achievements, Training, League / Social, Club / Facilities, Shop. Only show shortcuts that route to a real feature; otherwise mark as locked / coming soon.
8. Persistent bottom navigation: Home, Squad, Collection, Competitions, Club. Training is reachable from a player card and secondary shortcut; Shop from currency affordances and secondary shortcut. Avoid duplicating every tile in the bottom bar.

## Interaction and visual rules
- The top profile/resources area and bottom navigation remain fixed where practical; the central home content scrolls vertically.
- At first load, the user should immediately see club identity, balances, team strength and the star player. The next meaningful action must be obvious without scrolling far.
- Deep navy / ice-blue foundation, restrained purple accents to complement the approved player, vivid red primary CTA, gold for premium currency and trophies.
- Rounded, layered panels; strong contrast; compact readable type; comfortable touch targets; no horizontal overflow at iPhone portrait width.
- Hero scene should feel premium and dimensional, but remain lightweight. Prefer a real 3D model with subtle idle motion; if skeletal animation quality is not ready, use a safe static pose with gentle object-level motion rather than broken deformation.
- Use real game state for player, currencies, strength and progress. Do not leave hard-coded sample values in the shipped UI.
- No decorative/dead buttons and no fake feature flows.

## Build sequence
1. Audit existing home, city hub, navigation, roster, player model and state; reuse working systems and remove conflicting navigation only after mapping it.
2. Implement responsive home layout and fixed navigation using current data.
3. Integrate the approved Purple Ice Guardian in a fixed pose; validate lighting, framing and performance on iPhone Safari.
4. Wire all tiles to real screens or honest locked states.
5. Connect the primary CTA to pre-match → automatic simulation → result/rewards.
6. Test iPhone portrait and Android viewport; confirm scroll behavior, touch targets, safe areas and no horizontal overflow.

## Explicit non-goals
- No on-ice match visuals or live controls.
- No rotating hero player.
- No requirement to finish the 3D winter town before the manager home screen.
- No copying Hockey Battle 2's exact art, UI, names, text, or economy.
