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
  camera.position.set(5,3.4,10); camera.lookAt(.55,1.65,0);
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
  box(shoulder,.36,1.7,.34,yellow,0,.85);for(const z of [-.24,.24]){cylinder(shoulder,.055,1.4,steel,.2,.86,z);box(shoulder,.12,.62,.1,dark,.2,.45,z);}
  const elbow=new T.Group();elbow.position.y=1.75;shoulder.add(elbow);joint(elbow,.25);
  box(elbow,.28,1.42,.3,yellow,0,.71);cylinder(elbow,.065,1.25,steel,-.22,.7);
  const cable=new T.CatmullRomCurve3([new T.Vector3(-.24,0,.22),new T.Vector3(-.4,.4,.22),new T.Vector3(-.35,1.2,.22),new T.Vector3(0,1.45,.22)]);
  mesh(elbow,new T.TubeGeometry(cable,24,.045,8,false),dark);
  const extension=new T.Group();extension.position.y=1.48;elbow.add(extension);joint(extension,.21);
  box(extension,.23,.86,.25,yellow,0,.43);
  cylinder(extension,.045,.72,steel,-.17,.43);
  const extensionCable=new T.CatmullRomCurve3([new T.Vector3(.16,0,.17),new T.Vector3(.27,.3,.17),new T.Vector3(.25,.65,.17),new T.Vector3(0,.9,.17)]);
  mesh(extension,new T.TubeGeometry(extensionCable,20,.032,8,false),dark);
  const wrist=new T.Group();wrist.position.y=.92;extension.add(wrist);joint(wrist,.18);
  box(wrist,.45,.18,.36,steel,0,.18);
  const fingers=[-1,1].map(sign=>{const f=new T.Group();f.position.set(sign*.25,.2,0);wrist.add(f);box(f,.09,.38,.15,dark,0,.15);box(f,.18,.08,.15,steel,-sign*.05,.35);return f;});
  const extinguisher=new T.Group();wrist.add(extinguisher);extinguisher.position.set(0,.58,0);
  cylinder(extinguisher,.19,.65,red);mesh(extinguisher,new T.SphereGeometry(.19,24,16),red,0,.32);mesh(extinguisher,new T.SphereGeometry(.19,24,16),red,0,-.32);
  cylinder(extinguisher,.06,.18,steel,0,.53);box(extinguisher,.3,.05,.08,dark,.08,.64);box(extinguisher,.2,.26,.02,white,0,0,.193);
  const hose=new T.CatmullRomCurve3([new T.Vector3(.06,.5,0),new T.Vector3(.4,.5,0),new T.Vector3(.4,-.1,0),new T.Vector3(.32,-.3,.05)]);mesh(extinguisher,new T.TubeGeometry(hose,24,.035,8,false),dark);
  // A small reusable particle pool follows the hose outlet in world space.
  const foamGeometry=new T.SphereGeometry(1,8,6);
  const foam=Array.from({length:28},(_,i)=>{
   const material=new T.MeshStandardMaterial({color:0xf1fffa,roughness:1,transparent:true,opacity:0,depthWrite:false});
   const puff=new T.Mesh(foamGeometry,material);puff.visible=false;scene.add(puff);
   return {puff,delay:i*.024,angle:i*2.39996};
  });
  const nozzle=new T.Vector3(.32,-.3,.05),origin=new T.Vector3(),direction=new T.Vector3();
  const nozzleRotation=new T.Quaternion();
  const floor=mesh(scene,new T.CircleGeometry(3.2,64),new T.ShadowMaterial({opacity:.3}),0,.02);floor.rotation.x=-Math.PI/2;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');let frame=0,time=0,last=0,installed=0;
  function resize(){
   const w=el.clientWidth,h=el.clientHeight;
   if(!w||!h)return;
   renderer.setSize(w,h);camera.aspect=w/h;
   // Fit a padded sphere around every animated pose, including narrow screens.
   const vertical=T.MathUtils.degToRad(camera.fov/2);
   const limitingAngle=Math.min(vertical,Math.atan(Math.tan(vertical)*camera.aspect));
   const distance=2.65/Math.sin(limitingAngle);
   const target=new T.Vector3(.55,1.65,0);
   camera.position.copy(target).add(new T.Vector3(.42,.2,1).normalize().multiplyScalar(distance));
   camera.lookAt(target);camera.updateProjectionMatrix();
  }const observer=new ResizeObserver(resize);observer.observe(el);resize();
  function draw(now:number){frame=requestAnimationFrame(draw);const dt=last?Math.min((now-last)/1000,.05):0;last=now;if(document.hidden)return;time+=dt;
   const motion=reduced.matches?0:Math.sin(time*.9);
   const follow=reduced.matches?0:Math.sin(time*.9-.65);
   const nod=reduced.matches?0:Math.sin(time*1.8)*.06;
   installed=upgrade.current?Math.min(1,installed+dt*.65):0;
   turret.rotation.y=-.25+motion*.23;shoulder.rotation.z=.48+motion*.085;elbow.rotation.z=-1.1+follow*.16-installed*.15;wrist.rotation.z=.4-follow*.15+nod;
   extension.rotation.z=-1.5+follow*.10;
   wrist.rotation.y=motion*.12;
   fingers.forEach((f,i)=>f.rotation.z=(i?1:-1)*.08);
   // Emit for 0.65 seconds every ten seconds; let the plume dissipate.
   const burst=time%10;
   extinguisher.updateWorldMatrix(true,false);
   origin.copy(nozzle);extinguisher.localToWorld(origin);
   extinguisher.getWorldQuaternion(nozzleRotation);
   direction.set(-.25,-1,.25).normalize().applyQuaternion(nozzleRotation);
   for(const {puff,delay,angle} of foam){
    const age=burst-delay;
    puff.visible=!reduced.matches&&time>=10&&age>=0&&age<1.05;
    if(!puff.visible)continue;
    const spread=age*.19;
    puff.position.copy(origin).addScaledVector(direction,age*1.1);
    puff.position.x+=Math.cos(angle)*spread;
    puff.position.z+=Math.sin(angle)*spread;
    puff.position.y-=age*age*.22;
    puff.scale.setScalar(.025+age*.11);
    puff.material.opacity=.72*Math.sin(Math.PI*age/1.05);
   }
   renderer.render(scene,camera);
  }frame=requestAnimationFrame(draw);
  return()=>{cancelAnimationFrame(frame);observer.disconnect();scene.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});renderer.dispose();renderer.domElement.remove();};
 },[]);
 return <div ref={host} className="dummy-3d" role="img" aria-label={upgraded?'Дамми с новым огнетушителем в захвате':'Дамми — золотистый робот-манипулятор с огнетушителем в захвате'}>{failed&&<p>Дамми на связи. 3D-изображение недоступно на этом устройстве.</p>}</div>;
}




