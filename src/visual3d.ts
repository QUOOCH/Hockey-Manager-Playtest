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
  const mat=(color:number,roughness=.48,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  const navy=mat(0x101b31,.34,.18),purple=mat(0x6439bd,.38,.12),purpleDark=mat(0x38236f,.42,.18),white=mat(0xf1f4f8,.28,.12),black=mat(0x111722,.5,.16),steel=mat(0xa8c1d0,.22,.82),skin=mat(0xd99a78,.62),visor=mat(0x15283a,.16,.62),stitch=mat(0xb9a2ed,.5,.08);
  const group=new THREE.Group();target.add(group);
  const add=(geo:THREE.BufferGeometry,material:THREE.Material,x:number,y:number,z:number,rx=0,ry=0,rz=0)=>{const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);m.rotation.set(rx,ry,rz);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;};
  const oval=(x:number,y:number,z:number,sx:number,sy:number,sz:number,material:THREE.Material)=>{const m=add(new THREE.SphereGeometry(1,32,24),material,x,y,z);m.scale.set(sx,sy,sz);return m;};
  const link=(a:THREE.Vector3,b:THREE.Vector3,r1:number,r2:number,material:THREE.Material)=>{const d=new THREE.Vector3().subVectors(b,a),mesh=add(new THREE.CylinderGeometry(r2,r1,d.length(),18,1),material,(a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return mesh;};
  const capsule=(a:THREE.Vector3,b:THREE.Vector3,r:number,material:THREE.Material)=>{const d=new THREE.Vector3().subVectors(b,a),mesh=add(new THREE.CapsuleGeometry(r,Math.max(.02,d.length()-r*2),6,16),material,(a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return mesh;};
  const tube=(points:THREE.Vector3[],radius:number,material:THREE.Material)=>add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),32,radius,10,false),material,0,0,0);
  oval(0,2.38,0,.43,.3,.28,purple);oval(0,2.14,.005,.35,.47,.255,purple);oval(0,1.93,0,.34,.24,.25,purple);
  oval(0,1.82,.012,.352,.055,.258,white);oval(0,1.77,.018,.34,.035,.25,purpleDark);
  add(new THREE.TorusGeometry(.125,.025,10,32),white,0,2.55,.015,Math.PI/2);
  link(new THREE.Vector3(0,2.52,0),new THREE.Vector3(0,2.78,0),.105,.09,skin);
  oval(0,2.98,.012,.205,.25,.19,skin);oval(0,2.86,.075,.16,.115,.15,skin);
  oval(-.207,2.99,0,.045,.075,.045,skin);oval(.207,2.99,0,.045,.075,.045,skin);
  oval(.075,3.015,.183,.026,.018,.012,black);oval(-.075,3.015,.183,.026,.018,.012,black);
  link(new THREE.Vector3(-.12,3.06,.18),new THREE.Vector3(-.035,3.075,.19),.012,.01,navy);link(new THREE.Vector3(.035,3.075,.19),new THREE.Vector3(.12,3.06,.18),.01,.012,navy);
  oval(.015,2.965,.204,.018,.032,.018,skin);
  oval(0,3.17,0,.238,.17,.225,navy);oval(0,3.105,.12,.225,.075,.155,navy);oval(0,3.105,.236,.19,.025,.018,visor);
  oval(-.218,3.015,.015,.045,.09,.07,purpleDark);oval(.218,3.015,.015,.045,.09,.07,purpleDark);
  for(let i=-2;i<=2;i++){const x=i*.072;link(new THREE.Vector3(x,3.07,.238),new THREE.Vector3(x*.92,2.94,.235),.008,.008,steel);}
  link(new THREE.Vector3(-.17,3.07,.235),new THREE.Vector3(.17,3.07,.235),.01,.01,steel);
  const lS=new THREE.Vector3(-.34,2.42,0),lE=new THREE.Vector3(-.51,2.12,.06),lW=new THREE.Vector3(-.4,1.83,.23),rS=new THREE.Vector3(.34,2.42,0),rE=new THREE.Vector3(.5,2.16,.09),rW=new THREE.Vector3(.34,1.94,.25);
  oval(-.36,2.39,0,.19,.2,.2,purple);oval(.36,2.39,0,.19,.2,.2,purple);
  capsule(lS,lE,.125,purple);capsule(lE,lW,.095,purpleDark);capsule(rS,rE,.125,purple);capsule(rE,rW,.095,purpleDark);
  for(const [a,b] of [[lS,lE],[rS,rE]] as [THREE.Vector3,THREE.Vector3][]){const dir=new THREE.Vector3().subVectors(b,a).normalize();for(const t of [.34,.48]){const p=a.clone().lerp(b,t),ring=add(new THREE.TorusGeometry(.117,.025,8,24),white,p.x,p.y,p.z);ring.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),dir);}}
  for(const [x,y,z] of [[-.4,1.8,.24],[.34,1.91,.26]] as number[][]){oval(x,y,z,.145,.115,.14,navy);oval(x,y-.025,z+.065,.12,.09,.105,purpleDark);const cuff=add(new THREE.TorusGeometry(.095,.027,8,24),purple,x,y-.095,z);cuff.rotation.x=Math.PI/2;for(let n=0;n<3;n++)link(new THREE.Vector3(x-.075+n*.05,y-.06,z+.13),new THREE.Vector3(x-.07+n*.05,y-.12,z+.14),.012,.01,stitch);}
  oval(0,1.48,0,.34,.24,.255,black);oval(0,1.62,.015,.35,.075,.26,purpleDark);
  const leftHip=new THREE.Vector3(-.17,1.38,0),leftKnee=new THREE.Vector3(-.21,.86,.04),rightHip=new THREE.Vector3(.17,1.38,0),rightKnee=new THREE.Vector3(.21,.86,.04);
  capsule(leftHip,leftKnee,.125,black);capsule(rightHip,rightKnee,.125,black);
  for(const x of [-.21,.21]){capsule(new THREE.Vector3(x,.91,.08),new THREE.Vector3(x,.48,.1),.115,purple);for(const y of [.72,.62]){const band=add(new THREE.TorusGeometry(.108,.025,8,28),white,x,y,.09);band.rotation.x=Math.PI/2;}oval(x,.83,.16,.125,.23,.055,purpleDark);oval(x,.82,.205,.115,.19,.025,white);}
  for(const x of [-.21,.21]){oval(x,.43,.15,.145,.12,.27,black);oval(x,.49,.21,.115,.09,.18,purpleDark);oval(x,.55,.31,.095,.07,.07,white);for(let n=0;n<5;n++){const yy=.46+n*.027;link(new THREE.Vector3(x-.065,yy,.29),new THREE.Vector3(x+.065,yy+.018,.29),.009,.009,white);}add(new THREE.BoxGeometry(.22,.045,.39),steel,x,.32,.16);add(new THREE.BoxGeometry(.018,.035,.43),black,x,.29,.16);add(new THREE.BoxGeometry(.018,.012,.46),steel,x,.265,.16);}
  tube([new THREE.Vector3(.34,1.92,.28),new THREE.Vector3(.49,1.42,.3),new THREE.Vector3(.65,.92,.32),new THREE.Vector3(.78,.48,.34)],.025,black);
  tube([new THREE.Vector3(.78,.48,.34),new THREE.Vector3(.91,.43,.34),new THREE.Vector3(1.05,.46,.34)],.035,white);
  oval(-.13,2.17,.23,.065,.065,.035,white);
  tube([new THREE.Vector3(-.28,2.48,.18),new THREE.Vector3(-.2,2.53,.22),new THREE.Vector3(0,2.55,.23),new THREE.Vector3(.2,2.53,.22),new THREE.Vector3(.28,2.48,.18)],.009,stitch);
  link(new THREE.Vector3(-.31,1.97,.19),new THREE.Vector3(-.31,2.3,.19),.012,.012,white);link(new THREE.Vector3(.31,1.97,.19),new THREE.Vector3(.31,2.3,.19),.012,.012,white);
  group.position.y=.12;return group;
}

