/* DesmontAR — jogo educacional de realidade aumentada
 * Equipe: Ana Luísa, Ana Roberta, Giovanna e Luiza (UFPB)
 * Lógica do jogo: cena 3D, câmera e marcador, fases de montagem, paredes (AR sem marcador) e galeria em RV. */
(function(){
const $=s=>document.querySelector(s);
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const PI=Math.PI, TOP=.1;

/* ---------- estado ---------- */
const STEPS=['Início','Bancada','Processador','Memória','Vídeo e SSD','Energia','Ligar','Fim'];
const S={step:0,ar:false,spawnT:-1,startTime:0};
function clearState(){Object.assign(S,{sel:null,placed:{},occ:{},slotOf:{},cables:{},err:0,on:false,paste:false,pasteAmt:0,
  caseOn:false,loose:null,booted:false,card:null,ramSpeed:0,psu:null});}
clearState();

/* ---------- QR decorativo ---------- */
(function(){const q=$('#qr');let seed=7;const r=()=>{seed=(seed*9301+49297)%233280;return seed/233280};
for(let y=0;y<11;y++)for(let x=0;x<11;x++){const i=document.createElement('i');
const f=(x<3&&y<3)||(x>7&&y<3)||(x<3&&y>7);const center=(x==1&&y==1)||(x==9&&y==1)||(x==1&&y==9);
if(f){if(!center&&!(x==0||y==0||x==2||y==2||x==10||y==10||x==8||y==8))i.className='w';if(center)i.className='';}
else if(r()<.5)i.className='w';q.appendChild(i);}})();

/* ---------- renderizador e luz ---------- */
const stage=$('#stage');
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputEncoding=THREE.sRGBEncoding;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
stage.appendChild(renderer.domElement);
const scene=new THREE.Scene();
const BG=new THREE.Color(0x141a22);
scene.background=BG;scene.fog=new THREE.Fog(0x141a22,11,22);
const camera=new THREE.PerspectiveCamera(42,1,.05,60);
const controls=new THREE.OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.enablePan=false;
controls.minDistance=1.6;controls.maxDistance=11;controls.maxPolarAngle=PI*.47;

/* ambiente de estúdio para reflexos realistas nos metais */
try{
  const es=new THREE.Scene();
  const room=new THREE.Mesh(new THREE.BoxGeometry(12,7,12),new THREE.MeshStandardMaterial({color:0x23262c,side:THREE.BackSide,roughness:1,metalness:0}));
  room.position.y=3;es.add(room);es.add(new THREE.AmbientLight(0xffffff,.6));
  const panelL=(w,h,d,x,y,z,k,c=0xffffff)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshBasicMaterial({color:new THREE.Color(c).multiplyScalar(k)}));m.position.set(x,y,z);es.add(m);};
  panelL(5,.1,2.5,0,6.4,0,9);panelL(.1,2.5,4,-5.9,3.4,.5,5);panelL(.1,1.8,5,5.9,3,-1,3.5,0xdfe8ff);panelL(4,2,.1,0,3,5.9,3);panelL(3,1.2,.1,-1,2.5,-5.9,2,0xffe2c0);
  const pm=new THREE.PMREMGenerator(renderer);scene.environment=pm.fromScene(es,.04).texture;pm.dispose();
}catch(e){}

scene.add(new THREE.HemisphereLight(0xdfe8ff,0x2a2018,.45));
const sun=new THREE.DirectionalLight(0xfff4e6,1.5);sun.position.set(3,8,4);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.0004;sun.shadow.normalBias=.02;sun.shadow.radius=3;
Object.assign(sun.shadow.camera,{left:-5,right:5,top:5,bottom:-5});scene.add(sun);
const rim=new THREE.DirectionalLight(0x9fd0ff,.35);rim.position.set(-5,3,-4);scene.add(rim);

/* ---------- texturas ---------- */
function canvasTex(w,h,draw,srgb=true){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);if(srgb)t.encoding=THREE.sRGBEncoding;t.anisotropy=8;return t;}
const rnd=(a,b)=>a+Math.random()*(b-a);
const woodTex=canvasTex(1024,1024,(g,w,h)=>{g.fillStyle='#6a4730';g.fillRect(0,0,w,h);
  for(let i=0;i<260;i++){g.strokeStyle=`rgba(${rnd(25,70)|0},${rnd(14,36)|0},8,${rnd(.08,.3)})`;g.lineWidth=rnd(1,4);const y=rnd(0,h);g.beginPath();g.moveTo(0,y);g.bezierCurveTo(w*.3,y+rnd(-14,14),w*.7,y+rnd(-14,14),w,y+rnd(-6,6));g.stroke();}
  for(let i=0;i<6000;i++){g.fillStyle=`rgba(255,230,200,${rnd(0,.04)})`;g.fillRect(rnd(0,w),rnd(0,h),2,1);}});
woodTex.wrapS=woodTex.wrapT=THREE.RepeatWrapping;woodTex.repeat.set(1.5,1.5);
const brushed=canvasTex(512,128,(g,w,h)=>{g.fillStyle='#bfc4cb';g.fillRect(0,0,w,h);
  for(let i=0;i<900;i++){const y=rnd(0,h);const v=Math.random()<.5?255:70;g.strokeStyle=`rgba(${v},${v},${v},${rnd(.03,.12)})`;g.lineWidth=rnd(.5,1.5);g.beginPath();g.moveTo(rnd(-50,w),y);g.lineTo(rnd(0,w+50),y);g.stroke();}});
brushed.wrapS=brushed.wrapT=THREE.RepeatWrapping;
const meshTex=canvasTex(256,256,(g,w,h)=>{g.fillStyle='#1d2026';g.fillRect(0,0,w,h);g.fillStyle='#06070a';for(let y=0;y<h;y+=16)for(let x=(y/16)%2?8:0;x<w;x+=16){g.beginPath();g.arc(x+4,y+4,4.5,0,7);g.fill();}});
meshTex.wrapS=meshTex.wrapT=THREE.RepeatWrapping;meshTex.repeat.set(6,2);
const plasticTex=canvasTex(256,256,(g,w,h)=>{g.fillStyle='#18191c';g.fillRect(0,0,w,h);for(let i=0;i<3500;i++){const v=rnd(10,45)|0;g.fillStyle=`rgb(${v},${v},${v+2})`;g.fillRect(rnd(0,w),rnd(0,h),1.5,1.5);}});
plasticTex.wrapS=plasticTex.wrapT=THREE.RepeatWrapping;

/* ---------- materiais PBR ---------- */
function std(c,m,r,extra={}){const col=new THREE.Color(extra.color??c);if(col.convertSRGBToLinear)col.convertSRGBToLinear();delete extra.color;return new THREE.MeshStandardMaterial(Object.assign({metalness:m,roughness:r},extra,{color:col}));}
const MAT={
  plastic:std(0x1b1c20,0,.55,{map:plasticTex}),gloss:std(0x0f1012,.1,.18),anod:std(0x2b2f36,.85,.32),anodLight:std(0x4a505a,.85,.3),
  alu:std(0xffffff,1,.32,{map:brushed}),steel:std(0xd5d9de,1,.2),nickel:std(0xc7ccd2,1,.16),copper:std(0xc97b48,1,.22),gold:std(0xd9b14a,1,.22),
  chip:std(0x141518,.25,.32),cap:std(0x9aa1ab,1,.25),choke:std(0x34373d,.35,.6),slot:std(0x1a1b1f,0,.45),latch:std(0xdde1e6,0,.4),
  paste:std(0xa4a9b0,.15,.45),cable:std(0x111215,0,.75),mat:std(0x1c1f25,0,.95),pcbGreen:std(0x1d5a37,.1,.45),pcbBlue:std(0x1b3f66,.1,.45),
  sticker:std(0x0e0f12,0,.6),fanBlade:std(0x15161a,0,.35),white:std(0xe8ebef,0,.45)
};
const ledMat=std(0x111111,0,.4,{emissive:0xf5c518,emissiveIntensity:0});
const box=(x,y,z)=>new THREE.BoxGeometry(x,y,z);
const cyl=(r1,r2,h,s=24)=>new THREE.CylinderGeometry(r1,r2,h,s);
/* caixa com cantos arredondados (fica bem menos "desenho" que um cubo puro) */
function rbox(w,h,d,r=.015){r=Math.max(.001,Math.min(r,w/2*.9,h/2*.9,d/2*.9));const x=w/2-r,y=h/2-r,c=Math.min(r*.8,x,y);
  const s=new THREE.Shape();s.moveTo(-x+c,-y);s.lineTo(x-c,-y);s.quadraticCurveTo(x,-y,x,-y+c);s.lineTo(x,y-c);s.quadraticCurveTo(x,y,x-c,y);
  s.lineTo(-x+c,y);s.quadraticCurveTo(-x,y,-x,y-c);s.lineTo(-x,-y+c);s.quadraticCurveTo(-x,-y,-x+c,-y);
  const dd=Math.max(d-2*r,.0005);const g=new THREE.ExtrudeGeometry(s,{depth:dd,bevelEnabled:true,bevelThickness:r,bevelSize:r,bevelSegments:3,curveSegments:5});g.translate(0,0,-dd/2);return g;}
function add(parent,geo,mat,pos,info,rot){const m=new THREE.Mesh(geo,mat);m.position.set(...pos);if(rot)m.rotation.set(...rot);m.castShadow=true;m.receiveShadow=true;if(info)m.userData.info=info;parent.add(m);return m;}
function decal(parent,w,h,tex,pos,rot,opts={}){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),std(0xffffff,opts.m??0,opts.r??.5,{map:tex,transparent:true}));
  m.position.set(...pos);m.rotation.set(...rot);m.receiveShadow=true;parent.add(m);return m;}
function textTex(w,h,fn){return canvasTex(w,h,(g)=>{g.clearRect(0,0,w,h);fn(g,w,h);});}
function label(text,color='#f5c518'){const t=textTex(512,128,(g,w,h)=>{g.fillStyle='rgba(16,20,27,.88)';const r=28;g.beginPath();g.moveTo(r,8);g.arcTo(w-8,8,w-8,h-8,r);g.arcTo(w-8,h-8,8,h-8,r);g.arcTo(8,h-8,8,8,r);g.arcTo(8,8,w-8,8,r);g.fill();
  g.strokeStyle=color;g.lineWidth=5;g.stroke();g.fillStyle='#fff';g.font='600 52px "Barlow Semi Condensed", sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(text,w/2,h/2+2);});
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:t,depthTest:false,transparent:true}));sp.scale.set(.6,.15,1);sp.renderOrder=20;return sp;}

/* ---------- mesa e marcador ---------- */
const table=new THREE.Mesh(new THREE.BoxGeometry(10,.14,7),std(0xffffff,0,.62,{map:woodTex}));
table.position.set(.6,-.07,0);table.receiveShadow=true;scene.add(table);
const markerTex=canvasTex(512,512,(g,w,h)=>{g.fillStyle='#3a3c40';g.fillRect(0,0,w,h);g.fillStyle='#f4f5f7';g.fillRect(56,56,400,400);g.fillStyle='#3a3c40';
let s=3;const r=()=>{s=(s*9301+49297)%233280;return s/233280};for(let y=0;y<8;y++)for(let x=0;x<8;x++)if(r()<.45)g.fillRect(96+x*40,96+y*40,40,40);
g.fillStyle='#a9c1e1';g.fillRect(56,410,400,46);g.fillStyle='#3a3c40';g.font='800 34px Inter, sans-serif';g.textAlign='center';g.fillText('DESMONTAR',256,446);});
const marker=new THREE.Mesh(new THREE.PlaneGeometry(3,3),std(0xffffff,0,.85,{map:markerTex}));
marker.rotation.x=-PI/2;marker.position.y=.002;marker.receiveShadow=true;scene.add(marker);
const shadowPlane=new THREE.Mesh(new THREE.PlaneGeometry(12,12),new THREE.ShadowMaterial({opacity:.45}));
shadowPlane.rotation.x=-PI/2;shadowPlane.position.y=.001;shadowPlane.receiveShadow=true;shadowPlane.visible=false;scene.add(shadowPlane);

const rig=new THREE.Group();rig.visible=false;scene.add(rig);
const trayMat=add(rig,rbox(1.9,.008,3.2,.003),MAT.mat,[2.33,.004,.1]);trayMat.castShadow=false;

/* ---------- ventoinha genérica (frente para +z) ---------- */
const FANS=[];
function makeFan(size,rgb){const g=new THREE.Group();const R=size*.46;
  const fr=add(g,rbox(size,size,.05,.012),MAT.plastic,[0,0,-.005]);fr.scale.set(1,1,1);
  add(g,new THREE.TorusGeometry(R,.018,10,48),MAT.plastic,[0,0,.02]);
  if(rgb)add(g,new THREE.TorusGeometry(R-.012,.008,8,48),ledMat,[0,0,.03]);
  const rotor=new THREE.Group();rotor.position.z=.012;g.add(rotor);
  add(rotor,cyl(size*.15,size*.15,.04,28),MAT.gloss,[0,0,0],null,[PI/2,0,0]);
  add(rotor,cyl(size*.1,size*.1,.042,24),MAT.anodLight,[0,0,.001],null,[PI/2,0,0]);
  const n=9;for(let i=0;i<n;i++){const a=i/n*PI*2,b=add(rotor,rbox(size*.3,size*.15,.006,.003),MAT.fanBlade,[Math.cos(a)*size*.27,Math.sin(a)*size*.27,0]);b.rotation.set(.5,0,a,'ZYX');}
  FANS.push(rotor);return g;}

/* ---------- placa-mãe ---------- */
add(rig,box(2.4,.035,2.6),std(0x123a2f,.1,.4),[0,TOP-.0175,0],'board');
[[-1.1,-1.2],[1.1,-1.2],[-1.1,1.2],[1.1,1.2],[-1.1,0],[1.1,0]].forEach(([x,z])=>{add(rig,cyl(.03,.03,.065,16),MAT.gold,[x,.033,z]);});
const W=1024,H=1110,toC=(x,z)=>[(x+1.2)/2.4*W,(z+1.3)/2.6*H];
const pcbTex=canvasTex(W,H,(g)=>{
  g.fillStyle='#123a2f';g.fillRect(0,0,W,H);
  for(let i=0;i<9000;i++){g.fillStyle=`rgba(255,255,255,${rnd(0,.025)})`;g.fillRect(rnd(0,W),rnd(0,H),2,2);}
  g.lineCap='round';g.lineJoin='round';
  for(let b=0;b<70;b++){const x=rnd(0,W),y=rnd(0,H),n=3+(Math.random()*9|0),hz=Math.random()<.5,len=rnd(60,300),turn=(Math.random()<.5?-1:1)*rnd(30,90);
    g.strokeStyle=`rgba(70,150,118,${rnd(.35,.6)})`;g.lineWidth=2.2;
    for(let k=0;k<n;k++){const o=k*6.5;g.beginPath();if(hz){g.moveTo(x,y+o);g.lineTo(x+len,y+o);g.lineTo(x+len+Math.abs(turn),y+o+turn);}else{g.moveTo(x+o,y);g.lineTo(x+o,y+len);g.lineTo(x+o+turn,y+len+Math.abs(turn));}g.stroke();}}
  for(let i=0;i<900;i++){const x=rnd(0,W),y=rnd(0,H);g.fillStyle='#bf9f52';g.beginPath();g.arc(x,y,2.4,0,7);g.fill();g.fillStyle='#0b2a21';g.beginPath();g.arc(x,y,1.1,0,7);g.fill();}
  for(let i=0;i<320;i++){const x=rnd(0,W),y=rnd(0,H);g.fillStyle='#cfae62';g.fillRect(x,y,5,4);g.fillRect(x+11,y,5,4);g.fillStyle=Math.random()<.5?'#2a2b2e':'#7a5a3a';g.fillRect(x+4,y-1,8,6);}
  g.fillStyle='rgba(236,240,235,.92)';g.textAlign='center';
  const T=(t,x,z,size=20)=>{g.font=`bold ${size}px sans-serif`;const [cx,cy]=toC(x,z);g.fillText(t,cx,cy);};
  T('A1',.45,.36);T('A2',.57,.36);T('B1',.69,.36);T('B2',.81,.36);T('DDR5_A',.51,-1.16,16);T('DDR5_B',.75,-1.16,16);
  T('LGA S5',-.2,-.16);T('PCIE_X16',-.35,.68);T('PCIE_X1',-.85,1.08);T('M2_1',-.86,.08);
  T('CPU_PWR1',-.85,-1.06,16);T('ATX_PWR',1.0,.12,16);T('BL-S5 PRO',.5,1.22,34);T('REV 1.02',.5,1.27,14);
  g.strokeStyle='rgba(236,240,235,.75)';g.lineWidth=2;const [sx,sy]=toC(-.53,-.83),[ex,ey]=toC(.13,-.17);g.strokeRect(sx,sy,ex-sx,ey-sy);
  const [tx,ty]=toC(-.5,-.2);g.fillStyle='#e8ece9';g.beginPath();g.moveTo(tx,ty);g.lineTo(tx+16,ty);g.lineTo(tx,ty-16);g.fill();
});
const silk=new THREE.Mesh(new THREE.PlaneGeometry(2.4,2.6),std(0xffffff,.05,.38,{map:pcbTex}));
silk.rotation.x=-PI/2;silk.position.y=TOP+.0008;silk.receiveShadow=true;silk.userData.info='board';rig.add(silk);
/* soquete */
add(rig,rbox(.5,.03,.5,.006),MAT.steel,[-.2,TOP+.015,-.5],'socket');
add(rig,box(.41,.032,.41),std(0x8a7643,.9,.35),[-.2,TOP+.015,-.5],'socket');
add(rig,cyl(.012,.012,.5,10),MAT.steel,[.08,TOP+.035,-.5],'socket',[PI/2,0,0]);
add(rig,cyl(.012,.012,.08,10),MAT.steel,[.08,TOP+.035,-.21],'socket',[0,0,PI/2]);
/* VRM com dissipadores de aletas */
function vrm(w,d,pos,alongX){const g=new THREE.Group();g.position.set(...pos);rig.add(g);g.userData.info='vrm';
  add(g,rbox(w,.05,d,.008),MAT.anod,[0,.025,0]);const n=alongX?Math.round(w/.035):Math.round(d/.035);
  for(let i=0;i<n;i++){const o=-((n-1)/2)*.035+i*.035;add(g,box(alongX?.018:w*.92,.09,alongX?d*.92:.018),MAT.anod,alongX?[o,.095,0]:[0,.095,o]);}
  add(g,box(alongX?w*.9:.006,.006,alongX?.006:d*.9),MAT.alu,alongX?[0,.142,d*.47]:[w*.47,.142,0]);}
vrm(.62,.16,[-.2,TOP,-1.0],true);vrm(.16,.62,[-.64,TOP,-.5],false);
for(let i=0;i<7;i++)add(rig,box(.06,.05,.06),MAT.choke,[-.5+i*.085,TOP+.025,-.84],'vrm');
for(let i=0;i<6;i++)add(rig,cyl(.022,.022,.07,16),MAT.cap,[-.48+i*.1,TOP+.035,-.76],'board');
/* slots de memória */
const RAMX={A1:.45,A2:.57,B1:.69,B2:.81};
Object.values(RAMX).forEach(x=>{add(rig,rbox(.055,.055,1.3,.006),MAT.slot,[x,TOP+.0275,-.4],'ramslot');
  add(rig,box(.056,.075,.05),MAT.latch,[x,TOP+.037,.27],'ramslot');add(rig,box(.056,.075,.05),MAT.latch,[x,TOP+.037,-1.07],'ramslot');});
