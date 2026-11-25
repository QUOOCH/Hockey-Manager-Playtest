import * as THREE from 'three';

export type City3DStage = { dispose: () => void };

export function mountCity3D(host: HTMLElement, onSelect: (screen: string) => void): City3DStage {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'default' });
  } catch (error) {
    host.innerHTML = '<div class="city-3d-fallback"><b>3D-город не запустился</b><span>Похоже, браузер не дал доступ к WebGL. Перезагрузи страницу или открой её в Safari.</span></div>';
    console.error('Puck It! city WebGL init failed', error);
    return { dispose: () => { host.innerHTML = ''; } };
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xc7e3ef);
  scene.fog = new THREE.Fog(0xc7e3ef, 72, 138);
  const camera = new THREE.PerspectiveCamera(38, 1, .1, 180);
  const target = new THREE.Vector3(0, 0, 0);
  const azimuth = Math.PI / 4;
  const elevation = .78;
  let distance = 61;
  const updateCamera = () => {
    const horizontal = Math.cos(elevation) * distance;
    camera.position.set(
      target.x + Math.sin(azimuth) * horizontal,
      target.y + Math.sin(elevation) * distance,
      target.z + Math.cos(azimuth) * horizontal
    );
    camera.lookAt(target);
  };
  updateCamera();

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.setSize(Math.max(1, host.clientWidth), Math.max(1, host.clientHeight));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.28;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none';
  renderer.domElement.setAttribute('aria-label', 'Объёмный хоккейный город. Перемещайте карту пальцем.');
  host.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xe9f7ff, 0x637b8c, 2.25));
  scene.add(new THREE.AmbientLight(0xffffff, .55));
  const sun = new THREE.DirectionalLight(0xfff3df, 3.2);
  sun.position.set(-24, 38, 18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -42; sun.shadow.camera.right = 42;
  sun.shadow.camera.top = 42; sun.shadow.camera.bottom = -42;
  sun.shadow.normalBias = .035;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x8bd7ff, 1.25);
  fill.position.set(28, 18, -24); scene.add(fill);

  const mat = (color: number, roughness = .78, metalness = 0) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const snow = mat(0xe9f4f8), snowShade = mat(0xc5dce8), ice = mat(0x9bd9ed, .24),
    iceBright = mat(0xd8f5ff, .28), road = mat(0x657f91), asphalt = mat(0x526a7c),
    navy = mat(0x243b58), glass = mat(0x83c9e4, .2, .12), warmGlass = mat(0xffd99b, .3),
    pineDark = mat(0x174b50), pineMid = mat(0x23666a), wood = mat(0x755b4a),
    red = mat(0xc84e5d), purple = mat(0x65528e), gold = mat(0xe6b85c, .32, .45),
    white = mat(0xffffff), shadowMat = mat(0x9cb6c5);

  const box = (parent: THREE.Object3D, w: number, h: number, d: number, material: THREE.Material,
    x: number, y: number, z: number, bevel = false) => {
    const geometry = bevel
      ? new THREE.BoxGeometry(w, h, d, 1, 1, 1)
      : new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh);
    return mesh;
  };
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), snow);
  ground.rotation.x = -Math.PI / 2; ground.position.y = -.08; ground.receiveShadow = true; scene.add(ground);

  // Snowy rolling banks give the town a miniature diorama silhouette.
  for (let i = 0; i < 22; i++) {
    const x = ((i * 17) % 86) - 43, z = ((i * 29) % 82) - 41;
    if (Math.abs(x) < 18 && Math.abs(z) < 17) continue;
    const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), i % 3 ? snow : snowShade);
    hill.scale.set(3 + (i % 4), .5 + (i % 3) * .18, 2.2 + (i % 3));
    hill.position.set(x, -.05, z); hill.receiveShadow = true; scene.add(hill);
  }

  // Roads form a walkable town grid around the central rink.
  const roadStrip = (x: number, z: number, w: number, d: number) => {
    box(scene, w, .12, d, snowShade, x, -.01, z);
    box(scene, w * .96, .08, d * .96, road, x, .11, z);
    box(scene, w * .94, .025, d * .94, asphalt, x, .19, z);
  };
  roadStrip(0, 0, 7, 76); roadStrip(0, 0, 76, 7);
  roadStrip(-25, 0, 4, 62); roadStrip(25, 0, 4, 62);
  roadStrip(0, -25, 62, 4); roadStrip(0, 25, 62, 4);
  // Snowy sidewalks and small crossing marks.
  for (const x of [-4.2, 4.2]) for (let z = -30; z <= 30; z += 8) box(scene, .18, .035, 1.4, white, x, .22, z);
  for (const z of [-4.2, 4.2]) for (let x = -30; x <= 30; x += 8) box(scene, 1.4, .035, .18, white, x, .22, z);

  const clickable: THREE.Object3D[] = [];
  const rink = new THREE.Group(); rink.position.set(0, .22, 0); rink.userData.screen = 'stadium'; scene.add(rink); clickable.push(rink);
  // Arena foundation, ice, boards and a raised spectator hall.
  box(rink, 22, .8, 16, navy, 0, 0, 0);
  box(rink, 21.5, .22, 15.5, white, 0, .8, 0);
  box(rink, 20.8, .12, 14.8, ice, 0, 1.02, 0);
  for (const z of [-7.35, 7.35]) {
    box(rink, 20.7, 1.05, .32, white, 0, 1.12, z);
    box(rink, 20.5, .52, .12, mat(0x7eb6cb), 0, 1.3, z + (z < 0 ? .18 : -.18));
  }
  for (const x of [-10.35, 10.35]) box(rink, .32, 1.05, 14.7, white, x, 1.12, 0);
  // Ice markings.
  box(rink, .09, .025, 14.3, mat(0xd94f65), 0, 1.15, 0);
  box(rink, 20.1, .025, .08, mat(0xd94f65), 0, 1.15, 0);
  for (const x of [-6.8, 6.8]) {
    const circle = new THREE.Mesh(new THREE.TorusGeometry(1.65, .055, 8, 48), mat(0x4d83c4));
    circle.rotation.x = Math.PI / 2; circle.position.set(x, 1.17, 0); rink.add(circle);
    const dot = new THREE.Mesh(new THREE.CircleGeometry(.11, 20), mat(0xd94f65));
    dot.rotation.x = -Math.PI / 2; dot.position.set(x, 1.17, 0); rink.add(dot);
  }
  const centerCircle = new THREE.Mesh(new THREE.TorusGeometry(2.1, .045, 8, 48), mat(0x4d83c4));
  centerCircle.rotation.x = Math.PI / 2; centerCircle.position.y = 1.17; rink.add(centerCircle);
  // Goal cages and rink-side lamps.
  for (const z of [-6.4, 6.4]) {
    const goal = new THREE.Group(); goal.position.set(0, 1.18, z); rink.add(goal);
    const goalMat = mat(0xeaf7ff, .3, .35);
    box(goal, 1.8, .12, .12, goalMat, 0, 0, 0);
    box(goal, .12, 1.15, .12, goalMat, -.84, 0, 0);
    box(goal, .12, 1.15, .12, goalMat, .84, 0, 0);
    box(goal, 1.8, .08, .08, goalMat, 0, 1.05, 0);
  }
  // Arena roof trusses and glass end walls.
  const hall = new THREE.Group(); hall.position.set(0, 0, 0); rink.add(hall);
  box(hall, 21.5, .35, 15.8, mat(0x385b78), 0, 10.2, 0);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(12.5, 4.4, 4), mat(0x4e6f91));
  roof.rotation.y = Math.PI / 4; roof.position.set(0, 12.45, 0); roof.scale.z = .72; roof.castShadow = true; hall.add(roof);
  box(hall, 21.3, 7.8, .3, glass, 0, 1.8, -7.65);
  box(hall, 21.3, 7.8, .3, glass, 0, 1.8, 7.65);
  for (const x of [-10.4, 10.4]) box(hall, .3, 8, 15.2, navy, x, 1.8, 0);
  // Keep ice visible through an open front: the rink remains the town's visual anchor.
  hall.visible = false;

  function makeBuilding(x: number, z: number, screen: string, title: string, wallColor: number, roofColor: number, width = 8, depth = 7) {
    const group = new THREE.Group(); group.position.set(x, .2, z); group.userData.screen = screen; scene.add(group); clickable.push(group);
    // Raised snowy plot and foundation.
    box(group, width + .9, .42, depth + .9, shadowMat, 0, 0, 0);
    box(group, width + .55, .24, depth + .55, white, 0, .4, 0);
    box(group, width, 3.8, depth, mat(wallColor), 0, .64, 0);
    // Gabled roof built from two thick sloped planes, with snow caps.
    const roofA = box(group, width * .59, .34, depth + .8, mat(roofColor), -width * .25, 4.38, 0);
    roofA.rotation.z = -.42;
    const roofB = box(group, width * .59, .34, depth + .8, mat(roofColor), width * .25, 4.38, 0);
    roofB.rotation.z = .42;
    const snowA = box(group, width * .59, .13, depth + .82, white, -width * .25, 4.59, 0); snowA.rotation.z = -.42;
    const snowB = box(group, width * .59, .13, depth + .82, white, width * .25, 4.59, 0); snowB.rotation.z = .42;
    // Timber trim, corner beams and lit facade.
    for (const xx of [-width / 2 + .18, width / 2 - .18]) {
      box(group, .22, 3.7, .24, mat(0xf1dfc8), xx, .7, depth / 2 + .08);
      box(group, 1.15, 1.55, .16, glass, xx * .62, 2.05, depth / 2 + .11);
      box(group, .94, 1.34, .08, warmGlass, xx * .62, 2.15, depth / 2 + .2);
      box(group, .1, 1.55, .1, white, xx * .62, 2.05, depth / 2 + .27);
      box(group, 1.15, .1, .1, white, xx * .62, 2.05, depth / 2 + .27);
    }
    box(group, 1.45, 2.45, .22, wood, 0, .72, depth / 2 + .13);
    box(group, .95, 1.5, .06, mat(0x38516b), 0, 1.2, depth / 2 + .27);
    box(group, width + .15, .25, .35, mat(0x263d58), 0, 3.7, depth / 2 + .28);
    // Snowy entrance steps.
    box(group, 2.4, .2, .8, snowShade, 0, .5, depth / 2 + .65);
    // Sign plate; lettering is handled by the in-game building label overlay.
    const sign = new THREE.Mesh(new THREE.BoxGeometry(2.8, .62, .12), mat(0x203d5a));
    sign.position.set(0, 3.2, depth / 2 + .34); group.add(sign);
    const badge = new THREE.Mesh(new THREE.BoxGeometry(.42, .42, .14), gold);
    badge.position.set(-1.02, 3.2, depth / 2 + .43); group.add(badge);
    const signCanvas = document.createElement('canvas'); signCanvas.width = 512; signCanvas.height = 128;
    const ctx = signCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#203d5a'; ctx.fillRect(0, 0, 512, 128);
      ctx.strokeStyle = '#e8c477'; ctx.lineWidth = 8; ctx.strokeRect(7, 7, 498, 114);
      ctx.fillStyle = '#f8fbff'; ctx.font = 'bold 58px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(title, 276, 66);
    }
    const signTexture = new THREE.CanvasTexture(signCanvas); signTexture.colorSpace = THREE.SRGBColorSpace;
    const signFace = new THREE.Mesh(new THREE.PlaneGeometry(2.55, .58), new THREE.MeshBasicMaterial({ map: signTexture }));
    signFace.position.set(.12, 3.2, depth / 2 + .415); group.add(signFace);
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(.75, 1.35, .72), mat(0x9a6e61));
    chimney.position.set(width * .29, 5.12, -depth * .18); chimney.castShadow = true; group.add(chimney);
    box(group, .95, .18, .9, white, width * .29, 5.78, -depth * .18);
    for (let puff = 0; puff < 3; puff++) {
      const smoke = new THREE.Mesh(new THREE.SphereGeometry(.22 + puff * .045, 10, 8), mat(0xe7f1f5));
      smoke.position.set(width * .29 + puff * .16, 6.12 + puff * .35, -depth * .18); group.add(smoke);
    }
    const lamp = new THREE.PointLight(0xffd69b, 2.2, 9); lamp.position.set(0, 3, depth / 2 + 1.5); group.add(lamp);
    return group;
  }

  makeBuilding(-23, -17, 'managerOffice', 'ОФИС', 0x3c5874, 0x405b79, 8, 7);
  makeBuilding(23, -17, 'cards', 'АКАДЕМИЯ', 0x557b89, 0x668da0, 9, 7);
  makeBuilding(-23, 17, 'wardrobe', 'МАГАЗИН', 0x92724e, 0x79583f, 9, 7);
  makeBuilding(23, 17, 'heroRoom', 'РАЗДЕВАЛКА', 0x625184, 0x7965a1, 9, 7);

  // --- PowerPlay district: landmark architecture and a complete town composition ---
  const arena = new THREE.Group(); arena.position.set(0, 0, 0); arena.userData.screen = 'stadium'; scene.add(arena); clickable.push(arena);
  box(arena, 27.8, .8, 21.8, mat(0x263e58), 0, 0, 0);
  box(arena, 27.2, .18, 21.2, mat(0xdceaf0), 0, .8, 0);
  box(arena, 26.2, 5.6, .65, mat(0x31536f), 0, 1, -10.15);
  box(arena, 26.2, 5.6, .65, mat(0x31536f), 0, 1, 10.15);
  for (const x of [-13.05, 13.05]) box(arena, .65, 5.6, 20.2, mat(0x294965), x, 1, 0);
  for (const z of [-10.5, 10.5]) for (let x = -11.4; x <= 11.5; x += 2.25) {
    box(arena, 1.55, 3.5, .16, glass, x, 1.8, z);
    box(arena, 1.58, .12, .2, mat(0xe6f6ff), x, 3.45, z);
    box(arena, 1.58, .12, .2, mat(0xe6f6ff), x, 1.8, z);
  }
  const roofMat = mat(0xe7f2f7, .42, .08);
  box(arena, 27.8, .62, 6.1, roofMat, 0, 6.9, -7.75);
  box(arena, 27.8, .62, 6.1, roofMat, 0, 6.9, 7.75);
  box(arena, 8.2, .62, 9.4, roofMat, -9.8, 6.9, 0);
  box(arena, 8.2, .62, 9.4, roofMat, 9.8, 6.9, 0);
  box(arena, 10.8, .18, 7.8, glass, 0, 6.92, 0);
  box(arena, 12, .42, 2.2, mat(0x203a55), 0, 5.9, 11.15);
  box(arena, 10.8, 3.2, .25, glass, 0, 1.3, 10.95);
  box(arena, 11.2, .22, .35, gold, 0, 4.45, 11.12);
  const arenaSignCanvas = document.createElement('canvas'); arenaSignCanvas.width = 768; arenaSignCanvas.height = 180;
  const arenaCtx = arenaSignCanvas.getContext('2d');
  if (arenaCtx) { arenaCtx.fillStyle='#102a45'; arenaCtx.fillRect(0,0,768,180); arenaCtx.strokeStyle='#e7c579'; arenaCtx.lineWidth=9; arenaCtx.strokeRect(8,8,752,164); arenaCtx.fillStyle='#f4fbff'; arenaCtx.font='900 92px Arial'; arenaCtx.textAlign='center'; arenaCtx.textBaseline='middle'; arenaCtx.fillText('PUCK IT ARENA',384,92); }
  const arenaSignTexture = new THREE.CanvasTexture(arenaSignCanvas); arenaSignTexture.colorSpace = THREE.SRGBColorSpace;
  const arenaSign = new THREE.Mesh(new THREE.PlaneGeometry(10.2,2.35),new THREE.MeshBasicMaterial({map:arenaSignTexture}));
  arenaSign.position.set(0,4.8,11.18); arena.add(arenaSign);
  for (const [x,z] of [[-10,-7],[10,-7],[-10,7],[10,7]] as [number,number][]) {
    box(arena,2.1,.65,1.5,mat(0x8da7b9),x,7.2,z); box(arena,1.4,.18,1.05,mat(0x435f78),x,7.85,z);
  }
  for (const x of [-13.7,13.7]) for (const z of [-10.8,10.8]) {
    const mast=new THREE.Mesh(new THREE.CylinderGeometry(.11,.16,10,8),navy); mast.position.set(x,5,z); mast.castShadow=true; arena.add(mast);
    for(let n=0;n<4;n++){const bulb=new THREE.Mesh(new THREE.SphereGeometry(.12,8,6),warmGlass);bulb.position.set(x-.48+n*.32,9.75,z+.18);arena.add(bulb);}
  }

  function makeLandmark(x:number,z:number,screen:string,title:string,accent:number,kind:'tower'|'hall'|'round'|'lab'|'shop',w:number,d:number){
    const g=new THREE.Group();g.position.set(x,.16,z);g.userData.screen=screen;scene.add(g);clickable.push(g);
    const accentMat=mat(accent,.38,.22),darkMat=mat(0x203d58,.48,.16),wallMat=mat(kind==='lab'?0x8caebd:kind==='shop'?0x8b725a:0x526d83,.62,.08);
    box(g,w+2,.48,d+2,shadowMat,0,0,0);box(g,w+1.4,.24,d+1.4,white,0,.48,0);
    if(kind==='round'){
      const base=new THREE.Mesh(new THREE.CylinderGeometry(w*.62,w*.7,1.1,12),darkMat);base.position.y=1.15;base.castShadow=true;g.add(base);
      const body=new THREE.Mesh(new THREE.CylinderGeometry(w*.53,w*.62,4.2,12),wallMat);body.position.y=3.65;body.castShadow=true;g.add(body);
      const band=new THREE.Mesh(new THREE.CylinderGeometry(w*.55,w*.55,.34,12),accentMat);band.position.y=5.55;g.add(band);
      const cap=new THREE.Mesh(new THREE.CylinderGeometry(w*.42,w*.54,1.15,12),mat(0xdcebf2,.3,.2));cap.position.y=6.25;g.add(cap);
      const crown=new THREE.Mesh(new THREE.CylinderGeometry(w*.24,w*.24,.35,12),gold);crown.position.y=7;g.add(crown);
      for(let a=0;a<12;a++){const ang=a*Math.PI/6;const win=new THREE.Mesh(new THREE.BoxGeometry(.2,2.3,.08),warmGlass);win.position.set(Math.cos(ang)*w*.54,3.7,Math.sin(ang)*w*.54);win.rotation.y=-ang;g.add(win);}
    }else{
      const levels=kind==='tower'?3:kind==='lab'?2:1;
      for(let level=0;level<levels;level++){
        const ww=w*(1-level*.13),dd=d*(1-level*.12),yy=.72+level*(kind==='tower'?2.55:2.2);
        box(g,ww,kind==='tower'?2.45:2.05,dd,wallMat,0,yy,0);box(g,ww+.18,.18,dd+.18,accentMat,0,yy+2.05,0);
        for(let xx=-ww/2+1;xx<ww/2;xx+=1.35){box(g,1.02,1.12,.09,glass,xx,yy+.48,dd/2+.055);box(g,.09,1.12,.09,mat(0xdcebf2),xx+.53,yy+.48,dd/2+.08);box(g,1.02,1.12,.09,glass,xx,yy+.48,-dd/2-.055);}
        for(let zz=-dd/2+1;zz<dd/2;zz+=1.35){box(g,.09,1.12,1.02,glass,ww/2+.055,yy+.48,zz);box(g,.09,1.12,1.02,glass,-ww/2-.055,yy+.48,zz);}
      }
      const roofY=.85+levels*(kind==='tower'?2.55:2.2);box(g,w*.78,.28,d*.72,darkMat,0,roofY,0);
      for(const [rx,rz] of [[-w*.25,-d*.2],[w*.25,-d*.2],[-w*.25,d*.2],[w*.25,d*.2]] as [number,number][]){box(g,1.35,.72,1.1,mat(0x9eb4c1),rx,roofY+.28,rz);box(g,1.05,.12,.82,darkMat,rx,roofY+1,rz);}
      box(g,w*.62,2.7,.2,glass,0,.82,d/2+.12);box(g,w*.7,.2,1.25,accentMat,0,.58,d/2+.7);
      for(let step=0;step<3;step++)box(g,w*.55,.12,.45,snowShade,0,.28+step*.12,d/2+1.15+step*.38);
    }
    const c=document.createElement('canvas');c.width=512;c.height=128;const cx=c.getContext('2d');
    if(cx){cx.fillStyle='#142e49';cx.fillRect(0,0,512,128);cx.strokeStyle='#e5c47b';cx.lineWidth=7;cx.strokeRect(5,5,502,118);cx.fillStyle='#f5fbff';cx.font='900 52px Arial';cx.textAlign='center';cx.textBaseline='middle';cx.fillText(title,256,66);}
    const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
    const face=new THREE.Mesh(new THREE.PlaneGeometry(Math.min(w*.9,8),1.35),new THREE.MeshBasicMaterial({map:tex}));
    face.position.set(0,kind==='tower'?7.1:4.2,d/2+.18);g.add(face);return g;
  }
  makeLandmark(-31,-17,'managerOffice','CLUB HQ',0x7c65b4,'tower',8,7);
  makeLandmark(31,-17,'cards','POWER LAB',0x4d9db7,'lab',9,7);
  makeLandmark(-31,18,'wardrobe','PRO SHOP',0xb88950,'shop',9,8);
  makeLandmark(31,18,'heroRoom','PLAYER HUB',0x8a73bf,'hall',9,8);
  makeLandmark(0,-30,'playoff','TOURNAMENT',0xd2a34f,'round',8,7);
  makeLandmark(0,31,'standings','LEGENDS',0x9a6a9f,'hall',10,7);

  const plaza=new THREE.Group();plaza.position.set(-17,0,0);scene.add(plaza);
  const plinth=new THREE.Mesh(new THREE.CylinderGeometry(4.1,4.5,.8,12),mat(0x20364d,.48,.2));plinth.position.y=.4;plinth.castShadow=true;plaza.add(plinth);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(3.7,.12,8,48),gold);ring.rotation.x=Math.PI/2;ring.position.y=.85;plaza.add(ring);
  const puck=new THREE.Mesh(new THREE.CylinderGeometry(1.25,1.25,.58,32),mat(0x18283a,.28,.32));puck.position.set(0,3.05,0);puck.castShadow=true;plaza.add(puck);
  const puckTop=new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.1,.08,32),gold);puckTop.position.set(0,3.38,0);plaza.add(puckTop);
  const star=new THREE.Mesh(new THREE.IcosahedronGeometry(1.15,1),mat(0xe7c36e,.25,.45));star.position.set(0,4.35,0);star.castShadow=true;plaza.add(star);
  for(let i=0;i<3;i++){box(plaza,.08,3.5,.08,navy,-4+i*4,1.1,-3);const cloth=box(plaza,1.4,.72,.08,i%2?purple:red,-3.3+i*4,3.25,-3);cloth.rotation.z=.12;}

  const boulevardPts=[new THREE.Vector3(-42,.2,8),new THREE.Vector3(-30,.2,8),new THREE.Vector3(-22,.2,5),new THREE.Vector3(-14,.2,-1),new THREE.Vector3(0,.2,-5),new THREE.Vector3(15,.2,-7),new THREE.Vector3(27,.2,-12),new THREE.Vector3(42,.2,-12)];
  const boulevard=new THREE.CatmullRomCurve3(boulevardPts);
  const roadMesh=new THREE.Mesh(new THREE.TubeGeometry(boulevard,100,2.15,8,false),road);roadMesh.position.y=.02;roadMesh.receiveShadow=true;scene.add(roadMesh);
  const roadLine=new THREE.Mesh(new THREE.TubeGeometry(boulevard,100,.045,6,false),mat(0xeaf6fa));roadLine.position.y=.1;scene.add(roadLine);
  for(const x of [-34,-27]){
    const tunnel=new THREE.Mesh(new THREE.CylinderGeometry(2.05,2.05,7,20,1,true,0,Math.PI),mat(0x465a6c));tunnel.rotation.z=Math.PI/2;tunnel.position.set(x,2.2,-34);tunnel.castShadow=true;scene.add(tunnel);
    box(scene,7,.22,4.1,mat(0x607b8e),x,0,-34);box(scene,7,.08,.14,mat(0x273b50),x,.3,-32.1);
  }
  const slope=new THREE.Mesh(new THREE.PlaneGeometry(24,15),snowShade);slope.rotation.x=-Math.PI/2;slope.rotation.z=-.25;slope.position.set(28,0,-34);scene.add(slope);
  for(let i=0;i<6;i++){
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(.09,.14,7,8),navy);pole.position.set(20+i*3,3.5,-39+i*.9);pole.castShadow=true;scene.add(pole);
    const cable=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,3.25,6),mat(0x20364d,.48,.2));cable.rotation.z=Math.PI/2;cable.position.set(21.5+i*3,6.8,-38.5+i*.9);scene.add(cable);
    box(scene,.9,.12,.55,red,21.5+i*3,5.4,-38.5+i*.9);
  }
  for(let i=0;i<38;i++){const side=i%4,t=Math.floor(i/4),x=side<2?(side===0?-39-t%3:39+t%3):-34+t*4.2,z=side<2?-31+t*3.4:(side===2?-39:39);if(Math.abs(x)<16&&Math.abs(z)<16)continue;pine(x,z,3.8+(i%4)*.55);}

  function pine(x: number, z: number, height: number) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.18, .26, height * .28, 8), wood);
    trunk.position.set(x, height * .14, z); trunk.castShadow = true; scene.add(trunk);
    for (let layer = 0; layer < 3; layer++) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(height * (.29 - layer * .035), height * .38, 9), layer === 0 ? pineDark : pineMid);
      cone.position.set(x, height * (.28 + layer * .2), z); cone.castShadow = true; scene.add(cone);
      if (layer === 1) {
        const cap = new THREE.Mesh(new THREE.ConeGeometry(height * .19, height * .23, 9), white);
        cap.position.set(x, height * .53, z); scene.add(cap);
      }
    }
  }
  const treePositions: [number, number, number][] = [
    [-34,-29,5.2],[-30,-22,4.2],[-35,-7,5.4],[-32,12,4.6],[-34,29,5.3],
    [34,-29,5.3],[31,-21,4.6],[35,-5,5.2],[32,13,4.8],[35,29,5.4],
    [-15,-32,4.8],[-7,-34,4.2],[8,-34,5.1],[17,-31,4.5],[-16,32,4.8],
    [-7,34,4.4],[8,34,5.2],[17,31,4.6],[-29,0,4.2],[29,0,4.4]
  ];
  treePositions.forEach(([x,z,h]) => pine(x,z,h));

  function skater(x: number, z: number, jersey: number, angle: number) {
    const player = new THREE.Group(); player.position.set(x, 1.18, z); player.rotation.y = angle; rink.add(player);
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.22, .42, 4, 8), mat(jersey, .58));
    torso.position.y = .48; torso.castShadow = true; player.add(torso);
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(.19, 12, 10), navy);
    helmet.position.set(0, .9, .02); player.add(helmet);
    const pants = new THREE.Mesh(new THREE.BoxGeometry(.34, .18, .28), mat(0x202d3e));
    pants.position.y = .18; player.add(pants);
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(.025, .035, 1.05, 6), mat(0xeee8dc));
    stick.position.set(.34, .38, .18); stick.rotation.z = -.28; player.add(stick);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(.34, .055, .08), mat(0x252e39));
    blade.position.set(.44, .02, .28); player.add(blade);
  }
  skater(-3.4, -2.1, 0xc74f65, .55); skater(3.2, 2.2, 0x365f9b, -2.2);
  skater(-1.4, 4.1, 0xf0f3f5, 1.2); skater(5.2, -3.6, 0x5c4b88, -1.0);

  // Warm street lamps and small snow mounds make the town feel inhabited.
  for (const [x,z] of [[-7,-8],[7,-8],[-7,8],[7,8],[-25,-8],[25,-8],[-25,8],[25,8],[-8,-25],[8,-25],[-8,25],[8,25]] as [number,number][]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.08,.11,3.2,8), navy);
    pole.position.set(x, 1.6, z); pole.castShadow = true; scene.add(pole);
    const arm = box(scene, .85, .12, .12, navy, x - .32, 3.05, z);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(.26, 12, 10), warmGlass);
    lamp.position.set(x - .68, 3.08, z); scene.add(lamp);
    const light = new THREE.PointLight(0xffd99c, 3.5, 10); light.position.copy(lamp.position); scene.add(light);
    void arm;
  }
  for (let i = 0; i < 34; i++) {
    const x = ((i * 13) % 72) - 36, z = ((i * 23) % 70) - 35;
    if (Math.abs(x) < 12 && Math.abs(z) < 12) continue;
    const mound = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), white);
    mound.scale.set(1.2 + (i % 3) * .5, .35, .8 + (i % 2) * .4);
    mound.position.set(x, .08, z); scene.add(mound);
  }

  // Camera pan + pinch zoom, like a mobile strategy city. Rotation is deliberately locked.
  let pointers = new Map<number, { x: number; y: number }>();
  let lastCenter = { x: 0, y: 0 }, lastPinch = 0, moved = false, downPoint = { x: 0, y: 0 };
  const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const pick = (clientX: number, clientY: number) => {
    const rect = renderer.domElement.getBoundingClientRect();
    ndc.set((clientX - rect.left) / rect.width * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(clickable, true)[0];
    if (!hit) return;
    let object: THREE.Object3D | null = hit.object;
    while (object && !object.userData.screen) object = object.parent;
    if (object?.userData.screen) onSelect(String(object.userData.screen));
  };
  const pointerDown = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return;
    event.preventDefault();
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    downPoint = { x: event.clientX, y: event.clientY }; moved = false;
    if (pointers.size === 1) lastCenter = { ...downPoint };
    if (pointers.size === 2) {
      const points = [...pointers.values()];
      lastPinch = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      lastCenter = { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 };
    }
    try { renderer.domElement.setPointerCapture(event.pointerId); } catch { /* capture may be unavailable */ }
  };
  const pointerMove = (event: PointerEvent) => {
    if (event.pointerType === 'touch' || !pointers.has(event.pointerId)) return;
    event.preventDefault();
    const previous = pointers.get(event.pointerId)!;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = [...pointers.values()];
    if (points.length === 1) {
      const dx = event.clientX - previous.x, dy = event.clientY - previous.y;
      if (Math.abs(event.clientX - downPoint.x) + Math.abs(event.clientY - downPoint.y) > 5) moved = true;
      const worldPerPixel = distance / Math.max(260, host.clientHeight) * 1.25;
      const right = new THREE.Vector3(Math.cos(azimuth), 0, -Math.sin(azimuth));
      const forward = new THREE.Vector3(-Math.sin(azimuth), 0, -Math.cos(azimuth));
      target.addScaledVector(right, -dx * worldPerPixel);
      target.addScaledVector(forward, dy * worldPerPixel);
    } else if (points.length >= 2) {
      moved = true;
      const a = points[0], b = points[1];
      const center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const pinch = Math.hypot(a.x - b.x, a.y - b.y);
      if (lastPinch > 0) distance = THREE.MathUtils.clamp(distance * lastPinch / Math.max(1, pinch), 28, 104);
      const dx = center.x - lastCenter.x, dy = center.y - lastCenter.y;
      const worldPerPixel = distance / Math.max(260, host.clientHeight) * 1.05;
      const right = new THREE.Vector3(Math.cos(azimuth), 0, -Math.sin(azimuth));
      const forward = new THREE.Vector3(-Math.sin(azimuth), 0, -Math.cos(azimuth));
      target.addScaledVector(right, -dx * worldPerPixel);
      target.addScaledVector(forward, dy * worldPerPixel);
      lastPinch = pinch; lastCenter = center;
    }
    target.x = THREE.MathUtils.clamp(target.x, -17, 17);
    target.z = THREE.MathUtils.clamp(target.z, -17, 17);
    updateCamera();
  };
  const pointerUp = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return;
    const point = pointers.get(event.pointerId);
    pointers.delete(event.pointerId);
    if (point && !moved && pointers.size === 0) pick(event.clientX, event.clientY);
    if (pointers.size === 1) {
      const remaining = [...pointers.values()][0];
      lastCenter = { ...remaining }; downPoint = { ...remaining }; moved = true;
    }
    try { if (renderer.domElement.hasPointerCapture(event.pointerId)) renderer.domElement.releasePointerCapture(event.pointerId); } catch { /* no-op */ }
  };
  const wheel = (event: WheelEvent) => { event.preventDefault(); distance = THREE.MathUtils.clamp(distance + event.deltaY * .035, 22, 92); updateCamera(); };
  let touchStart = 0, touchMoved = false, lastTouchCenter = { x: 0, y: 0 }, lastTouchPinch = 0;
  const touchStartHandler = (event: TouchEvent) => {
    event.preventDefault(); touchMoved = false; touchStart = Date.now();
    if (event.touches.length === 1) {
      const t = event.touches[0]; lastTouchCenter = { x: t.clientX, y: t.clientY };
    } else if (event.touches.length >= 2) {
      const a = event.touches[0], b = event.touches[1];
      lastTouchPinch = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      lastTouchCenter = { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 };
    }
  };
  const touchMoveHandler = (event: TouchEvent) => {
    event.preventDefault();
    if (event.touches.length === 1) {
      const t = event.touches[0], dx = t.clientX - lastTouchCenter.x, dy = t.clientY - lastTouchCenter.y;
      if (Math.abs(dx) + Math.abs(dy) > 2) touchMoved = true;
      const scale = distance / Math.max(260, host.clientHeight) * 1.25;
      target.addScaledVector(new THREE.Vector3(Math.cos(azimuth), 0, -Math.sin(azimuth)), -dx * scale);
      target.addScaledVector(new THREE.Vector3(-Math.sin(azimuth), 0, -Math.cos(azimuth)), dy * scale);
      lastTouchCenter = { x: t.clientX, y: t.clientY };
    } else if (event.touches.length >= 2) {
      touchMoved = true;
      const a = event.touches[0], b = event.touches[1];
      const center = { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 };
      const pinch = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      if (lastTouchPinch > 0 && pinch > 0) distance = THREE.MathUtils.clamp(distance * lastTouchPinch / pinch, 22, 92);
      const dx = center.x - lastTouchCenter.x, dy = center.y - lastTouchCenter.y;
      const scale = distance / Math.max(260, host.clientHeight) * 1.05;
      target.addScaledVector(new THREE.Vector3(Math.cos(azimuth), 0, -Math.sin(azimuth)), -dx * scale);
      target.addScaledVector(new THREE.Vector3(-Math.sin(azimuth), 0, -Math.cos(azimuth)), dy * scale);
      lastTouchPinch = pinch; lastTouchCenter = center;
    }
    target.x = THREE.MathUtils.clamp(target.x, -23, 23);
    target.z = THREE.MathUtils.clamp(target.z, -23, 23);
    updateCamera();
  };
  const touchEndHandler = (event: TouchEvent) => {
    event.preventDefault();
    if (event.touches.length === 1) {
      const t = event.touches[0]; lastTouchCenter = { x: t.clientX, y: t.clientY };
      lastTouchPinch = 0; touchMoved = true;
    } else if (event.touches.length === 0 && !touchMoved && Date.now() - touchStart < 350) {
      const t = event.changedTouches[0]; if (t) pick(t.clientX, t.clientY);
    } else if (event.touches.length === 0) lastTouchPinch = 0;
  };
  renderer.domElement.addEventListener('pointerdown', pointerDown);
  renderer.domElement.addEventListener('pointermove', pointerMove);
  renderer.domElement.addEventListener('pointerup', pointerUp);
  renderer.domElement.addEventListener('pointercancel', pointerUp);
  renderer.domElement.addEventListener('wheel', wheel, { passive: false });
  renderer.domElement.addEventListener('touchstart', touchStartHandler, { passive: false });
  renderer.domElement.addEventListener('touchmove', touchMoveHandler, { passive: false });
  renderer.domElement.addEventListener('touchend', touchEndHandler, { passive: false });
  renderer.domElement.addEventListener('touchcancel', touchEndHandler, { passive: false });

  let frame = 0, disposed = false;
  const resize = () => {
    if (disposed) return;
    const width = Math.max(1, host.clientWidth), height = Math.max(1, host.clientHeight);
    camera.aspect = width / height; camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };
  const observer = new ResizeObserver(resize); observer.observe(host); resize();
  const clock = new THREE.Clock();
  const animate = () => {
    if (disposed) return;
    frame = requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    // Subtle snow drift: tiny flakes, low-cost point cloud.
    renderer.render(scene, camera);
    void t;
  };
  animate();

  return {
    dispose() {
      if (disposed) return;
      disposed = true; cancelAnimationFrame(frame); observer.disconnect();
      renderer.domElement.removeEventListener('pointerdown', pointerDown);
      renderer.domElement.removeEventListener('pointermove', pointerMove);
      renderer.domElement.removeEventListener('pointerup', pointerUp);
      renderer.domElement.removeEventListener('pointercancel', pointerUp);
      renderer.domElement.removeEventListener('wheel', wheel);
      renderer.domElement.removeEventListener('touchstart', touchStartHandler);
      renderer.domElement.removeEventListener('touchmove', touchMoveHandler);
      renderer.domElement.removeEventListener('touchend', touchEndHandler);
      renderer.domElement.removeEventListener('touchcancel', touchEndHandler);
      scene.traverse(object => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach(material => material.dispose());
        }
      });
      renderer.dispose(); host.innerHTML = '';
    }
  };
}
