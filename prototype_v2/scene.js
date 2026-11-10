import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import data from './puzzle_data.json';
const $ = id => document.getElementById(id);
const buildingData = new Map(data.buildings.map(n => [n.id, n]));
const edgeId = (a,b) => [a,b].sort().join('|');
const edges = new Map(data.edges.map(([a,b,delay]) => [edgeId(a,b), { a,b, delay }]));
const edgeExists = (a,b) => edges.has(edgeId(a,b));
const edgeDelay = (a,b) => edges.get(edgeId(a,b))?.delay ?? Infinity;
const IDs = data.buildings.map(n => n.id);
const mainColor = 0x56bff6, reserveColor = 0xffb963;
const canvas = $('viewport');
const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:false});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor(0x171c25);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x171c25, 40, 100);
const camera = new THREE.OrthographicCamera(-15,15,10,-10,.1,100);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping=true;
controls.dampingFactor=.075;
controls.enablePan=false;
controls.minZoom=.68;
controls.maxZoom=2.25;
controls.minPolarAngle=.075;
controls.maxPolarAngle=Math.PI*.485;
controls.target.set(0,.5,0);
camera.position.set(19,24,26);
camera.lookAt(controls.target);
controls.update();
scene.add(new THREE.HemisphereLight(0xa8ceea,0x43526e,2.1));
const sunlight = new THREE.DirectionalLight(0xd6e8fa,2.05);
sunlight.position.set(-10,22,14);
sunlight.castShadow=true;
sunlight.shadow.mapSize.set(2048,2048);
sunlight.shadow.camera.left=-22; sunlight.shadow.camera.right=22;
sunlight.shadow.camera.top=20; sunlight.shadow.camera.bottom=-20;
scene.add(sunlight);
const mat=(color,opts={})=>new THREE.MeshStandardMaterial({color,roughness:.78,metalness:.14,...opts});
const baseMat=mat(0x344456), platformMat=mat(0x495d6d), roofGrey=mat(0x819cae), blueRoof=mat(0x3c8ce0,{metalness:.35,roughness:.4}), goldRoof=mat(0xeaba56,{metalness:.25}), violetRoof=mat(0xa98de7,{metalness:.45}), whiteRoof=mat(0xd8ebfa,{metalness:.18}), factoryRoof=mat(0x6eb9c4);
const selectableMeshes=[];
const buildingMeshes=new Map(), edgeMeshes=new Map(), omegaMarkers=[];
let stage=1, selected=new Set(IDs), activeRoute='main', mainPath=['B'], reservePath=['B'];
let showCommunications=true, showCalibration=false, showStvor=false;
let targetViewingDirection=null, stvorGroup=null, projectionGroup=null;
const atomCenter = new THREE.Vector3(0,2.55,0);
let atom = null, assembly = null;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const dummyFinds = [
  [
    ['Гайка без болта', 'Дамми считает, что болт просто опаздывает.'],
    ['Квитанция из карусели', 'Дамми купил билет на один оборот и запросил второй круг.', 'Других соединений между оставшимися зданиями нет.'],
    ['Магнит с холодильника', 'Дамми пытался прикрепить его к макету. Прикрепился сам.'],
  ],
  [
    ['Подгоревшая прихватка', 'Дамми объявил её образцом термостойкости.', 'Документ 02. Проверьте задержку каждого кабеля отдельно.'],
    ['Кухонный таймер', 'Дамми засёк импульс и заодно поставил макароны.'],
  ],
  [
    ['Перископ из трубочек', 'Через него отлично видно внутреннюю сторону трубочки.'],
    ['Бумажный транспортир', 'Дамми пытался измерить им собственный энтузиазм.', 'За каждый такт разницы поднимайте линию взгляда ещё на 6° над горизонтом.'],
    ['Очки с одной линзой', 'Дамми называет их биноклем с экономией бюджета.'],
    ['Шарик из фольги', 'Дамми представил запасной атом. При ближайшем осмотре это обёртка от конфеты.'],
  ],
];
const dummyCounts = [0,0,0];

function updateDummy() {
  const index = stage - 1;
  const finds = dummyFinds[index];
  $('dummyStation').classList.toggle('hide', !finds);
  if (!finds) return;
  const count = dummyCounts[index];
  const items = $('dummyItems');
  items.replaceChildren();
  for (const [title, description, hint] of finds.slice(0,count)) {
    const item = document.createElement('li');
    const name = document.createElement('strong');
    name.textContent = title;
    item.append(name, description);
    if (hint) {
      const note = document.createElement('small');
      note.textContent = hint;
      item.append(note);
    }
    items.append(item);
  }
  $('dummyFind').disabled = count === finds.length;
  $('dummyStatus').textContent = count === finds.length
    ? 'Это всё, что нашёл Дамми на этом этапе.'
    : `Найдено ${count} из ${finds.length}`;
}
$('dummyFind').addEventListener('click', () => {
  dummyCounts[stage - 1]++;
  updateDummy();
});