/* M.2, PCIe e conectores */
add(rig,box(.05,.04,.13),MAT.slot,[-.77,TOP+.02,.15],'m2');add(rig,cyl(.016,.016,.03,12),MAT.gold,[-.24,TOP+.015,.15],'m2');
add(rig,rbox(1.0,.055,.065,.006),MAT.slot,[-.35,TOP+.0275,.55],'x16');add(rig,rbox(1.02,.058,.075,.008),std(0xcfd4da,1,.25,{transparent:true,opacity:.55}),[-.35,TOP+.029,.55],'x16');
add(rig,box(.06,.06,.075),MAT.latch,[.17,TOP+.03,.55],'x16');
add(rig,rbox(.3,.05,.06,.006),MAT.slot,[-.85,TOP+.025,.95],'x1');
add(rig,rbox(.09,.085,.46,.008),MAT.slot,[1.12,TOP+.0425,-.2],'p24');
add(rig,rbox(.28,.085,.085,.008),MAT.slot,[-.85,TOP+.0425,-1.18],'cpu8');
/* painel traseiro e chipset */
add(rig,rbox(.23,.29,1.0,.02),MAT.anod,[-1.08,TOP+.145,-.55],'io');
const ioTex=textTex(512,128,(g,w,h)=>{g.fillStyle='#d8dde3';g.font='bold 54px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('BL-S5  PRO',w/2,h/2);});
decal(rig,.6,.15,ioTex,[-.963,TOP+.18,-.55],[0,PI/2,0],{m:.5,r:.4});
add(rig,rbox(.42,.07,.42,.015),MAT.anod,[.7,TOP+.035,.95],'chipset');add(rig,box(.42,.006,.03),MAT.alu,[.7,TOP+.071,.82],'chipset');
const csTex=textTex(256,256,(g,w,h)=>{g.strokeStyle='rgba(230,235,240,.5)';g.lineWidth=3;for(let i=0;i<6;i++){g.beginPath();g.moveTo(30+i*18,40);g.lineTo(130+i*18,216);g.stroke();}g.fillStyle='#f5c518';g.fillRect(170,40,10,176);});
decal(rig,.38,.38,csTex,[.7,TOP+.0715,.95],[-PI/2,0,0],{m:.3,r:.4});
add(rig,cyl(.07,.07,.015,32),MAT.nickel,[.25,TOP+.008,1.0],'cmos');
for(let i=0;i<4;i++)add(rig,cyl(.018,.018,.05,14),std(0xc7a14a,1,.25),[-1.0+i*.06,TOP+.025,1.15],'board');
add(rig,box(.14,.008,.14),MAT.chip,[.95,TOP+.004,.45],'chipset');

/* ---------- monitor ---------- */
const monitor=new THREE.Group();monitor.position.set(.2,0,-2.35);rig.add(monitor);
add(monitor,rbox(.62,.02,.32,.008),MAT.anod,[0,.01,0],'monitor');add(monitor,rbox(.07,1.15,.05,.015),MAT.anod,[0,.585,-.04],'monitor');
add(monitor,rbox(1.98,1.17,.045,.012),MAT.gloss,[0,1.6,0],'monitor');add(monitor,rbox(.5,.3,.06,.02),MAT.plastic,[0,1.54,-.04],'monitor');
const scrCanvas=document.createElement('canvas');scrCanvas.width=1024;scrCanvas.height=576;const scr=scrCanvas.getContext('2d');
const scrTex=new THREE.CanvasTexture(scrCanvas);scrTex.encoding=THREE.sRGBEncoding;
const screen=add(monitor,new THREE.PlaneGeometry(1.92,1.08),new THREE.MeshBasicMaterial({map:scrTex,toneMapped:false}),[0,1.61,.0235],'monitor');screen.castShadow=false;
function drawScreen(mode,data){const w=1024,h=576;scr.fillStyle='#000';scr.fillRect(0,0,w,h);
  if(mode==='off'){const g=scr.createLinearGradient(0,0,w,h);g.addColorStop(0,'rgba(255,255,255,.07)');g.addColorStop(.45,'rgba(255,255,255,0)');scr.fillStyle=g;scr.fillRect(0,0,w,h);}
  if(mode==='nosignal'){scr.fillStyle='#0b0f16';scr.fillRect(0,0,w,h);scr.strokeStyle='#3b4656';scr.lineWidth=3;scr.strokeRect(w/2-200,h/2-60,400,120);
    scr.fillStyle='#c7d0dc';scr.font='bold 40px sans-serif';scr.textAlign='center';scr.fillText('SEM SINAL',w/2,h/2+14);scr.textAlign='left';}
  if(mode==='post'){scr.font='bold 30px monospace';data.forEach((l,i)=>{scr.fillStyle=l.c||'#d8e1ec';scr.fillText(l.t,44,64+i*44);});}
  if(mode==='phrase'){const g=scr.createLinearGradient(0,0,w,h);g.addColorStop(0,'#0f1b2e');g.addColorStop(1,'#1e1430');scr.fillStyle=g;scr.fillRect(0,0,w,h);
    const full=['Olá, mundo!','Fui montado peça por peça.','Agora é sua vez de me programar.'];let left=data;scr.textAlign='center';
    full.forEach((t,i)=>{const s=t.slice(0,Math.max(0,Math.min(t.length,left)));left-=t.length;
      scr.fillStyle=i===0?'#f5c518':'#e9eef5';scr.font=i===0?'bold 96px sans-serif':'600 44px sans-serif';scr.fillText(s,w/2,i===0?230:320+(i-1)*62);});
    if(Math.floor(performance.now()/450)%2)scr.fillStyle='#f5c518',scr.fillRect(w/2-12,470,24,6);scr.textAlign='left';}
  scrTex.needsUpdate=true;}
drawScreen('off');

/* ---------- peças da bandeja ---------- */
const ITEMS={};
function item(id,info,trayPos,trayRot,step,labelText,labelPos,labelColor){const g=new THREE.Group();g.userData.item=id;g.userData.info=info;rig.add(g);
  g.position.set(...trayPos);g.rotation.set(...trayRot);ITEMS[id]={obj:g,trayPos,trayRot,step};
  if(labelText){const l=label(labelText,labelColor);l.position.set(...labelPos);g.add(l);ITEMS[id].label=l;}return g;}
/* processadores */
function ihsTex(lines){return textTex(256,256,(g,w,h)=>{g.fillStyle='rgba(70,76,84,.55)';g.textAlign='center';g.font='bold 30px sans-serif';lines.forEach((t,i)=>g.fillText(t,w/2,95+i*38));});}
function makeCPU(id,sub,lines,pos,lab,col){const g=item(id,id,pos,[0,0,0],2,lab,[0,.2,0],col);
  add(g,rbox(.4,.02,.4,.004),sub,[0,.01,0]);add(g,rbox(.33,.03,.33,.012),MAT.nickel,[0,.035,0]);
  decal(g,.3,.3,ihsTex(lines),[0,.0505,0],[-PI/2,0,0],{m:.6,r:.3});
  const tri=new THREE.Shape();tri.moveTo(0,0);tri.lineTo(.04,0);tri.lineTo(0,.04);const tm=add(g,new THREE.ShapeGeometry(tri),MAT.gold,[-.19,.0205,.19],null,[-PI/2,0,0]);tm.castShadow=false;
  return g;}
makeCPU('cpuS4',MAT.pcbBlue,['BIT CORE','S4 · 6C'],[1.72,0,-1.25],'Soquete S4','#93a1b3');
makeCPU('cpu',MAT.pcbGreen,['BIT CORE','S5 · 8C/16T'],[2.3,0,-1.25],'Soquete S5','#93a1b3');
(function(){const g=item('cpuNB','cpuNB',[2.88,0,-1.25],[0,0,0],2,'Notebook',[0,.2,0],'#93a1b3');
  add(g,rbox(.38,.014,.3,.003),MAT.pcbGreen,[0,.007,0]);add(g,box(.13,.016,.11),MAT.gloss,[-.04,.022,0]);
  for(let i=0;i<6;i++)add(g,box(.02,.01,.012),MAT.cap,[.08+(i%2)*.04,.019,-.06+Math.floor(i/2)*.06]);})();
/* cooler torre */
const cooler=item('cooler','cooler',[2.3,0,-.58],[0,-PI/2,0],2);
add(cooler,rbox(.38,.04,.38,.006),MAT.copper,[0,.02,0]);
[-.09,-.03,.03,.09].forEach(x=>{add(cooler,cyl(.016,.016,.66,14),MAT.copper,[x,.37,.02]);add(cooler,cyl(.016,.016,.66,14),MAT.nickel,[x+.012,.37,-.05]);});
for(let i=0;i<36;i++)add(cooler,box(.56,.006,.26),MAT.alu,[0,.14+i*.0145,0]);
add(cooler,rbox(.58,.028,.28,.01),MAT.anod,[0,.68,0]);
const capTex=textTex(256,128,(g,w,h)=>{g.fillStyle='#e9eef5';g.font='bold 44px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('BIT FROST',w/2,h/2);});
decal(cooler,.36,.09,capTex,[0,.695,0],[-PI/2,0,0],{m:.4,r:.4});
const cf=makeFan(.5,true);cf.position.set(.31,.4,0);cf.rotation.y=PI/2;cooler.add(cf);
/* memórias */
function ramTex(t){return textTex(512,128,(g,w,h)=>{g.fillStyle='#e9eef5';g.font='bold 46px sans-serif';g.textBaseline='middle';g.fillText(t,24,h/2);g.fillStyle='#f5c518';g.fillRect(w-120,h/2-6,90,12);});}
function makeRAM(id,pos,gen,lab){const g=item(id,id==='ramD4'?'ramD4':'ram',pos,[0,0,PI/2],3,lab,[.3,0,0],gen==='DDR4'?'#93a1b3':'#f5c518');
  add(g,box(.016,.3,1.25),MAT.pcbGreen,[0,0,0]);add(g,box(.018,.035,1.2),MAT.gold,[0,-.13,0]);
  const nz=gen==='DDR4'?-.08:.09;add(g,box(.03,.05,.025),MAT.plastic,[0,-.135,nz]);
  [-1,1].forEach(s=>{add(g,rbox(.016,.25,1.21,.006),MAT.anod,[s*.017,.03,0]);decal(g,.7,.17,ramTex(gen+' 16GB 6000'),[s*.0255,.03,0],[0,s*PI/2,0],{m:.4,r:.4});});
  add(g,rbox(.03,.035,1.18,.01),ledMat,[0,.168,0]);
  const glow=new THREE.Mesh(box(.07,.36,1.3),new THREE.MeshBasicMaterial({color:0xff3344,transparent:true,opacity:.35,depthWrite:false,toneMapped:false}));glow.visible=false;g.add(glow);ITEMS[id].glow=glow;return g;}
makeRAM('ram1',[1.75,.02,.3],'DDR5','DDR5');makeRAM('ram2',[2.15,.02,.3],'DDR5','DDR5');makeRAM('ramD4',[2.6,.02,.3],'DDR4','DDR4');
/* SSD M.2 */
const ssd=item('ssd','ssd',[3.0,.01,.3],[0,PI/2,0],4);
add(ssd,box(.5,.012,.11),MAT.pcbGreen,[0,0,0]);add(ssd,box(.06,.0125,.11),MAT.gold,[-.22,0,0]);
const ssdTex=textTex(512,128,(g,w,h)=>{g.fillStyle='#0d0e11';g.fillRect(0,0,w,h);g.fillStyle='#e9eef5';g.font='bold 44px sans-serif';g.textBaseline='middle';g.fillText('BIT NVMe 1TB',22,h/2-12);g.fillStyle='#f5c518';g.font='bold 24px sans-serif';g.fillText('PCIe 4.0 · M.2 2280',22,h/2+30);});
decal(ssd,.38,.095,ssdTex,[.03,.0072,0],[-PI/2,0,0],{m:.1,r:.5});
/* placa de vídeo */
const gpu=item('gpu','gpu',[2.35,.13,1.25],[-PI/2,0,0],4);
add(gpu,rbox(1.5,.55,.022,.008),std(0xffffff,.9,.35,{map:brushed,color:0x3a3f47}),[0,0,-.1]);
add(gpu,box(1.44,.5,.012),MAT.pcbGreen,[0,-.01,-.083]);
add(gpu,rbox(1.48,.5,.15,.03),MAT.anod,[0,0,0]);
add(gpu,box(1.36,.012,.152),MAT.alu,[0,-.19,0]);add(gpu,box(.012,.44,.152),MAT.alu,[.0,0,0]);
add(gpu,rbox(1.2,.018,.04,.008),ledMat,[0,.258,-.01]);
for(let i=0;i<40;i++){const x=-.66+i*.03;if(x>.42&&x<.66)continue;add(gpu,box(.006,.045,.13),MAT.alu,[x,.27,-.02]);}
add(gpu,rbox(.04,.62,.24,.006),MAT.steel,[-.77,0,-.03]);
for(let i=0;i<5;i++)add(gpu,box(.042,.03,.12),MAT.gloss,[-.77,-.18+i*.09,-.03]);
add(gpu,box(.6,.06,.013),MAT.gold,[-.3,-.3,-.083]);
add(gpu,rbox(.17,.05,.07,.008),MAT.slot,[.55,.285,-.03]);
const gpuTex=textTex(512,96,(g,w,h)=>{g.fillStyle='#e9eef5';g.font='bold 52px sans-serif';g.textBaseline='middle';g.fillText('BIT FORCE  7700',10,h/2);});
decal(gpu,.5,.09,gpuTex,[.35,-.215,.0765],[0,0,0],{m:.4,r:.35});
[-.36,.36].forEach(x=>{const f=makeFan(.44,false);f.position.set(x,.03,.07);gpu.add(f);});
/* fontes (3 opções) */
function makePSU(id,watts,badge,badgeCol,pos){const g=item(id,'psu',pos,[0,0,0],5,watts+' W',[0,.62,0],badgeCol);g.visible=false;
  add(g,rbox(1.0,.46,.85,.025),std(0xffffff,.35,.5,{map:plasticTex,color:0x2a2c31}),[0,.23,0]);
  [.3,.24,.18,.12].forEach(r=>add(g,new THREE.TorusGeometry(r,.008,6,48),MAT.anodLight,[0,.462,.0],null,[PI/2,0,0]));
  add(g,box(.62,.006,.012),MAT.anodLight,[0,.462,0]);add(g,box(.012,.006,.62),MAT.anodLight,[0,.462,0]);
  add(g,cyl(.07,.07,.01,24),MAT.gloss,[0,.463,0]);
  const t=textTex(512,256,(c,w,h)=>{c.fillStyle='#14161a';c.fillRect(0,0,w,h);c.fillStyle='#e9eef5';c.font='bold 92px sans-serif';c.textAlign='center';c.fillText(watts+' W',w/2,120);
    c.fillStyle=badgeCol;c.fillRect(w/2-150,160,300,60);c.fillStyle='#111';c.font='bold 34px sans-serif';c.fillText(badge,w/2,203);});
  decal(g,.5,.25,t,[0,.23,.4265],[0,0,0],{m:.2,r:.5});
  for(let i=0;i<6;i++)add(g,rbox(.1,.07,.02,.008),MAT.slot,[-.38+i*.11,.12,-.43]);
  return g;}
makePSU('psu350',350,'GENÉRICA','#9aa3ad',[2.35,0,-1.05]);makePSU('psu650',650,'80 PLUS GOLD','#e3b341',[2.35,0,.05]);makePSU('psu1600',1600,'PLATINUM','#d6dde6',[2.35,0,1.15]);

/* pasta térmica */
const pasteMesh=add(rig,cyl(.07,.07,.008,32),MAT.paste,[-.2,TOP+.084,-.5]);pasteMesh.visible=false;

/* ---------- gabinete (deitado, com vidro em cima) ---------- */
const caseG=new THREE.Group();caseG.visible=false;caseG.userData.info='case';rig.add(caseG);
(function(){const X0=-1.5,X1=1.6,Z0=-1.62,Z1=2.72,Hh=1.12,cx=(X0+X1)/2,cz=(Z0+Z1)/2,w=X1-X0,d=Z1-Z0;
  const glassMat=new THREE.MeshPhysicalMaterial({color:0xb4c4d6,metalness:0,roughness:.03,transparent:true,opacity:.14,clearcoat:1,clearcoatRoughness:0,depthWrite:false,side:THREE.DoubleSide});
  const glassP=(gw,gh,gd,pos)=>{const g=new THREE.Mesh(box(gw,gh,gd),glassMat);g.position.set(...pos);g.renderOrder=10;g.userData.skip=true;caseG.add(g);};
  add(caseG,box(w,.02,d),MAT.anod,[cx,.01,cz]);
  /* traseira (lado do painel de portas) com ventoinha de exaustão */
  add(caseG,rbox(.03,Hh,d,.008),MAT.anod,[X0,Hh/2,cz]);
  const ex=makeFan(.46,true);ex.position.set(X0+.07,.58,.35);ex.rotation.y=PI/2;caseG.add(ex);
  /* topo do gabinete com tela de ventilação */
  add(caseG,rbox(w,Hh,.03,.008),std(0xffffff,.6,.5,{map:meshTex}),[cx,Hh/2,Z0]);
  /* frente e fundo de vidro (estilo aquário) com ventoinhas de entrada */
  glassP(.012,Hh-.06,d-.06,[X1,Hh/2,cz]);glassP(w-.06,Hh-.06,.012,[cx,Hh/2,Z1]);
  [-.75,.05,.85].forEach(z=>{const fn=makeFan(.46,true);fn.position.set(X1-.07,.56,z);fn.rotation.y=-PI/2;caseG.add(fn);});
  /* estrutura de alumínio */
  [[X0,Z0],[X1,Z0],[X0,Z1],[X1,Z1]].forEach(([x,z])=>add(caseG,rbox(.05,Hh,.05,.012),MAT.anodLight,[x,Hh/2,z]));
  [[cx,Z0,w,.05],[cx,Z1,w,.05]].forEach(([x,z,a,b])=>{add(caseG,box(a,.04,b),MAT.anodLight,[x,Hh,z]);add(caseG,box(a,.04,b),MAT.anodLight,[x,.02,z]);});
  [[X0,cz],[X1,cz]].forEach(([x,z])=>{add(caseG,box(.05,.04,d),MAT.anodLight,[x,Hh,z]);add(caseG,box(.05,.04,d),MAT.anodLight,[x,.02,z]);});
  /* vidro lateral (em cima, pois o gabinete está deitado) */
  glassP(w-.06,.012,d-.06,[cx,Hh+.01,cz]);
  add(caseG,cyl(.035,.035,.02,24),MAT.steel,[1.35,Hh+.02,Z0+.12]);add(caseG,new THREE.TorusGeometry(.04,.006,8,32),ledMat,[1.35,Hh+.031,Z0+.12],null,[PI/2,0,0]);
  for(let i=0;i<7;i++)add(caseG,rbox(.03,.01,.16,.004),MAT.steel,[X0+.02,.25+i*.075,-.55]);
})();

/* ---------- áreas de encaixe destacadas ---------- */
const haloMat=new THREE.MeshBasicMaterial({color:0xf5c518,transparent:true,opacity:.35,depthWrite:false,toneMapped:false});
const SLOTS={socket:[[-.2,TOP+.05,-.5],[.62,.1,.62]],A1:[[RAMX.A1,TOP+.06,-.4],[.09,.12,1.36]],A2:[[RAMX.A2,TOP+.06,-.4],[.09,.12,1.36]],
  B1:[[RAMX.B1,TOP+.06,-.4],[.09,.12,1.36]],B2:[[RAMX.B2,TOP+.06,-.4],[.09,.12,1.36]],m2:[[-.5,TOP+.03,.15],[.6,.05,.18]],
  x16:[[-.35,TOP+.04,.55],[1.1,.08,.12]],x1:[[-.85,TOP+.04,.95],[.38,.08,.12]],p24:[[1.12,TOP+.06,-.2],[.16,.14,.55]],
  cpu8:[[-.85,TOP+.06,-1.18],[.36,.14,.16]],gpu8:[[.5,TOP+.62,.63],[.24,.1,.14]],bay:[[.5,.24,2.1],[1.06,.5,.9]]};
const halos={};Object.entries(SLOTS).forEach(([k,[p,s]])=>{const h=new THREE.Mesh(box(...s),haloMat);h.position.set(...p);h.visible=false;h.userData.slot=k;rig.add(h);halos[k]=h;});

/* ---------- textos ---------- */
const INFO={
  board:['Placa-mãe','Conecta todas as peças e faz elas conversarem entre si por trilhas de cobre.'],
  socket:['Soquete S5','Encaixe físico e elétrico do processador. Esta placa aceita apenas processadores S5.'],
  vrm:['VRM','Circuitos que reduzem os 12 V da fonte para cerca de 1 V usado pelo processador. Os dissipadores retiram o calor deles.'],
  ramslot:['Slots de memória','Dois canais: A1 e A2 (canal A), B1 e B2 (canal B).'],
  m2:['Slot M.2','Conector para SSDs NVMe, ligados por linhas PCIe.'],
  x16:['Slot PCIe x16','16 linhas de dados e reforço metálico: feito para a placa de vídeo.'],
  x1:['Slot PCIe x1','Uma linha de dados, para placas pequenas como Wi-Fi.'],
  p24:['Conector de 24 pinos','Principal entrada de energia da placa-mãe.'],
  cpu8:['Conector de 8 pinos','Energia extra dedicada ao processador.'],
  io:['Painel traseiro','Portas USB, rede, áudio e vídeo da traseira do gabinete.'],
  chipset:['Chipset','Controla a comunicação com armazenamento extra, USB e rede.'],
  cmos:['Bateria CMOS','Mantém a data, a hora e as configurações da BIOS com o PC desligado.'],
  monitor:['Monitor','Mostra o resultado do primeiro boot.'],
  cpu:['Processador S5','8 núcleos e 16 threads. Compatível com esta placa-mãe.'],
  cpuS4:['Processador S4','Geração anterior, com outro soquete.'],
  cpuNB:['Processador de notebook','Vem soldado na placa (formato BGA), sem encaixe.'],
  cooler:['Cooler torre','Base de cobre, heatpipes, aletas de alumínio e ventoinha.'],
  ram:['Memória DDR5','Pente de 16 GB. Guarda os dados em uso enquanto o PC está ligado.'],
  ramD4:['Memória DDR4','Geração anterior de memória.'],
  ssd:['SSD NVMe M.2','Armazenamento permanente de 1 TB, ligado por PCIe.'],
  gpu:['Placa de vídeo','Processa imagens com milhares de núcleos em paralelo.'],
  psu:['Fonte','Converte a energia da tomada para as tensões usadas pelas peças.'],
  case:['Gabinete','Protege as peças e organiza o fluxo de ar: entra pela frente e sai por trás.']
};
const CARDS={
  cpu_ok:['good','O processador entrou no soquete sem nenhuma força.','O soquete é o encaixe físico e elétrico entre o processador e a placa-mãe. Cada geração muda o número e a posição dos contatos, então só um processador do mesmo soquete (S5) se conecta. O triângulo dourado no canto mostra a posição certa.','Antes de comprar, confira na página da placa-mãe quais soquetes e modelos ela aceita.'],
  cpu_s4:['bad','O processador S4 não encaixou: os contatos dele não batem com o soquete S5.','Soquetes diferentes têm quantidade e posição de contatos diferentes. Mesmo parecendo quase igual, forçar a peça entorta os pinos e pode estragar a placa-mãe.','Trocar de geração de processador costuma exigir trocar a placa-mãe também.'],
  cpu_nb:['bad','Esse processador não tem como encaixar no soquete.','Processadores de notebook usam o formato BGA: em vez de contatos, têm pequenas bolinhas de solda e ficam soldados na placa. Isso economiza espaço, mas impede a troca.','Por isso quase nunca dá para fazer upgrade de processador em notebook.'],
  paste_low:['bad','Pasta de menos: ela não cobriu o centro do processador.','O ar que fica preso entre o processador e o cooler conduz muito mal o calor. Sem pasta suficiente, o processador esquenta e reduz a própria velocidade para se proteger (thermal throttling).','Uma gota do tamanho de um grão de ervilha no centro basta: a pressão do cooler espalha.'],
  paste_high:['bad','Pasta demais: ela escorreu pelas bordas do processador.','A pasta só precisa preencher as microfalhas das superfícies. O excesso não melhora o resfriamento, suja a placa e, em pastas condutivas, pode causar curto-circuito.','Se exagerar, limpe com álcool isopropílico e aplique de novo.'],
  paste_ok:['good','Quantidade ideal de pasta térmica.','As superfícies do processador e do cooler parecem lisas, mas têm microfalhas cheias de ar. A pasta preenche esses espaços e deixa o calor passar para o cooler.','A pasta resseca com o tempo: trocar a cada 2 ou 3 anos mantém o PC frio.'],
  cooler_ok:['good','Cooler instalado sobre o processador.','O calor passa da base de cobre para os heatpipes, tubos com um líquido que evapora no lado quente e condensa no lado frio. As aletas espalham o calor e a ventoinha empurra o ar quente para trás.','Sem cooler, um processador moderno passa de 90 °C em segundos e desliga para se proteger.'],
  ram_d4:['bad','O pente DDR4 não entrou no slot.','Cada geração de memória tem o chanfro (a fenda nos contatos dourados) numa posição diferente. Isso impede de encaixar uma memória que a placa não suporta eletricamente: a DDR5 usa outra tensão e outro protocolo.','A geração de RAM aceita aparece na especificação da placa-mãe.'],
  ram_single:['bad','Os dois pentes ficaram no mesmo canal. O medidor mostra memória mais lenta.','A placa tem dois canais de memória, A e B, como uma estrada de duas faixas. Com os dois pentes no mesmo canal, só uma faixa é usada (single channel) e a velocidade de transferência cai pela metade.','Por isso dois pentes de 8 GB costumam ser mais rápidos que um único de 16 GB.'],
  ram_a1b1:['warn','Dual channel ativado, mas nos slots A1 e B1.','Os dois canais estão em uso, então a velocidade é boa. Mesmo assim o manual recomenda A2 e B2: são os slots mais distantes do processador, onde o sinal elétrico fica mais limpo e a memória atinge frequências maiores com estabilidade.','Sempre consulte o manual da placa-mãe para a ordem dos slots.'],
  ram_ok:['good','Dual channel ativado nos slots recomendados.','Com um pente em cada canal, o processador lê e grava nos dois ao mesmo tempo, dobrando a largura de banda. A RAM guarda os dados em uso agora e é apagada quando o PC desliga.','Jogos e edição de vídeo são as tarefas que mais sentem a diferença do dual channel.'],
  ssd_ok:['good','SSD M.2 instalado e preso pelo parafuso.','O SSD é o armazenamento permanente: guarda o sistema e os arquivos mesmo desligado. O modelo NVMe usa linhas PCIe ligadas direto ao processador e é dezenas de vezes mais rápido que um HD, que depende de um disco girando.','Trocar o HD de um computador antigo por um SSD é o upgrade que mais deixa ele rápido.'],
  gpu_x1:['bad','A placa de vídeo não coube no slot PCIe x1.','O número depois do x indica quantas linhas de dados o slot tem. A placa de vídeo troca muita informação com o processador e precisa das 16 linhas do slot x16, o mais longo e reforçado.','Slots x1 servem para placas menores, como Wi-Fi ou captura de vídeo.'],
  gpu_ok:['good','Placa de vídeo encaixada no slot PCIe x16.','A GPU tem milhares de núcleos simples trabalhando em paralelo, ideais para calcular os milhões de pixels de uma imagem. Nesse tipo de tarefa ela é muito mais rápida que o processador.','Esse mesmo paralelismo faz as GPUs serem usadas para treinar inteligência artificial.'],
  psu_350:['bad','Com a fonte de 350 W, o PC desligou sozinho assim que um jogo começou.','As peças consomem 420 W juntas, e a placa de vídeo ainda tem picos rápidos acima disso. Quando o consumo passa do limite, a proteção da fonte corta a energia para não queimar.','Fonte fraca é uma das causas mais comuns de PC que reinicia sozinho em jogos.'],
  psu_1600:['warn','A fonte de 1600 W funcionaria, mas é exagerada para este PC.','Fontes têm a melhor eficiência perto de 50% da capacidade. Usando 420 W de 1600 W, ela fica numa faixa menos eficiente, desperdiça energia e custa muito mais.','Escolha uma fonte com cerca de 30% a 50% de folga sobre o consumo.'],
  psu_ok:['good','Fonte de 650 W instalada no gabinete.','Ela converte a corrente alternada da tomada em corrente contínua de 12 V, 5 V e 3,3 V. Com 420 W de consumo, sobra folga para picos e ela trabalha perto da faixa de maior eficiência.','O selo 80 Plus indica a eficiência: quanto mais alto (Bronze, Gold, Platinum), menos energia vira calor.'],
  cables_ok:['good','Todos os cabos de energia conectados.','O cabo de 24 pinos alimenta a placa-mãe, o de 8 pinos leva energia extra só para o processador e o cabo PCIe alimenta a placa de vídeo, que consome mais do que o slot consegue entregar.','Esquecer o cabo de 8 pinos do processador é um erro clássico: o PC simplesmente não liga.'],
  boot_fail:['bad','O PC ligou e as ventoinhas giraram, mas o monitor ficou sem sinal e a placa emitiu bipes.','Ao ligar, a placa-mãe faz o POST, um autoteste das peças, e avisa com bipes quando algo falha. Ao fechar o gabinete, um pente de memória saiu um pouco do lugar.','Toque na peça piscando em vermelho para encaixá-la de novo.','O que fazer'],
  boot_ok:['good','Memória encaixada de novo: o POST passou e o sistema iniciou.','Com todas as peças respondendo, a placa-mãe passa o controle ao SSD, que carrega o sistema operacional na RAM. A partir daí o processador começa a executar os programas.','Tirar e recolocar a memória resolve muitos casos de PC que liga mas não mostra imagem.']
};
function showInfo(k){const d=INFO[k];if(!d)return;$('#info h3').textContent=d[0];$('#info p').textContent=d[1];$('#info').style.display='block';}
$('#infoClose').onclick=()=>$('#info').style.display='none';
function setCard(k){S.card=k;panel.classList.remove('min');$('#info').style.display='none';}

/* ---------- animação ---------- */
const anims=[];
function moveTo(obj,pos,rot,dur=.8,arc=.55){for(let i=anims.length-1;i>=0;i--)if(anims[i].obj===obj)anims.splice(i,1);const q1=new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot));
  anims.push({obj,p0:obj.position.clone(),p1:new THREE.Vector3(...pos),q0:obj.quaternion.clone(),q1,t:0,dur:reduceMotion?.01:dur,arc});}

/* ---------- regras ---------- */
const FAMILY={cpu:'cpu',cpuS4:'cpu',cpuNB:'cpu',ram1:'ram',ram2:'ram',ramD4:'ram',psu350:'psu',psu650:'psu',psu1600:'psu'};
function selectable(id){const it=ITEMS[id];if(!it||S.placed[id]||it.step!==S.step)return false;
  if(S.step===2){if(FAMILY[id]==='cpu')return !S.placed.cpu;if(id==='cooler')return S.paste&&!S.placed.cooler;}
  if(S.step===5)return !S.psu;
  return true;}
function why(id){const it=ITEMS[id];if(!it)return null;
  if(id==='cooler'&&S.step===2&&!S.placed.cpu)return 'Primeiro escolha e encaixe o processador.';
  if(id==='cooler'&&S.step===2&&!S.paste)return 'Aplique a pasta térmica antes do cooler.';
  if(!S.placed[id]&&it.step>S.step)return 'Essa peça é de uma fase seguinte.';return null;}
function select(id){if(S.sel&&S.sel!==id)drop();S.sel=id;const o=ITEMS[id].obj;if(o.userData.base==null)o.userData.base=o.position.y;
  showInfo(ITEMS[id].obj.userData.info);toast('Agora toque na área destacada em amarelo.');updateHalos();render();}
function drop(){if(!S.sel)return;const o=ITEMS[S.sel].obj;if(o.userData.base!=null)o.position.y=o.userData.base;o.userData.base=null;S.sel=null;updateHalos();}
function toTray(id){const it=ITEMS[id],o=it.obj;o.userData.base=null;moveTo(o,it.trayPos,it.trayRot,.6,.3);if(it.label)it.label.visible=true;}
function reject(id,card){S.err++;toTray(id);S.sel=null;setCard(card);updateHalos();render();}
function updateHalos(){Object.values(halos).forEach(h=>h.visible=false);const show=k=>halos[k].visible=true;const f=FAMILY[S.sel]||S.sel;
  if(f==='cpu'||S.sel==='cooler')show('socket');
  if(f==='ram')['A1','A2','B1','B2'].forEach(k=>{if(!S.occ[k])show(k)});
  if(S.sel==='ssd')show('m2');if(S.sel==='gpu'){show('x16');show('x1');}
  if(f==='psu')show('bay');
  if(S.step===5&&S.psu)['p24','cpu8','gpu8'].forEach(k=>{if(!S.cables[k])show(k)});}
function place(id,pos,rot=[0,0,0],slot){const it=ITEMS[id],o=it.obj;o.userData.base=null;moveTo(o,pos,rot);S.placed[id]=true;if(it.label)it.label.visible=false;
  if(slot){S.occ[slot]=id;S.slotOf[id]=slot;}S.sel=null;updateHalos();}
function slotTap(k){
  if(['p24','cpu8','gpu8'].includes(k)){connect(k);return;}
  const id=S.sel;if(!id)return;const f=FAMILY[id]||id;
  if(f==='cpu'&&k==='socket'){if(id==='cpu'){place('cpu',[-.2,TOP+.03,-.5]);setCard('cpu_ok');render();}else reject(id,id==='cpuS4'?'cpu_s4':'cpu_nb');return;}
  if(id==='cooler'&&k==='socket'){place('cooler',[-.2,TOP+.088,-.5],[0,0,0]);setCard('cooler_ok');render();return;}
  if(f==='ram'&&/^[AB][12]$/.test(k)){if(id==='ramD4'){reject(id,'ram_d4');return;}
    place(id,[RAMX[k],TOP+.2,-.4],[0,0,0],k);
    if(S.placed.ram1&&S.placed.ram2){const a=S.slotOf.ram1,b=S.slotOf.ram2;
      if(a[0]===b[0]){S.ramSpeed=50;S.err++;setCard('ram_single');}
      else if([a,b].sort().join()==='A2,B2'){S.ramSpeed=100;setCard('ram_ok');}
      else{S.ramSpeed=88;setCard('ram_a1b1');}}
    else toast(`Pente encaixado no slot ${k}. Falta o outro.`);
    render();return;}
  if(id==='ssd'&&k==='m2'){place('ssd',[-.5,TOP+.016,.15],[0,0,0]);setCard('ssd_ok');render();return;}
  if(id==='gpu'){if(k==='x16'){place('gpu',[-.05,TOP+.325,.65]);setCard('gpu_ok');render();}else reject('gpu','gpu_x1');return;}
  if(f==='psu'&&k==='bay'){if(id==='psu650'){S.psu=id;place(id,[.5,0,2.1]);setCard('psu_ok');render();}else reject(id,id==='psu350'?'psu_350':'psu_1600');}
}
function resetRAM(){['ram1','ram2'].forEach(id=>{if(S.placed[id]){delete S.placed[id];delete S.occ[S.slotOf[id]];delete S.slotOf[id];toTray(id);}});S.ramSpeed=0;S.card=null;updateHalos();render();}
/* cabos */
const CABLE_PATH={
  p24:[[.75,.46,1.8],[.95,.8,1.4],[1.35,.55,.5],[1.2,.4,-.2],[1.12,TOP+.1,-.2]],
  cpu8:[[.3,.46,1.8],[.1,.9,1.5],[-1.4,.75,.3],[-1.15,.55,-1.2],[-.85,TOP+.1,-1.18]],
  gpu8:[[.55,.46,1.75],[.6,.9,1.3],[.5,1.0,.65],[.5,TOP+.67,.63]]};
const cableMeshes=[];
function connect(k){if(S.cables[k]||!S.psu)return;S.cables[k]=true;
  const pts=CABLE_PATH[k].map(p=>new THREE.Vector3(...p));const c=new THREE.CatmullRomCurve3(pts);
  const tube=add(rig,new THREE.TubeGeometry(c,64,k==='p24'?.04:.03,12,false),MAT.cable,[0,0,0],'psu');
  const e=pts[pts.length-1];const plug=add(rig,rbox(.13,.07,.13,.012),MAT.plastic,[e.x,e.y,e.z],'psu');cableMeshes.push(tube,plug);
  if(S.cables.p24&&S.cables.cpu8&&S.cables.gpu8)setCard('cables_ok');
  else toast({p24:'Cabo de 24 pinos conectado à placa-mãe.',cpu8:'Cabo de 8 pinos conectado ao processador.',gpu8:'Cabo PCIe conectado à placa de vídeo.'}[k]);
  updateHalos();render();}

/* ---------- toque na cena ---------- */
const ray=new THREE.Raycaster();const ptr=new THREE.Vector2();let downPos=null;
function visibleChain(o){while(o){if(!o.visible)return false;o=o.parent;}return true;}
function tagOf(o){while(o&&o!==rig){if(o.userData.slot||o.userData.item||o.userData.info)return o.userData;o=o.parent;}return null;}
renderer.domElement.addEventListener('pointerdown',e=>{downPos=[e.clientX,e.clientY]});
renderer.domElement.addEventListener('pointerup',e=>{
  if(!downPos||Math.hypot(e.clientX-downPos[0],e.clientY-downPos[1])>7||!rig.visible||S.step<1||S.step>6)return;
  const r=renderer.domElement.getBoundingClientRect();ptr.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);
  ray.setFromCamera(ptr,camera);const hits=ray.intersectObjects(rig.children,true);
  for(const h of hits){const o=h.object;if(o.userData.skip||o.isSprite&&!o.parent.visible||!visibleChain(o))continue;const ud=tagOf(o);if(!ud)continue;
    if(S.loose&&ud.item===S.loose){fixLoose();return;}
    if(ud.slot){slotTap(ud.slot);return;}
    if(ud.item){if(selectable(ud.item))select(ud.item);else{showInfo(ud.info);const w=why(ud.item);if(w)toast(w);}return;}
    if(ud.info){showInfo(ud.info);return;}}
});

/* ---------- câmera do celular ---------- */
const video=$('#video');
async function startCamera(){try{const st=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});video.srcObject=st;await video.play();return true;}catch(e){return false;}}
function setAR(on){S.ar=on;video.style.display=on?'block':'none';scene.background=on?null:BG;scene.fog=on?null:new THREE.Fog(0x141a22,11,22);
  table.visible=!on;marker.visible=!on;shadowPlane.visible=on;$('#modeBtn').textContent=on?'Modo: câmera':'Modo: 3D';}
