# Hockey: Puck it! — Product Roadmap & Idea Backlog

> Living project notebook. Add decisions and ideas here so they survive chat resets. Keep the main branch untouched until the project owner explicitly approves integration.

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
- [ ] Build a polished, atmospheric player room (not a generic menu panel).
- [ ] Display the 3D player as the visual centrepiece, with drag/touch rotation.
- [ ] Add player details and equipment presentation around the character.
- [ ] Preserve the selected premium stylized visual direction for cards and surrounding UI; keep match gameplay visuals distinct where appropriate.

## Match presentation and gameplay
- [ ] Keep improving hockey-specific player motion and animation quality.
- [ ] Re-test goalie-save restart / faceoff flow.
- [ ] Re-test puck possession and AI puck recovery so opponents do not hold the puck indefinitely.
- [ ] Keep puck appearance consistent; investigate any unexpected colour changes.
- [ ] Remove unintended rink markings or debug lines.
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
