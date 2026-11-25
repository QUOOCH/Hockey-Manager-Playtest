/// <reference types="vite/client" />
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';

export type HeroGearSlot = 'helmet' | 'chest' | 'gloves' | 'stick' | 'skates' | 'jersey' | 'pants';
export type Hero3DOptions = { modelRoot?: string; allowRotation?: boolean; idleMotion?: boolean; onLoad?: () => void; onError?: (message: string) => void; onAnimationInfo?: (message: string) => void };
export type Hero3DStage = { loadBaseModel: (file?: string) => Promise<void>; setEquipment: (slot: HeroGearSlot, file: string | null) => Promise<void>; setRotation: (radians: number) => void; setSkeletonVisible: (visible: boolean) => void; setSkeletonEditable: (enabled: boolean) => void; dispose: () => void };
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
  let baseModel:THREE.Object3D|null=null,mixer:THREE.AnimationMixer|null=null,skeletonGuide:THREE.Group|null=null,skeletonEditable=false,selectedJoint:THREE.Mesh|null=null,frame=0,disposed=false,dragging=false,lastPointerX=0,rotation=-.28;
  const clock=new THREE.Clock();
  const allowRotation=options.allowRotation!==false;
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
    if(!allowRotation||e.pointerType==='touch'||(e.pointerType==='mouse'&&e.button!==0))return;
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
    if(!allowRotation||e.touches.length!==1)return;
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
    const load=(url:string):Promise<GLTF>=>loader.loadAsync(url);
  const loadBaseModel=async(file='base.glb')=>{try{const modelUrl=file.startsWith('blob:')||file.startsWith('http://')||file.startsWith('https://')?file:root+file;const gltf=await load(modelUrl);if(disposed)return;const next=gltf.scene;const bounds=new THREE.Box3().setFromObject(next),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3()),scale=3.25/Math.max(size.y,.01);next.scale.setScalar(scale);next.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);let skinnedMeshes=0;next.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;}if(o instanceof THREE.SkinnedMesh)skinnedMeshes++;});modelRoot.remove(procedural);if(baseModel)modelRoot.remove(baseModel);if(mixer){mixer.stopAllAction();mixer=null;}baseModel=next;modelRoot.add(next);const autoRigged=skinnedMeshes===0?autoRigStaticModel(next):false;if(gltf.animations.length&&skinnedMeshes){mixer=new THREE.AnimationMixer(next);gltf.animations.forEach((clip,index)=>{const action=mixer!.clipAction(clip);if(index===0)action.play();});options.onAnimationInfo?.('Анимации найдены: '+gltf.animations.map(a=>a.name||'без названия').join(', ')+'. Автоматически запущена первая.');}else if(autoRigged){options.onAnimationInfo?.('Настоящий скелет создан: 18 костей, иерархия суставов и автоматические веса вершин. Вращение суставов деформирует модель.');}else if(skinnedMeshes){options.onAnimationInfo?.('Скелет найден ('+skinnedMeshes+' skinned mesh), но готовых анимаций в файле нет.');}else{options.onAnimationInfo?.('Не удалось автоматически привязать геометрию к скелету. Модель оставлена без изменений.');}options.onLoad?.();}catch(e){options.onError?.(e instanceof Error?'Не удалось загрузить модель: '+e.message:'Не удалось загрузить 3D-модель.');}};
  const SKELETON_KEY='puckit-skeleton-joints-v3';
  const SKELETON_ROTATION_KEY='puckit-skeleton-rotations-v2';
  const jointPositions:Record<string,THREE.Vector3>={};
  const jointMeshes=new Map<string,THREE.Mesh>();
  const boneLines:THREE.Line[]=[];
  const raycaster=new THREE.Raycaster(),pointerNdc=new THREE.Vector2();
  const projectPointer=(clientX:number,clientY:number)=>{const rect=canvas.getBoundingClientRect();pointerNdc.set(((clientX-rect.left)/rect.width)*2-1,-((clientY-rect.top)/rect.height)*2+1);raycaster.setFromCamera(pointerNdc,camera);};
  const saveJointPositions=()=>{try{const data:Record<string,[number,number,number]>={};for(const [name,bone] of jointBones)data[name]=[bone.rotation.x,bone.rotation.y,bone.rotation.z];localStorage.setItem(SKELETON_ROTATION_KEY,JSON.stringify(data));}catch{/* storage may be unavailable */}};
  const updateBoneLines=()=>{for(let i=0;i<links.length;i++){const [a,b]=links[i],line=boneLines[i];if(!line)continue;const attr=line.geometry.getAttribute('position') as THREE.BufferAttribute;attr.setXYZ(0,jointPositions[a].x,jointPositions[a].y,jointPositions[a].z);attr.setXYZ(1,jointPositions[b].x,jointPositions[b].y,jointPositions[b].z);attr.needsUpdate=true;line.geometry.computeBoundingSphere();}};
  const links:[string,string][]=[['pelvis','spine'],['spine','chest'],['chest','neck'],['neck','head'],['head','helmet'],['chest','shoulderL'],['shoulderL','elbowL'],['elbowL','wristL'],['chest','shoulderR'],['shoulderR','elbowR'],['elbowR','wristR'],['pelvis','hipL'],['hipL','kneeL'],['kneeL','ankleL'],['pelvis','hipR'],['hipR','kneeR'],['kneeR','ankleR']];
  const parents:Record<string,string|null>={pelvis:null,spine:'pelvis',chest:'spine',neck:'chest',head:'neck',helmet:'head',shoulderL:'chest',elbowL:'shoulderL',wristL:'elbowL',shoulderR:'chest',elbowR:'shoulderR',wristR:'elbowR',hipL:'pelvis',kneeL:'hipL',ankleL:'kneeL',hipR:'pelvis',kneeR:'hipR',ankleR:'kneeR'};
  const defaults:Record<string,THREE.Vector3>={pelvis:new THREE.Vector3(.21,1.45,0),spine:new THREE.Vector3(.16,1.86,0),chest:new THREE.Vector3(-.08,2.20,0),neck:new THREE.Vector3(-.04,2.58,0),head:new THREE.Vector3(.02,2.96,0),helmet:new THREE.Vector3(.02,3.16,0),shoulderL:new THREE.Vector3(-.10,2.32,-.43),elbowL:new THREE.Vector3(-.04,2.02,-.68),wristL:new THREE.Vector3(.16,1.78,-.82),shoulderR:new THREE.Vector3(-.10,2.32,.43),elbowR:new THREE.Vector3(-.04,2.02,.68),wristR:new THREE.Vector3(.16,1.78,.82),hipL:new THREE.Vector3(.21,1.42,-.23),kneeL:new THREE.Vector3(.08,.88,-.25),ankleL:new THREE.Vector3(.10,.34,-.28),hipR:new THREE.Vector3(.21,1.42,.23),kneeR:new THREE.Vector3(.08,.88,.25),ankleR:new THREE.Vector3(.10,.34,.28)};
  const jointBones=new Map<string,THREE.Bone>();
  
  const ensureJointPositions=()=>{if(Object.keys(jointPositions).length)return;let saved:Record<string,number[]>={};try{saved=JSON.parse(localStorage.getItem(SKELETON_KEY)||'{}');}catch{/* use defaults */}for(const [name,pos] of Object.entries(defaults)){const value=saved[name];jointPositions[name]=Array.isArray(value)&&value.length===3&&value.every(Number.isFinite)?new THREE.Vector3(value[0],value[1],value[2]):pos.clone();}};
  const syncGuideFromBones=()=>{modelRoot.updateMatrixWorld(true);for(const [name,bone] of jointBones){const world=bone.getWorldPosition(new THREE.Vector3());jointPositions[name].copy(modelRoot.worldToLocal(world));const marker=jointMeshes.get(name);if(marker)marker.position.copy(jointPositions[name]);}updateBoneLines();};
  const autoRigStaticModel=(next:THREE.Group)=>{
    ensureJointPositions();
    const meshes:THREE.Mesh[]=[];next.traverse(o=>{if(o instanceof THREE.Mesh&&!(o instanceof THREE.SkinnedMesh))meshes.push(o);});
    if(!meshes.length)return false;
    next.updateMatrixWorld(true);modelRoot.updateMatrixWorld(true);
    const toNext=(p:THREE.Vector3)=>next.worldToLocal(modelRoot.localToWorld(p.clone()));
    const localJoints:Record<string,THREE.Vector3>={};for(const [name,p] of Object.entries(jointPositions))localJoints[name]=toNext(p);
    const bones:THREE.Bone[]=[];
    for(const name of Object.keys(parents)){const bone=new THREE.Bone();bone.name='PUCKIT_'+name;bone.userData.jointName=name;const parentName=parents[name];if(parentName){const parent=jointBones.get(parentName)!;bone.position.copy(localJoints[name]).sub(localJoints[parentName]);parent.add(bone);}else{bone.position.copy(localJoints[name]);next.add(bone);}jointBones.set(name,bone);bones.push(bone);}
    next.updateMatrixWorld(true);
    const skeleton=new THREE.Skeleton(bones);skeleton.calculateInverses();
    const segmentData=links.map(([a,b])=>{const start=localJoints[a],end=localJoints[b],delta=end.clone().sub(start);return{a,b,bone:bones.findIndex(x=>x.userData.jointName===a),ax:start.x,ay:start.y,az:start.z,dx:delta.x,dy:delta.y,dz:delta.z,lenSq:Math.max(delta.lengthSq(),1e-8)};});
    const adjacentSegments=segmentData.map((seg,i)=>segmentData.map((other,j)=>({other,j})).filter(({other,j})=>j!==i&&(seg.a===other.a||seg.a===other.b||seg.b===other.a||seg.b===other.b)).map(x=>x.j));
    for(const source of meshes){
      const relative=new THREE.Matrix4().copy(next.matrixWorld).invert().multiply(source.matrixWorld);
      const geometry=source.geometry.clone();geometry.applyMatrix4(relative);
      const pos=geometry.getAttribute('position');const count=pos.count;
      const indices=new Uint16Array(count*4),weights=new Float32Array(count*4);
      for(let i=0;i<count;i++){
        const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
        let nearest=-1,nearestD=Infinity;
        for(let j=0;j<segmentData.length;j++){const seg=segmentData[j],vx=x-seg.ax,vy=y-seg.ay,vz=z-seg.az;const t=Math.max(0,Math.min(1,(vx*seg.dx+vy*seg.dy+vz*seg.dz)/seg.lenSq));const ex=vx-t*seg.dx,ey=vy-t*seg.dy,ez=vz-t*seg.dz,d=ex*ex+ey*ey+ez*ez;if(d<nearestD){nearestD=d;nearest=j;}}
        let adjacent=-1,adjacentD=Infinity;
        for(const j of adjacentSegments[nearest]){const seg=segmentData[j],vx=x-seg.ax,vy=y-seg.ay,vz=z-seg.az;const t=Math.max(0,Math.min(1,(vx*seg.dx+vy*seg.dy+vz*seg.dz)/seg.lenSq));const ex=vx-t*seg.dx,ey=vy-t*seg.dy,ez=vz-t*seg.dz,d=ex*ex+ey*ey+ez*ez;if(d<adjacentD){adjacentD=d;adjacent=j;}}
        const offset=i*4,mainBone=segmentData[nearest].bone;
        indices[offset]=mainBone;indices[offset+1]=mainBone;indices[offset+2]=mainBone;indices[offset+3]=mainBone;
        weights[offset]=1;weights[offset+1]=0;weights[offset+2]=0;weights[offset+3]=0;
        if(adjacent>=0){const gap=Math.sqrt(adjacentD)-Math.sqrt(nearestD),blend=Math.max(0,Math.min(.5,.5*(1-gap/.16)));if(blend>.001){indices[offset+1]=segmentData[adjacent].bone;weights[offset]=1-blend;weights[offset+1]=blend;}}
      }
      geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));geometry.computeBoundingSphere();geometry.computeBoundingBox();
      const skinned=new THREE.SkinnedMesh(geometry,source.material);skinned.name=source.name||'PUCKIT_RIGGED_MESH';skinned.castShadow=true;skinned.receiveShadow=true;skinned.frustumCulled=false;skinned.userData={...source.userData};next.add(skinned);source.parent?.remove(source);next.updateMatrixWorld(true);skinned.bind(skeleton,skinned.matrixWorld);skinned.normalizeSkinWeights();
    }
    let savedRotations:Record<string,number[]>={};try{savedRotations=JSON.parse(localStorage.getItem(SKELETON_ROTATION_KEY)||'{}');}catch{/* use neutral pose */}for(const [name,rotation] of Object.entries(savedRotations)){const bone=jointBones.get(name);if(bone&&Array.isArray(rotation)&&rotation.length===3&&rotation.every(Number.isFinite))bone.rotation.set(rotation[0],rotation[1],rotation[2]);}
    next.updateMatrixWorld(true);syncGuideFromBones();return true;
  };
  let jointDragLastX=0,jointDragLastY=0;
  const rotateJointBranch=(jointName:string,horizontalAngle:number,verticalAngle:number)=>{
    const bone=jointBones.get(jointName);if(!bone||(Math.abs(horizontalAngle)<.0001&&Math.abs(verticalAngle)<.0001))return;
    const limbJoint=/^(shoulder|elbow|wrist|hip|knee|ankle)/.test(jointName);
    if(limbJoint){bone.rotation.x+=horizontalAngle;bone.rotation.z+=verticalAngle;}
    else{bone.rotation.z+=horizontalAngle;bone.rotation.x+=verticalAngle;}
    syncGuideFromBones();
  };
  const jointDown=(e:PointerEvent|TouchEvent)=>{
    if(!skeletonEditable||!skeletonGuide)return;
    const touch='touches'in e,point=touch?e.touches[0]:e as PointerEvent;if(!point)return;
    projectPointer(point.clientX,point.clientY);
    const hits=raycaster.intersectObjects([...jointMeshes.values()],false);if(!hits.length)return;
    selectedJoint=hits[0].object as THREE.Mesh;jointDragLastX=point.clientX;jointDragLastY=point.clientY;
    e.preventDefault();e.stopPropagation();
  };
  const jointMove=(e:PointerEvent|TouchEvent)=>{
    if(!selectedJoint||!skeletonEditable)return;
    const touch='touches'in e,point=touch?e.touches[0]:e as PointerEvent;if(!point)return;
    e.preventDefault();e.stopPropagation();
    const name=String(selectedJoint.userData.joint),dx=point.clientX-jointDragLastX,dy=point.clientY-jointDragLastY;
    jointDragLastX=point.clientX;jointDragLastY=point.clientY;
    // Horizontal drag bends in the character plane; vertical drag adds depth rotation.
    rotateJointBranch(name,dx*.012,dy*.009);
  };
  const jointUp=()=>{if(selectedJoint){saveJointPositions();selectedJoint=null;}};
  canvas.addEventListener('pointerdown',jointDown as EventListener,true);canvas.addEventListener('pointermove',jointMove as EventListener,true);canvas.addEventListener('pointerup',jointUp,true);canvas.addEventListener('pointercancel',jointUp,true);
  canvas.addEventListener('touchstart',jointDown as EventListener,{capture:true,passive:false});canvas.addEventListener('touchmove',jointMove as EventListener,{capture:true,passive:false});canvas.addEventListener('touchend',jointUp,true);canvas.addEventListener('touchcancel',jointUp,true);
  const setSkeletonEditable=(enabled:boolean)=>{skeletonEditable=enabled;canvas.style.cursor=enabled?'crosshair':'grab';if(!enabled)jointUp();};
  const setSkeletonVisible=(visible:boolean)=>{
    if(!visible){if(skeletonGuide){modelRoot.remove(skeletonGuide);skeletonGuide=null;}jointMeshes.clear();boneLines.length=0;selectedJoint=null;return;}
    if(skeletonGuide)return;
    const guide=new THREE.Group();guide.name='puckit-skeleton-guide';
    const jointMat=new THREE.MeshBasicMaterial({color:0x65e7ff,depthTest:false});
    const selectedMat=new THREE.MeshBasicMaterial({color:0xffc857,depthTest:false});
    const boneMat=new THREE.LineBasicMaterial({color:0x8beaff,transparent:true,opacity:.95,depthTest:false});
    ensureJointPositions();
    for(const [a,b] of links){const geo=new THREE.BufferGeometry().setFromPoints([jointPositions[a],jointPositions[b]]);const line=new THREE.Line(geo,boneMat);line.renderOrder=20;guide.add(line);boneLines.push(line);}
    for(const [name,pos] of Object.entries(jointPositions)){const mesh=new THREE.Mesh(new THREE.SphereGeometry(name==='head'?.095:.065,16,12),name==='pelvis'?selectedMat:jointMat);mesh.position.copy(pos);mesh.renderOrder=21;mesh.userData.joint=name;guide.add(mesh);jointMeshes.set(name,mesh);}
    modelRoot.add(guide);skeletonGuide=guide;
  };
  const setEquipment=async(slot:HeroGearSlot,file:string|null)=>{const anchor=modelRoot.getObjectByName(ANCHORS[slot]);if(!anchor){if(file)options.onError?.('Для этой экипировки GLB-модель ещё не подключена.');return;}const previous=equipment.get(slot);if(previous){anchor.remove(previous);equipment.delete(slot);}if(!file)return;try{const gltf=await load(root+'equipment/'+file);if(disposed)return;const part:THREE.Group=gltf.scene;anchor.add(part);equipment.set(slot,part);}catch(e){options.onError?.(e instanceof Error?e.message:'Не удалось загрузить предмет.');}};
  const animate=()=>{if(disposed)return;frame=requestAnimationFrame(animate);const delta=Math.min(clock.getDelta(),.05),elapsed=clock.elapsedTime;if(options.idleMotion){modelRoot.position.y=.012+Math.sin(elapsed*1.35)*.018;modelRoot.rotation.y=rotation;modelRoot.rotation.x=Math.sin(elapsed*.72)*.004;}else mixer?.update(delta);renderer.render(scene,camera);};animate();
  return{loadBaseModel,setEquipment,setSkeletonEditable,setRotation:r=>{rotation=r;modelRoot.rotation.y=r;},setSkeletonVisible,dispose:()=>{if(disposed)return;disposed=true;canvas.removeEventListener('pointerdown',jointDown as EventListener,true);canvas.removeEventListener('pointermove',jointMove as EventListener,true);canvas.removeEventListener('pointerup',jointUp,true);canvas.removeEventListener('pointercancel',jointUp,true);canvas.removeEventListener('touchstart',jointDown as EventListener,true);canvas.removeEventListener('touchmove',jointMove as EventListener,true);canvas.removeEventListener('touchend',jointUp,true);canvas.removeEventListener('touchcancel',jointUp,true);cancelAnimationFrame(frame);observer.disconnect();host.removeEventListener('pointerdown',down);host.removeEventListener('pointermove',move);host.removeEventListener('pointerup',up);host.removeEventListener('pointercancel',up);host.removeEventListener('lostpointercapture',up);host.removeEventListener('touchstart',touchStart);host.removeEventListener('touchmove',touchMove);host.removeEventListener('touchend',touchEnd);host.removeEventListener('touchcancel',touchEnd);mixer?.stopAllAction();scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>m.dispose());}});renderer.dispose();renderer.domElement.remove();}};
}