$('#modeBtn').onclick=async()=>{if(S.ar){setAR(false);return;}if(video.srcObject||await startCamera())setAR(true);else toast('A câmera não está disponível aqui. Abra o link no celular e permita o acesso.');};

/* ---------- som de bipe (POST) ---------- */
function beep(times){try{const A=window.AudioContext||window.webkitAudioContext;if(!A)return;const ac=beep.ac||(beep.ac=new A());
  for(let i=0;i<times;i++){const o=ac.createOscillator(),g=ac.createGain();o.type='square';o.frequency.value=880;g.gain.value=.05;o.connect(g);g.connect(ac.destination);const t=ac.currentTime+i*.35;o.start(t);o.stop(t+.18);}}catch(e){}}

/* =====================================================================
   ATELIÊ EM REALIDADE AUMENTADA — fases de AR, eventos e encerramento
   ===================================================================== */
ray.layers.enableAll();
const PH=['inicio','local','reconhecer','escala','rastrear','proc','mem','ligar','paredes','galeria','fim'];
const PHN=['Início','Mesa de ensaio','Reconhecer','Escala','Rastrear','Processador','Memória e vídeo','Ligar','Obras na parede','Galeria 360°','Fim'];
const STEPOF={inicio:0,local:1,galeria:6,paredes:6,reconhecer:1,escala:1,rastrear:1,proc:2,mem:3,ligar:6,fim:7};
const AR={marker:-1,recog:false,scaleCm:null,scaleF:.5,tracked:false,reason:'',why:null,handOn:false,lightOff:false,
  turned:false,lostOnce:false,recovered:false,az0:0,losses:0,wasTracked:false,art:[false,false,false,false],handEv:false,lightEv:false,lostCard:null,place:null,glare:false,glareEv:false,inside:false,obra:null};

/* ---------- personagens (avatares geométricos) ---------- */
const COL={azul:'#3b7be0',rosa:'#ec6fa8',vinho:'#9c2a4f',amarelo:'#f5c518'};
const CHAR={
  marcador:{n:'Marcador',c:COL.azul,s:'sq',d:'A referência de tudo'},
  camera:{n:'Câmera',c:COL.rosa,s:'ci',d:'Procura os pontos'},
  escala:{n:'Escala',t:'#e3809f',c:COL.vinho,s:'tr',d:'Converte em centímetros'},
  rastreio:{n:'Rastreamento',c:COL.amarelo,s:'hx',d:'Recalcula a cada quadro'}};
function avatar(k,sz=46){const c=CHAR[k].c,s=CHAR[k].s;const ink=k==='rastreio'?'#1a1a1a':'#fff';
  const shape=s==='sq'?`<rect x="5" y="5" width="38" height="38" rx="7" fill="${c}"/>`:s==='ci'?`<circle cx="24" cy="24" r="20" fill="${c}"/>`:
    s==='tr'?`<path d="M24 4 L45 42 L3 42 Z" fill="${c}" stroke="${c}" stroke-width="3" stroke-linejoin="round"/>`:`<path d="M24 3 L42 13.5 L42 34.5 L24 45 L6 34.5 L6 13.5 Z" fill="${c}"/>`;
  const ey=s==='tr'?29:22;
  return `<svg width="${sz}" height="${sz}" viewBox="0 0 48 48" aria-hidden="true">${shape}<circle cx="18" cy="${ey}" r="2.6" fill="${ink}"/><circle cx="30" cy="${ey}" r="2.6" fill="${ink}"/><path d="M18 ${ey+7} Q24 ${ey+11} 30 ${ey+7}" stroke="${ink}" stroke-width="2.4" fill="none" stroke-linecap="round"/></svg>`;}
/* ---------- avatares estilo memoji das integrantes ---------- */
const MEMBERS=[
  {id:'al',nome:'Ana Luísa',papel:'marcador'},
  {id:'lu',nome:'Luiza',papel:'camera'},
  {id:'gi',nome:'Giovanna',papel:'escala'},
  {id:'ar',nome:'Ana Roberta',papel:'rastreio'}];
