import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export type LockerRoomStage = { dispose: () => void };

export function mountLockerRoomStage(host: HTMLElement, onStatus?: (message: string) => void): LockerRoomStage | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
  } catch {
    onStatus?.('На этом устройстве недоступен WebGL.');
    return null;
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07111d);
  scene.fog = new THREE.Fog(0x07111d, 12, 27);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 60);
  camera.position.set(0, 3.15, 9.4);
  camera.lookAt(0, 1.65, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(host.clientWidth || 360, host.clientHeight || 560);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.domElement.className = 'locker-room-canvas';
  renderer.domElement.setAttribute('aria-label', 'Интерактивная трёхмерная хоккейная раздевалка');
  host.appendChild(renderer.domElement);

  const mat = (color: number, roughness = .65, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const wall = mat(0x182b3a, .86);
  const sideWall = mat(0x101f2d, .82);
  const floorMat = mat(0x172b3b, .28, .32);
  const darkMetal = mat(0x101a24, .38, .72);
  const lockerMetal = mat(0x334a5a, .34, .78);
  const lockerFace = mat(0x263b4a, .42, .62);
  const silver = mat(0xa6c0cc, .25, .82);
  const purple = mat(0x7148d6, .3, .45);
  const purpleGlow = new THREE.MeshBasicMaterial({ color: 0x9c6dff });
  const wood = mat(0x8c6547, .52, .08);
  const rubber = mat(0x090f17, .9);
  const white = mat(0xdce9ee, .34, .18);

  const addBox = (parent: THREE.Object3D, material: THREE.Material, x: number, y: number, z: number, w: number, h: number, d: number, cast = true) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = cast;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const addCylinder = (parent: THREE.Object3D, material: THREE.Material, x: number, y: number, z: number, radius: number, height: number, segments = 32) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, segments), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  scene.add(new THREE.HemisphereLight(0xb9d8ee, 0x101522, 1.45));
  const key = new THREE.DirectionalLight(0xe4f3ff, 2.25);
  key.position.set(-4, 8, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -8; key.shadow.camera.right = 8; key.shadow.camera.top = 9; key.shadow.camera.bottom = -5;
  scene.add(key);
  const cold = new THREE.PointLight(0x65caff, 22, 12, 2);
  cold.position.set(-3.8, 4.2, 1.5); scene.add(cold);
  const violet = new THREE.PointLight(0x8b55ff, 18, 11, 2);
  violet.position.set(3.5, 3.4, -1.5); scene.add(violet);
  const heroLight = new THREE.SpotLight(0xe9f5ff, 42, 14, Math.PI / 5, .45, 1.5);
  heroLight.position.set(0, 7.5, 3.4); heroLight.target.position.set(0, 1.2, 0); scene.add(heroLight, heroLight.target);

  // A real enclosed room: floor, back wall, side returns and ceiling beams.
  addBox(scene, floorMat, 0, -.16, -2.5, 14, .3, 14, false);
  addBox(scene, wall, 0, 2.65, -5.2, 14, 5.6, .35, false);
  addBox(scene, sideWall, -6.9, 2.65, -1.7, .35, 5.6, 7.2, false);
  addBox(scene, sideWall, 6.9, 2.65, -1.7, .35, 5.6, 7.2, false);
  addBox(scene, mat(0x0b1722, .8), 0, 5.48, -1.9, 13.8, .18, 7.2, false);
  addBox(scene, darkMetal, 0, 5.28, -1.9, 13.7, .12, 7.2, false);
  // Floor inlays and a soft central presentation zone.
  for (let z = -8; z <= 4; z += 1) addBox(scene, mat(0x466176, .62, .2), 0, .006, z, 13.7, .012, .012, false);
  for (let x = -6; x <= 6; x += 1) addBox(scene, mat(0x466176, .62, .2), x, .006, -2, .012, .012, false);
  const floorGlow = new THREE.Mesh(new THREE.CircleGeometry(2.35, 64), new THREE.MeshBasicMaterial({ color: 0x28618a, transparent: true, opacity: .13, depthWrite: false }));
  floorGlow.rotation.x = -Math.PI / 2; floorGlow.position.set(0, .012, -.2); scene.add(floorGlow);

  // Locker banks with individual doors, ventilation slots, name plates and handles.
  const buildLocker = (x: number, index: number, z = -4.78) => {
    addBox(scene, darkMetal, x, 1.78, z, .91, 3.55, .5);
    addBox(scene, lockerMetal, x, 1.8, z + .265, .84, 3.42, .035);
    addBox(scene, lockerFace, x, 1.8, z + .29, .77, 3.33, .025);
    addBox(scene, silver, x - .31, 1.8, z + .315, .012, 3.25, .012, false);
    for (let n = 0; n < 5; n++) addBox(scene, silver, x - .19 + n * .075, 3.12, z + .326, .045, .018, .012, false);
    for (let n = 0; n < 4; n++) addBox(scene, darkMetal, x - .2 + n * .12, 2.82, z + .326, .065, .018, .012, false);
    addBox(scene, purple, x, 2.48, z + .33, .72, .025, .018, false);
    addBox(scene, silver, x + .27, 1.73, z + .35, .035, .2, .035, false);
    addBox(scene, darkMetal, x, .48, z + .33, .48, .24, .025, false);
    const plate = addBox(scene, darkMetal, x, 3.35, z + .34, .42, .22, .025, false);
    const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0c1c2a'; ctx.fillRect(0, 0, 256, 128);
      ctx.strokeStyle = '#8f69ed'; ctx.lineWidth = 6; ctx.strokeRect(5, 5, 246, 118);
      ctx.fillStyle = '#e8f4fb'; ctx.font = 'bold 58px Arial'; ctx.textAlign = 'center'; ctx.fillText(String(index).padStart(2, '0'), 128, 83);
    }
    const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
    const label = new THREE.Mesh(new THREE.PlaneGeometry(.34, .17), new THREE.MeshBasicMaterial({ map: tex }));
    label.position.set(x, 3.35, z + .36); scene.add(label);
    void plate;
  };
  for (let i = 0; i < 6; i++) { buildLocker(-4.65 + i * .98, i + 1); buildLocker(4.65 - i * .98, i + 7); }

  // Long timber benches, dark steel legs and rubber floor mats.
  for (const z of [-2.7, -1.7]) {
    addBox(scene, wood, 0, .72, z, 5.6, .16, .58);
    addBox(scene, mat(0xb88c62, .5), 0, .805, z, 5.55, .025, .55, false);
    for (const x of [-2.45, 2.45]) {
      addBox(scene, darkMetal, x, .36, z, .13, .68, .14);
      addBox(scene, silver, x, .12, z, .32, .06, .3);
    }
    addBox(scene, rubber, 0, .012, z, 5.8, .018, .8, false);
  }

  // Back-wall crest and light strips, using real 3D signage rather than a flat backdrop.
  const signCanvas = document.createElement('canvas'); signCanvas.width = 1024; signCanvas.height = 256;
  const signCtx = signCanvas.getContext('2d');
  if (signCtx) {
    signCtx.fillStyle = '#0a1a28'; signCtx.fillRect(0, 0, 1024, 256);
    signCtx.strokeStyle = '#8c67ec'; signCtx.lineWidth = 10; signCtx.strokeRect(12, 12, 1000, 232);
    signCtx.fillStyle = '#f2f7fb'; signCtx.font = '900 112px Arial'; signCtx.textAlign = 'center'; signCtx.fillText('PUCK IT!', 512, 138);
    signCtx.fillStyle = '#8dc9e7'; signCtx.font = 'bold 28px Arial'; signCtx.fillText('HOME LOCKER ROOM  /  EST. 2026', 512, 202);
  }
  const signTex = new THREE.CanvasTexture(signCanvas); signTex.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.5, .88), new THREE.MeshBasicMaterial({ map: signTex }));
  sign.position.set(0, 4.5, -4.98); scene.add(sign);
  for (const x of [-4.7, -2.4, 0, 2.4, 4.7]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(1.45, .035, .07), new THREE.MeshBasicMaterial({ color: 0xbfeaff }));
    strip.position.set(x, 5.08, -3.1); scene.add(strip);
    const glow = new THREE.PointLight(0x8ddcff, 3.2, 3.5, 2); glow.position.set(x, 4.95, -2.8); scene.add(glow);
  }

  // Gear wall: hanging jerseys and a stick rack add depth to the room.
  const jerseyColors = [0xeff4f7, 0x5939a6, 0x182e42];
  for (let i = 0; i < 3; i++) {
    const x = -4.9 + i * 1.05;
    addBox(scene, darkMetal, x, 4.0, -4.96, .7, .035, .12);
    addBox(scene, jerseyColors[i] === 0xeff4f7 ? white : mat(jerseyColors[i], .62), x, 3.55, -4.83, .55, .78, .12);
    addBox(scene, purple, x, 3.55, -4.75, .52, .035, .018, false);
  }
  // Display pedestal, subtle metal rings and violet underglow.
  addCylinder(scene, darkMetal, 0, .12, .05, 1.05, .24, 64);
  addCylinder(scene, lockerMetal, 0, .26, .05, .96, .08, 64);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.01, .018, 10, 80), purpleGlow);
  ring.rotation.x = Math.PI / 2; ring.position.set(0, .31, .05); scene.add(ring);
  const pedestalGlow = new THREE.PointLight(0x8754ff, 7, 4, 2); pedestalGlow.position.set(0, .5, .05); scene.add(pedestalGlow);

  // The hero stays in one pose. Only the complete character group rotates on drag.
  const heroPivot = new THREE.Group(); heroPivot.position.set(0, .32, .05); scene.add(heroPivot);
  const heroRoot = new THREE.Group(); heroPivot.add(heroRoot);
  const loader = new GLTFLoader();
  let disposed = false;
  let loadFailed = false;
  const modelUrl = new URL(import.meta.env.BASE_URL + 'rig-test-input/puck-it-player%202.glb', window.location.href).toString();
  void loader.loadAsync(modelUrl).then((gltf) => {
    if (disposed) return;
    const model = gltf.scene;
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const height = Math.max(.001, size.y);
    const scale = 3.45 / height;
    model.scale.setScalar(scale);
    const scaledBounds = new THREE.Box3().setFromObject(model);
    model.position.y -= scaledBounds.min.y;
    model.traverse((node) => {
      if (node instanceof THREE.Mesh) { node.castShadow = true; node.receiveShadow = true; }
    });
    heroRoot.add(model);
    onStatus?.('Хоккеист загружен · потяни пальцем, чтобы вращать');
  }).catch((error: unknown) => {
    loadFailed = true;
    console.error('Locker room player load failed', error);
    onStatus?.('Не удалось загрузить модель хоккеиста. Проверь подключение и перезагрузи комнату.');
  });

  let dragging = false;
  let lastX = 0;
  let targetRotation = 0;
  const pointerDown = (event: PointerEvent) => { dragging = true; lastX = event.clientX; renderer.domElement.setPointerCapture?.(event.pointerId); };
  const pointerMove = (event: PointerEvent) => {
    if (!dragging) return;
    const dx = event.clientX - lastX; lastX = event.clientX;
    targetRotation += dx * .009;
  };
  const pointerUp = () => { dragging = false; };
  renderer.domElement.addEventListener('pointerdown', pointerDown);
  renderer.domElement.addEventListener('pointermove', pointerMove);
  renderer.domElement.addEventListener('pointerup', pointerUp);
  renderer.domElement.addEventListener('pointercancel', pointerUp);

  const resize = () => {
    const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight);
    camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
  };
  const observer = new ResizeObserver(resize); observer.observe(host);
  let frame = 0;
  const animate = () => {
    if (disposed) return;
    frame = requestAnimationFrame(animate);
    heroPivot.rotation.y += (targetRotation - heroPivot.rotation.y) * .16;
    renderer.render(scene, camera);
  };
  resize(); animate();

  return {
    dispose: () => {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect();
      renderer.domElement.removeEventListener('pointerdown', pointerDown);
      renderer.domElement.removeEventListener('pointermove', pointerMove);
      renderer.domElement.removeEventListener('pointerup', pointerUp);
      renderer.domElement.removeEventListener('pointercancel', pointerUp);
      scene.traverse((node) => {
        if (node instanceof THREE.Mesh) {
          node.geometry.dispose();
          const materials = Array.isArray(node.material) ? node.material : [node.material];
          materials.forEach((material) => { if ('map' in material && material.map) material.map.dispose(); material.dispose(); });
        }
      });
      renderer.dispose(); renderer.domElement.remove();
    }
  };
}
