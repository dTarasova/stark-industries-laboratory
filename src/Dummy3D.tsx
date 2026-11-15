import {useEffect, useRef, useState} from 'react';
import * as T from 'three';

/** Articulated workshop arm: each joint owns the downstream mechanism. */
export function Dummy3D({upgraded}: {upgraded:boolean}) {
 const host=useRef<HTMLDivElement>(null);
 const upgrade=useRef(upgraded);
 const [failed,setFailed]=useState(false);
 useEffect(()=>{upgrade.current=upgraded;},[upgraded]);
 useEffect(()=>{
  const el=host.current!;
  let renderer:T.WebGLRenderer;
  try {renderer=new T.WebGLRenderer({alpha:true,antialias:true});} catch {setFailed(true);return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.shadowMap.enabled=true; renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.outputColorSpace=T.SRGBColorSpace; renderer.toneMapping=T.ACESFilmicToneMapping; renderer.toneMappingExposure=1.6;
  el.appendChild(renderer.domElement);
  const scene=new T.Scene(), camera=new T.PerspectiveCamera(36,1,.1,40);
  camera.position.set(5,3.4,8); camera.lookAt(.3,1.7,0);
  scene.add(new T.HemisphereLight(0xc9edff,0x453321,3));
  for(const [x,y,z,color,power] of [[-3,6,4,0xffd3a0,65],[4,4,-3,0x7bcfff,85]] ) {const light=new T.PointLight(color,power); light.position.set(x,y,z); light.castShadow=true; scene.add(light);}
  const mat=(color:number,metalness=.7,roughness=.32)=>new T.MeshStandardMaterial({color,metalness,roughness});
  const yellow=mat(0xcba547),steel=mat(0x9ba7ad),dark=mat(0x252c31),red=mat(0xbe3026),white=mat(0xe2e8df,.1);
  function mesh(parent:T.Object3D,g:T.BufferGeometry,m:T.Material,x=0,y=0,z=0) {const a=new T.Mesh(g,m); a.position.set(x,y,z); a.castShadow=true;a.receiveShadow=true;parent.add(a);return a;}
  const box=(p:T.Object3D,w:number,h:number,d:number,m:T.Material,x=0,y=0,z=0)=>mesh(p,new T.BoxGeometry(w,h,d),m,x,y,z);
  const cylinder=(p:T.Object3D,r:number,h:number,m:T.Material,x=0,y=0,z=0)=>mesh(p,new T.CylinderGeometry(r,r,h,32),m,x,y,z);
  const root=new T.Group();scene.add(root);
  box(root,1.55,.22,1.15,dark,0,.2);box(root,1.25,.18,.85,yellow,0,.38);
  for(const x of [-.6,.6])for(const z of [-.48,.48]) {const wheel=cylinder(root,.18,.15,dark,x,.18,z);wheel.rotation.x=Math.PI/2;}
  cylinder(root,.42,.3,steel,0,.57);
  const turret=new T.Group();turret.position.y=.73;root.add(turret);
  function joint(p:T.Object3D,r:number) {const axle=cylinder(p,r,.52,dark);axle.rotation.x=Math.PI/2;for(const z of [-.3,.3]) {const cap=cylinder(p,r*.72,.08,steel,0,0,z);cap.rotation.x=Math.PI/2; const bolt=cylinder(p,r*.22,.09,dark,0,0,z*1.2);bolt.rotation.x=Math.PI/2;}}
  const shoulder=new T.Group();turret.add(shoulder);joint(shoulder,.3);
  box(shoulder,.36,1.45,.34,yellow,0,.72);for(const z of [-.24,.24]){cylinder(shoulder,.055,1.15,steel,.2,.73,z);box(shoulder,.12,.62,.1,dark,.2,.45,z);}
  const elbow=new T.Group();elbow.position.y=1.5;shoulder.add(elbow);joint(elbow,.25);
  box(elbow,.28,1.22,.3,yellow,0,.61);cylinder(elbow,.065,1.05,steel,-.22,.6);
  const cable=new T.CatmullRomCurve3([new T.Vector3(-.24,0,.22),new T.Vector3(-.4,.4,.22),new T.Vector3(-.35,1,.22),new T.Vector3(0,1.25,.22)]);
  mesh(elbow,new T.TubeGeometry(cable,24,.045,8,false),dark);
  const wrist=new T.Group();wrist.position.y=1.28;elbow.add(wrist);joint(wrist,.18);
  box(wrist,.45,.18,.36,steel,0,.18);
  const fingers=[-1,1].map(sign=>{const f=new T.Group();f.position.set(sign*.25,.2,0);wrist.add(f);box(f,.09,.38,.15,dark,0,.15);box(f,.18,.08,.15,steel,-sign*.05,.35);return f;});
  const extinguisher=new T.Group();wrist.add(extinguisher);extinguisher.position.set(0,.58,0);
  cylinder(extinguisher,.19,.65,red);mesh(extinguisher,new T.SphereGeometry(.19,24,16),red,0,.32);mesh(extinguisher,new T.SphereGeometry(.19,24,16),red,0,-.32);
  cylinder(extinguisher,.06,.18,steel,0,.53);box(extinguisher,.3,.05,.08,dark,.08,.64);box(extinguisher,.2,.26,.02,white,0,0,.193);
  const hose=new T.CatmullRomCurve3([new T.Vector3(.06,.5,0),new T.Vector3(.4,.5,0),new T.Vector3(.4,-.1,0),new T.Vector3(.32,-.3,.05)]);mesh(extinguisher,new T.TubeGeometry(hose,24,.035,8,false),dark);
  const floor=mesh(scene,new T.CircleGeometry(3.2,64),new T.ShadowMaterial({opacity:.3}),0,.02);floor.rotation.x=-Math.PI/2;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');let frame=0,time=0,last=0,installed=0;
  function resize(){const w=el.clientWidth,h=el.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.position.z=w<500?11:8;camera.updateProjectionMatrix();}const observer=new ResizeObserver(resize);observer.observe(el);resize();
  function draw(now:number){frame=requestAnimationFrame(draw);const dt=last?Math.min((now-last)/1000,.05):0;last=now;if(document.hidden)return;time+=dt;
   const motion=reduced.matches?0:Math.sin(time*.9);
   installed=upgrade.current?Math.min(1,installed+dt*.65):0;
   turret.rotation.y=-.25+motion*.12;shoulder.rotation.z=.48+motion*.035;elbow.rotation.z=-1.1+motion*.08-installed*.15;wrist.rotation.z=.4+motion*.12;
   fingers.forEach((f,i)=>f.rotation.z=(i?1:-1)*(upgrade.current?.08:.18+motion*.08));
   extinguisher.visible=upgrade.current;extinguisher.scale.setScalar(reduced.matches?1:Math.max(.01,installed));
   renderer.render(scene,camera);
  }frame=requestAnimationFrame(draw);
  return()=>{cancelAnimationFrame(frame);observer.disconnect();scene.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});renderer.dispose();renderer.domElement.remove();};
 },[]);
 return <div ref={host} className="dummy-3d" role="img" aria-label={upgraded?'Дамми с новым огнетушителем в захвате':'Дамми — золотистый робот-манипулятор с подвижными суставами'}>{failed&&<p>Дамми на связи. 3D-изображение недоступно на этом устройстве.</p>}</div>;
}