const memberOf=k=>MEMBERS.find(m=>m.papel===k)||MEMBERS[0];
function memberSVG(m){
  const bg=CHAR[m.papel].c,u=m.id;
  const P={
    al:{sk:['#efc4a6','#d29a78'],hair:['#3a2418','#1f130c','#6b4630'],cloth:'#1c1d22',mouth:'soft',lip:'#c9787c',brow:'#2a1a12'},
    lu:{sk:['#f6d6c4','#e0ad95'],hair:['#2a1d17','#140d0a','#4a352a'],cloth:'#8b8580',mouth:'teeth',lip:'#d9707e',brow:'#2a1d17'},
    gi:{sk:['#f2d2c0','#d8a991'],hair:['#151216','#060507','#2c2730'],cloth:'#121216',mouth:'pout',lip:'#7d1d2b',brow:'#151216'},
    ar:{sk:['#ecc19e','#c99270'],hair:['#4a2f1e','#2c1a10','#c4935a'],cloth:'#141418',mouth:'soft',lip:'#b3363c',brow:'#3a2418'}}[u];
  const [h,hd,hh]=P.hair;
  const defs=`<defs>
    <radialGradient id="bg${u}" cx="50%" cy="35%" r="75%"><stop offset="0" stop-color="${bg}" stop-opacity=".75"/><stop offset="1" stop-color="${bg}"/></radialGradient>
    <radialGradient id="sk${u}" cx="45%" cy="38%" r="70%"><stop offset="0" stop-color="${P.sk[0]}"/><stop offset=".75" stop-color="${P.sk[0]}"/><stop offset="1" stop-color="${P.sk[1]}"/></radialGradient>
    <linearGradient id="hr${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${h}"/><stop offset="1" stop-color="${hd}"/></linearGradient>
    <linearGradient id="cl${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.cloth}"/><stop offset="1" stop-color="#000" stop-opacity=".9"/></linearGradient>
    <clipPath id="cc${u}"><circle cx="64" cy="64" r="62"/></clipPath></defs>`;
  let back='',front='',acc='',extra='';
  if(u==='al'){ /* longo, volumoso e ondulado, risca lateral */
    back=`<path d="M30 52 C24 24 54 10 72 14 C98 18 108 40 102 62 C108 80 112 96 106 118 L22 118 C16 98 22 80 26 66 Z" fill="url(#hr${u})"/>`+
      [[24,78],[22,96],[26,112],[104,80],[108,98],[104,114]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="10" fill="${h}"/><path d="M${x-6} ${y-2} Q${x} ${y-8} ${x+6} ${y-2}" stroke="${hh}" stroke-width="2" fill="none" opacity=".55"/>`).join('');
    front=`<path d="M38 50 C38 28 58 20 74 22 C90 24 98 36 96 56 C92 42 84 34 70 32 C60 31 50 38 44 54 C42 58 40 62 38 66 Z" fill="url(#hr${u})"/>
      <path d="M38 50 C34 62 34 74 38 86 C34 82 30 70 32 58 Z" fill="${h}"/><path d="M96 54 C102 66 100 80 94 90 C98 78 98 66 94 58 Z" fill="${h}"/>
      <path d="M52 28 C62 24 76 25 86 32" stroke="${hh}" stroke-width="2.5" fill="none" opacity=".6" stroke-linecap="round"/>`;}
  if(u==='lu'){ /* preso para trás, liso */
    back=`<path d="M38 50 C36 26 56 16 70 17 C90 18 100 34 96 58 C100 70 100 84 94 94 C90 80 92 70 90 64 L40 64 Z" fill="url(#hr${u})"/>`;
    front=`<path d="M38 52 C38 30 56 21 70 21 C86 22 96 34 94 54 C88 40 80 33 66 33 C54 34 44 42 38 52 Z" fill="url(#hr${u})"/>
      <path d="M56 26 C66 23 78 25 86 31" stroke="${hh}" stroke-width="2" fill="none" opacity=".6" stroke-linecap="round"/>`;
    acc=`<circle cx="37" cy="66" r="3.2" fill="none" stroke="#d4af37" stroke-width="1.6"/><path d="M50 108 Q64 118 78 108" stroke="#d9d9d9" stroke-width="1" fill="none"/><circle cx="64" cy="114" r="2" fill="#f2f2f2"/>`+
      `<circle cx="51" cy="49" r=".9" fill="#5a3a2c"/><circle cx="83" cy="70" r=".9" fill="#5a3a2c"/>`;}
  if(u==='gi'){ /* preto, longo, liso, risca no meio e topo alinhado */
    back=`<path d="M32 50 C30 24 50 14 64 14 C80 14 98 24 96 50 L104 122 L24 122 Z" fill="url(#hr${u})"/>`;
    front=`<path d="M38 56 C36 30 50 20 64 20 C78 20 92 30 90 56 C88 40 78 30 64 30 C50 30 40 40 38 56 Z" fill="url(#hr${u})"/>
      <path d="M64 20 L64 31" stroke="${hd}" stroke-width="1.6"/><path d="M38 56 C34 74 34 96 30 118 L42 118 C40 96 40 74 40 60 Z" fill="${h}"/><path d="M90 56 C94 74 94 96 98 118 L86 118 C88 96 88 74 88 60 Z" fill="${h}"/>`;
    acc=`<path d="M54 106 Q64 112 74 106" stroke="#cfcfcf" stroke-width="1" fill="none"/><path d="M64 110 l-2.5 4 h5 z" fill="#e8e8e8"/>`;}
  if(u==='ar'){ /* castanho, longo, liso, mechas claras */
    back=`<path d="M30 52 C28 24 50 13 66 14 C86 15 102 28 98 54 L104 122 L24 122 Z" fill="url(#hr${u})"/>
      <path d="M30 70 L26 118 M100 70 L104 118" stroke="${hh}" stroke-width="5" opacity=".35"/>`;
    front=`<path d="M38 56 C36 30 52 20 66 20 C82 21 94 32 92 56 C88 40 78 31 64 31 C52 32 42 42 38 56 Z" fill="url(#hr${u})"/>
      <path d="M38 56 C34 76 34 98 30 120 L42 120 C40 98 40 76 41 60 Z" fill="${h}"/><path d="M92 56 C96 76 96 98 100 120 L88 120 C90 98 90 76 89 60 Z" fill="${h}"/>
      <path d="M36 66 C34 86 34 104 32 118" stroke="${hh}" stroke-width="3" opacity=".55" fill="none"/><path d="M94 66 C96 86 96 104 98 118" stroke="${hh}" stroke-width="3" opacity=".55" fill="none"/>
      <path d="M58 26 C70 22 82 26 88 34" stroke="${hh}" stroke-width="2.5" fill="none" opacity=".7" stroke-linecap="round"/>`;
    acc=`<path d="M53 96 Q64 102 75 96" stroke="#111" stroke-width="3.2" fill="none"/><path d="M52 104 Q64 124 76 104" stroke="#d4af37" stroke-width="1" fill="none"/>`;}
  /* olhos */
  const eye=(cx,flip)=>`<ellipse cx="${cx}" cy="62.5" rx="6.6" ry="5.6" fill="#fff"/><circle cx="${cx+(flip?-.6:.6)}" cy="63" r="4.4" fill="#5a3522"/><circle cx="${cx+(flip?-.6:.6)}" cy="63" r="2.3" fill="#120a06"/><circle cx="${cx+1.8}" cy="61.2" r="1.4" fill="#fff"/>`+
    `<path d="M${cx-7.2} 60.8 Q${cx} 54.8 ${cx+7.2} 60.8" stroke="#1a110c" stroke-width="${u==='gi'?2.6:1.9}" fill="none" stroke-linecap="round"/>`+
    (u==='gi'?`<path d="M${cx+(flip?-7:7)} 60.8 L${cx+(flip?-10.5:10.5)} 59.6" stroke="#111" stroke-width="2" stroke-linecap="round"/>`:'');
  const brows=`<path d="M46 54 Q51.5 50.5 57 52.5" stroke="${P.brow}" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M71 52.5 Q76.5 50.5 82 54" stroke="${P.brow}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
  const nose=`<path d="M63 64 Q61.5 71 64.5 72.5" stroke="${P.sk[1]}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
  const mouth=P.mouth==='teeth'?`<path d="M55 78 Q64 89 73 78 Z" fill="#fff" stroke="${P.lip}" stroke-width="2.4" stroke-linejoin="round"/>`:
    P.mouth==='pout'?`<path d="M58.5 79.5 Q61 77 64 78.5 Q67 77 69.5 79.5 Q64 84 58.5 79.5 Z" fill="${P.lip}"/>`:
    `<path d="M57 78.5 Q64 84.5 71 78.5 Q64 81 57 78.5 Z" fill="${P.lip}"/>`;
  const blush=`<ellipse cx="47" cy="72" rx="5.5" ry="3.2" fill="#ef8f9a" opacity="${u==='ar'||u==='lu'?.45:.25}"/><ellipse cx="81" cy="72" rx="5.5" ry="3.2" fill="#ef8f9a" opacity="${u==='ar'||u==='lu'?.45:.25}"/>`;
  const clothes=u==='lu'?`<path d="M14 130 C16 106 34 98 50 96 L64 112 L78 96 C94 98 112 106 114 130 Z" fill="url(#cl${u})"/>`:
    u==='gi'?`<path d="M14 130 C16 106 34 98 50 96 L64 106 L78 96 C94 98 112 106 114 130 Z" fill="url(#cl${u})"/><path d="M50 96 L58 130 M78 96 L70 130" stroke="#2a2a30" stroke-width="2.4"/>`+[30,36,42,90,96,102].map(x=>`<path d="M${x} 110 l-1 18" stroke="#2a2a30" stroke-width="1.4"/>`).join(''):
    `<path d="M14 130 C16 106 34 98 50 96 Q64 110 78 96 C94 98 112 106 114 130 Z" fill="url(#cl${u})"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">${defs}<circle cx="64" cy="64" r="62" fill="url(#bg${u})"/>
    <g clip-path="url(#cc${u})">${back}${clothes}<path d="M56 84 L56 100 Q64 104 72 100 L72 84 Z" fill="${P.sk[1]}"/>
    <ellipse cx="37.5" cy="63" rx="4.5" ry="6.5" fill="${P.sk[1]}"/><ellipse cx="90.5" cy="63" rx="4.5" ry="6.5" fill="${P.sk[1]}"/>
    <ellipse cx="64" cy="61" rx="26.5" ry="30" fill="url(#sk${u})"/>${blush}${front}${brows}${eye(51.5,false)}${eye(76.5,true)}${nose}${mouth}${acc}</g>
    <circle cx="64" cy="64" r="62" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2"/></svg>`;}
/* AVIMG (fotos das guias) fica em js/dados.js */
const avatarURL=m=>AVIMG[m.id]||('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(memberSVG(m)));
const memberAvatar=(m,sz)=>`<img src="${avatarURL(m)}" width="${sz}" height="${sz}" alt="Avatar de ${m.nome}" style="flex:none;display:block;border-radius:50%;object-fit:cover;box-shadow:0 0 0 2px ${CHAR[m.papel].c}">`;

const say=(k,t)=>`<p class="instr">${t}</p>`;

/* ---------- obra coletiva (gerada com as 4 cores) ---------- */
const artCv=document.createElement('canvas');artCv.width=1024;artCv.height=576;
/* ---------- exposição de Claude Monet (obras em domínio público) ---------- */
/* Para usar as reproduções reais, cole a imagem de cada obra (data URL ou caminho do arquivo) em PSRC. */
/* PSRC (imagens das obras de Monet) fica em js/dados.js */
const PAINT={
  impressao:{t:'Impressão, nascer do sol',a:'Claude Monet, 1872',m:'Musée Marmottan Monet, Paris',ar:1.31,g:'ar',
    d:'O porto de Le Havre ao amanhecer.',c:'Um crítico usou o título deste quadro, de forma irônica, para apelidar o grupo de pintores. Foi assim que nasceu o nome Impressionismo!',base:['#9aa7b6','#e0864a','#5d6f82']},
  iris:{t:'Íris no jardim do artista',a:'Claude Monet, 1900',m:'Musée d’Orsay, Paris',ar:1.2,g:'lu',
    d:'O caminho de flores do jardim de Monet em Giverny.',c:'Monet plantava o jardim pensando nas cores que queria pintar. Primeiro ele “desenhava” com flores de verdade, depois com tinta.',base:['#7c9a5a','#c9a3d9','#c8402c']},
  crisantemos:{t:'Crisântemos',a:'Claude Monet, 1897',m:'',ar:1.24,g:'gi',
    d:'Um quadro inteiro tomado por flores, sem céu nem chão.',c:'De perto são só manchas de tinta. De longe, o nosso cérebro junta as manchas e enxerga as flores. Parecido com a câmera juntando pontos para reconhecer o marcador!',base:['#e3c34a','#d9707e','#c8402c']},
  ponte:{t:'A ponte japonesa',a:'Claude Monet, 1899',m:'',ar:1.27,g:'al',
    d:'A ponte sobre o lago de ninfeias, em Giverny.',c:'Monet mandou construir esse lago e essa ponte para ter o que pintar perto de casa. Pintou a mesma ponte mais de dez vezes.',base:['#4f7a3c','#9cbf6a','#6d8fa0']},
  ninfeias:{t:'Ninfeias',a:'Claude Monet, 1906',m:'Art Institute of Chicago',ar:1.06,g:'lu',
    d:'As flores de nenúfar flutuando no lago de Giverny.',c:'Monet pintou cerca de 250 quadros de ninfeias, sempre o mesmo lago com luzes diferentes.',base:['#5e7fa3','#8fb08a','#d9a3b8']},
  nuvens:{t:'Ninfeias: as nuvens',a:'Claude Monet, 1903',m:'',ar:1.48,g:'gi',
    d:'O céu aparece só como reflexo na água do lago.',c:'Repare: não tem céu no quadro, só o reflexo das nuvens na água. É uma ilusão, parecida com a AR, que mistura o que é real com o que só parece estar ali.',base:['#8e98a3','#c9c2b0','#3d4650']}};
const PIMG={};const paintWaiters={};
Object.keys(PSRC).forEach(k=>{if(!PSRC[k])return;const im=new Image();im.onload=()=>{PIMG[k]=im;PAINT[k].ar=im.width/im.height;(paintWaiters[k]||[]).forEach(f=>f());refreshArt();};im.src=PSRC[k];});
function drawPainting(g,w,h,k){const P=PAINT[k],im=PIMG[k];
  if(im){const r=im.width/im.height,R=w/h;let sw=im.width,sh=im.height,sx=0,sy=0;if(r>R){sw=im.height*R;sx=(im.width-sw)/2;}else{sh=im.width/R;sy=(im.height-sh)/2;}g.drawImage(im,sx,sy,sw,sh,0,0,w,h);return;}
  /* espaço reservado enquanto a reprodução não foi adicionada */
  const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,P.base[0]);gr.addColorStop(.55,P.base[1]);gr.addColorStop(1,P.base[2]);g.fillStyle=gr;g.fillRect(0,0,w,h);
  g.fillStyle='rgba(245,240,230,.82)';const pw=w*.78,ph=h*.36;g.fillRect((w-pw)/2,(h-ph)/2,pw,ph);
  g.fillStyle='#22252b';g.textAlign='center';g.font=`600 ${Math.round(h*.07)}px Georgia, serif`;g.fillText(P.t,w/2,h/2-h*.02);
  g.font=`${Math.round(h*.045)}px Georgia, serif`;g.fillStyle='#4a4d55';g.fillText(P.a,w/2,h/2+h*.06);
  g.font=`italic ${Math.round(h*.034)}px Georgia, serif`;g.fillText('reprodução da obra a adicionar',w/2,h/2+h*.13);g.textAlign='left';}
function paintTex(k){const P=PAINT[k];const c=document.createElement('canvas');const draw=()=>{c.width=1024;c.height=Math.round(1024/P.ar);drawPainting(c.getContext('2d'),c.width,c.height,k);};draw();
  const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=8;(paintWaiters[k]=paintWaiters[k]||[]).push(()=>{draw();t.needsUpdate=true;});return t;}
/* a obra da exposição é revelada em 4 partes: Impressão, nascer do sol */
function drawArt(g,w,h,parts,reveal=1){g.save();g.fillStyle='#e9e1d2';g.fillRect(0,0,w,h);g.beginPath();g.rect(0,0,w*reveal,h);g.clip();
  drawPainting(g,w,h,'impressao');
  const q=[[0,0],[1,0],[0,1],[1,1]];q.forEach(([x,y],i)=>{if(parts[i])return;g.fillStyle='#e9e1d2';g.fillRect(x*w/2,y*h/2,w/2,h/2);
    g.strokeStyle='rgba(120,105,80,.18)';g.lineWidth=1;for(let k=0;k<w/2;k+=6){g.beginPath();g.moveTo(x*w/2+k,y*h/2);g.lineTo(x*w/2+k,y*h/2+h/2);g.stroke();}
    g.fillStyle='rgba(90,80,64,.5)';g.textAlign='center';g.font=`600 ${Math.round(h*.16)}px Georgia, serif`;g.fillText('?',x*w/2+w/4,y*h/2+h/4+h*.06);g.textAlign='left';});
  g.restore();}
function artURL(){const c=document.createElement('canvas');c.width=320;c.height=180;drawArt(c.getContext('2d'),320,180,AR.art);return c.toDataURL();}
let artThumb='';function refreshArt(){artThumb=artURL();}
function unlock(i){if(!AR.art[i]){AR.art[i]=true;refreshArt();const f=FACTS[i];if(f)setTimeout(()=>guide(f[0],'Você sabia?',f[1],7000),900);}}
/* ---------- guias: dicas, curiosidades e reações ---------- */
const byId=id=>MEMBERS.find(m=>m.id===id);
const HINTS={
  local:['lu','Pense em como a câmera enxerga o papel: luz que muda e superfícies brilhantes atrapalham o contraste.'],
  reconhecer:['al','Escolha o marcador com mais cantos diferentes entre si. Desenho repetido confunde a câmera.'],
  escala:['gi','Meça a folha impressa! O marcador do DesmontAR tem 14 cm.'],
  rastrear:['ar','Arraste para os lados para dar a volta na mesa. Depois arraste para cima até o celular ficar quase rente à mesa.'],
  proc:['al','A placa é S5: o processador precisa ter o mesmo soquete. Na pasta térmica, solte na faixa verde. Se a AR perder o marcador, a peça cai da sua mão.'],
  mem:['lu','A placa só aceita DDR5. Um pente em cada canal (A2 e B2) faz os dois trabalharem juntos. A placa de vídeo vai no slot mais comprido, o PCIe x16.'],
  ligar:['ar','Some 125 + 220 + 75 W. Escolha a fonte com folga, mas sem exagero. Depois feche o gabinete e ligue.'],
  paredes:['gi','Procure uma parede com textura: tijolos, cartazes, uma porta. Parede lisa e branca não tem pontos de referência.'],
  galeria:['ar','Volte para o marcador, atravesse o portal e gire o celular para ver a sala inteira. Toque nas obras.']};
const LOSTHINT={angle:['ar','Levante o celular (arraste o dedo para baixo) e aponte para a mesa em diagonal. Rente à mesa eu não vejo os cantos.'],off:['al','Gire a câmera até a folha voltar para a tela.'],
  glare:['lu','O reflexo apagou os cantos. Leve o marcador para a mesa com luminária.'],light:['lu','Ficou escuro demais. Leve o marcador para a mesa com luminária.']};
const FACTS=[['al','Os filtros de rosto das redes sociais usam a mesma ideia: em vez de um marcador, a câmera procura pontos do seu rosto.'],
  ['gi','Apps de móveis em AR usam a escala real para mostrar se um sofá cabe na sua sala antes de você comprar.'],
  ['ar','O Pokémon GO usa AR para colocar os pokémons no mundo real enquanto você anda pela rua.'],
  ['lu','A AR também é usada no ensino de medicina, para mostrar órgãos em 3D por cima de um boneco de treino.']];
let gT=null;
function edgePos(el,edge){const mob=innerWidth<760,W=innerWidth,H=innerHeight;const pw=$('#panel').getBoundingClientRect();
  const r=(a,b)=>a+Math.random()*(b-a);el.style.left=el.style.right=el.style.top=el.style.bottom='auto';el.dataset.edge=edge;
  const maxBottom=mob&&pw.height?H-pw.height-16:H-16;
  if(edge==='left'){el.style.left='12px';el.style.top=Math.round(r(70,Math.max(80,maxBottom-el.offsetHeight-10)))+'px';}
  if(edge==='right'){el.style.right=(mob?12:Math.min(W-pw.left+12,W*.45))+'px';el.style.top=Math.round(r(70,Math.max(80,maxBottom-el.offsetHeight-10)))+'px';}
  if(edge==='top'){el.style.top='58px';el.style.left=Math.round(r(12,Math.max(14,(mob?W:pw.left)-el.offsetWidth-12)))+'px';}
  if(edge==='bottom'){el.style.bottom=(mob&&pw.height?pw.height+16:20)+'px';el.style.left=Math.round(r(12,Math.max(14,(mob?W:pw.left)-el.offsetWidth-12)))+'px';}}
function slideIn(el,edge){const off={left:'translateX(-130%)',right:'translateX(130%)',top:'translateY(-160%)',bottom:'translateY(160%)'}[edge];
  el.style.transition='none';el.style.transform=off;el.style.opacity='0';void el.offsetWidth;el.style.transition='transform .5s cubic-bezier(.2,1.3,.4,1),opacity .3s';el.style.transform='none';el.style.opacity='1';}
function slideOut(el){const edge=el.dataset.edge||'left';const off={left:'translateX(-130%)',right:'translateX(130%)',top:'translateY(-160%)',bottom:'translateY(160%)'}[edge];
  el.style.transform=off;el.style.opacity='0';setTimeout(()=>{if(el.style.opacity==='0')el.style.display='none';},450);}
let lastEdge='';
function pickEdge(){const E=['left','right','top','bottom'].filter(e=>e!==lastEdge);lastEdge=E[Math.floor(Math.random()*E.length)];return lastEdge;}
function guide(id,title,text,ms){const m=byId(id);const g=$('#guide');$('#peek').style.display='none';
  g.innerHTML=`${memberAvatar(m,58)}<div class="gb"><b>${m.nome}</b><small>${title}</small><p>${text}</p></div><button class="gx" aria-label="Fechar">×</button>`;
  g.style.display='flex';const edge=pickEdge();g.classList.toggle('rev',edge==='right');edgePos(g,edge);slideIn(g,edge);
  g.querySelector('.gx').onclick=()=>slideOut(g);clearTimeout(gT);if(ms)gT=setTimeout(()=>slideOut(g),ms);}
/* de tempos em tempos uma guia espia de uma borda da tela oferecendo ajuda */
function peek(){if(S.ph==='inicio'||S.ph==='fim'||$('#guide').style.display==='flex')return;const h=(!AR.tracked&&AR.recog&&LOSTHINT[AR.why])||HINTS[S.ph];if(!h)return;
  const m=byId(h[0]),p=$('#peek');p.innerHTML=`${memberAvatar(m,54)}<span>Precisa de uma dica?</span>`;p.style.display='flex';const edge=pickEdge();p.classList.toggle('rev',edge==='right');edgePos(p,edge);slideIn(p,edge);
  p.onclick=()=>{p.style.display='none';askHint();};clearTimeout(peek.t);peek.t=setTimeout(()=>slideOut(p),5000);}
/* a dica só aparece quando a jogadora fica parada um tempo, para não cobrir a tela do celular à toa */
let lastAct=performance.now(),lastPeek=0;addEventListener('pointerdown',()=>{lastAct=performance.now();},true);
setInterval(()=>{const n=performance.now();if(n-lastAct>20000&&n-lastPeek>40000){lastPeek=n;peek();}},4000);
function askHint(){const lost=!AR.tracked&&STEPOF[S.ph]>=1&&AR.recog&&LOSTHINT[AR.why];const h=lost||HINTS[S.ph];if(h)guide(h[0],'Dica',h[1],0);}
function hintFace(){const b=$('#hintBtn');b.style.display=(S.ph==='inicio'||S.ph==='fim')?'none':'inline-flex';}
$('#hintBtn').onclick=askHint;

/* ---------- marcadores e pontos de referência ---------- */
const texBlank=canvasTex(512,512,(g,w,h)=>{g.fillStyle='#ece8df';g.fillRect(0,0,w,h);});
const texA=canvasTex(512,512,(g,w,h)=>{g.fillStyle='#b7b2a8';g.fillRect(0,0,w,h);g.filter='blur(18px)';
  for(let i=0;i<14;i++){g.fillStyle=`rgba(${120+i*4},${118+i*3},${112+i*2},.8)`;g.beginPath();g.arc(60+(i*97)%400,60+(i*151)%400,60+(i%4)*20,0,7);g.fill();}g.filter='none';});
const texB=canvasTex(512,512,(g,w,h)=>{for(let y=0;y<8;y++)for(let x=0;x<8;x++){g.fillStyle=(x+y)%2?'#111':'#f4f4f4';g.fillRect(x*64,y*64,64,64);}});
const TEX=[texA,texB,markerTex];
function thumb(i){const c=document.createElement('canvas');c.width=c.height=96;c.getContext('2d').drawImage(TEX[i].image,0,0,96,96);return c.toDataURL();}
const TH=[thumb(0),thumb(1),thumb(2)];
const Um=v=>(v/512-.5)*3;
const ptsC=[];{let s=3;const r=()=>{s=(s*9301+49297)%233280;return s/233280};const on=[];for(let y=0;y<8;y++){on.push([]);for(let x=0;x<8;x++)on[y].push(r()<.45);}
  for(let y=0;y<8;y++)for(let x=0;x<8;x++)if(on[y][x])[[0,0],[1,0],[0,1],[1,1]].forEach(([a,b])=>{if(((x*7+y*3+a+b)%3)!==0)ptsC.push([Um(96+(x+a)*40),.014,Um(96+(y+b)*40)]);});
  [[56,56],[456,56],[56,456],[456,456],[56,410],[456,410]].forEach(([a,b])=>ptsC.push([Um(a),.014,Um(b)]));}
const ptsB=[];for(let y=1;y<8;y++)for(let x=1;x<8;x++)ptsB.push([Um(x*64),.014,Um(y*64)]);
const ptsA=[[-.6,.014,.3],[.5,.014,-.7],[.2,.014,.9]];
const PCOUNT=[ptsA.length,ptsB.length,ptsC.length];
function ptsGeo(list){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(list.flat(),3));return g;}
const PG=[ptsGeo(ptsA),ptsGeo(ptsB),ptsGeo(ptsC)];
const pMat=new THREE.PointsMaterial({color:0x36d399,size:7,sizeAttenuation:false,depthTest:false,transparent:true,toneMapped:false});
const fpts=new THREE.Points(PG[2],pMat);fpts.layers.set(2);fpts.renderOrder=40;fpts.visible=false;scene.add(fpts);
const axes=new THREE.AxesHelper(1.2);axes.position.y=.02;axes.layers.set(2);axes.material.depthTest=false;axes.renderOrder=41;axes.visible=false;scene.add(axes);
camera.layers.enable(1);camera.layers.enable(2);

/* ---------- mundo real: celular, mão e câmera externa ---------- */
const phone=new THREE.Group();scene.add(phone);
{const pb=new THREE.Mesh(rbox(.95,1.75,.09,.08),std(0x15171c,.4,.35));pb.rotation.y=PI;phone.add(pb);
 const ps=new THREE.Mesh(new THREE.PlaneGeometry(.82,1.55),new THREE.MeshBasicMaterial({color:0x2a4a6a,toneMapped:false}));ps.position.z=.05;phone.add(ps);
 phone.traverse(o=>o.layers.set(3));}
const rayL=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineDashedMaterial({color:0xf5c518,dashSize:.18,gapSize:.12,transparent:true,opacity:.85,toneMapped:false}));
rayL.geometry.setAttribute('position',new THREE.Float32BufferAttribute(new Array(24).fill(0),3));rayL.layers.set(3);scene.add(rayL);
const hand=new THREE.Group();{const skin=std(0xc98e6b,0,.6);
  hand.add(new THREE.Mesh(rbox(1.3,.28,1.5,.12),skin));
  [-.45,-.15,.15,.45].forEach((x,i)=>{const f=new THREE.Mesh(rbox(.24,.22,1.0-(i===0||i===3?.2:0),.1),skin);f.position.set(x,0,-1.15+(i===0||i===3?.1:0));hand.add(f);});
  const th=new THREE.Mesh(rbox(.26,.22,.8,.1),skin);th.position.set(.8,0,.05);th.rotation.y=-.6;hand.add(th);
  const arm=new THREE.Mesh(rbox(1.0,.4,3,.15),std(0x3a5a8a,0,.8));arm.position.z=2.1;hand.add(arm);}
hand.scale.setScalar(1.35);hand.position.set(9,.8,.55);hand.visible=false;scene.add(hand);
const worldCam=new THREE.PerspectiveCamera(42,1.6,.1,80);worldCam.layers.set(0);worldCam.layers.enable(3);
worldCam.position.set(-7.5,7.5,7.5);worldCam.lookAt(.6,.4,.6);
const envMap=scene.environment;const lights=[];scene.traverse(o=>{if(o.isLight)lights.push([o,o.intensity]);});
let lightK=1;

/* ---------- textos das fases de AR ---------- */
Object.assign(CARDS,{
  wallOk:['good','Parede encontrada: pontos suficientes para calcular um plano em pé.','Sem marcador, a AR usa o próprio ambiente. Ela acha cantos e texturas na imagem, percebe que vários estão no mesmo plano e entende que ali é uma parede. A obra fica presa nesse plano e aparece no tamanho real.','Apps de decoração e o Google Arts & Culture usam isso para pendurar quadros virtuais na parede da sua casa.'],
  wallFail:['bad','Parede lisa: quase nenhum ponto de referência.','Uma parede branca e lisa não tem cantos nem contrastes. É o mesmo problema do marcador borrado: sem pontos, a AR não sabe onde a superfície está.','Por isso os apps pedem para você mover o celular devagar e apontar para lugares com textura.'],
  mkA:['bad','A câmera encontrou só 3 pontos de referência.','A AR reconhece um marcador pelos cantos e contrastes da imagem. Uma imagem borrada e clara não tem cantos nítidos, então não há pontos suficientes para saber onde ela está.','Fotos desfocadas ou papéis lisos não funcionam como marcador.'],
  mkB:['bad','A câmera encontrou 49 pontos, mas todos iguais.','No xadrez, cada canto é idêntico aos outros. A AR não sabe qual canto é qual, então não descobre a rotação do marcador e o objeto ficaria girando ou tremendo.','Bons marcadores têm desenhos que não se repetem, como um QR Code.'],
  mkC:['good','85 pontos diferentes encontrados: marcador reconhecido.','Com cantos nítidos num padrão que não se repete, a AR compara o que a câmera vê com a imagem original e calcula a posição e o ângulo do celular em relação à folha. Os eixos coloridos mostram essa posição.','Apps de AR fazem essa comparação dezenas de vezes por segundo.'],
  sc5:['bad','Com 5 cm, o PC ficou quase 3 vezes maior que o real.','A câmera vê o marcador só como um desenho na imagem: não sabe se ele é pequeno e está perto ou grande e está longe. O tamanho real informado converte a imagem em centímetros. Você disse que a folha é menor do que é, então tudo cresceu.','Por isso ferramentas como o Zapworks pedem o tamanho real do marcador.'],
  sc50:['bad','Com 50 cm, o PC encolheu e virou um brinquedo.','Agora a AR acha que a folha é enorme e está longe, então desenha o PC menor para manter a proporção.','Medir a folha impressa com régua evita esse erro: impressoras às vezes encolhem a página.'],
  sc14:['good','Com 14 cm, a placa-mãe ficou com 30 cm, como uma de verdade.','Com o tamanho real, a AR sabe quantos centímetros cada parte do marcador representa e desenha o PC na escala certa.','Apps de móveis em AR usam isso para mostrar se um sofá cabe na sala.'],
  trTurn:['good','Você deu a volta e o PC continuou no mesmo lugar da mesa.','A cada quadro, a AR encontra os pontos de novo e recalcula de onde o celular está olhando. O PC é redesenhado a partir dessa posição, por isso parece preso à mesa.','É isso que dá a sensação de que o objeto virtual existe no mundo real.'],
  trLost:['bad','Olhando quase rente à mesa, a AR perdeu o marcador e o PC sumiu.','Nesse ângulo, o marcador fica achatado na imagem e os cantos ficam juntos demais para serem reconhecidos. Sem pontos, a AR não sabe onde desenhar.','Por isso apps de AR pedem para apontar o celular de cima, em diagonal.'],
  trOff:['bad','O marcador saiu do enquadramento e o PC sumiu.','A AR só calcula a posição enquanto vê o marcador. Fora da imagem da câmera, não existe referência.','Mantenha a folha inteira na tela enquanto usa a AR.'],
  trBack:['good','Você voltou a enquadrar o marcador e o PC reapareceu no mesmo lugar.','Assim que os pontos voltam, a AR recalcula a posição. O PC não fica guardado na mesa: ele só existe na tela, desenhado de novo a cada quadro.','Quando o rastreamento cai, os apps pedem para apontar de novo para o marcador.'],
  hand:['bad','Uma mão passou na frente do marcador e o PC sumiu.','A AR depende de ver os pontos do marcador. Coberto, ele some da imagem e o PC desaparece junto, mesmo com a mesa continuando lá.','Em sala de aula, deixar o marcador num lugar livre evita esse problema.','Como resolver'],
  glare:['bad','Um reflexo de luz cobriu parte do marcador e o PC sumiu.','Em superfícies brilhantes, a luz reflete e vira uma mancha branca na imagem. Os cantos que ficam embaixo do reflexo desaparecem e a AR fica sem pontos suficientes.','Imprimir em papel fosco e evitar mesas de vidro deixa a AR estável.','Como resolver'],
  light:['bad','Uma nuvem passou, a luz da janela caiu e a câmera parou de ver os cantos do marcador.','No escuro, a imagem perde contraste: preto e branco ficam parecidos e os cantos desaparecem. Sem cantos, sem pontos de referência.','Ambientes iluminados e papel fosco deixam a AR mais estável.','Como resolver'],
  plGood:['good','Mesa com luminária: escolha estável.','Luz constante e superfície fosca: o marcador aparece com o mesmo contraste o tempo todo, então a câmera encontra os mesmos pontos em todos os quadros.','Em sala de aula, a mesa mais iluminada e sem reflexo é o melhor lugar para o marcador.'],
  plRisk:['warn','Combinado: o marcador vai ficar aí.','A AR depende de como a câmera enxerga o marcador. Iluminação e superfície mudam esse contraste. Fique de olho no que acontece durante a montagem.','Você poderá mudar o marcador de lugar se algo der errado.','Fique atenta']
});
const LOSTFIX={glare:'Leve o marcador para a mesa com luminária: luz constante e sem reflexo.',light:'Leve o marcador para a mesa com luminária: luz constante e sem reflexo.',angle:'Levante o celular: arraste o dedo para baixo até ver a mesa em diagonal.',off:'Arraste o dedo até a folha voltar para a tela.'};

/* ---------- painel ---------- */
const panel=$('#panel');
function toast(t,ms=3200){const el=$('#toast');el.textContent=t;el.style.display='block';clearTimeout(toast._t);toast._t=setTimeout(()=>el.style.display='none',ms);}
function dots(){const i=PH.indexOf(S.ph);$('#dots').innerHTML=PHN.map((s,k)=>`<i class="${k<i?'done':k===i?'on':''}" title="${s}"></i>`).join('');}
function board(n,title){n=PH.indexOf(S.ph);return `<div class="board" id="boardHead" role="button" aria-label="Recolher ou expandir o painel"><span class="n">${n}</span><h2>${title}</h2><span class="car">▾</span></div>`;}
function cardKey(k){if(!k)return '';const [tone,a,b,c,lab]=CARDS[k];
  return `<div class="card ${tone}"><h4>O que aconteceu</h4><p>${a}</p><h4>Por que</h4><p>${b}</p><h4>${lab||'Na vida real'}</h4><p>${k==='glare'||k==='light'?LOSTFIX[k]:c}</p></div>`;}
function checklist(items){return `<ul class="check">${items.map(([t,done,cur])=>`<li class="${!done&&cur?'cur':''}">${t}${done?'<b>OK</b>':'<i>pendente</i>'}</li>`).join('')}</ul>`;}
function pickBtn(id,label){return `<button class="ghost" data-pick="${id}">${S.sel===id?'Segurando: toque na área amarela':label}</button>`;}
function bar(label,val,color){return `<div class="bar"><div class="l"><span>${label}</span><span>${val}%</span></div><div class="t"><div class="f" style="width:${val}%;background:${color}"></div></div></div>`;}
function artRow(){const n=AR.art.filter(Boolean).length;return `<div class="artrow"><img src="${artThumb}" alt="Obra da exposição, ${n} de 4 partes"><span>Obra da exposição<br><b>${n} de 4 partes</b></span></div>`;}
function lostBox(){if(AR.tracked||STEPOF[S.ph]<2||S.ph==='fim')return '';const k=AR.why;
  const key=k==='glare'?'glare':k==='light'?'light':k==='angle'?'trLost':'trOff';
  return say('rastreio','A AR perdeu o marcador! Sem vê-lo, ela não sabe onde desenhar o PC.')+cardKey(key)+
    (k==='glare'||k==='light'?`<button class="cta" id="fixPlace">Mover o marcador para a mesa com luminária</button>`:`<p class="fix">${LOSTFIX[k]||''}</p>`);}

function render(){
  dots();const st=STEPOF[S.ph];panel.style.display=S.ph!=='inicio'&&S.ph!=='fim'?'block':'none';let h='';
  if(S.ph==='local'){const P=AR.place;
    h=board(0,'Mesa de ensaio')+say('marcador','Antes de ensaiar a montagem: em qual mesa o marcador vai ficar? O lugar muda como a câmera enxerga a folha.')+
      `<div class="places">${[['janela','Mesa perto da janela','O sol entra e sai'],['vidro','Mesa de vidro','Superfície brilhante'],['luminaria','Mesa com luminária','Luz constante e fosca']].map(([k,t,d])=>`<button class="plc ${P===k?(k==='luminaria'?'ok':'sel'):''}" data-place="${k}"><b>${t}</b><small>${d}</small></button>`).join('')}</div>`+
      (P?cardKey(P==='luminaria'?'plGood':'plRisk'):'')+`<button class="cta" id="next" ${P?'':'disabled'}>Colocar o marcador</button>`;}
  if(S.ph==='galeria'){h=board(0,AR.inside?'Galeria 360° · RV':'Portal da galeria')+(AR.inside?'':artRow());
    if(!AR.tracked)h+=lostBox();
    else if(AR.inside)h+=`<div class="nomob">`+say('camera','Bem-vinda à exposição de Monet! Gire o celular ou arraste a tela para olhar em volta e toque nas obras.')+`</div>`+

      (vr.canGyro&&!vr.gyro?`<button class="ghost" id="gyroBtn">Usar o giroscópio do celular</button>`:'')+`<button class="ghost" id="exitGal">Sair da RV e voltar para a RA</button><button class="cta" id="finish">Ver o resultado</button>`;
    else h+=say('rastreio','Volte a apontar para o marcador: o computador abriu ali um portal para a galeria completa, que não cabe na sala.')+`<div class="card warn"><h4>Atenção: aqui muda a tecnologia</h4><p>Ao atravessar o portal, você <b>sai da realidade aumentada</b> e entra na <b>realidade virtual</b>. A câmera desliga, o mundo real some da tela e tudo o que você vê passa a ser digital.</p></div>`+
`<button class="cta go" id="enterGal">Atravessar o portal e entrar na RV</button><button class="cta" id="finish">Ver o resultado</button>`;}
  if(S.ph==='reconhecer'&&CAM.on){
    h=board(1,'Reconhecimento')+artRow()+say('camera',CAMTXT.recog)+
      (AR.recog?cardKey('mkC'):`<p class="fix">Procurando o marcador… deixe a folha inteira na parte de cima da tela, com boa luz.</p>`)+
      `<div class="card"><h4>E se fosse outro desenho?</h4><p><b>Borrado:</b> sem cantos nítidos, a câmera acha poucos pontos e não reconhece.</p><p><b>Xadrez:</b> todos os cantos são iguais, a AR não sabe a rotação e o objeto fica girando.</p></div>`+
      `<button class="cta" id="next" ${AR.recog?'':'disabled'}>Próxima fase</button>`;}
  else if(S.ph==='reconhecer'){
    h=board(1,'Reconhecimento')+artRow()+say('camera','A câmera procura cantos e contrastes na imagem: são os <b>pontos de referência</b>. Coloque um marcador na mesa e veja quantos ela encontra.')+
      `<div class="mk">${['Borrado','Xadrez','DesmontAR'].map((n,i)=>`<button class="mkc ${AR.marker===i?(i===2?'ok':'bad'):''}" data-mk="${i}"><img src="${TH[i]}" alt="">${n}</button>`).join('')}</div>`+
      (AR.marker>=0?cardKey(['mkA','mkB','mkC'][AR.marker]):'')+
      (AR.recog?`<p class="fix">A AR ainda não sabe o tamanho da folha, então está chutando a escala do PC.</p>`:'')+
      `<button class="cta" id="next" ${AR.recog?'':'disabled'}>Próxima fase</button>`;}
  if(S.ph==='escala'){const v=AR.scaleCm;
    h=board(2,'Escala')+artRow()+say('escala','A AR já sabe <b>onde</b> a folha está, mas não o <b>tamanho</b> dela. Quanto mede o marcador impresso?')+
      `<div class="vals">${[5,50,14].map(n=>`<button class="val ${v===n?(n===14?'ok':'bad'):''}" data-cm="${n}">${n} cm</button>`).join('')}</div>`+
      (v?cardKey('sc'+v):'')+(!AR.tracked?lostBox():'')+`<button class="cta" id="next" ${v===14?'':'disabled'}>Próxima fase</button>`;}
  if(S.ph==='rastrear'){
    h=board(3,'Rastreamento')+artRow()+say('rastreio',CAM.on?CAMTXT.rastrearSay:'A AR recalcula a posição a cada quadro. Arraste o dedo para mover o celular: <b>para os lados</b> dá a volta na mesa, <b>para cima</b> abaixa o celular e <b>para baixo</b> levanta.')+
      checklist([['Dar a volta na mesa',AR.turned,true],['Abaixar o celular até eu perder o marcador',AR.lostOnce,AR.turned],['Voltar a enquadrar o marcador',AR.recovered,AR.lostOnce]])+
      (!AR.tracked?cardKey(AR.why==='angle'?'trLost':'trOff'):AR.recovered?cardKey('trBack'):AR.turned?cardKey('trTurn'):'')+
      `<button class="cta" id="next" ${AR.recovered&&AR.tracked?'':'disabled'}>Começar a montagem</button>`;}
  if(st>=2&&st<=3){const titles={2:'Processador',3:'Memória e vídeo'};
    h=board(st+2,titles[st])+artRow();
    if(!AR.tracked)h+=lostBox();
    else{
      if(st===2){h+=cardKey(S.card)+checklist([['Escolher e encaixar o processador',S.placed.cpu,true],['Aplicar a pasta térmica',S.paste,S.placed.cpu],['Instalar o cooler',S.placed.cooler,S.paste]]);
        if(!S.placed.cpu)h+=`<p>A placa-mãe usa soquete <b>S5</b>. Toque em um processador e depois no soquete.</p>`+pickBtn('cpuS4','Pegar o processador S4')+pickBtn('cpu','Pegar o processador S5')+pickBtn('cpuNB','Pegar o processador de notebook');
        else if(!S.paste)h+=`<p>Segure o botão e solte na faixa verde.</p><div class="pm"><div class="pz"></div><div class="pf" id="pf" style="width:${S.pasteAmt}%"></div></div><div class="pl"><span>pouca</span><span>ideal</span><span>demais</span></div><button class="ghost hold" id="hold">Segure para aplicar a pasta</button>`;
        else if(!S.placed.cooler)h+=pickBtn('cooler','Pegar o cooler');
        h+=`<button class="cta" id="next" ${S.placed.cooler?'':'disabled'}>Próxima fase</button>`;}
      if(st===3){const both=S.placed.ram1&&S.placed.ram2;h+=cardKey(S.card)+`<p>Canais: <b>A1 e A2</b> (canal A) e <b>B1 e B2</b> (canal B). Instale os dois pentes compatíveis e a placa de vídeo no slot mais comprido.</p>`+checklist([['Pente 1',S.placed.ram1,true],['Pente 2',S.placed.ram2,true],['Placa de vídeo',S.placed.gpu,true]]);
        if(!S.placed.ram1)h+=pickBtn('ram1','Pegar o pente DDR5 (1)');if(!S.placed.ram2)h+=pickBtn('ram2','Pegar o pente DDR5 (2)');if(!both)h+=pickBtn('ramD4','Pegar o pente DDR4');if(!S.placed.gpu)h+=pickBtn('gpu','Pegar a placa de vídeo');
        if(both)h+=bar('Velocidade da memória',S.ramSpeed,S.ramSpeed>=100?'var(--ok)':S.ramSpeed>=85?'var(--board)':'var(--bad)');
        if(both&&S.ramSpeed<100)h+=`<button class="ghost" id="reram">Tirar os pentes e tentar de novo</button>`;
        h+=`<button class="cta" id="next" ${both&&S.ramSpeed>=85&&S.placed.gpu?'':'disabled'}>Próxima fase</button>`;}
    }}
  if(S.ph==='paredes'&&PW.native){const n=Object.keys(PW.real).length;
    h=board(0,'Obras na parede')+artRow()+say('rastreio','Agora é <b>RA sem marcador</b>, feita pela RA do próprio celular. Escolha uma obra e toque em <b>Pendurar na parede</b>. O celular procura pontos na parede, calcula o plano dela e prende a obra ali: ela fica parada mesmo se você andar.')+
      `<p class="fix">Se o visualizador abrir em <b>Objeto</b>, toque em <b>RA</b> no topo. Se ele demorar para achar a parede, mexa o celular devagar de um lado para o outro e mire perto de uma porta, quadro, interruptor ou canto. Depois toque no X e volte para o jogo.</p>`+
      `<p class="okline">${n}/3 obras penduradas</p><div class="obsel">${OBK.map(k=>`<button class="ob ${PW.sel===k?'sel':''} ${PW.real[k]?'done':''}" data-ob="${k}"><img src="${thumbURL(k)}" alt=""><span>${PAINT[k].t}</span><small>${dimTxt(k)}</small></button>`).join('')}</div>`+
      arLink(PW.sel,'Pendurar na parede: '+PAINT[PW.sel].t)+
      `<button class="cta" id="next" ${n>=3?'':'disabled'}>Abrir o portal da galeria (${Math.min(n,3)}/3 obras)</button>`+`<button class="ghost" id="inGame">Não abriu? Pendurar aqui no jogo</button>`+cardKey('wallOk');}
  else if(S.ph==='paredes'){h=board(0,'Obras na parede')+artRow();
    if(!PW.found){const pc=Math.min(100,Math.round(PW.score/WALL_N*100));
      h+=say('rastreio',CAM.on?'Agora <b>sem marcador</b>! Fique a uns <b>1,5 m</b> de uma parede, segure o celular em pé e aponte para ela. A câmera procura pontos de referência na própria parede.':'Agora <b>sem marcador</b>! Arraste para olhar a sala e mire o círculo do centro numa parede. A câmera procura pontos de referência na própria parede.')+
        bar('Pontos de referência na parede',pc,pc>=100?'var(--ok)':pc>35?'var(--board)':'var(--bad)')+(PW.failSeen?cardKey('wallFail')+`<p class="fix">Mire perto de uma porta, quadro, interruptor ou canto e mexa o celular devagar.</p><button class="ghost" id="forceWall">Usar esta parede mesmo assim</button>`:'');}
    else{const n=Object.keys(PW.placed).length;
      h+=`<p class="okline">Parede encontrada · ${n}/3 obras penduradas</p><div class="obsel">${OBK.map(k=>`<button class="ob ${PW.sel===k?'sel':''} ${PW.placed[k]?'done':''}" data-ob="${k}"><img src="${thumbURL(k)}" alt=""><span>${PAINT[k].t}</span><small>${dimTxt(k)}</small></button>`).join('')}</div>`+
        (CAM.on?`<p>Mire o círculo num espaço livre da parede e toque na tela para pendurar <b>${PAINT[PW.sel].t}</b>.</p>`:`<p>Toque na parede para pendurar <b>${PAINT[PW.sel].t}</b> no tamanho real.</p>`)+
        `<button class="cta" id="next" ${n>=3?'':'disabled'}>Abrir o portal da galeria (${Math.min(n,3)}/3 obras)</button>`+cardKey('wallOk');}}
  if(S.ph==='ligar'){h=board(8,'Ligar o computador')+artRow();
    if(!AR.tracked)h+=lostBox();
    else if(!S.psu)h+=cardKey(S.card)+say('marcador','Falta a fonte, que leva a energia para todas as peças. Some o consumo e escolha uma.')+`<table class="qtable"><tr><td>Processador</td><td>125 W</td></tr><tr><td>Placa de vídeo</td><td>220 W</td></tr><tr><td>Demais peças</td><td>75 W</td></tr><tr><td>Total</td><td>420 W</td></tr></table>`+[350,650,1600].map(w=>`<button class="ghost" data-psu="${w}">Fonte de ${w} W</button>`).join('');
    else if(!S.caseOn)h+=(S.card?cardKey(S.card):'')+say('marcador','Tudo montado sobre o marcador. Feche o gabinete e ligue o computador da exposição.')+`<button class="cta" id="closeCase">Fechar o gabinete</button>`;
    else if(!S.on)h+=`<button class="cta go" id="power">Ligar o PC</button>`;
    else if(!S.booted)h+=`<p>Iniciando…</p>`;
    else h+=say('camera','O computador ligou e abriu os arquivos da exposição! A primeira obra já está na tela: Impressão, nascer do sol. Agora vamos tirar as obras da tela e levar para as paredes da sala.')+`<button class="cta" id="next">Levar as obras para a parede</button>`;}
  const wasMin=panel.classList.contains('min');panel.innerHTML=h;if(wasMin)panel.classList.add('min');
  const bh=$('#boardHead');if(bh)bh.onclick=()=>panel.classList.toggle('min');
  panel.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{const id=b.dataset.pick;if(selectable(id))select(id);else{const w=why(id);if(w)toast(w);}});
  panel.querySelectorAll('[data-mk]').forEach(b=>b.onclick=()=>chooseMarker(+b.dataset.mk));
  panel.querySelectorAll('[data-cm]').forEach(b=>b.onclick=()=>chooseScale(+b.dataset.cm));
  const nx=$('#next');if(nx)nx.onclick=next;
  const ig=$('#inGame');if(ig)ig.onclick=()=>{PW.native=false;render();};
  const fw=$('#forceWall');if(fw)fw.onclick=()=>{wallFound();toast('Parede aceita: com poucos pontos, a obra pode ficar menos firme.');};
  panel.querySelectorAll('[data-hang]').forEach(a=>a.addEventListener('click',()=>{PW.real[a.dataset.hang]=true;camPause();setTimeout(render,400);}));
  panel.querySelectorAll('[data-psu]').forEach(b=>b.onclick=()=>choosePSU(+b.dataset.psu));
  panel.querySelectorAll('[data-ob]').forEach(b=>b.onclick=()=>{PW.sel=b.dataset.ob;render();});
  const rr=$('#reram');if(rr)rr.onclick=resetRAM;
  const hd=$('#hold');if(hd)bindHold(hd);
  const fp=$('#fixPlace');if(fp)fp.onclick=()=>{setPlace('luminaria');AR.lightOff=false;AR.glare=false;toast('Marcador na mesa com luminária: luz constante e sem reflexo.');};
  panel.querySelectorAll('[data-place]').forEach(b=>b.onclick=()=>{setPlace(b.dataset.place);render();});
  const eg=$('#enterGal');if(eg)eg.onclick=enterGallery;const xg=$('#exitGal');if(xg)xg.onclick=()=>exitGallery();const gb=$('#gyroBtn');if(gb)gb.onclick=startGyro;
  const cc=$('#closeCase');if(cc)cc.onclick=closeCase;
  const pw=$('#power');if(pw)pw.onclick=powerOn;
  const fi=$('#finish');if(fi)fi.onclick=()=>setPhase('fim');
}
function bindHold(btn){let iv=null;
  const start=e=>{e.preventDefault();if(iv)return;S.pasteAmt=0;pasteMesh.visible=true;
    iv=setInterval(()=>{S.pasteAmt=Math.min(100,S.pasteAmt+2.2);const pf=$('#pf');if(pf)pf.style.width=S.pasteAmt+'%';const k=.25+S.pasteAmt/100*1.6;pasteMesh.scale.set(k,1+S.pasteAmt/60,k);},40);};
  const end=()=>{if(!iv)return;clearInterval(iv);iv=null;const a=S.pasteAmt;
    if(a<30){S.err++;setCard('paste_low');pasteMesh.visible=false;S.pasteAmt=0;}else if(a>65){S.err++;setCard('paste_high');pasteMesh.visible=false;S.pasteAmt=0;}
    else{S.paste=true;setCard('paste_ok');pasteMesh.scale.set(1,1,1);}render();};
  btn.addEventListener('pointerdown',start);btn.addEventListener('pointerup',end);btn.addEventListener('pointerleave',end);btn.addEventListener('pointercancel',end);btn.addEventListener('contextmenu',e=>e.preventDefault());}
function fixLoose(){}

/* ---------- ações das fases de AR ---------- */
function chooseMarker(i){AR.marker=i;marker.material.map=TEX[i];marker.material.needsUpdate=true;
  fpts.geometry=PG[i];pMat.color.setHex(i===2?0x36d399:i===1?0xf5c518:0xff4f5e);
  if(i===2){if(!AR.recog){AR.recog=true;S.spawnT=0;unlock(0);}}else{if(AR.recog)S.err++;AR.recog=false;S.err++;}
  render();}
function chooseScale(cm){AR.scaleCm=cm;AR.scaleF=cm===5?2.8:cm===50?.28:1;if(cm===14)unlock(1);else S.err++;render();}
function next(){const i=PH.indexOf(S.ph);setPhase(PH[i+1]);}
function setPhase(ph){drop();S.ph=ph;document.body.classList.toggle('ph-paredes',ph==='paredes');$('#guide').style.display='none';setTimeout(hintFace,0);S.step=STEPOF[ph];S.card=null;$('#info').style.display='none';
  ['cpuS4','cpuNB'].forEach(id=>ITEMS[id].obj.visible=S.step<=2);ITEMS.ramD4.obj.visible=S.step<=3;
  ['psu350','psu650','psu1600'].forEach(id=>ITEMS[id].obj.visible=S.psu===id);
  trayMat.visible=S.step<6;updateHalos();
  if(ph==='rastrear'){AR.az0=azNow();}
  if(ph==='proc'){unlock(2);}
  focusStep(ph);
  if(ph==='galeria'){openGallery();}
  if(ph==='mem'){if(!S.placed.ssd){const o=ITEMS.ssd.obj;o.position.set(-.5,TOP+.016,.15);o.rotation.set(0,0,0);S.placed.ssd=true;}
    setTimeout(()=>{if(S.ph==='mem'&&!AR.lightEv&&AR.place==='janela'){AR.lightEv=true;AR.lightOff=true;}},1600);}
  if(ph==='paredes')enterWalls();else{leaveWalls();if(CAM.paused)camResume();}
  if(ph==='fim')showEnd();
  render();}
/* evento da mão: quando o primeiro pente entra */
ITEMS.gpu.step=3;
const _place=place;place=function(id,...a){_place(id,...a);if(S.ph==='mem'&&!AR.glareEv&&AR.place==='vidro'&&(id==='ram1'||id==='ram2')){AR.glareEv=true;
  setTimeout(()=>{if(S.ph==='mem'&&AR.place==='vidro')AR.glare=true;},1400);}};
/* fonte: liga os cabos automaticamente */
const _slotTap=slotTap;slotTap=function(k){_slotTap(k);if(S.ph==='energia'&&S.psu&&!S.cables.p24){['psu350','psu1600'].forEach(id=>{if(id!==S.psu)ITEMS[id].obj.visible=false;});setTimeout(()=>{['p24','cpu8','gpu8'].forEach(c=>connect(c));setCard('psu_ok');unlock(3);render();},900);}};

function choosePSU(w){if(S.psu)return;
  if(w!==650){S.err++;setCard(w===350?'psu_350':'psu_1600');render();return;}
  S.psu='psu650';ITEMS.psu650.obj.visible=true;place('psu650',[.5,0,2.1]);['psu350','psu1600'].forEach(id=>ITEMS[id].obj.visible=false);setCard('psu_ok');render();
  setTimeout(()=>{['p24','cpu8','gpu8'].forEach(c=>{if(!S.cables[c])connect(c);});unlock(3);render();},700);}
function closeCase(){S.caseOn=true;trayMat.visible=false;caseG.visible=true;caseG.position.set(0,2.4,0);moveTo(caseG,[0,0,0],[0,0,0],1.0,0);render();}
let bootT=-1;
function powerOn(){S.on=true;render();
  const L=[{t:'BL-S5 PRO  BIOS v1.02'},{t:'Processador, memória e vídeo ... OK',c:'#36d399'},{t:'Abrindo a exposição...',c:'#f5c518'}];
  L.forEach((_,i)=>setTimeout(()=>drawScreen('post',L.slice(0,i+1)),250+i*500));
  setTimeout(()=>{bootT=performance.now();camFly=innerWidth<760?[[2.2,6.5,5.5],[.3,.6,-1.6]]:[[2.5,4.5,3.5],[.3,1.0,-1.6]];},250+L.length*500+400);}
let camFly=null;
function drawBootArt(k){scr.fillStyle='#000';scr.fillRect(0,0,1024,576);drawArt(scr,1024,576,[true,true,true,true],k);scrTex.needsUpdate=true;}

/* ---------- local do marcador e reflexo ---------- */
const tableMat0={r:table.material.roughness,m:table.material.metalness};
function setPlace(p){AR.place=p;table.material.roughness=p==='vidro'?.06:tableMat0.r;table.material.metalness=p==='vidro'?.25:tableMat0.m;table.material.needsUpdate=true;}
const glareTex=canvasTex(256,256,(g,w,h)=>{const r=g.createRadialGradient(w/2,h/2,4,w/2,h/2,w/2);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.45,'rgba(255,255,255,.85)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,w,h);});
const glareM=new THREE.Mesh(new THREE.PlaneGeometry(2.6,1.9),new THREE.MeshBasicMaterial({map:glareTex,transparent:true,depthWrite:false,toneMapped:false}));
glareM.rotation.x=-PI/2;glareM.rotation.z=.5;glareM.position.set(.25,.02,-.1);glareM.visible=false;scene.add(glareM);

/* ---------- galeria em AR (portal sobre o marcador) ---------- */
const OBRAS_OLD={
  coletiva:['Quatro olhares','Obra coletiva das quatro criadoras','As quatro partes juntas. Ela só ficou completa porque a AR funcionou do começo ao fim.'],
  marcador:['Grade',`Obra de ${memberOf('marcador').nome}`,'Quadrados que não se repetem, como um bom marcador: cada canto é único e fácil de reconhecer.'],
  camera:['Lente',`Obra de ${memberOf('camera').nome}`,'Anéis que lembram a lente da câmera procurando cantos e contrastes na imagem.'],
  escala:['Proporção',`Obra de ${memberOf('escala').nome}`,'Círculos que crescem: o mesmo desenho em tamanhos diferentes, como a AR ajustando a escala.'],
  rastreio:['Trajeto',`Obra de ${memberOf('rastreio').nome}`,'O caminho do celular ao redor da mesa, recalculado ponto a ponto.']};
const OBRAS={};Object.entries(PAINT).forEach(([k,P])=>OBRAS[k]=[P.t,P.a+(P.m?' · '+P.m:''),P.d]);
const galG=new THREE.Group();galG.visible=false;scene.add(galG);const galLeds=[];S.galT=-1;
function urlTex(url){const t=new THREE.Texture();const img=new Image();img.onload=()=>{const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');g.save();g.beginPath();g.arc(128,128,124,0,7);g.clip();g.drawImage(img,0,0,256,256);g.restore();g.lineWidth=6;g.strokeStyle='#fff';g.beginPath();g.arc(128,128,124,0,7);g.stroke();t.image=c;t.encoding=THREE.sRGBEncoding;t.needsUpdate=true;};img.src=url;return t;}
function svgTex(svg){const t=new THREE.Texture();const img=new Image();img.onload=()=>{const c=document.createElement('canvas');c.width=c.height=256;c.getContext('2d').drawImage(img,0,0,256,256);t.image=c;t.encoding=THREE.sRGBEncoding;t.needsUpdate=true;};img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);return t;}
function artTex(parts,title){return canvasTex(1024,576,(g,w,h)=>{drawArt(g,w,h,parts);});}
function plaque(t1,t2){return canvasTex(512,128,(g,w,h)=>{g.fillStyle='#f7f3ec';g.fillRect(0,0,w,h);g.fillStyle='#22252b';g.font='600 46px "Chakra Petch", sans-serif';g.fillText(t1,18,58);g.fillStyle='#6b6f78';g.font='30px "Barlow Semi Condensed", sans-serif';g.fillText(t2,18,104);});}
let galBuilt=false;
function buildGallery(){if(galBuilt)return;galBuilt=true;
  /* só o portal de entrada da galeria 360°, preso ao marcador */
  const dark=std(0x22252b,.2,.5),wood=std(0x7a5236,0,.55);
  const A=(geo,mat,pos,rot,ud)=>{const m=new THREE.Mesh(geo,mat);m.position.set(...pos);if(rot)m.rotation.set(...rot);if(ud)m.userData.obra=ud;galG.add(m);return m;};
  A(cyl(1.25,1.3,.05,48),wood,[0,.025,0]);
  A(rbox(.16,1.9,.16,.04),dark,[-.85,.98,0]);A(rbox(.16,1.9,.16,.04),dark,[.85,.98,0]);A(rbox(1.86,.16,.18,.04),dark,[0,1.9,0]);
  [[-.75,.98,0,.03,1.76,.04],[.75,.98,0,.03,1.76,.04],[0,1.81,0,1.52,.03,.04]].forEach(([x,y,z,a,b,c])=>{const m=A(box(a,b,c),new THREE.MeshBasicMaterial({color:0xf5c518,toneMapped:false}),[x,y,z]);galLeds.push(m);});
  /* dentro do portal: uma prévia da sala, como uma janela */
  const pv=canvasTex(512,640,(g,w,h)=>{g.fillStyle='#efe9df';g.fillRect(0,0,w,h);g.fillStyle='#d9cdb9';g.fillRect(0,h*.72,w,h*.28);
    g.fillStyle='#22252b';g.fillRect(w*.14,h*.2,w*.72,h*.42);g.fillStyle='#e0864a';g.fillRect(w*.17,h*.23,w*.66,h*.36);});
  const glow=A(new THREE.PlaneGeometry(1.5,1.72),new THREE.MeshBasicMaterial({map:pv,transparent:true,opacity:.92,toneMapped:false,side:THREE.DoubleSide}),[0,.96,0],null,'portal');
  paintWaiters.impressao=paintWaiters.impressao||[];const redraw=()=>{const c=pv.image,g=c.getContext('2d');if(PIMG.impressao)g.drawImage(PIMG.impressao,c.width*.17,c.height*.23,c.width*.66,c.height*.36);pv.needsUpdate=true;};redraw();paintWaiters.impressao.push(redraw);
  const title=canvasTex(1024,160,(g,w,h)=>{g.fillStyle='#22252b';g.fillRect(0,0,w,h);g.fillStyle='#f5c518';g.font='700 84px "Chakra Petch", sans-serif';g.textAlign='center';g.fillText('Galeria Monet',w/2,110);});
  A(new THREE.PlaneGeometry(1.4,.22),new THREE.MeshBasicMaterial({map:title,toneMapped:false}),[0,2.16,0]);
  galG.traverse(o=>{o.layers.set(1);if(o.isMesh){o.castShadow=false;o.receiveShadow=true;}});}
function openGallery(){buildGallery();caseG.visible=true;S.galT=0;galG.scale.setScalar(.001);AR.obra=null;toast('O portal da galeria se abriu sobre o marcador.');setTimeout(()=>guide('gi','Você sabia?','O Google Arts & Culture tem galerias inteiras que você visita pelo celular, com as obras em alta resolução.',7000),1500);
  camFly=innerWidth<760?[[.4,4.6,6.4],[0,-.2,.4]]:[[.6,3.0,4.6],[0,.45,-.2]];}
/* ---------- galeria 360° (realidade virtual) ---------- */
const vr={scene:new THREE.Scene(),cam:new THREE.PerspectiveCamera(72,1,.05,80),yaw:0,pitch:0,gyro:false,a0:null,canGyro:('DeviceOrientationEvent' in window)&&matchMedia('(pointer:coarse)').matches,built:false};
vr.scene.background=new THREE.Color(0x15171c);vr.cam.position.set(0,1.6,0);
function buildVR(){if(vr.built)return;vr.built=true;const sc=vr.scene;sc.environment=envMap;
  sc.add(new THREE.HemisphereLight(0xfff6ea,0x3a2a20,.7));
  const key=new THREE.PointLight(0xfff1dd,1.1,22,2);key.position.set(0,3.1,0);sc.add(key);
  const wall=std(0xf1ebe1,0,.9),dark=std(0x1d1f25,.3,.45),floorM=std(0xffffff,0,.5,{map:woodTex.clone()});floorM.map.repeat.set(3,3);floorM.map.needsUpdate=true;
  const A=(geo,mat,pos,rot,ud)=>{const m=new THREE.Mesh(geo,mat);m.position.set(...pos);if(rot)m.rotation.set(...rot);if(ud)m.userData.obra=ud;sc.add(m);return m;};
  A(new THREE.PlaneGeometry(11,11),floorM,[0,0,0],[-PI/2,0,0]);A(new THREE.PlaneGeometry(11,11),std(0x26282e,0,.9),[0,3.6,0],[PI/2,0,0]);
  [[0,1.8,-5.5,0],[0,1.8,5.5,PI],[-5.5,1.8,0,PI/2],[5.5,1.8,0,-PI/2]].forEach(([x,y,z,r])=>A(new THREE.PlaneGeometry(11,3.6),wall,[x,y,z],[0,r,0]));
  [[-2.5],[0],[2.5]].forEach(([x])=>A(box(.12,.04,9),new THREE.MeshBasicMaterial({color:0xfff3df,toneMapped:false}),[x,3.57,0]));
  A(box(11,.12,.04),dark,[0,.06,-5.48]);A(box(11,.12,.04),dark,[0,.06,5.48]);A(box(.04,.12,11),dark,[-5.48,.06,0]);A(box(.04,.12,11),dark,[5.48,.06,0]);
  const hang=(tex,w,h,pos,ry,ud,frame=true)=>{const n=new THREE.Vector3(Math.sin(ry),0,Math.cos(ry));if(frame)A(rbox(w+.14,h+.14,.05,.02),dark,[pos[0]-n.x*.0,pos[1],pos[2]-n.z*.0],[0,ry,0]);
    A(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex,toneMapped:false,transparent:!frame}),[pos[0]+n.x*.03,pos[1],pos[2]+n.z*.03],[0,ry,0],ud);};
  const spot=(pos,ry,c)=>{const n=new THREE.Vector3(Math.sin(ry),0,Math.cos(ry));A(box(1.2,.05,.12),new THREE.MeshBasicMaterial({color:new THREE.Color(c||'#fff3df'),toneMapped:false}),[pos[0]+n.x*.1,3.1,pos[2]+n.z*.1],[0,ry,0]);};
  /* parede da frente: obra coletiva */
  hang(paintTex('impressao'),3.6,3.6/PAINT.impressao.ar,[0,1.72,-5.45],0,'impressao');spot([0,0,-5.45],0);
  hang(canvasTex(1024,128,(g,w,h)=>{g.fillStyle='#22252b';g.font='600 74px "Chakra Petch", sans-serif';g.textAlign='center';g.fillText('Claude Monet',w/2,90);}),2.4,.3,[0,3.32,-5.44],0,null,false);
  hang(plaque('Impressão, nascer do sol','Claude Monet, 1872'),.9,.225,[0,.2,-5.44],0);
  /* paredes laterais: uma obra de cada integrante, com retrato */
  const SIDE=[['iris',-5.45,-2,PI/2],['crisantemos',-5.45,2,PI/2],['ponte',5.45,-2,-PI/2],['ninfeias',5.45,2,-PI/2]];
  SIDE.forEach(([k,x,z,ry])=>{const gm=byId(PAINT[k].g);const ph=Math.min(1.7,2.4/PAINT[k].ar);hang(paintTex(k),ph*PAINT[k].ar,ph,[x,1.85,z],ry,k);
    const n=new THREE.Vector3(Math.sin(ry),0,Math.cos(ry));const t=new THREE.Vector3(Math.cos(ry),0,-Math.sin(ry));
    hang(plaque(PAINT[k].t,PAINT[k].a),.9,.225,[x,.62,z],ry);
    A(box(.04,.04,2.4),new THREE.MeshBasicMaterial({color:new THREE.Color('#fff3df'),toneMapped:false}),[x+n.x*.06,2.75,z]);});
  /* parede de trás: as criadoras */
  hang(canvasTex(1024,128,(g,w,h)=>{g.fillStyle='#22252b';g.font='600 70px "Chakra Petch", sans-serif';g.textAlign='center';g.fillText('Curadoria',w/2,90);}),2.4,.3,[3.3,2.75,5.44],PI,null,false);
  hang(paintTex('nuvens'),2.6,2.6/PAINT.nuvens.ar,[-1.2,1.8,5.45],PI,'nuvens');hang(plaque(PAINT.nuvens.t,PAINT.nuvens.a),.9,.225,[-1.2,.42,5.44],PI);
  MEMBERS.forEach((m,i)=>{const x=1.9+(i%2)*1.4,y=2.0-Math.floor(i/2)*1.25;hang(urlTex(avatarURL(m)),.8,.8,[x,y,5.44],PI,'guia:'+m.id,false);
    hang(canvasTex(512,96,(g,w,h)=>{g.fillStyle='#22252b';g.font='600 46px "Chakra Petch", sans-serif';g.textAlign='center';g.fillText(m.nome,w/2,62);}),1.2,.225,[x,y-.55,5.44],PI,null,false);});
  /* banco */
  A(rbox(1.6,.1,.45,.03),std(0x7a5236,0,.55),[0,.45,2.2]);A(box(.08,.42,.4),dark,[-.65,.21,2.2]);A(box(.08,.42,.4),dark,[.65,.21,2.2]);}
const lookCam=()=>S.ph==='paredes'&&!AR.inside?PW.cam:vr.cam;
function setVRCam(){lookCam().quaternion.setFromEuler(new THREE.Euler(vr.pitch,vr.yaw,0,'YXZ'));}
function rvBanner(on){const b=$('#rvBanner');if(!b)return;b.innerHTML=on?'<small>Você saiu da realidade aumentada</small><b>Agora é realidade virtual</b><span>A câmera desligou. Tudo ao seu redor é digital, e o celular só usa o giroscópio para saber para onde você virou.</span>':'<small>Você saiu da realidade virtual</small><b>De volta à realidade aumentada</b><span>A câmera ligou de novo e o desenho volta a aparecer por cima do mundo real.</span>';b.className=on?'rv':'ra';b.style.display='flex';clearTimeout(rvBanner.t);rvBanner.t=setTimeout(()=>b.style.display='none',3200);}
function enterGallery(){rvBanner(true);vr.a0=null;vr.yawOff=0;if(vr.canGyro&&!vr.gyro)startGyro();buildVR();AR.inside=true;AR.obra=null;vr.yaw=0;vr.pitch=0;setVRCam();controls.enabled=false;if(CAM.on)video.style.display='none';render();if(!AR.vrTold){AR.vrTold=true;setTimeout(()=>guide('lu','Agora é realidade virtual','Gire o celular e o corpo para olhar a sala inteira. A mesa e o marcador sumiram: na AR, o desenho aparecia por cima do mundo real. Aqui, tudo é digital, e o celular só usa o giroscópio para saber para onde você virou.',11000),700);}}
function exitGallery(silent){if(!AR.inside&&!silent)return;if(!silent)rvBanner(false);AR.inside=false;controls.enabled=!CAM.on;if(CAM.on){video.style.display='block';CAM.seen=-1e9;}stopGyro();if(!silent)render();}
/* arrastar para olhar em volta */
let vrDrag=null;
renderer.domElement.addEventListener('pointerdown',e=>{if(AR.inside||S.ph==='paredes')vrDrag=[e.clientX,e.clientY,vr.yaw,vr.pitch,vr.yawOff||0];});
addEventListener('pointermove',e=>{if(!vrDrag)return;if(vr.gyro){vr.yawOff=vrDrag[4]+(e.clientX-vrDrag[0])*.006;return;}vr.yaw=vrDrag[2]+(e.clientX-vrDrag[0])*.006;vr.pitch=Math.max(-1.1,Math.min(1.1,vrDrag[3]+(e.clientY-vrDrag[1])*.006));setVRCam();});
addEventListener('pointerup',()=>{vrDrag=null;});
/* giroscópio */
const zee=new THREE.Vector3(0,0,1),gEuler=new THREE.Euler(),gq0=new THREE.Quaternion(),gq1=new THREE.Quaternion(-Math.sqrt(.5),0,0,Math.sqrt(.5)),gYaw=new THREE.Quaternion();
function onOri(e){if(e.alpha==null)return;const d=PI/180;if(vr.a0==null)vr.a0=e.alpha;PW.beta=e.beta;const C=lookCam();
  gEuler.set(e.beta*d,(e.alpha-vr.a0)*d,-e.gamma*d,'YXZ');C.quaternion.setFromEuler(gEuler);C.quaternion.multiply(gq1);C.quaternion.premultiply(gYaw.setFromAxisAngle(yAx,vr.yawOff||0));
  const or=((screen.orientation&&screen.orientation.angle)||window.orientation||0)*d;C.quaternion.multiply(gq0.setFromAxisAngle(zee,-or));}
async function startGyro(){try{if(typeof DeviceOrientationEvent!=='undefined'&&typeof DeviceOrientationEvent.requestPermission==='function'){const r=await DeviceOrientationEvent.requestPermission();if(r!=='granted'){toast('Sem permissão para o giroscópio. Arraste a tela para olhar em volta.');return;}}
  vr.a0=null;vr.gyro=true;addEventListener('deviceorientation',onOri);render();}catch(e){toast('O giroscópio não está disponível aqui. Arraste a tela para olhar em volta.');}}
function stopGyro(){if(vr.gyro){removeEventListener('deviceorientation',onOri);vr.gyro=false;}}
renderer.domElement.addEventListener('pointerup',e=>{if(S.ph!=='galeria'||(!galG.visible&&!AR.inside))return;
  if(vrDrag&&Math.hypot(e.clientX-vrDrag[0],e.clientY-vrDrag[1])>7)return;
  const r=renderer.domElement.getBoundingClientRect();ptr.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(ptr,AR.inside?vr.cam:camera);
  const hit=ray.intersectObjects(AR.inside?vr.scene.children:galG.children,true).find(h=>h.object.userData.obra);if(hit){const k=hit.object.userData.obra;if(k==='portal'){enterGallery();return;}if(k.startsWith('guia:')){const m=byId(k.slice(5));guide(m.id,'Curadoria','Oi! Sou '+m.nome+'. Toque em uma obra e eu conto uma curiosidade sobre ela.',5000);return;}AR.obra=k;const P=PAINT[k];if(P)guide(P.g,P.t,P.c,9000);}});

/* ---------- tela final ---------- */
function showEnd(){const secs=Math.round((performance.now()-S.startTime)/1000);
  $('#endArt').src=(()=>{const c=document.createElement('canvas');c.width=1024;c.height=576;drawArt(c.getContext('2d'),1024,576,[true,true,true,true]);return c.toDataURL();})();
  $('#stats').innerHTML=`<div><b>${Math.floor(secs/60)}:${String(secs%60).padStart(2,'0')}</b>Tempo</div><div><b>${S.err}</b>Erros</div><div><b>${AR.losses}</b>Vezes que a AR perdeu o marcador</div>`;
  $('#endScreen').style.display='block';}

/* ---------- início ---------- */
function resetAll(){clearState();Object.assign(AR,{marker:-1,recog:false,scaleCm:null,scaleF:.5,tracked:false,reason:'',why:null,handOn:false,lightOff:false,glare:false,glareEv:false,inside:false,vrTold:false,obra:null,place:null,turned:false,lostOnce:false,recovered:false,losses:0,wasTracked:false,art:[false,false,false,false],handEv:false,lightEv:false});
  Object.values(ITEMS).forEach(it=>{it.obj.position.set(...it.trayPos);it.obj.rotation.set(...it.trayRot);it.obj.userData.base=null;if(it.label)it.label.visible=true;if(it.glow)it.glow.visible=false;});
  anims.length=0;pasteMesh.visible=false;pasteMesh.scale.set(1,1,1);caseG.visible=false;caseG.position.set(0,0,0);trayMat.visible=true;
  cableMeshes.forEach(m=>{rig.remove(m);m.geometry.dispose();});cableMeshes.length=0;setPlace(null);galG.visible=false;exitGallery(true);
  marker.material.map=texBlank;marker.material.needsUpdate=true;drawScreen('off');camFly=null;resize();ledMat.emissiveIntensity=0;bootT=-1;panel.classList.remove('min');refreshArt();updateHalos();}
function setViewG(){}
function setView(){if(innerWidth<760)camera.position.set(4.3,6.9,7.4);else camera.position.set(3.8,3.6,4.6);}
function begin(){$('#startScreen').style.display='none';$('#endScreen').style.display='none';resetAll();setView();S.startTime=performance.now();if(CAM.on){setPlace('luminaria');setPhase('reconhecer');}else setPhase('local');setTimeout(()=>guide('ar','Bem-vinda!','Oi, eu sou a Ana Roberta! As peças doadas são caras e frágeis, então vamos ensaiar a montagem em realidade aumentada. Eu e as meninas aparecemos pela tela com dicas. Se travar, toque em Dica.',8000),900);}
const TXT0={hr:HINTS.rastrear,lo:LOSTHINT.off,fo:LOSTFIX.off,hk:HINTS.reconhecer};
function camTexts(on){HINTS.rastrear=on?CAMTXT.hintR:TXT0.hr;HINTS.reconhecer=on?['al','Aponte para o marcador impresso com boa luz e sem reflexo. A folha inteira precisa aparecer na tela, sem dedos na frente.']:TXT0.hk;LOSTHINT.off=on?CAMTXT.lostOff:TXT0.lo;LOSTFIX.off=on?CAMTXT.fixOff:TXT0.fo;}
$('#start3D').onclick=()=>{CAM.on=false;camTexts(false);document.body.classList.remove('cam');setAR(false);controls.enabled=true;resize();begin();};$('#again').onclick=begin;
$('#learnBtn').onclick=()=>{const l=$('#learn');l.style.display=l.style.display==='block'?'none':'block';};
$('#startCast').innerHTML=MEMBERS.map(m=>`<div class="cast">${memberAvatar(m,64)}<b>${m.nome}</b><small>Guia e artista</small></div>`).join('');
$('#endCast').innerHTML=MEMBERS.map(m=>`<div class="cast">${memberAvatar(m,52)}<b>${m.nome}</b><small>Guia e curadora</small></div>`).join('');

/* ---------- rastreamento simulado ---------- */
const tv=new THREE.Vector3();
function evalTracking(){
  if(S.ph==='inicio'||S.ph==='fim')return [false,null];
  if(!AR.recog)return [false,'mk'];
  if(AR.lightOff)return [false,'light'];
  if(AR.glare)return [false,'glare'];
  if(AR.inside||S.ph==='paredes')return [true,null];
  if(CAM.on)return performance.now()-CAM.seen<400?[true,null]:[false,'off'];
  if(controls.getPolarAngle()>1.2)return [false,'angle'];
  let seen=false;for(const [x,z] of [[0,0],[-1.5,-1.5],[1.5,-1.5],[1.5,1.5],[-1.5,1.5]]){tv.set(x,0,z).project(camera);if(Math.abs(tv.x)<1&&Math.abs(tv.y)<1&&tv.z<1){seen=true;break;}}if(!seen)return [false,'off'];
  return [true,null];}
const chip=$('#arChip'),wl=$('#worldBox');

/* ---------- loop ---------- */
/* ---------- AR de verdade: câmera do celular + marcador DesmontAR impresso ---------- */
/* 1) acha quadriláteros na imagem (contornos do js-aruco2, licença MIT)
   2) confere a borda preta e lê a grade 8x8 do marcador nas 4 rotações: só aceita o padrão DesmontAR
   3) calcula a posição do celular pela homografia dos 4 cantos (o marcador inteiro vale 3 unidades do jogo) */
const CAM={on:false,seen:-1e9,cv:document.createElement('canvas'),fr:.8,tp:new THREE.Vector3(),tq:new THREE.Quaternion(),has:false,last:null,found:0,lastOk:0};
CAM.ctx=CAM.cv.getContext('2d',{willReadFrequently:true});
const cvG=new CV.Image(),cvT=new CV.Image(),cvB=[];
const MKBITS=(()=>{let s=3;const r=()=>{s=(s*9301+49297)%233280;return s/233280};const b=[];for(let y=0;y<8;y++)for(let x=0;x<8;x++)b.push(r()<.45?1:0);return b;})();
const mAW=new THREE.Matrix4().set(1,0,0,0, 0,0,-1,0, 0,1,0,0, 0,0,0,1);
function hsolve(A,b){const n=b.length;for(let i=0;i<n;i++){let p=i;for(let r=i+1;r<n;r++)if(Math.abs(A[r][i])>Math.abs(A[p][i]))p=r;[A[i],A[p]]=[A[p],A[i]];[b[i],b[p]]=[b[p],b[i]];
  if(Math.abs(A[i][i])<1e-12)return null;for(let r=i+1;r<n;r++){const k=A[r][i]/A[i][i];for(let c=i;c<n;c++)A[r][c]-=k*A[i][c];b[r]-=k*b[i];}}
  const x=new Array(n);for(let i=n-1;i>=0;i--){let v=b[i];for(let c=i+1;c<n;c++)v-=A[i][c]*x[c];x[i]=v/A[i][i];}return x;}
function homog(src,dst){const A=[],b=[];for(let i=0;i<4;i++){const [X,Y]=src[i],[x,y]=dst[i];A.push([X,Y,1,0,0,0,-x*X,-x*Y]);b.push(x);A.push([0,0,0,X,Y,1,-y*X,-y*Y]);b.push(y);}
  const h=hsolve(A,b);return h&&[[h[0],h[1],h[2]],[h[3],h[4],h[5]],[h[6],h[7],1]];}
const UNIT=[[0,0],[1,0],[1,1],[0,1]];
function hp(H,u,v){const w=H[2][0]*u+H[2][1]*v+H[2][2];return [(H[0][0]*u+H[0][1]*v+H[0][2])/w,(H[1][0]*u+H[1][1]*v+H[1][2])/w];}
function gAt(g,w,h,H,u,v){const [x,y]=hp(H,u,v);const xi=Math.round(x),yi=Math.round(y);if(xi<1||yi<1||xi>=w-1||yi>=h-1)return -1;
  const i=yi*w+xi;return (g[i]*2+g[i-1]+g[i+1]+g[i-w]+g[i+w]+g[i-w-1]+g[i-w+1]+g[i+w-1]+g[i+w+1])/10;}
function readMarker(g,w,h,c){
  const H=homog(UNIT,c.map(p=>[p.x,p.y]));if(!H)return null;
  let ring=0,nr=0,white=0,nw=0;
  for(let k=.08;k<.95;k+=.12)for(const [u,v] of [[k,.05],[k,.95],[.05,k],[.95,k]]){const q=gAt(g,w,h,H,u,v);if(q<0)return null;ring+=q;nr++;}
  for(const [u,v] of [[.15,.15],[.85,.15],[.15,.72],[.85,.72],[.5,.14],[.14,.5],[.86,.5]]){const q=gAt(g,w,h,H,u,v);if(q<0)return null;white+=q;nw++;}
  ring/=nr;white/=nw;if(white-ring<25)return null;const th=(ring+white)/2;
  let best=99,rot=0;
  for(let r=0;r<4;r++){const q=[c[r],c[(r+1)%4],c[(r+2)%4],c[(r+3)%4]];const Hr=homog(UNIT,q.map(p=>[p.x,p.y]));if(!Hr)continue;let d=0;
    for(let y=0;y<8&&d<=best;y++)for(let x=0;x<8;x++){const v=gAt(g,w,h,Hr,(116+40*x)/512,(116+40*y)/512);if(v<0){d=99;break;}if((v<th?1:0)!==MKBITS[y*8+x])d++;}
    if(d<best){best=d;rot=r;}}
  if(best>9)return null;
  return {q:[c[rot],c[(rot+1)%4],c[(rot+2)%4],c[(rot+3)%4]],d:best};}
/* refina os cantos: ajusta uma reta em cada lado do contorno e cruza as retas (precisão abaixo de 1 pixel) */
function refineCorners(q,ct){const L=[];
  for(let i=0;i<4;i++){const a=q[i],b=q[(i+1)%4],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),ux=dx/len,uy=dy/len;
    let n=0,mx=0,my=0;const pts=[];for(const p of ct){const t=(p.x-a.x)*ux+(p.y-a.y)*uy,d=-(p.x-a.x)*uy+(p.y-a.y)*ux;if(t>len*.12&&t<len*.88&&Math.abs(d)<2.5){pts.push(p);mx+=p.x;my+=p.y;n++;}}
    if(n<6)return q;mx/=n;my/=n;let sxx=0,sxy=0,syy=0;for(const p of pts){const x=p.x-mx,y=p.y-my;sxx+=x*x;sxy+=x*y;syy+=y*y;}
    const th=.5*Math.atan2(2*sxy,sxx-syy);L.push([mx,my,Math.cos(th),Math.sin(th)]);}
  const out=[];for(let i=0;i<4;i++){const A=L[(i+3)%4],B=L[i];const den=A[2]*B[3]-A[3]*B[2];if(Math.abs(den)<1e-6)return q;
    const t=((B[0]-A[0])*B[3]-(B[1]-A[1])*B[2])/den;const x=A[0]+A[2]*t,y=A[1]+A[3]*t;if(Math.hypot(x-q[i].x,y-q[i].y)>4)return q;out.push({x,y});}
  return out;}
function poseFromCorners(q,w,h,f){
  const img=q.map(p=>[p.x-w/2,h/2-p.y]);const H=homog([[-1.5,1.5],[1.5,1.5],[1.5,-1.5],[-1.5,-1.5]],img);if(!H)return null;
  const col=j=>new THREE.Vector3(H[0][j]/f,H[1][j]/f,-H[2][j]);const h1=col(0),h2=col(1),h3=col(2);
  let l=2/(h1.length()+h2.length());if(h3.z*l>0)l=-l;
  const a=h1.multiplyScalar(l).normalize(),b=h2.multiplyScalar(l).normalize(),t=h3.multiplyScalar(l);
  const m=a.clone().add(b).normalize(),p=new THREE.Vector3().crossVectors(a,b).cross(m).normalize();
  const r1=m.clone().sub(p).normalize(),r2=m.clone().add(p).normalize();
  let R1=r1,R2=r2;if(r2.dot(a)>r1.dot(a)){R1=r2;R2=r1;}const R3=new THREE.Vector3().crossVectors(R1,R2);
  return new THREE.Matrix4().set(R1.x,R2.x,R3.x,t.x, R1.y,R2.y,R3.y,t.y, R1.z,R2.z,R3.z,t.z, 0,0,0,1).multiply(mAW).invert();}
function detectMarker(){
  const vw=video.videoWidth,vh=video.videoHeight;if(!vw||video.readyState<2)return null;
  const sc=480/Math.max(vw,vh),w=Math.round(vw*sc),h=Math.round(vh*sc);
  if(CAM.cv.width!==w||CAM.cv.height!==h){CAM.cv.width=w;CAM.cv.height=h;}
  CAM.ctx.drawImage(video,0,0,w,h);const img=CAM.ctx.getImageData(0,0,w,h);
  CV.grayscale(img,cvG);CV.adaptiveThreshold(cvG,cvT,3,6);
  const cont=CV.findContours(cvT,cvB);let found=null,bestD=99,bestP=0,fct=null;
  for(const ct of cont){if(ct.length<w*.1)continue;const p=CV.approxPolyDP(ct,ct.length*.05);
    if(p.length!==4||!CV.isContourConvex(p)||CV.minEdgeLength(p)<12)continue;
    const dx1=p[1].x-p[0].x,dy1=p[1].y-p[0].y,dx2=p[2].x-p[0].x,dy2=p[2].y-p[0].y;if(dx1*dy2-dy1*dx2<0){const s=p[1];p[1]=p[3];p[3]=s;}
    const r=readMarker(cvG.data,w,h,p);if(!r)continue;const pr=CV.perimeter(p);
    if(r.d<bestD||(r.d===bestD&&pr>bestP)){found=r.q;bestD=r.d;bestP=pr;fct=ct;}}
  if(!found)return null;found=refineCorners(found,fct);
  const M=poseFromCorners(found,w,h,CAM.fr*Math.max(w,h));if(!M)return null;
  const p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();M.decompose(p,q,s);if(p.y<.1||!isFinite(p.x))return null;
  CAM.tp.copy(p);CAM.tq.copy(q);CAM.last=found;return true;}
function camFov(){if(!CAM.on||!video.videoWidth)return;const vw=video.videoWidth,vh=video.videoHeight,s=Math.max(innerWidth/vw,innerHeight/vh);
  camera.fov=2*Math.atan(innerHeight/2/(CAM.fr*Math.max(vw,vh)*s))*180/PI;camera.updateProjectionMatrix();}
video.addEventListener('loadedmetadata',camFov);video.addEventListener('resize',camFov);
CAM.sp=new THREE.Vector3();CAM.sq=new THREE.Quaternion();CAM.uYaw=0;CAM.uScale=1;
const qUser=new THREE.Quaternion(),yAx=new THREE.Vector3(0,1,0);
function camStep(){if(!CAM.on||AR.inside||S.ph==='paredes')return;
  if(detectMarker()){CAM.seen=performance.now();CAM.found++;
    if(!CAM.has||performance.now()-CAM.lastOk>500){CAM.sp.copy(CAM.tp);CAM.sq.copy(CAM.tq);CAM.has=true;}
    CAM.lastOk=performance.now();}
  /* suavização: parado fica firme, movimento rápido acompanha */
  const dp=CAM.sp.distanceTo(CAM.tp)/Math.max(1,CAM.tp.length()*.15),da=CAM.sq.angleTo(CAM.tq);
  const k=Math.min(.85,Math.max(.07,dp/.5,da/.2));
  CAM.sp.lerp(CAM.tp,k);CAM.sq.slerp(CAM.tq,k);
  /* gestos: girar e dar zoom no modelo = mover a câmera virtual em volta do marcador */
  qUser.setFromAxisAngle(yAx,-CAM.uYaw);
  camera.position.copy(CAM.sp).multiplyScalar(1/CAM.uScale).applyQuaternion(qUser);
  camera.quaternion.copy(qUser).multiply(CAM.sq);camera.updateMatrixWorld();}
const gPts=new Map();let gStart=null;
renderer.domElement.addEventListener('pointerdown',e=>{if(!CAM.on||AR.inside||S.ph==='paredes')return;gPts.set(e.pointerId,[e.clientX,e.clientY]);gStart=null;});
addEventListener('pointermove',e=>{if(!CAM.on||AR.inside||!gPts.has(e.pointerId))return;gPts.set(e.pointerId,[e.clientX,e.clientY]);
  const P=[...gPts.values()];
  if(!gStart)gStart={yaw:CAM.uYaw,sc:CAM.uScale,p:P.map(p=>p.slice()),d:P.length>1?Math.hypot(P[0][0]-P[1][0],P[0][1]-P[1][1]):0,n:P.length};
  if(P.length!==gStart.n){gStart=null;return;}
  if(P.length===1)CAM.uYaw=gStart.yaw+(P[0][0]-gStart.p[0][0])*.012;
  else if(gStart.d>10)CAM.uScale=Math.max(.4,Math.min(3,gStart.sc*Math.hypot(P[0][0]-P[1][0],P[0][1]-P[1][1])/gStart.d));});
document.addEventListener('gesturestart',e=>e.preventDefault());
const gEnd=e=>{gPts.delete(e.pointerId);gStart=null;};addEventListener('pointerup',gEnd);addEventListener('pointercancel',gEnd);
const azNow=()=>CAM.on?Math.atan2(CAM.sp.x,CAM.sp.z):controls.getAzimuthalAngle();
const CAMTXT={
  recog:'Aponte a câmera para o marcador DesmontAR impresso. A câmera procura cantos e contrastes na imagem: são os <b>pontos de referência</b>.',
  rastrearSay:'A AR recalcula a posição a cada quadro. Mexa o celular de verdade: <b>dê a volta</b> no marcador (ou gire a folha), depois <b>abaixe o celular</b> até quase encostar na mesa.',
  hintR:['ar','Gire a folha ou ande em volta dela com o celular. Depois abaixe o celular até ficar quase rente à mesa.'],
  lostOff:['al','Aponte a câmera para o marcador: a folha inteira precisa aparecer na parte de cima da tela.'],
  fixOff:'Aponte a câmera para o marcador DesmontAR, com a folha inteira aparecendo na parte de cima da tela.'};
/* abre a câmera com prazo: se o celular não responder, avisa em vez de ficar carregando para sempre */
const withT=(p,ms)=>Promise.race([p,new Promise((_,r)=>setTimeout(()=>r(new Error('timeout')),ms))]);
async function camOpen(){
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)return 'nosupport';
  try{if(video.srcObject){video.srcObject.getTracks().forEach(t=>t.stop());video.srcObject=null;}
    let st;try{st=await withT(navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false}),15000);}
    catch(e){if(e&&e.name==='OverconstrainedError')st=await withT(navigator.mediaDevices.getUserMedia({video:true,audio:false}),15000);else throw e;}
    video.muted=true;video.setAttribute('playsinline','');video.setAttribute('muted','');video.srcObject=st;video.style.display='block';
    try{await withT(video.play(),4000);}catch(e){}
    await withT(new Promise(r=>{if(video.readyState>=1)r();else video.addEventListener('loadedmetadata',()=>r(),{once:true});}),6000);
    return 'ok';}
  catch(e){video.style.display='none';return e&&(e.name==='NotAllowedError'||e.name==='SecurityError')?'denied':e&&e.message==='timeout'?'timeout':e&&(e.name==='NotReadableError'||e.name==='AbortError')?'busy':'error';}}
