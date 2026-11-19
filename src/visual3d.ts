import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export type HeroGearSlot = 'helmet' | 'chest' | 'gloves' | 'stick' | 'skates' | 'jersey' | 'pants';
export type Hero3DOptions = { modelRoot?: string; onLoad?: () => void; onError?: (message: string) => void };
export type Hero3DStage = {
  loadBaseModel: (file?: string) => Promise<void>;
  setEquipment: (slot: HeroGearSlot, file: string | null) => Promise<void>;
  setRotation: (radians: number) => void;
  dispose: () => void;
};

const DEFAULT_ROOT = `${import.meta.env.BASE_URL}assets/models/hero/center/`;
const ANCHORS: Record<HeroGearSlot, string> = { helmet: 'slot_helmet', chest: 'slot_chest', gloves: 'slot_gloves', stick: 'slot_stick', skates: 'slot_skates', jersey: 'slot_jersey', pants: 'slot_pants' };

/** Lightweight mobile-first GLB viewer for the hero room. */
export function mountHero3DStage(host: HTMLElement, options: Hero3DOptions = {}): Hero3DStage | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch {
    options.onError?.('WebGL недоступен на этом устройстве.');
    return null;
  }
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
  camera.position.set(0, 1.55, 5.7);
  camera.lookAt(0, 1.35, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = false;
  renderer.domElement.className = 'hero-3d-canvas';
  renderer.domElement.setAttribute('aria-label', '3D-модель хоккеиста');
  host.appendChild(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xc8eaff, 0x07182a, 2.0));
  const key = new THREE.DirectionalLight(0xe8f7ff, 3.1); key.position.set(-3.5, 5, 4); scene.add(key);
  const fill = new THREE.DirectionalLight(0x299be8, 2.2); fill.position.set(4, 2.5, -2); scene.add(fill);
  const rim = new THREE.DirectionalLight(0x78dfff, 2.8); rim.position.set(0, 4, -4); scene.add(rim);
  const stage = new THREE.Group(); scene.add(stage);
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 1.02, 0.12, 48), new THREE.MeshStandardMaterial({ color: 0x153d5b, metalness: 0.58, roughness: 0.32 }));
  pedestal.position.y = 0.06; stage.add(pedestal);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.012, 8, 64), new THREE.MeshBasicMaterial({ color: 0x65d9ff }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.125; stage.add(ring);
  const modelRoot = new THREE.Group(); stage.add(modelRoot);
  const loader = new GLTFLoader();
  const root = options.modelRoot || DEFAULT_ROOT;
  const equipment = new Map<HeroGearSlot, THREE.Object3D>();
  let baseModel: THREE.Object3D | null = null;
  let frame = 0; let disposed = false; let dragging = false; let lastPointerX = 0; let rotation = 0;
  const resize = () => { if (disposed) return; const w = Math.max(1, host.clientWidth); const h = Math.max(1, host.clientHeight); camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h, false); };
  const observer = new ResizeObserver(resize); observer.observe(host); resize();
  const pointerDown = (event: PointerEvent) => { dragging = true; lastPointerX = event.clientX; renderer.domElement.setPointerCapture?.(event.pointerId); };
  const pointerMove = (event: PointerEvent) => { if (!dragging) return; rotation += (event.clientX - lastPointerX) * 0.009; lastPointerX = event.clientX; modelRoot.rotation.y = rotation; };
  const pointerUp = () => { dragging = false; };
  renderer.domElement.addEventListener('pointerdown', pointerDown); renderer.domElement.addEventListener('pointermove', pointerMove); renderer.domElement.addEventListener('pointerup', pointerUp); renderer.domElement.addEventListener('pointercancel', pointerUp);
  const reportError = (error: unknown) => options.onError?.(error instanceof Error ? error.message : 'Не удалось загрузить 3D-модель.');
  const load = (url: string) => new Promise<THREE.Object3D>((resolve, reject) => loader.load(url, gltf => resolve(gltf.scene), undefined, reject));
  const loadBaseModel = async (file = 'base.glb') => {
    try {
      const next = await load(root + file); if (disposed) return;
      const bounds = new THREE.Box3().setFromObject(next); const size = bounds.getSize(new THREE.Vector3()); const center = bounds.getCenter(new THREE.Vector3());
      const scale = 3.25 / Math.max(size.y, 0.01); next.scale.setScalar(scale); next.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
      next.traverse(object => { if (object instanceof THREE.Mesh) { object.frustumCulled = true; object.castShadow = false; object.receiveShadow = false; } });
      if (baseModel) modelRoot.remove(baseModel); baseModel = next; modelRoot.add(next); options.onLoad?.();
    } catch (error) { reportError(error); throw error; }
  };
  const setEquipment = async (slot: HeroGearSlot, file: string | null) => {
    const anchor = modelRoot.getObjectByName(ANCHORS[slot]);
    if (!anchor) { if (file) options.onError?.(`В модели не найден слот ${ANCHORS[slot]}.`); return; }
    const previous = equipment.get(slot); if (previous) { anchor.remove(previous); equipment.delete(slot); }
    if (!file) return;
    try {
      const part = await load(root + 'equipment/' + file); if (disposed) return;
      part.traverse(object => { if (object instanceof THREE.Mesh) { object.frustumCulled = true; object.castShadow = false; object.receiveShadow = false; } });
      anchor.add(part); equipment.set(slot, part);
    } catch (error) { reportError(error); throw error; }
  };
  const animate = () => { if (disposed) return; frame = window.requestAnimationFrame(animate); renderer.render(scene, camera); }; animate();
  return {
    loadBaseModel, setEquipment,
    setRotation: radians => { rotation = radians; modelRoot.rotation.y = radians; },
    dispose: () => {
      if (disposed) return; disposed = true; window.cancelAnimationFrame(frame); observer.disconnect();
      renderer.domElement.removeEventListener('pointerdown', pointerDown); renderer.domElement.removeEventListener('pointermove', pointerMove); renderer.domElement.removeEventListener('pointerup', pointerUp); renderer.domElement.removeEventListener('pointercancel', pointerUp);
      scene.traverse(object => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); const mats = Array.isArray(object.material) ? object.material : [object.material]; mats.forEach(material => material.dispose()); } });
      renderer.dispose(); renderer.domElement.remove();
    }
  };
}