/** Premium mobile-first 3D player. The procedural model is immediately available; an approved GLB can replace it later. */
export function mountHero3DStage(host:HTMLElement,options:Hero3DOptions={}):Hero3DStage|null{
  let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}catch{options.onError?.('WebGL недоступен на этом устройстве.');return null;}
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(30,1,.1,40);
  camera.position.set(.32,2.05,8.15);camera.lookAt(0,1.62,0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.32;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.domElement.className='hero-3d-canvas';renderer.domElement.setAttribute('aria-label','Вращаемая 3D-модель хоккеиста');host.appendChild(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xd9edff,0x26364b,2.55));
  scene.add(new THREE.AmbientLight(0xffffff,.62));
  const key=new THREE.DirectionalLight(0xf1f8ff,3.45);key.position.set(-3.5,5,4);key.castShadow=true;scene.add(key);
  const fill=new THREE.DirectionalLight(0x58b8f4,2.55);fill.position.set(4,2.5,-2);scene.add(fill);
  const rim=new THREE.DirectionalLight(0x78dfff,2.8);rim.position.set(0,4,-4);scene.add(rim);
  const pedestal=new THREE.Mesh(new THREE.CylinderGeometry(.92,1.02,.12,48),new THREE.MeshStandardMaterial({color:0x153d5b,metalness:.58,roughness:.32}));pedestal.position.y=.06;scene.add(pedestal);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.88,.012,8,64),new THREE.MeshBasicMaterial({color:0x65d9ff}));ring.rotation.x=Math.PI/2;ring.position.y=.125;scene.add(ring);
  const modelRoot=new THREE.Group();scene.add(modelRoot);const procedural=makeProceduralHockeyPlayer(modelRoot);
  const loader=new GLTFLoader(),root=options.modelRoot||DEFAULT_ROOT,equipment=new Map<HeroGearSlot,THREE.Object3D>();
  let baseModel:THREE.Object3D|null=null,frame=0,disposed=false,dragging=false,lastPointerX=0,rotation=-.28;
  modelRoot.rotation.y=rotation;
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
  const loadBaseModel=async(file='base.glb')=>{try{const modelUrl=file.startsWith('blob:')||file.startsWith('http://')||file.startsWith('https://')?file:root+file;const next=await load(modelUrl);if(disposed)return;const bounds=new THREE.Box3().setFromObject(next),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3()),scale=3.25/Math.max(size.y,.01);next.scale.setScalar(scale);next.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);next.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;}});modelRoot.remove(procedural);if(baseModel)modelRoot.remove(baseModel);baseModel=next;modelRoot.add(next);options.onLoad?.();}catch{options.onLoad?.();}};
  const setEquipment=async(slot:HeroGearSlot,file:string|null)=>{const anchor=modelRoot.getObjectByName(ANCHORS[slot]);if(!anchor){if(file)options.onError?.('Для этой экипировки GLB-модель ещё не подключена.');return;}const previous=equipment.get(slot);if(previous){anchor.remove(previous);equipment.delete(slot);}if(!file)return;try{const part=await load(root+'equipment/'+file);if(disposed)return;anchor.add(part);equipment.set(slot,part);}catch(e){options.onError?.(e instanceof Error?e.message:'Не удалось загрузить предмет.');}};
  const animate=()=>{if(disposed)return;frame=requestAnimationFrame(animate);/* Deliberately stationary: rotation is controlled only by the user's drag. */renderer.render(scene,camera);};animate();
  return{loadBaseModel,setEquipment,setRotation:r=>{rotation=r;modelRoot.rotation.y=r;},dispose:()=>{if(disposed)return;disposed=true;cancelAnimationFrame(frame);observer.disconnect();host.removeEventListener('pointerdown',down);host.removeEventListener('pointermove',move);host.removeEventListener('pointerup',up);host.removeEventListener('pointercancel',up);host.removeEventListener('lostpointercapture',up);host.removeEventListener('touchstart',touchStart);host.removeEventListener('touchmove',touchMove);host.removeEventListener('touchend',touchEnd);host.removeEventListener('touchcancel',touchEnd);scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>m.dispose());}});renderer.dispose();renderer.domElement.remove();}};
}