const CAMERR={denied:'O celular não deu permissão para a câmera. No iPhone: Ajustes › Apps › Safari › Câmera › Permitir (ou toque em "aA" na barra do endereço › Ajustes do Site › Câmera). Depois recarregue a página.',
  timeout:'A câmera não respondeu. Feche os apps que podem estar usando a câmera (WhatsApp, chamadas de vídeo, Instagram), recarregue a página e tente de novo.',
  busy:'A câmera está ocupada por outro app. Feche chamadas de vídeo e apps de câmera e tente de novo.',
  nosupport:'Este navegador não libera a câmera. Abra o link direto no Safari (iPhone) ou no Chrome (Android), não por dentro do WhatsApp ou Instagram.',
  error:'Não consegui abrir a câmera. Recarregue a página e tente de novo.'};
/* o visualizador de RA do celular precisa da câmera: o jogo solta a câmera antes de abrir e religa quando você volta */
function camPause(){if(video.srcObject){video.srcObject.getTracks().forEach(t=>t.stop());video.srcObject=null;}CAM.paused=true;}
let camResuming=false;
async function camResume(){if(!CAM.on||!CAM.paused||camResuming||document.hidden)return;camResuming=true;const r=await camOpen();camResuming=false;
  if(r==='ok'){CAM.paused=false;camFov();if(!AR.inside)video.style.display='block';}else toast('Toque na tela para religar a câmera.',5000);}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(camResume,600);});
