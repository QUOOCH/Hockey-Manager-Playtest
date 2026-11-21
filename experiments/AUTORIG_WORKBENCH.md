# PUCK IT! — open-source auto-rig experiment

This is an isolated experiment. It does not change the live game or its existing Three.js rig.

## Candidate

- [Autorig Workbench](https://github.com/sambena/autorig-workbench), pinned to \`80a127582aa55f4c8378d60dcff57725dd24ef8f\`.
- Blender 5.2.2, headless on a GitHub Actions runner.
- Two independent human-rig attempts: Workbench skinning and Mesh2Motion skinning.
- 90,000-triangle output target to preserve more detail than the tool's 15,000 default.
- Both attempts produce GLB/FBX plus the tool's bend audit.

The upstream project is GPL-3.0-or-later. Its bundled Mesh2Motion application code is MIT; its bundled rigs and animation assets are CC0. We run it as an external build tool and do not copy its source into the game bundle.

## Run with the player model

The workflow supports either:

1. A direct HTTPS URL to the GLB through **Actions → Test open-source auto-rig pipeline → Run workflow → model_url**, or
2. A file named \`rig-test-input/puck-it-player.glb\` in this branch.

The workflow first runs the upstream project's own tests. If a GLB is supplied, it validates the GLB header and runs both skinning methods separately. Their outputs and logs are uploaded as the \`puck-it-autorig-experiment\` artifact for 14 days.

A successful tool test is not a successful player rig. We only move a result into the game after the audit and visual bend checks show that the shoulders, elbows, hips and knees deform without smearing.

## Why this is isolated

The upstream workbench is alpha and its published bake-off still reports many failing meshes. This experiment is designed to measure our exact player rather than assume that any automatic rig will work. No live game files are touched.

The workflow accepts any `.glb` filename placed in `rig-test-input/` (including filenames containing spaces).


Upstream test suites are diagnostic and non-blocking in this experiment: a failure in the candidate tool's own tests is recorded as a warning, but does not prevent the two player-specific skinning attempts from running. The rigging outputs are still judged independently and are not accepted without deformation checks.
