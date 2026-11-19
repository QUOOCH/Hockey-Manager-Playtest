# Hero 3D asset pipeline

The web playtest loads hero models as glTF 2.0 binary assets (.glb) through Three.js.

## Center forward prototype

Place the first approved model here:

- `public/assets/models/hero/center/base.glb`
- `public/assets/models/hero/center/equipment/helmet.glb`
- `public/assets/models/hero/center/equipment/chest.glb`
- `public/assets/models/hero/center/equipment/gloves.glb`
- `public/assets/models/hero/center/equipment/stick.glb`
- `public/assets/models/hero/center/equipment/skates.glb`
- `public/assets/models/hero/center/equipment/jersey.glb`
- `public/assets/models/hero/center/equipment/pants.glb`

## Interchangeable equipment contract

The base model should use real-world proportions, face local +Z, and have its feet on Y=0. Its scene hierarchy must expose these named attachment nodes:

- `slot_helmet`
- `slot_chest`
- `slot_gloves`
- `slot_stick`
- `slot_skates`
- `slot_jersey`
- `slot_pants`

Each equipment GLB must be exported in the same coordinate space as the base model and aligned to its matching attachment node. Keep the character body and clothing geometry separated so cosmetic swaps do not require replacing the full character.

Textures should be efficient (prefer 1K for the first mobile prototype), use glTF metallic-roughness materials, and avoid unnecessary hidden geometry. The renderer caps device pixel ratio at 1.5 and uses low-power WebGL settings for mobile Safari.

The existing SVG hero remains the fallback until the approved model and required equipment assets are ready. This module is infrastructure only and does not change match rendering or existing saves.