addEventListener('pageshow',()=>setTimeout(camResume,600));addEventListener('focus',()=>setTimeout(camResume,600));
addEventListener('pointerdown',()=>{if(CAM.paused&&S.ph!=='paredes')camResume();},true);
async function beginCam(){const b=$('#startCam'),m=$('#camMsg');b.disabled=true;b.textContent='Abrindo a câmera…';if(m)m.style.display='none';
  const r=await camOpen();b.disabled=false;b.textContent='Jogar com a câmera (AR de verdade)';
  if(r!=='ok'){if(m){m.textContent=CAMERR[r]+' Se preferir, jogue sem câmera.';m.style.display='block';}else toast(CAMERR[r],8000);return;}
  CAM.on=true;CAM.has=false;CAM.uYaw=0;CAM.uScale=1;camTexts(true);document.body.classList.add('cam');begin();setAR(true);controls.enabled=false;camFov();
  setTimeout(()=>guide('lu','Câmera ligada','Aponte para o marcador DesmontAR impresso, em cima da mesa. Deixe a folha na parte de cima da tela. Arraste com um dedo para girar o modelo e use dois dedos para dar zoom.',9000),5200);}
$('#startCam').onclick=beginCam;

/* ---------- obras na parede: AR sem marcador ---------- */
/* Com câmera: os pontos de referência da parede são achados de verdade na imagem (cantos e texturas);
   o plano da parede e a fixação da obra usam o giroscópio (3 graus de liberdade), uma simplificação.
   Sem câmera: uma sala de aula simulada, com uma parede lisa (falha) e paredes com textura (funcionam). */