function meshBox(w,h,d, material, x,y,z, parent=scene) {
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
  m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
function cylinder(radiusTop,radiusBottom,height, material, x,y,z,parent=scene,segments=16){
  const m=new THREE.Mesh(new THREE.CylinderGeometry(radiusTop,radiusBottom,height,segments),material);
  m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
function tubeBetween(start,end,radius,material,parent=scene){
  const direction=end.clone().sub(start);
  const m=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,direction.length(),7),material);
  m.position.copy(start).add(end).multiplyScalar(.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());
  parent.add(m);return m;
}
function labelSprite(text,{bg='#344659',fg='#f2f6fa',fontSize=52,w=180,h=85,worldWidth=1.1}={}){
  const c=document.createElement('canvas');c.width=w;c.height=h;
  const ctx=c.getContext('2d');
  ctx.fillStyle=bg;ctx.beginPath();ctx.roundRect(5,5,w-10,h-10,14);ctx.fill();
  ctx.strokeStyle='#ffffff30';ctx.lineWidth=2;ctx.stroke();
  ctx.font=`750 ${fontSize}px system-ui,Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=fg;ctx.fillText(text,w/2,h/2+2);
  const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
  const material=new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false});
  const sprite=new THREE.Sprite(material);sprite.scale.set(worldWidth,worldWidth*h/w,1);sprite.renderOrder=12;
  return sprite;
}
// Base and environmental details
meshBox(25.2,.55,15.9,baseMat,0,-.35,0);
meshBox(25.3,.16,16,platformMat,0,-.63,0);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(24.75,15.25),mat(0x42566a));
ground.rotation.x=-Math.PI/2;ground.position.y=-.058;ground.receiveShadow=true;scene.add(ground);
for (let x=-11.75;x<=12;x+=1.15) {
  const points=[new THREE.Vector3(x,.007,-7.45),new THREE.Vector3(x,.007,7.45)];
  const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0x6c8799,transparent:true,opacity:.055}));scene.add(line);
}
for (let z=-7.2;z<=7.3;z+=1.15) {
  const points=[new THREE.Vector3(-12.1,.007,z),new THREE.Vector3(12.1,.007,z)];
  const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0x6c8799,transparent:true,opacity:.055}));scene.add(line);
}
// Road and courtyards
meshBox(1.1,.025,14.9,mat(0x627c8d),0,-.025,0);
meshBox(23.9,.028,.45,mat(0x647a88),0,-.01,-6.5);
for (const [x,z] of [[-5.65,0],[5.6,0]]) {
  const p=new THREE.Mesh(new THREE.CylinderGeometry(2.05,2.05,.025,32),mat(0x344959));p.position.set(x,-.022,z);scene.add(p);
  const ring=new THREE.Mesh(new THREE.RingGeometry(1.95,1.995,64),new THREE.MeshBasicMaterial({color:0x738a95,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.set(x,.011,z);scene.add(ring);
}
// Carousel
cylinder(.86,.86,.13,mat(0xbc9361),-5.65,.12,0);
cylinder(.18,.25,.63,mat(0x9c6b50),-5.65,.48,0);
cylinder(.95,.72,.23,mat(0xcaa16e),-5.65,.83,0);
for (let n=0;n<6;n++) {
  const a=n*Math.PI/3;
  cylinder(.055,.055,.6,mat(0xf5c47f),-5.65+Math.cos(a)*.68,.49,Math.sin(a)*.68);
}
// Swings
for(let dz of [-.59,.59]) {
  tubeBetween(new THREE.Vector3(5.6-1,.1,dz),new THREE.Vector3(5.6-.7,1.4,dz),.055,whiteRoof);
  tubeBetween(new THREE.Vector3(5.6+1,.1,dz),new THREE.Vector3(5.6+.7,1.4,dz),.055,whiteRoof);
}
tubeBetween(new THREE.Vector3(4.9,1.38,-.59),new THREE.Vector3(6.3,1.38,.59),.05,whiteRoof);
for (let dx of [-.25,.25]){
  tubeBetween(new THREE.Vector3(5.6+dx,1.35,0),new THREE.Vector3(5.6+dx,.45,0),.025,mat(0xa2cdd4));
}
meshBox(.65,.065,.25,mat(0xd2ab6c),5.6,.42,0);
// Fence: central motif distinct from the two communication passages
for(let z=-5;z<.4;z+=.5) meshBox(.06,.8,.06,mat(0xc3a566),.35,.4,z);
meshBox(.06,.65,5.3,mat(0xe0c17c),.35,.63,-2.25);
const fenceLabel=labelSprite('ОГРАДА',{bg:'#4a5260',fg:'#f0ce84',fontSize:23,w:195,h:50,worldWidth:1.6});fenceLabel.position.set(.35,1.2,-2.3);scene.add(fenceLabel);
// Trees and external details
for(const [x,z] of [[-11.6,-2.5],[-9.8,1],[-6.2,-5.3],[-1.2,5.1],[2.1,4.8],[7.9,5.7],[10.7,2.5],[11,-1.4]]){
  cylinder(.07,.09,.35,mat(0x775c4c),x,.18,z);
  const tree=new THREE.Mesh(new THREE.ConeGeometry(.34,.88,7),mat(0x56806e));tree.position.set(x,.7,z);scene.add(tree);
}
function buildNode(n){
  const group=new THREE.Group();group.position.set(n.x,0,n.z);scene.add(group);
  const mainBody=meshBox(n.roof==='factory'?1.12:.78,.75,n.roof==='factory'?.98:.78,mat(n.roof==='factory'?0x657887:0x698193),0,.39,0,group);
  const selectables=[mainBody];
  let roof;
  if(n.roof==='dome') {
    roof=new THREE.Mesh(new THREE.SphereGeometry(.42,20,10,0,Math.PI*2,0,Math.PI/2),blueRoof);roof.position.y=.75;group.add(roof);
  } else if(n.roof==='spire') {
    roof=new THREE.Mesh(new THREE.ConeGeometry(.39,.65,5),whiteRoof);roof.position.y=1.08;group.add(roof);
  } else if(n.roof==='crystal') {
    roof=new THREE.Mesh(new THREE.OctahedronGeometry(.42),goldRoof);roof.position.y=1.04;roof.scale.y=.64;group.add(roof);
  } else if(n.roof==='antenna') {
    const c1=new THREE.Mesh(new THREE.ConeGeometry(.105,.54,5),violetRoof);c1.position.set(-.22,1.0,0);group.add(c1);
    const c2=new THREE.Mesh(new THREE.ConeGeometry(.105,.54,5),violetRoof);c2.position.set(.22,1.0,0);group.add(c2);roof=c1;selectables.push(c2);
  } else {
    roof=meshBox(1.05,.13,.96,factoryRoof,0,.84,0,group);
    for(const dx of [-.25,.25]) cylinder(.12,.12,.52,mat(0xa7bcc1),dx,1.13,-.2,group);
    meshBox(.28,.35,.08,mat(0x293b48),0,.46,.52,group);
  }
  if(roof)selectables.push(roof);
  for(const m of selectables){ m.userData.building=n.id;selectableMeshes.push(m); }
  const idLabel=labelSprite(n.id,{bg:n.role==="factory"?'#6d6660':n.role==='receiver'?'#296b79':'#35495c',fontSize:51});
  idLabel.position.set(0,1.83,0);group.add(idLabel);
  if(n.role){
    const role=labelSprite(n.role==='factory'?'ФАБРИКА':'ПРИЁМНИК ◉',{w:280,h:55,fontSize:29,bg:n.role==='factory'?'#715f48':'#28697b',fg:'#f7eee1',worldWidth:1.75});
    role.position.set(0,1.42,0);group.add(role);
  }
  if(n.omega){
    const omega=labelSprite('Ω',{bg:'#6a3c69',fg:'#ffd0f7',fontSize:58,worldWidth:.64});
    omega.position.set(.64,1.18,0);group.add(omega);omegaMarkers.push(omega);
  }
  buildingMeshes.set(n.id,{group,idLabel});
}
data.buildings.forEach(buildNode);
// communication cables and raycasting hit targets
for(const [a,b,delay] of data.edges){
  const na=buildingData.get(a), nb=buildingData.get(b);
  const start=new THREE.Vector3(na.x,.22,na.z),end=new THREE.Vector3(nb.x,.22,nb.z);
  const base=tubeBetween(start,end,.036,new THREE.MeshStandardMaterial({color:0x71d9ce,emissive:0x15483f,emissiveIntensity:.7,transparent:true,opacity:.8}));
  const major=tubeBetween(start.clone().add(new THREE.Vector3(0,.025,0)),end.clone().add(new THREE.Vector3(0,.025,0)),.089,new THREE.MeshBasicMaterial({color:mainColor,transparent:true,opacity:.95}));
  const reserve=tubeBetween(start.clone().add(new THREE.Vector3(0,.047,0)),end.clone().add(new THREE.Vector3(0,.047,0)),.072,new THREE.MeshBasicMaterial({color:reserveColor,transparent:true,opacity:.95}));
  const hit=tubeBetween(start,end,.15,new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));hit.userData.edge=edgeId(a,b);selectableMeshes.push(hit);
  const mid=start.clone().add(end).multiplyScalar(.5);
  mid.y=.65;
  const weight=labelSprite(String(delay),{bg:delay>=6?'#784e42':'#344e62',fg:'#fff',w:100,h:90,fontSize:55,worldWidth:.49});
  weight.position.copy(mid);scene.add(weight);
  edgeMeshes.set(edgeId(a,b),{base,major,reserve,hit,weight,a,b,delay});
}
function cableActive(a,b){return selected.has(a)&&selected.has(b);}
function pathPairs(path){return new Set(path.slice(1).map((v,i)=>edgeId(path[i],v)));}
function updateView(){
  for(const [id,obj] of buildingMeshes){obj.group.visible=selected.has(id);}
  const pm=pathPairs(mainPath),pr=pathPairs(reservePath);
  for(const [id,e] of edgeMeshes){
    const active=cableActive(e.a,e.b),visible=showCommunications&&active;
    e.base.visible=visible;
    e.major.visible=visible&&stage>=2&&pm.has(id);
    e.reserve.visible=visible&&stage>=2&&pr.has(id);
    e.hit.visible=visible&&stage===2;
    e.weight.visible=visible&&showCalibration&&stage===2;
  }
  for(const mark of omegaMarkers)mark.visible=showCalibration&&stage===2;
  if(stvorGroup) stvorGroup.visible=stage>=3&&showStvor;
  if(projectionGroup) projectionGroup.visible=stage===3;
  $('visibleCount').textContent=String(selected.size);
  updateChips();updateRoutesDisplay();
}
function updateChips(){
  for(const button of $('buildingChips').children){
    const id=button.dataset.building;
    button.classList.toggle('off',!selected.has(id));
    button.classList.toggle('selected',selected.has(id));
    button.title=selected.has(id)?`Скрыть здание ${id}`:`Вернуть здание ${id}`;
    button.setAttribute('aria-pressed',String(selected.has(id)));
  }
}
function setStatus(message,style=''){$('status').className='status'+(style?' '+style:'');$('status').textContent=message;}
function pressBuilding(id){
  if(stage===1){
    if(selected.has(id))selected.delete(id);else selected.add(id);
    setStatus(`Выбрано ${selected.size} из 8 зданий. ${selected.size>8?'Скройте лишние сооружения.':selected.size<8?'Верните недостающие сооружения.':'Можно проверить топологию.'}`);
    updateView();return;
  }
  if(stage!==2||!selected.has(id))return;
  const p=activeRoute==='main'?mainPath:reservePath;
  const last=p.at(-1);
  if(id===p.at(-2))p.pop();
  else if(id!==last&&edgeExists(last,id)&&!p.includes(id))p.push(id);
  else if(id!==last) {setStatus(`Нельзя продолжить маршрут от ${last} к ${id}. Выберите соседнее здание по кабелю или отмените предыдущий шаг.`,'warn');return;}
  setStatus(`Маршрут «${activeRoute==='main'?'Основной':'Резервный'}»: ${p.join(' → ')}. Выбирайте последовательно связанные здания.`);
  updateView();
}
for(const n of data.buildings){
  const button=document.createElement('button');button.type='button';button.className='chip selected';button.dataset.building=n.id;button.textContent=n.id;button.addEventListener('click',()=>pressBuilding(n.id));$('buildingChips').append(button);
}
function polygonEncloses(cycle,point){
  const pts=cycle.map(id=>buildingData.get(id));let inside=false;
  for(let i=0,j=pts.length-1;i<pts.length;j=i++){
    const a=pts[i],b=pts[j];
    if((a.z>point.z)!=(b.z>point.z)&&point.x<(b.x-a.x)*(point.z-a.z)/(b.z-a.z)+a.x)inside=!inside;
  }
  return inside;
}
function hasRing(ids, landmark){
  const n=ids.length;if(n!==4)return false;
  const degree=ids.map(a=>ids.filter(b=>a!==b&&edgeExists(a,b)).length);
  if(!degree.every(d=>d===2))return false;
  const cyc=[ids[0]], used=new Set(cyc);let last=cyc[0];
  while(cyc.length<4){const next=ids.find(v=>!used.has(v)&&edgeExists(last,v));if(!next)return false;used.add(next);cyc.push(next);last=next;}
  return edgeExists(cyc[3],cyc[0])&&polygonEncloses(cyc,landmark);
}
function isValidTopology(){
  if(selected.size!==8||!selected.has('B')||!selected.has('H'))return false;
  const left=[...selected].filter(v=>buildingData.get(v).x<0),right=[...selected].filter(v=>buildingData.get(v).x>0);
  if(left.length!==4||right.length!==4)return false;
  if(!hasRing(left,data.landmarks.carousel)||!hasRing(right,data.landmarks.swings))return false;
  const activeEdges=[...edges.values()].filter(({a,b})=>cableActive(a,b));
  if(activeEdges.length!==10)return false;
  const bridges=activeEdges.filter(({a,b})=>buildingData.get(a).x*buildingData.get(b).x<0);
  if(bridges.length!==2)return false;
  return new Set(bridges.flatMap(e=>[e.a,e.b])).size===4;
}
function stepDisplay(){
  updateDummy();
  for(let n=1;n<=3;n++){
    const el=$(`step${n}`);el.classList.toggle('active',stage===n);el.classList.toggle('done',stage>n);
  }
  for(const n of [1,2,3])$(`panelStage${n}`).classList.toggle('hide',stage!==n);
  $('panelSuccess').classList.toggle('hide',stage!==4);
  $('toggleCalibration').classList.toggle('hide',stage!==2);
  $('toggleStvor').classList.toggle('hide',stage!==3);
  $('toggleCalibration').classList.toggle('active',showCalibration);
  $('toggleComm').classList.toggle('active',showCommunications);
  $('toggleStvor').classList.toggle('active',showStvor);
  $('hudTitle').textContent=stage===1?'Архивная застройка / 20 сооружений':stage===2?'Проверка энергетических каналов':stage===3?'Анаморфная структура элемента':'Структура нового элемента обнаружена';
  $('hudDetail').textContent=stage===1?'Найдите два кольца вокруг дворов и соедините их двумя переходами.':stage===2?'Выбирайте здания по очереди для построения синего и оранжевого маршрутов.':stage===3?'Створ переходов определяет горизонтальное направление, архив — угол подъёма камеры.':'Проект 0 завершён.';
  $('sceneMode').textContent=stage===1?'РЕЖИМ: ОТБОР':stage===2?'РЕЖИМ: МАРШРУТЫ':stage===3?'РЕЖИМ: ПРОЕКЦИЯ':'ДОСТУП РАЗРЕШЁН';
  $('sceneCaption').textContent=stage===1?'Здания A–T · карусель слева · качели справа':stage===2?'Для маршрутов нажимайте здания по одному от фабрики B до приёмника H':stage===3?'Изменяйте направление наблюдения мышью, используйте найденный створ и задержки':'Структура нового элемента обнаружена';
}
$('checkTopology').addEventListener('click',()=>{
  if(!isValidTopology()){setStatus('Топология не подтверждена: проверьте число зданий, оба кольца, количество переходов и отсутствие лишних соединений.','warn');return;}
  stage=2;showCalibration=true;mainPath=['B'];reservePath=['B'];chooseRoute('main');
  setStatus('Топология допустима, но не доказана. Исследуйте три архивных документа и восстановите оба независимых маршрута.','good');
  stepDisplay();updateView();
});
$('returnTopology').addEventListener('click',()=>{
  stage=1;mainPath=['B'];reservePath=['B'];showCalibration=false;
  setStatus('Редактирование состава зданий. После нового выбора снова проверьте топологию.');stepDisplay();updateView();
});
function updateRoutesDisplay(){
  $('mainPath').textContent=mainPath.join(' → ');$('reservePath').textContent=reservePath.join(' → ');
  $('mainDelay').textContent=`${routeDelay(mainPath)} тактов`;
  $('reserveDelay').textContent=`${routeDelay(reservePath)} тактов`;
}
function routeDelay(path){return path.slice(1).reduce((t,v,i)=>t+edgeDelay(path[i],v),0);}
function chooseRoute(which){activeRoute=which;$('chooseMain').classList.toggle('active',which==='main');$('chooseReserve').classList.toggle('active',which==='reserve');setStatus(`Выбран ${which==='main'?'основной':'резервный'} канал. Продолжайте маршрут от ${which==='main'?mainPath.at(-1):reservePath.at(-1)}.`);}
$('chooseMain').addEventListener('click',()=>chooseRoute('main'));
$('chooseReserve').addEventListener('click',()=>chooseRoute('reserve'));
$('clearRoute').addEventListener('click',()=>{if(activeRoute==='main')mainPath=['B'];else reservePath=['B'];setStatus('Выбранный маршрут очищен до фабрики B.');updateView();});
function isValidPath(path){return path.length>=2&&path[0]==='B'&&path.at(-1)==='H'&&new Set(path).size===path.length&&path.every(v=>selected.has(v))&&path.slice(1).every((v,i)=>edgeExists(path[i],v));}
function countBridges(path){return path.slice(1).filter((v,i)=>buildingData.get(path[i]).x*buildingData.get(v).x<0).length;}
function thermalSafe(path){return path.slice(1).every((v,i)=>edgeDelay(path[i],v)<6);}
function omegaSafe(path){return path.filter(v=>buildingData.get(v).omega).length<=1;}
function isValidRoutePair(){
  if(!isValidPath(mainPath)||!isValidPath(reservePath))return false;
  if(countBridges(mainPath)!==1||countBridges(reservePath)!==1)return false;
  if(mainPath.length!==6||reservePath.length!==4)return false;
  const mainMid=new Set(mainPath.slice(1,-1));
  if(reservePath.slice(1,-1).some(v=>mainMid.has(v)))return false;
  const a=mainPath.findIndex((v,i)=>i&&buildingData.get(pathIndex(mainPath,i-1)).x*buildingData.get(v).x<0);
  const b=reservePath.findIndex((v,i)=>i&&buildingData.get(pathIndex(reservePath,i-1)).x*buildingData.get(v).x<0);
  if(a<0||b<0)return false;
  return edgeId(mainPath[a-1],mainPath[a])!==edgeId(reservePath[b-1],reservePath[b]);
}
function pathIndex(path,i){return path[i];}
$('checkArchive').addEventListener('click',()=>{
  if(!isValidTopology()){setStatus('Топология изменилась. Сначала восстановите кольца и переходы.','warn');return;}
  if(!isValidRoutePair()){setStatus('Нужно задать два независимых маршрута B → H: каждый пересекает один переход, маршруты не имеют общих промежуточных зданий, основной состоит из 5 кабелей, резервный — из 3.','warn');return;}
  const d1=routeDelay(mainPath)===7&&routeDelay(reservePath)>7;
  const d2=thermalSafe(mainPath)&&thermalSafe(reservePath);
  const d3=omegaSafe(mainPath)&&omegaSafe(reservePath);
  if(!(d1&&d2&&d3)){
    setStatus('Эта топология возможна, но реконструкция противоречит архиву. Проверьте время прохождения, задержки отдельных кабелей и маркировку Ω. Можно изменить здания и проложить оба маршрута заново.','warn');return;
  }
  stage=3;showCalibration=false;showCommunications=true;
  $('finalMainDelay').textContent=String(routeDelay(mainPath));
  $('finalReserveDelay').textContent=String(routeDelay(reservePath));
  setupProjection();
  setStatus('АРХИВНАЯ РЕКОНСТРУКЦИЯ ПОДТВЕРЖДЕНА. Определите направление по двум переходам, затем рассчитайте высоту наблюдателя.','good');
  stepDisplay();updateView();
});
$('toggleComm').addEventListener('click',()=>{showCommunications=!showCommunications;updateView();stepDisplay();});
$('toggleCalibration').addEventListener('click',()=>{showCalibration=!showCalibration;updateView();stepDisplay();});
$('toggleStvor').addEventListener('click',()=>{showStvor=!showStvor;updateView();stepDisplay();});
function resetCamera(){controls.target.set(0,.65,0);camera.position.set(19,24,26);camera.zoom=1;camera.updateProjectionMatrix();controls.update();}
$('defaultView').addEventListener('click',resetCamera);
$('topView').addEventListener('click',()=>{const t=controls.target.clone();camera.position.copy(t).add(new THREE.Vector3(.03,34,.02));camera.zoom=1.05;camera.updateProjectionMatrix();controls.update();});
function getBridges(){return [...edges.values()].filter(e=>cableActive(e.a,e.b)&&buildingData.get(e.a).x*buildingData.get(e.b).x<0);}
function setupProjection(){
  if(stvorGroup){scene.remove(stvorGroup);stvorGroup=null;}
  if(projectionGroup){scene.remove(projectionGroup);projectionGroup=null;}
  const bridges=getBridges();if(bridges.length!==2)throw new Error('Invalid bridge count');
  // Identify top and bottom cable from their midpoint z values.
  const mid=e=>new THREE.Vector3((buildingData.get(e.a).x+buildingData.get(e.b).x)/2,.11,(buildingData.get(e.a).z+buildingData.get(e.b).z)/2);
  const mids=bridges.map(mid).sort((a,b)=>a.z-b.z);
  stvorGroup=new THREE.Group();scene.add(stvorGroup);
  tubeBetween(mids[0],mids[1],.055,new THREE.MeshBasicMaterial({color:0xffd178}),stvorGroup);
  for(const p of mids){const bead=new THREE.Mesh(new THREE.SphereGeometry(.16,12,10),new THREE.MeshBasicMaterial({color:0xffd178}));bead.position.copy(p);stvorGroup.add(bead);}
  const planar=mids[1].clone().sub(mids[0]);planar.y=0;
  const normal=new THREE.Vector3(-planar.z,0,planar.x).normalize();
  const factory=buildingData.get('B');const factoryPos=new THREE.Vector3(factory.x,0,factory.z);
  const center=mids[0].clone().add(mids[1]).multiplyScalar(.5);
  if(normal.dot(factoryPos.sub(center))<0)normal.negate();
  const elevation=(routeDelay(reservePath)-routeDelay(mainPath))*6*Math.PI/180;
  targetViewingDirection=normal.clone().multiplyScalar(Math.cos(elevation)).add(new THREE.Vector3(0,Math.sin(elevation),0)).normalize();
  // Use orthographic anamorphic geometry: each projected point lies on a ray
  // parallel to targetViewingDirection, but at a different spatial depth.
  const towardCenter=targetViewingDirection.clone().negate();
  const horizontal=new THREE.Vector3().crossVectors(towardCenter,new THREE.Vector3(0,1,0)).normalize();
  const vertical=new THREE.Vector3().crossVectors(horizontal,towardCenter).normalize();
  projectionGroup=new THREE.Group();scene.add(projectionGroup);
  const pt=(u,v,depth)=>atomCenter.clone().addScaledVector(horizontal,u).addScaledVector(vertical,v).addScaledVector(targetViewingDirection,depth);
  const draw=(coords,depth,color,radius=.045)=>{
    const points=coords.map(([u,v])=>pt(u,v,depth));
    const curve=new THREE.CatmullRomCurve3(points);
    const shape=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(8,coords.length*4),radius,8,false),new THREE.MeshBasicMaterial({color}));
    shape.userData.depth = depth;
    projectionGroup.add(shape);return shape;
  };
  for(let i=0;i<3;i++){
    const coords=[];for(let n=0;n<=22;n++){
      const theta=(i*2*Math.PI/3)+(n/22)*2*Math.PI/3;
      coords.push([1.42*Math.cos(theta),1.42*Math.sin(theta)]);
    }
    draw(coords,[1.4,-1.8,.3][i],0x65e8e1,.045);
  }
  draw([[0,-1.18],[0,-.7],[0,-.08]],-1.1,0xa4cbff,.045);
  draw([[0,-.08],[0,.7],[0,1.18]],1.6,0xa4cbff,.045);
  draw([[0,.98],[.65,0],[0,-.98]],-.35,0xffd28a,.041);
  draw([[0,-.98],[-.65,0],[0,.98]],2.0,0xffd28a,.041);
  // thin depth rays give the scene extra holographic context, without revealing an outline from other angles
  const baseM=mat(0x72ced0,{emissive:0x347d7e,emissiveIntensity:.5});
  for(const [u,v,d] of [[1.42,0,1.4],[0,1.42,-1.8],[-1.42,0,.3]]){
    const marker=new THREE.Mesh(new THREE.IcosahedronGeometry(.07,0),baseM);marker.position.copy(pt(u,v,d));marker.userData.depth=d;projectionGroup.add(marker);
  }
  stvorGroup.visible=showStvor;
  projectionGroup.visible=true;
}
$('checkProjection').addEventListener('click',()=>{
  if(!targetViewingDirection || stage!==3 || assembly)return;
  const offset=camera.position.clone().sub(controls.target).normalize();
  const delta=Math.acos(THREE.MathUtils.clamp(offset.dot(targetViewingDirection),-1,1));
  if(delta>THREE.MathUtils.degToRad(6)){
    setStatus(`Фрагменты ещё не совпадают. Проверьте сторону наблюдения, перпендикуляр к створу и угол возвышения. Ориентация камеры отличается от расчётной.`, 'warn');return;
  }
  assembly = {
    start: performance.now(),
    from: camera.position.clone().sub(controls.target),
    turn: new THREE.Quaternion().setFromUnitVectors(offset,targetViewingDirection),
    aim: controls.target.clone(),
    zoom: camera.zoom,
    positions: projectionGroup.children.map(part => part.position.clone()),
  };
  controls.enabled = false;
  $('checkProjection').disabled = true;
  setStatus('Проекция подтверждена. Собираем атом…','good');
  if (reduceMotion) animateAssembly(Infinity);
});

function animateAssembly(time) {
  const elapsed = time - assembly.start;
  const align = THREE.MathUtils.smoothstep(elapsed,0,580);
  const merge = THREE.MathUtils.smoothstep(elapsed,580,1380);
  const turn = new THREE.Quaternion().slerp(assembly.turn,align);
  controls.target.copy(assembly.aim).lerp(atomCenter,align);
  camera.position.copy(assembly.from).applyQuaternion(turn).add(controls.target);
  camera.zoom = THREE.MathUtils.lerp(assembly.zoom,2.1,align);
  camera.updateProjectionMatrix();
  projectionGroup.children.forEach((part,index) => {
    part.position.copy(assembly.positions[index]).addScaledVector(targetViewingDirection,-part.userData.depth*merge);
  });
  if (merge < 1) return;

  atom = new THREE.Group();
  atom.position.copy(atomCenter);
  for (const [index,color] of [0x65e8e1,0xa4cbff,0xffd28a].entries()) {
    const orbit = new THREE.Mesh(new THREE.TorusGeometry(1.35,.045,8,72),new THREE.MeshBasicMaterial({color}));
    orbit.rotation.set(Math.PI/3,index*Math.PI/3,index*.75);
    atom.add(orbit);
  }
  atom.add(new THREE.Mesh(new THREE.IcosahedronGeometry(.36,1),mat(0xffd28a,{emissive:0x815022})));
  scene.add(atom);
  assembly = null;
  controls.enabled = true;
  $('checkProjection').disabled = false;
  stage=4;showStvor=false;stepDisplay();updateView();
  setStatus('СТРУКТУРА ПОДТВЕРЖДЕНА. Нулевой элемент разблокирован.','good');
}
const hints=[
  'Подсказка 1. Найдите середины двух переходов. Отрезок между ними — створ. Горизонтальное направление взгляда должно быть перпендикулярно створу, а не совпадать с ним.',
  'Подсказка 2. Выберите из двух перпендикулярных направлений то, которое смотрит на установку со стороны фабрики B. Угол поднимайте от горизонта.',
  'Подсказка 3. У резервного канала 11 тактов, у основного — 7. Разница 4; умножьте её на 6°. Требуется 24° над горизонтом со стороны фабрики. В проекции ищите кольцо, ось и ромб.'
];
for(let n=1;n<=3;n++)$(`hint${n}`).addEventListener('click',()=>{$('projectionHint').textContent=hints[n-1];});
function resetAll(){
  assembly = null;
  controls.enabled = true;
  $('checkProjection').disabled = false;
  dummyCounts.fill(0);
  if (atom) {
    scene.remove(atom);
    atom.children.forEach(part => {part.geometry.dispose();part.material.dispose();});
    atom = null;
  }
  stage=1;selected=new Set(IDs);mainPath=['B'];reservePath=['B'];activeRoute='main';showCommunications=true;showCalibration=false;showStvor=false;
  if(stvorGroup){scene.remove(stvorGroup);stvorGroup=null;}
  if(projectionGroup){scene.remove(projectionGroup);projectionGroup=null;}
  targetViewingDirection=null;
  chooseRoute('main');resetCamera();
  setStatus('Новая попытка начата. Восстановите два контура и оставьте ровно восемь зданий.');
  stepDisplay();updateView();
}
$('resetAll').addEventListener('click',resetAll);
$('restartSuccess').addEventListener('click',resetAll);
// 3D input: distinguish clicks from OrbitControls drags.
const raycaster=new THREE.Raycaster(), pointer=new THREE.Vector2();let down=null;
canvas.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};});
canvas.addEventListener('pointerup',e=>{
  if(!down)return;const dx=e.clientX-down.x,dy=e.clientY-down.y;down=null;
  if(Math.hypot(dx,dy)>6||stage>=3)return;
  const box=canvas.getBoundingClientRect();
  pointer.set((e.clientX-box.left)/box.width*2-1,-(e.clientY-box.top)/box.height*2+1);
  raycaster.setFromCamera(pointer,camera);
  const targets=selectableMeshes.filter(m=>{
    if(m.userData.building)return selected.has(m.userData.building);
    return stage===2&&m.userData.edge&&m.visible;
  });
  const hits=raycaster.intersectObjects(targets,false);
  if(!hits.length)return;
  const hit=hits[0].object;
  if(hit.userData.building){pressBuilding(hit.userData.building);return;}
  const eData=edges.get(hit.userData.edge);if(!eData)return;
  const path=activeRoute==='main'?mainPath:reservePath;
  if(path.at(-1)===eData.a)pressBuilding(eData.b);
  else if(path.at(-1)===eData.b)pressBuilding(eData.a);
});
function resize(){
  const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight);
  renderer.setSize(w,h,false);
  const aspect=w/h,halfH=9.7;
  camera.left=-halfH*aspect;camera.right=halfH*aspect;
  camera.top=halfH;camera.bottom=-halfH;camera.updateProjectionMatrix();
}
window.addEventListener('resize',resize);
resize();stepDisplay();updateView();
function loop(time=performance.now()){
  if (assembly) animateAssembly(time);
  if (atom && !reduceMotion) atom.rotation.y = time*.0004;
  controls.update();renderer.render(scene,camera);requestAnimationFrame(loop);
}
loop();
