# Player autorig audit — 2026-11-22

## Source inspected
- `PuckItPlayer_hockey_autorig 2.glb`
- GLB contains 1 mesh, 1 skin, 66 joints, 2 animations.
- Mesh has 269,596 positions and one skinned primitive.
- The stick is not a separate mesh/object in this file. It cannot be safely re-parented as a standalone prop until its geometry is isolated from the combined mesh.

## Confirmed rig concerns
- The left and right hand influence distributions are strongly asymmetric.
- `hand_l` has total summed vertex weight ~250; `hand_r` ~65.
- Several finger chains have zero assigned vertex weight (including index/middle/ring/pinky segments beyond the first segment on the left, and most right-hand finger chains).
- Thumb chains carry unusually large influence: `thumb_02_l` ~5,601 and `thumb_03_r` ~6,395 summed weights. Their affected vertex bounds extend well beyond a small thumb region.
- These figures are diagnostic flags, not proof that the stick itself is weighted to those bones. The mesh must be visually inspected and the stick region identified before editing weights.

## Required grip orientation (user-confirmed)
- The hockey player's **left hand** holds the stick.
- The blade/hook points **upward** in the reference grip.
- Preserve this exact orientation as the bind/reference grip pose. Do not silently normalize it to a conventional hockey stance.
- The stick should remain rigid relative to the left palm when the wrist rotates. Fingers may curl around the shaft, but should not deform the stick geometry.

## Safe repair plan
1. Keep the uploaded GLB immutable as the source backup.
2. Open the GLB in Blender and inspect the combined mesh in the reference pose.
3. Identify and separate the stick geometry into its own object; do not guess the separation by bone name or vertex bounds alone.
4. Create a grip socket/helper aligned to the left palm in the user-approved hook-up orientation.
5. Parent the isolated stick object to the grip socket (or use an equivalent rigid attachment); keep hand/finger weights on the player mesh only.
6. Audit and repair left/right hand weights and finger chains using visible deformation tests.
7. Re-test idle and walk animations, then test wrist rotation and grip retention.
8. Export a new GLB under a new filename; never overwrite the source or touch the live game branch.

## Current status
- Structural and weight-distribution audit completed.
- No vertex weights or geometry have been modified yet.
- A corrected/exported GLB has **not** been produced. Geometry separation requires a visual authoring pass; doing it blindly in code risks cutting gloves/fingers or deleting part of the stick.