const PW={native:false,real:{},scene:new THREE.Scene(),cam:new THREE.PerspectiveCamera(65,1,.05,60),built:false,found:false,foundT:0,lowT:0,score:0,pts:[],
  sel:'impressao',placed:{},failSeen:false,room:new THREE.Group(),wallPlane:null,grid:null,beta:null,lastScan:0,aimTex:null};
PW.cam.position.set(0,1.5,0);
/* tamanhos reais (altura x largura, cm) segundo os museus; Crisântemos: tamanho aproximado */
const DIM={impressao:[48,63],iris:[81,92],crisantemos:[81,100],ponte:[74,93],ninfeias:[90,94],nuvens:[75,105]};
const HCM=Object.fromEntries(Object.entries(DIM).map(([k,v])=>[k,v[0]]));
const OBK=['impressao','iris','crisantemos','ponte','ninfeias','nuvens'];
const cmW=k=>DIM[k][1];
const dimTxt=k=>`${DIM[k][1]} × ${DIM[k][0]} cm${k==='crisantemos'?' (aprox.)':''}`;
const thumbs={};function thumbURL(k){if(thumbs[k])return thumbs[k];const c=document.createElement('canvas');c.width=160;c.height=Math.round(160/PAINT[k].ar);drawPainting(c.getContext('2d'),c.width,c.height,k);
  const u=c.toDataURL('image/jpeg',.8);if(PIMG[k])thumbs[k]=u;return u;}
const QL=(()=>{try{return document.createElement('a').relList.supports('ar');}catch(e){return false;}})();
const ANDROID=/android/i.test(navigator.userAgent);
/* as 6 obras em 3D (USDZ) vão dentro do próprio jogo: não depende de nenhum arquivo extra no GitHub */
/* USDZ64 (modelos 3D das obras para o Quick Look) fica em js/dados.js */
const usdzURLs={};let obrasFile=null;
function usdzURL(k){if(obrasFile)return 'obras/'+k+'.usdz';
  if(!usdzURLs[k]){const b=atob(USDZ64[k]),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);usdzURLs[k]=URL.createObjectURL(new Blob([u],{type:'model/vnd.usdz+zip'}));}
  return usdzURLs[k];}
/* se a pasta obras estiver publicada, usa os arquivos; senão, os embutidos */
try{fetch('obras/impressao.usdz',{method:'HEAD',cache:'no-store'}).then(r=>{obrasFile=r.ok&&!/text\/html/.test(r.headers.get('content-type')||'');}).catch(()=>{obrasFile=false;});}catch(e){obrasFile=false;}
function arLink(k,label){const P=PAINT[k];label=label||'Pendurar na minha parede de verdade';
  if(QL){const u=usdzURL(k);return `<a rel="ar" class="qlbtn" data-hang="${k}" href="${u}#allowsContentScaling=0"${obrasFile?'':` download="${k}.usdz"`}><img src="${thumbURL(k)}" alt="">${label}</a>`;}
  if(ANDROID){const f=new URL('obras/'+k+'.glb',location.href).href;
    return `<a class="qlbtn" href="intent://arvr.google.com/scene-viewer/1.2?file=${encodeURIComponent(f)}&mode=ar_only&enable_vertical_placement=true&title=${encodeURIComponent(P.t)}#Intent;scheme=https;package=com.google.android.googlequicksearchbox;action=android.intent.action.VIEW;end;" data-hang="${k}"><img src="${thumbURL(k)}" alt="">${label}</a>`;}
  return `<p class="fix">No celular, aqui aparece o botão <b>Pendurar na minha parede de verdade</b>, que abre a obra no visualizador de realidade aumentada do aparelho, presa a uma parede real.</p>`;}
