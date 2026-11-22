# Player autorig audit — 2026-11-22

## Source inspected
- `PuckItPlayer_hockey_autorig 2.glb`
- GLB structure: 68 nodes, 1 skin, 66 joints, 2 animations.
- One skinned mesh primitive: 269,596 position vertices and 89,878 triangles.
- Skin attributes present: `JOINTS_0` and `WEIGHTS_0`.
- The stick is not a separate mesh/object in this file. It cannot be safely re-parented as a standalone prop until its geometry is isolated from the combined primitive.

## Weight audit (decoded directly from the GLB)
The following counts are vertices with non-zero influence from each joint; summed weights are shown as a diagnostic measure.

| Joint | Influenced vertices | Sum of weights |
|---|---:|---:|
| hand_l | 1,076 | 250.3 |
| hand_r | 395 | 65.4 |
| lowerarm_l | 10,080 | 2,729.8 |
| lowerarm_r | 7,370 | 1,760.3 |
| thumb_01_l | 1,985 | 202.2 |
| thumb_02_l | 14,933 | 5,601.1 |
| thumb_03_l | 7,669 | 1,276.9 |
| thumb_01_r | 5,467 | 1,390.3 |
| thumb_02_r | 1,159 | 125.2 |
| thumb_03_r | 12,257 | 6,394.7 |

### Finger-chain gaps
- Left: only first segments of index/middle/ring/pinky have non-zero weights; segments 02, 03 and leaf have zero.
- Right: index 01–03 have some weights, but middle/ring/pinky chains have zero; index leaf and thumb leaf also zero.
- Thumb 02/03 influences cover unusually broad spatial bounds. This is a strong warning sign, but does not by itself prove those vertices belong to the stick.

### Interpretation
- Hand weights are asymmetric, and several finger chains are not actually deforming the mesh.
- This is consistent with a weak/incorrect hand rig and could contribute to the bad grip, but the exact cause of the stick slipping is not proven until the stick's vertices are identified visually.
- Do not "fix" this by blindly zeroing thumb weights. That could damage the glove/hand.

## Required grip orientation (user-confirmed)
- The hockey player's **left hand** holds the stick.
- The blade/hook points **upward** in the reference grip.
- Preserve this exact orientation as the bind/reference grip pose. Do not silently normalize it to a conventional hockey stance.
- The stick should remain rigid relative to the left palm when the wrist rotates. Fingers may curl around the shaft, but should not deform the stick geometry.

## Safe repair plan
1. Keep the uploaded GLB immutable as the source backup.
2. Inspect the combined mesh in a visual authoring tool in the exact reference pose.
3. Identify the stick's triangles/vertices visually, then separate the stick into its own object; do not guess the separation by bone name or vertex bounds alone.
4. Create a grip socket/helper aligned to the left palm in the user-approved hook-up orientation.
5. Parent the isolated stick object to the grip socket (or use an equivalent rigid attachment); keep hand/finger weights on the player mesh only.
6. Repair left/right hand weights and finger chains using visible deformation tests.
7. Re-test idle and walk animations, then test wrist rotation and grip retention.
8. Export a new GLB under a new filename; never overwrite the source or touch the live game branch.

## Current status
- GLB structure and skin weights decoded and audited.
- No vertex weights or geometry have been modified.
- A corrected/exported GLB has **not** been produced.
- Next required operation is visual identification/separation of stick geometry. A blind automated cut is unsafe because the source is one combined skinned primitive.
