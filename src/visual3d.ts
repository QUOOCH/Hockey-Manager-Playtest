/// <reference types="vite/client" />
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export type HeroGearSlot = 'helmet' | 'chest' | 'gloves' | 'stick' | 'skates' | 'jersey' | 'pants';
export type Hero3DOptions = { modelRoot?: string; onLoad?: () => void; onError?: (message: string) => void };
export type Hero3DStage = { loadBaseModel: (file?: string) => Promise<void>; setEquipment: (slot: HeroGearSlot, file: string | null) => Promise<void>; setRotation: (radians: number) => void; dispose: () => void };
const DEFAULT_ROOT = import.meta.env.BASE_URL + 'assets/models/hero/center/';
const ANCHORS: Record<HeroGearSlot, string> = { helmet:'slot_helmet', chest:'slot_chest', gloves:'slot_gloves', stick:'slot_stick', skates:'slot_skates', jersey:'slot_jersey', pants:'slot_pants' };

function roundedBox(w:number,h:number,d:number,r:number,material:THREE.Material){
  const shape=new THREE.Shape(),x=-w/2,y=-h/2;
  shape.moveTo(x+r,y);shape.lineTo(x+w-r,y);shape.quadraticCurveTo(x+w,y,x+w,y+r);shape.lineTo(x+w,y+h-r);shape.quadraticCurveTo(x+w,y+h,x+w-r,y+h);shape.lineTo(x+r,y+h);shape.quadraticCurveTo(x,y+h,x,y+h-r);shape.lineTo(x,y+r);shape.quadraticCurveTo(x,y,x+r,y);
  const geo=new THREE.ExtrudeGeometry(shape,{depth:Math.max(.01,d-2*r),bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:r,bevelThickness:r,curveSegments:8});
  geo.translate(0,0,-Math.max(.01,d-2*r)/2);return new THREE.Mesh(geo,material);
}
function makeProceduralHockeyPlayer(target:THREE.Group){
  const navy=new THREE.MeshStandardMaterial({color:0x102e49,roughness:.48,metalness:.12}),blue=new THREE.MeshStandardMaterial({color:0x1678a8,roughness:.42,metalness:.16}),ice=new THREE.MeshStandardMaterial({color:0xe9f7fb,roughness:.28,metalness:.25}),red=new THREE.MeshStandardMaterial({color:0xd43a4b,roughness:.4,metalness:.12}),dark=new THREE.MeshStandardMaterial({color:0x081521,roughness:.56}),steel=new THREE.MeshStandardMaterial({color:0x9ab8c7,metalness:.8,roughness:.24}),skin=new THREE.MeshStandardMaterial({color:0xb97855,roughness:.72}),gold=new THREE.MeshStandardMaterial({color:0xd8ad5c,metalness:.55,roughness:.3});
  const group=new THREE.Group();target.add(group);
  const add=(geo:THREE.BufferGeometry,mat:THREE.Material,x:number,y:number,z:number,rx=0,ry=0,rz=0)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.rotation.set(rx,ry,rz);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;};
  const sphere=(x:number,y:number,z:number,sx:number,sy:number,sz:number,mat:THREE.Material)=>{const m=add(new THREE.SphereGeometry(1,24,18),mat,x,y,z);m.scale.set(sx,sy,sz);return m;};
  const limb=(a:THREE.Vector3,b:THREE.Vector3,r:number,mat:THREE.Material)=>{const d=new THREE.Vector3().subVectors(b,a);const m=add(new THREE.CapsuleGeometry(r,Math.max(.01,d.length()-r*2),5,12),mat,(a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return m;};
  // Broad shoulder silhouette, padded jersey and recognizable hockey proportions.
  sphere(0,2.38,0,.39,.27,.25,blue);
  const torso=roundedBox(.62,.78,.34,.11,blue);torso.position.set(0,1.98,0);group.add(torso);
  const chest=roundedBox(.54,.42,.365,.08,navy);chest.position.set(0,2.08,.015);group.add(chest);
  const stripe=roundedBox(.56,.075,.372,.025,red);stripe.position.set(0,1.91,.02);group.add(stripe);
  const number=roundedBox(.18,.22,.018,.025,ice);number.position.set(0,2.08,.204);group.add(number);
  add(new THREE.CylinderGeometry(.105,.12,.17,16),skin,0,2.83,0);sphere(0,3.04,0,.22,.25,.21,skin);
  // Helmet, visor and metal face cage.
  const helmet=sphere(0,3.11,0,.245,.22,.235,red);helmet.scale.y=.82;sphere(0,3.16,.09,.19,.12,.16,blue);
  add(new THREE.BoxGeometry(.37,.055,.035),ice,0,3.06,.21);
  for(let i=-2;i<=2;i++){const x=i*.061;limb(new THREE.Vector3(x,3.02,.224),new THREE.Vector3(x,2.91,.235),.009,steel);}
  limb(new THREE.Vector3(-.2,3.02,.22),new THREE.Vector3(.2,3.02,.22),.012,steel);
  // Arms and padded gloves in a natural stick-handling pose.
  const shoulderL=new THREE.Vector3(-.34,2.48,0),elbowL=new THREE.Vector3(-.49,2.12,.06),handL=new THREE.Vector3(-.39,1.82,.22),shoulderR=new THREE.Vector3(.34,2.48,0),elbowR=new THREE.Vector3(.49,2.16,.1),handR=new THREE.Vector3(.32,1.93,.26);
  limb(shoulderL,elbowL,.145,navy);limb(elbowL,handL,.105,blue);limb(shoulderR,elbowR,.145,navy);limb(elbowR,handR,.105,blue);
  for(const [x,y,z] of [[-.39,1.82,.22],[.32,1.93,.26]] as number[][]){const g=roundedBox(.24,.18,.22,.055,red);g.position.set(x,y,z);group.add(g);const cuff=roundedBox(.22,.055,.225,.02,ice);cuff.position.set(x,y-.105,z);group.add(cuff);}
  const pants=roundedBox(.62,.36,.39,.1,navy);pants.position.set(0,1.48,0);group.add(pants);
  const belt=roundedBox(.58,.065,.4,.02,red);belt.position.set(0,1.66,0);group.add(belt);
  limb(new THREE.Vector3(-.17,1.34,0),new THREE.Vector3(-.2,.72,.03),.12,navy);limb(new THREE.Vector3(.17,1.34,0),new THREE.Vector3(.2,.72,.03),.12,navy);
  for(const x of [-.2,.2]){const pad=roundedBox(.23,.54,.24,.065,ice);pad.position.set(x,.85,.11);group.add(pad);const padStripe=roundedBox(.235,.055,.25,.02,red);padStripe.position.set(x,.84,.12);group.add(padStripe);sphere(x,1.14,.12,.14,.12,.14,blue);}
  // Skates with steel blades and visible laces.
  for(const x of [-.2,.2]){const boot=roundedBox(.25,.2,.43,.06,navy);boot.position.set(x,.48,.12);group.add(boot);sphere(x,.48,.29,.12,.085,.12,blue);add(new THREE.BoxGeometry(.24,.025,.5),steel,x,.36,.14);for(let n=0;n<4;n++)add(new THREE.BoxGeometry(.1,.012,.012),ice,x,.53+n*.027,.34);}
  // Composite stick and puck.
  limb(new THREE.Vector3(.43,1.94,.18),new THREE.Vector3(.7,.47,.25),.025,dark);
  const blade=roundedBox(.3,.055,.075,.02,ice);blade.position.set(.82,.43,.25);blade.rotation.z=-.16;group.add(blade);
  add(new THREE.CircleGeometry(.075,24),gold,-.13,2.23,.205);
  add(new THREE.CylinderGeometry(.11,.11,.045,24),dark,.72,.18,.35,Math.PI/2);
  group.position.y=.12;return group;
}

/** Premium mobile-first 3D player. The procedural model is immediately available; an approved GLB can replace it later. */
export function mountHero3DStage(host:HTMLElement,options:Hero3DOptions={}):Hero3DStage|null{
  let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}catch{options.onError?.('WebGL недоступен на этом устройстве.');return null;}
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,1,.1,40);
  camera.position.set(0,1.8,7.5);camera.lookAt(0,1.75,0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.18;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.domElement.className='hero-3d-canvas';renderer.domElement.setAttribute('aria-label','Вращаемая 3D-модель хоккеиста');host.appendChild(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xc8eaff,0x07182a,2));
  const key=new THREE.DirectionalLight(0xe8f7ff,3.1);key.position.set(-3.5,5,4);key.castShadow=true;scene.add(key);
  const fill=new THREE.DirectionalLight(0x299be8,2.2);fill.position.set(4,2.5,-2);scene.add(fill);
  const rim=new THREE.DirectionalLight(0x78dfff,2.8);rim.position.set(0,4,-4);scene.add(rim);
  const pedestal=new THREE.Mesh(new THREE.CylinderGeometry(.92,1.02,.12,48),new THREE.MeshStandardMaterial({color:0x153d5b,metalness:.58,roughness:.32}));pedestal.position.y=.06;scene.add(pedestal);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.88,.012,8,64),new THREE.MeshBasicMaterial({color:0x65d9ff}));ring.rotation.x=Math.PI/2;ring.position.y=.125;scene.add(ring);
  const modelRoot=new THREE.Group();scene.add(modelRoot);const procedural=makeProceduralHockeyPlayer(modelRoot);
  const loader=new GLTFLoader(),root=options.modelRoot||DEFAULT_ROOT,equipment=new Map<HeroGearSlot,THREE.Object3D>();
  let baseModel:THREE.Object3D|null=null,frame=0,disposed=false,dragging=false,lastPointerX=0,rotation=0;
  const resize=()=>{if(disposed)return;const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);};
  const observer=new ResizeObserver(resize);observer.observe(host);resize();
  let activePointerId:number|null=null;
  const canvas=renderer.domElement;
  const beginDrag=(x:number)=>{dragging=true;lastPointerX=x;};
  const dragTo=(x:number)=>{if(!dragging)return;rotation+=(x-lastPointerX)*.012;lastPointerX=x;modelRoot.rotation.y=rotation;};
  const endDrag=()=>{dragging=false;activePointerId=null;};
  // Mouse/pen uses Pointer Events. iOS Safari gets an explicit Touch Events path.
  const down=(e:PointerEvent)=>{
    if(e.pointerType==='touch'||(e.pointerType==='mouse'&&e.button!==0))return;
    e.preventDefault();beginDrag(e.clientX);activePointerId=e.pointerId;
    try{host.setPointerCapture(e.pointerId);}catch{/* capture is optional */}
  };
  const move=(e:PointerEvent)=>{
    if(e.pointerType==='touch'||!dragging||activePointerId!==e.pointerId)return;
    e.preventDefault();dragTo(e.clientX);
  };
  const up=(e:PointerEvent)=>{
    if(e.pointerType==='touch'||activePointerId!==e.pointerId)return;
    endDrag();
    try{if(host.hasPointerCapture(e.pointerId))host.releasePointerCapture(e.pointerId);}catch{/* no-op */}
  };
  const touchStart=(e:TouchEvent)=>{
    if(e.touches.length!==1)return;
    e.preventDefault();beginDrag(e.touches[0].clientX);
  };
  const touchMove=(e:TouchEvent)=>{
    if(!dragging||e.touches.length!==1)return;
    e.preventDefault();dragTo(e.touches[0].clientX);
  };
  const touchEnd=(e:TouchEvent)=>{if(e.touches.length===0)endDrag();};
  host.addEventListener('pointerdown',down);
  host.addEventListener('pointermove',move);
  host.addEventListener('pointerup',up);
  host.addEventListener('pointercancel',up);
  host.addEventListener('lostpointercapture',up);
  host.addEventListener('touchstart',touchStart,{passive:false});
  host.addEventListener('touchmove',touchMove,{passive:false});
  host.addEventListener('touchend',touchEnd,{passive:false});
  host.addEventListener('touchcancel',touchEnd,{passive:false});
    const load=(url:string)=>new Promise<THREE.Object3D>((resolve,reject)=>loader.load(url,g=>resolve(g.scene),undefined,reject));
  const loadBaseModel=async(file='base.glb')=>{try{const next=await load(root+file);if(disposed)return;const bounds=new THREE.Box3().setFromObject(next),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3()),scale=3.25/Math.max(size.y,.01);next.scale.setScalar(scale);next.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);next.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;}});modelRoot.remove(procedural);if(baseModel)modelRoot.remove(baseModel);baseModel=next;modelRoot.add(next);options.onLoad?.();}catch{options.onLoad?.();}};
  const setEquipment=async(slot:HeroGearSlot,file:string|null)=>{const anchor=modelRoot.getObjectByName(ANCHORS[slot]);if(!anchor){if(file)options.onError?.('Для этой экипировки GLB-модель ещё не подключена.');return;}const previous=equipment.get(slot);if(previous){anchor.remove(previous);equipment.delete(slot);}if(!file)return;try{const part=await load(root+'equipment/'+file);if(disposed)return;anchor.add(part);equipment.set(slot,part);}catch(e){options.onError?.(e instanceof Error?e.message:'Не удалось загрузить предмет.');}};
  const animate=()=>{if(disposed)return;frame=requestAnimationFrame(animate);/* Deliberately stationary: rotation is controlled only by the user's drag. */renderer.render(scene,camera);};animate();
  return{loadBaseModel,setEquipment,setRotation:r=>{rotation=r;modelRoot.rotation.y=r;},dispose:()=>{if(disposed)return;disposed=true;cancelAnimationFrame(frame);observer.disconnect();host.removeEventListener('pointerdown',down);host.removeEventListener('pointermove',move);host.removeEventListener('pointerup',up);host.removeEventListener('pointercancel',up);host.removeEventListener('lostpointercapture',up);host.removeEventListener('touchstart',touchStart);host.removeEventListener('touchmove',touchMove);host.removeEventListener('touchend',touchEnd);host.removeEventListener('touchcancel',touchEnd);scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>m.dispose());}});renderer.dispose();renderer.domElement.remove();}};
}