function buildWalls(){if(PW.built)return;PW.built=true;const sc=PW.scene;sc.environment=envMap;
  sc.add(new THREE.HemisphereLight(0xfffaf0,0x404048,1.0));const dl=new THREE.DirectionalLight(0xffffff,.5);dl.position.set(1,3,2);sc.add(dl);
  const R=PW.room;sc.add(R);
  const brick=canvasTex(512,512,(g,w,h)=>{g.fillStyle='#b9a493';g.fillRect(0,0,w,h);for(let y=0;y<16;y++)for(let x=-1;x<9;x++){const o=y%2?32:0;g.fillStyle=`hsl(${14+Math.random()*10},${30+Math.random()*15}%,${44+Math.random()*12}%)`;g.fillRect(x*64+o+2,y*32+2,60,28);}});
  brick.wrapS=brick.wrapT=THREE.RepeatWrapping;brick.repeat.set(3,1.2);
  const board=canvasTex(512,256,(g,w,h)=>{g.fillStyle='#c79a63';g.fillRect(0,0,w,h);for(let i=0;i<70;i++){g.fillStyle=`hsla(30,40%,${30+Math.random()*30}%,.35)`;g.fillRect(Math.random()*w,Math.random()*h,3,3);}
    [['#f2c018',30,30],['#ec6fa8',190,60],['#3b7be0',330,24],['#f6f4f1',90,140],['#9c2a4f',260,150],['#f6f4f1',400,130]].forEach(([c,x,y])=>{g.fillStyle=c;g.fillRect(x,y,90,80);g.fillStyle='rgba(0,0,0,.5)';for(let k=0;k<4;k++)g.fillRect(x+10,y+14+k*14,60-k*8,5);});});
  const plain=std(0xf3f1ec,0,.95),floorM=std(0xffffff,0,.6,{map:woodTex.clone()});floorM.map.repeat.set(2,2);floorM.map.needsUpdate=true;
  const W=(geo,mat,pos,rot,tex,name)=>{const m=new THREE.Mesh(geo,mat);m.position.set(...pos);if(rot)m.rotation.set(...rot);m.userData.wall=true;m.userData.tex=tex;m.userData.name=name;R.add(m);return m;};
  W(new THREE.PlaneGeometry(8,3),std(0xffffff,0,.9,{map:brick}),[0,1.5,-3.5],null,true,'parede de tijolos');
  W(new THREE.PlaneGeometry(7,3),plain,[-3.5,1.5,0],[0,PI/2,0],false,'parede lisa');
  W(new THREE.PlaneGeometry(7,3),plain,[3.5,1.5,0],[0,-PI/2,0],true,'parede com mural');
  const mural=new THREE.Mesh(new THREE.PlaneGeometry(3,1.5),std(0xffffff,0,.9,{map:board}));mural.position.set(3.48,1.55,-.3);mural.rotation.y=-PI/2;mural.userData.wall=true;mural.userData.tex=true;R.add(mural);
  W(new THREE.PlaneGeometry(8,3),plain,[0,1.5,3.5],[0,PI,0],false,'parede lisa');
  const fl=new THREE.Mesh(new THREE.PlaneGeometry(8,7),floorM);fl.rotation.x=-PI/2;R.add(fl);
  const ce=new THREE.Mesh(new THREE.PlaneGeometry(8,7),std(0xe9e7e2,0,1));ce.rotation.x=PI/2;ce.position.y=3;R.add(ce);
  /* quadro-negro e carteiras para parecer uma sala */
  const gb=new THREE.Mesh(new THREE.BoxGeometry(2.6,1.1,.05),std(0x2e4a3a,0,.8));gb.position.set(0,1.6,3.45);gb.userData.wall=true;gb.userData.tex=false;R.add(gb);
  [[-1.4,-1.2],[0,-1.2],[1.4,-1.2],[-1.4,1.2],[1.4,1.2]].forEach(([x,z])=>{const d=new THREE.Mesh(new THREE.BoxGeometry(.9,.05,.6),std(0x8a6a4a,0,.6));d.position.set(x,.72,z);R.add(d);});
  /* pontos de referência simulados nas paredes com textura */
  const P=[];for(let i=0;i<520;i++){const s=Math.random();if(s<.55)P.push(-3.8+Math.random()*7.6,.2+Math.random()*2.6,-3.48);else P.push(3.48,.3+Math.random()*2.5,-3.2+Math.random()*6.4);}
  for(let i=0;i<10;i++){P.push(-3.48,.3+Math.random()*2.5,-3+Math.random()*6);}
  const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.Float32BufferAttribute(P,3));
  PW.simPts=new THREE.Points(pg,new THREE.PointsMaterial({color:0x36d399,size:.045,transparent:true,opacity:.95,depthWrite:false}));PW.simPts.visible=false;R.add(PW.simPts);
  /* grade que mostra a parede encontrada */
  const gt=canvasTex(256,256,(g,w,h)=>{g.strokeStyle='rgba(54,211,153,.85)';g.lineWidth=3;for(let i=0;i<=8;i++){g.beginPath();g.moveTo(i*32,0);g.lineTo(i*32,h);g.stroke();g.beginPath();g.moveTo(0,i*32);g.lineTo(w,i*32);g.stroke();}});
  PW.grid=new THREE.Mesh(new THREE.PlaneGeometry(2.4,1.6),new THREE.MeshBasicMaterial({map:gt,transparent:true,opacity:.6,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}));PW.grid.visible=false;sc.add(PW.grid);}
/* pontos reais da câmera: cantos e texturas numa grade de células */
const FD={cv:document.createElement('canvas')};FD.ctx=FD.cv.getContext('2d',{willReadFrequently:true});
function featureScan(){const vw=video.videoWidth,vh=video.videoHeight;if(!vw||video.readyState<2)return [];
  const sc=200/Math.max(vw,vh),w=Math.round(vw*sc),h=Math.round(vh*sc);if(FD.cv.width!==w||FD.cv.height!==h){FD.cv.width=w;FD.cv.height=h;}
  FD.ctx.drawImage(video,0,0,w,h);const d=FD.ctx.getImageData(0,0,w,h).data;const g=new Float32Array(w*h);
  for(let i=0,j=0;i<g.length;i++,j+=4)g[i]=d[j]*.3+d[j+1]*.59+d[j+2]*.11;
  const C=8,pts=[];for(let cy=1;cy<Math.floor(h/C)-1;cy++)for(let cx=1;cx<Math.floor(w/C)-1;cx++){let best=0,bx=0,by=0;
    for(let y=cy*C;y<cy*C+C;y++)for(let x=cx*C;x<cx*C+C;x++){const i=y*w+x;const gx=g[i+1]-g[i-1],gy=g[i+w]-g[i-w];const m=Math.min(Math.abs(gx),Math.abs(gy));if(m>best){best=m;bx=x;by=y;}}
    if(best>10)pts.push([bx/w,by/h]);}
  return pts;}
const ptsCv=document.createElement('canvas');ptsCv.id='ptsCv';ptsCv.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:2;display:none';document.body.appendChild(ptsCv);
function drawPts(){const W=innerWidth,H=innerHeight;if(ptsCv.width!==W||ptsCv.height!==H){ptsCv.width=W;ptsCv.height=H;}const g=ptsCv.getContext('2d');g.clearRect(0,0,W,H);
  if(!CAM.on||PW.native)return;const vw=video.videoWidth,vh=video.videoHeight;if(!vw)return;const s=Math.max(W/vw,H/vh);g.fillStyle='#36d399';
  if(!PW.found)PW.pts.forEach(([u,v])=>{const x=(u*vw-vw/2)*s+W/2,y=(v*vh-vh/2)*s+H/2;g.fillRect(x-3,y-3,6,6);});
  g.strokeStyle='rgba(255,255,255,.9)';g.lineWidth=2;g.beginPath();g.arc(W/2,H*AIM_Y,18,0,7);g.stroke();}
const WALL_N=24;
function pwStep(){if(PW.native)return;const now=performance.now(),dt=Math.min(.25,(now-(PW.lastT||now))/1000);PW.lastT=now;
  if(PW.found&&CAM.on&&performance.now()-PW.lastScan>300){PW.lastScan=performance.now();PW.pts=featureScan();}
  if(!PW.found){let sc=0;
    if(CAM.on){if(performance.now()-PW.lastScan>120){PW.lastScan=performance.now();PW.pts=featureScan();}sc=PW.pts.length;
      if(PW.beta!=null&&(PW.beta<45||PW.beta>135))sc=Math.min(sc,8);}
    else{ray.setFromCamera({x:0,y:0},PW.cam);const hit=ray.intersectObjects(PW.room.children,false).find(h=>h.object.userData.wall);PW.aimHit=hit||null;sc=hit?(hit.object.userData.tex?70:5):0;PW.simPts.visible=true;}
    PW.score+=(sc-PW.score)*Math.min(1,dt*4);
    if(PW.score>=WALL_N){PW.foundT+=dt;PW.lowT=0;}else{PW.foundT=0;if(PW.score<14)PW.lowT+=dt;}
    if(PW.lowT>2.5&&!PW.failSeen){PW.failSeen=true;S.err++;guide('al','Parede lisa','Aqui quase não tenho pontos de referência: parede lisa e branca não tem cantos nem textura. Tente uma parede com tijolos, cartazes, uma porta ou um quadro.',8000);render();}
    if(PW.foundT>1.1)wallFound();
    if(frameN%10===0)render();}
}
function wallFound(){PW.found=true;PW.simPts.visible=false;ptsCv.getContext('2d').clearRect(0,0,ptsCv.width,ptsCv.height);
  const dir=new THREE.Vector3(0,0,-1).applyQuaternion(PW.cam.quaternion);dir.y=0;dir.normalize();
  let pos,n;if(!CAM.on&&PW.aimHit){pos=PW.aimHit.point.clone();n=PW.aimHit.face.normal.clone().transformDirection(PW.aimHit.object.matrixWorld);}
  else{pos=PW.cam.position.clone().addScaledVector(dir,WALL_D);pos.y=PW.cam.position.y;n=dir.clone().negate();}
  PW.wallPlane=new THREE.Plane().setFromNormalAndCoplanarPoint(n,pos);
  PW.grid.position.copy(pos).addScaledVector(n,.01);PW.grid.lookAt(pos.clone().add(n));PW.grid.visible=true;
  setTimeout(()=>{if(PW.grid)PW.grid.material.opacity=.25;},2500);
  guide('lu','Parede encontrada','Achei pontos suficientes e calculei um plano em pé: a parede. Agora escolha uma obra e toque na parede para pendurar.',7000);render();}
function hangPainting(k,pos,n){const P=PAINT[k];let g=PW.placed[k];if(g)PW.scene.remove(g);
  g=new THREE.Group();const w=cmW(k)/100,h=HCM[k]/100;
  const sh=new THREE.Mesh(new THREE.PlaneGeometry(w+.16,h+.16),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.28,depthWrite:false}));sh.position.set(.025,-.035,-.009);g.add(sh);
  const fr=new THREE.Mesh(new THREE.BoxGeometry(w+.08,h+.08,.02),std(0x2a2620,.2,.5));g.add(fr);
  const pic=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:paintTex(k),toneMapped:false}));pic.position.z=.012;g.add(pic);
  const pl=new THREE.Mesh(new THREE.PlaneGeometry(.36,.09),new THREE.MeshBasicMaterial({map:plaque(P.t,`${dimTxt(k)}`),toneMapped:false}));pl.position.set(0,-h/2-.12,.005);g.add(pl);
  g.position.copy(pos).addScaledVector(n,.012);g.lookAt(g.position.clone().add(n));PW.scene.add(g);PW.placed[k]=g;

  guide(P.g,P.t,`${P.c} Tamanho real: ${dimTxt(k)}.`,9000);
  const nx=OBK.find(o=>!PW.placed[o]);if(nx)PW.sel=nx;render();}
let pwDown=null;
renderer.domElement.addEventListener('pointerdown',e=>{if(S.ph==='paredes')pwDown=[e.clientX,e.clientY];});
renderer.domElement.addEventListener('pointerup',e=>{if(S.ph!=='paredes'||!pwDown||PW.native)return;const moved=Math.hypot(e.clientX-pwDown[0],e.clientY-pwDown[1]);pwDown=null;if(moved>8)return;
  if(!PW.found){toast(CAM.on?'Primeiro aponte para uma parede até ela ser encontrada.':'Primeiro mire o centro da tela numa parede até ela ser encontrada.');return;}
  const r=renderer.domElement.getBoundingClientRect();ray.setFromCamera({x:(e.clientX-r.left)/r.width*2-1,y:-(e.clientY-r.top)/r.height*2+1},PW.cam);
  if(!CAM.on){const hit=ray.intersectObjects(PW.room.children,false).find(h=>h.object.userData.wall);if(!hit)return;
    if(!hit.object.userData.tex){toast('Essa parede é lisa: a AR não achou pontos para prender a obra ali.');S.err++;return;}
    hangPainting(PW.sel,hit.point,hit.face.normal.clone().transformDirection(hit.object.matrixWorld));return;}
  hangAtAim();});
/* com a câmera: a obra vai para onde o círculo do centro aponta, de frente para você, a 2 m (o giroscópio só sabe a direção, não a distância) */
const HANG_D=2.0,AIM_Y=.32;
const WALL_D=1.5;
function hangAtAim(){
  if(PW.pts.length<8){S.err++;toast('Aqui a parede está lisa demais: mire num lugar com textura.');return;}
  if(PW.beta!=null&&(PW.beta<45||PW.beta>135)){toast('Segure o celular em pé, de frente para a parede.');return;}
  ray.setFromCamera({x:0,y:1-2*AIM_Y},PW.cam);const n=PW.wallPlane.normal.clone();
  if(ray.ray.direction.dot(n)>-Math.cos(55*PI/180)){toast('Mire mais de frente para a parede encontrada.');return;}
  const p=new THREE.Vector3();if(!ray.ray.intersectPlane(PW.wallPlane,p)){toast('Mire na parede encontrada.');return;}
  const k=PW.sel,w=cmW(k)/100,h=HCM[k]/100;
  for(const [o,g] of Object.entries(PW.placed)){if(o===k)continue;const d=g.position.clone().sub(p);const dy=Math.abs(d.y);d.y=0;
    if(d.length()<(w+cmW(o)/100)/2+.08&&dy<(h+HCM[o]/100)/2+.08){toast('Já tem uma obra aí. Gire o celular para um espaço livre da parede.');return;}}
  hangPainting(k,p,n);}
function enterWalls(){PW.native=false;PW.real={};buildWalls();PW.lastT=0;$('#info').style.display='none';PW.found=false;PW.foundT=0;PW.lowT=0;PW.score=0;PW.pts=[];PW.failSeen=false;Object.values(PW.placed).forEach(g=>PW.scene.remove(g));PW.placed={};PW.sel='impressao';PW.grid.visible=false;
  PW.room.visible=!CAM.on;PW.scene.background=CAM.on?null:new THREE.Color(0xdcd8d0);ptsCv.style.display='block';
  vr.yaw=0;vr.pitch=-.05;vr.a0=null;vr.yawOff=0;setVRCam();
  if(vr.canGyro&&!vr.gyro)startGyro();}
function leaveWalls(){ptsCv.style.display='none';}

let lastW=0;
function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h);camera.aspect=w/h;
  /* no iPhone a barra do Safari muda a altura: só reposiciona a câmera quando a largura muda */
  if(w!==lastW){if(w<760){controls.target.set(.95,-1.1,1.5);camera.fov=55;}else{controls.target.set(1.0,.3,.2);camera.fov=42;}lastW=w;}
  vOff=null;camera.updateProjectionMatrix();if(CAM.on)camFov();}
/* celular: o painel cobre a parte de baixo, então a peça em foco é desenhada na área livre de cima */
const FOCUS={proc:[-.21,.16,-.54],mem:[.74,.17,-.43],video:[-.38,.15,.59],energia:[.54,.26,2.0]};
function focusStep(ph){if(CAM.on||innerWidth>=760||!FOCUS[ph])return;const f=FOCUS[ph];camFly=[[f[0]+.9,f[1]+3.6,f[2]+3.6],f];}
let vOff=null;function viewOffset(){const W=innerWidth,H=innerHeight;let off=0;
  if(W<760&&!CAM.on&&FOCUS[S.ph]&&!AR.inside&&panel.style.display!=='none'&&!panel.classList.contains('min')){const bot=panel.getBoundingClientRect().top;off=Math.max(0,Math.round((H/2-(56+bot)/2)/16)*16);}
  if(off!==vOff){vOff=off;if(off)camera.setViewOffset(W,H,0,off,W,H);else camera.clearViewOffset();}}
addEventListener('resize',resize);resize();setView();
const easeBack=k=>{const c=1.7;return 1+(c+1)*Math.pow(k-1,3)+c*Math.pow(k-1,2);};
const clock=new THREE.Clock();let frameN=0,curScale=.5;
function loop(){
  requestAnimationFrame(loop);const dt=Math.min(clock.getDelta(),.05),t=clock.elapsedTime;frameN++;viewOffset();
  if(camFly){camFly[2]=(camFly[2]||0)+dt;if(camFly[2]>2.6)camFly=null;}
  if(camFly){const k=Math.min(1,dt*2.2);camera.position.lerp(tv.set(...camFly[0]),k);controls.target.lerp(new THREE.Vector3(...camFly[1]),k);if(camFly&&camera.position.distanceTo(tv.set(...camFly[0]))<.06)camFly=null;}
  if(CAM.on){camFly=null;camStep();if(S.ph==='reconhecer'&&AR.marker<0&&performance.now()-CAM.seen<300)chooseMarker(2);}else controls.update();
  /* rastreamento */
  const [ok,why]=evalTracking();
  if(AR.recog&&AR.wasTracked&&!ok&&S.ph!=='fim'){AR.losses++;}
  const changed=ok!==AR.tracked||why!==AR.why;AR.tracked=ok;AR.why=why;
  if(S.ph==='rastrear'){let d=Math.abs(azNow()-AR.az0);if(d>PI)d=2*PI-d;
    let ch=false;if(!AR.turned&&ok&&d>(CAM.on?.7:.9)){AR.turned=true;ch=true;}
    if(AR.turned&&!AR.lostOnce&&!ok&&(why==='angle'||why==='off')){AR.lostOnce=true;ch=true;}
    if(AR.lostOnce&&!AR.recovered&&ok){AR.recovered=true;ch=true;}
    if(ch)render();}
  if(changed){if(!ok)drop();else if(AR.losses>0&&STEPOF[S.ph]>=1&&!AR.inside&&AR.recog)guide(['ar','al','lu','gi'][AR.losses%4],'Voltou!','Voltei a ver o marcador, então o objeto voltou para o mesmo lugar.',3500);render();hintFace();}
  AR.wasTracked=ok;
  /* PC só aparece quando a AR está rastreando */
  rig.visible=ok&&S.ph!=='galeria'&&S.ph!=='paredes';galG.visible=ok&&S.ph==='galeria';
  if(S.galT>=0&&S.galT<1){S.galT=reduceMotion?1:Math.min(1,S.galT+dt/1.1);galG.scale.setScalar(Math.max(.001,easeBack(S.galT)));}
  glareM.visible=AR.glare;if(AR.glare)glareM.material.opacity=.75+.2*Math.sin(t*3);
  if(S.ph==='galeria'){galLeds.forEach((m,i)=>m.material.color.setHSL((t*.08+i*.25)%1,.75,.6));}
  const target=AR.scaleF;curScale+=(target-curScale)*Math.min(1,dt*6);
  if(S.spawnT>=0&&S.spawnT<1){S.spawnT=reduceMotion?1:Math.min(1,S.spawnT+dt/.8);rig.scale.setScalar(Math.max(.001,easeBack(S.spawnT)*curScale));}else rig.scale.setScalar(curScale);
  if(frameN%15===0)rig.traverse(o=>o.layers.set(1));
  /* pontos de referência e eixos */
  const showPts=(S.ph==='reconhecer'&&AR.marker>=0)||(!ok&&(why==='glare'||why==='light'));
  fpts.visible=showPts&&!(why==='angle');if(!ok&&(why==='glare'||why==='light')){fpts.geometry=PG[0];pMat.color.setHex(0xff4f5e);}
  else if(S.ph==='reconhecer'&&AR.marker>=0){fpts.geometry=PG[AR.marker];pMat.color.setHex(AR.marker===2?0x36d399:AR.marker===1?0xf5c518:0xff4f5e);pMat.opacity=AR.marker===1?(Math.floor(t*6)%2?1:.35):1;}
  axes.visible=ok&&S.ph==='reconhecer';
  /* luz */
  const lt=AR.lightOff?.12:1;lightK+=(lt-lightK)*Math.min(1,dt*5);lights.forEach(([l,i])=>l.intensity=i*lightK);
  scene.environment=lightK<.8?null:envMap;marker.material.color.setScalar(Math.max(.18,lightK));
  /* animações */
  for(let i=anims.length-1;i>=0;i--){const a=anims[i];a.t=Math.min(1,a.t+dt/a.dur);const e=a.t<.5?2*a.t*a.t:1-Math.pow(-2*a.t+2,2)/2;
    a.obj.position.lerpVectors(a.p0,a.p1,e);a.obj.position.y+=Math.sin(PI*e)*a.arc;a.obj.quaternion.copy(a.q0).slerp(a.q1,e);if(a.t>=1)anims.splice(i,1);}
  if(S.sel){const o=ITEMS[S.sel].obj;if(o.userData.base!=null)o.position.y=o.userData.base+.14+.04*Math.sin(t*4);}
  if(Object.values(halos).some(h=>h.visible))haloMat.opacity=.18+.25*(.5+.5*Math.sin(t*5));
  if(S.on){FANS.forEach(f=>f.rotation.z+=dt*16);ledMat.emissiveIntensity=1.6;ledMat.emissive.setHSL((t*.12)%1,.85,.55);}
  if(bootT>0){const k=Math.min(1,(performance.now()-bootT)/1800);drawBootArt(k);if(k>=1&&!S.booted){S.booted=true;render();}}
  /* chip de status */
  const cnt=!ok?(why==='glare'||why==='light'?3:why==='angle'||why==='off'?0:AR.marker>=0?PCOUNT[AR.marker]:0):ptsC.length;
  const msg={mk:AR.marker<0?'Procurando marcador…':AR.marker===0?'Poucos pontos: não reconheço':'Pontos repetidos: posição ambígua',light:'Pouca luz: não vejo os pontos',glare:'Reflexo no marcador',angle:'Ângulo inclinado demais',off:'Marcador fora da tela'};
  chip.className=ok?'ok':'bad';chip.innerHTML=S.ph==='paredes'?(PW.native?'RA sem marcador · RA do próprio celular':PW.found?'AR sem marcador · parede encontrada':`AR sem marcador · <b>${Math.round(PW.score)}</b> pontos na parede`):AR.inside?(vr.gyro?'Realidade virtual · giroscópio ligado':'Realidade virtual · arraste para olhar'):ok?`AR rastreando · <b>${cnt}</b> pontos`:`${msg[why]||''} · <b>${cnt}</b> pontos`;
  chip.style.display=(S.ph!=='inicio'&&S.ph!=='fim')?'block':'none';wl.style.display='none';
  /* celular no mundo real */
  phone.position.copy(camera.position);phone.quaternion.copy(camera.quaternion);
  const cs=[[-1.5,.01,-1.5],[1.5,.01,-1.5],[1.5,.01,1.5],[-1.5,.01,1.5]],pa=rayL.geometry.attributes.position.array,cp=camera.position;
  cs.forEach((q,i)=>pa.set([cp.x,cp.y,cp.z,...q],i*6));rayL.geometry.attributes.position.needsUpdate=true;rayL.computeLineDistances();rayL.material.color.setHex(ok?0x36d399:0xff4f5e);
  /* desenho: tela do celular (tela cheia) + mundo real (janela) */
  const W=innerWidth,H=innerHeight;renderer.setScissorTest(false);renderer.setViewport(0,0,W,H);
  if(S.ph==='paredes'&&!AR.inside){pwStep();PW.cam.aspect=W/H;if(CAM.on)PW.cam.fov=camera.fov;PW.cam.updateProjectionMatrix();renderer.toneMappingExposure=1.15;renderer.render(PW.scene,PW.cam);drawPts();return;}
  if(AR.inside){vr.cam.aspect=W/H;vr.cam.updateProjectionMatrix();renderer.toneMappingExposure=1.15;renderer.render(vr.scene,vr.cam);return;}
  renderer.render(scene,camera);
  if(wl.style.display==='block'){const r=wl.getBoundingClientRect(),y=H-r.bottom+2,x=r.left+2,w=r.width-4,hh=r.height-28;
    worldCam.aspect=w/hh;worldCam.updateProjectionMatrix();renderer.setScissorTest(true);renderer.setScissor(x,y,w,hh);renderer.setViewport(x,y,w,hh);renderer.render(scene,worldCam);renderer.setScissorTest(false);}
}
refreshArt();S.ph='inicio';dots();loop();
window.__bitlab={PW,vr,setVRCam,CAM,scene,rig,THREE,S,AR,setPhase,chooseMarker,chooseScale,slotTap,select,ITEMS,controls,camera,anims,next};
})();

