import * as THREE from './vendor/three.module.min.js';
import {GLTFLoader} from './vendor/three-addons/loaders/GLTFLoader.js';
import {DRACOLoader} from './vendor/three-addons/loaders/DRACOLoader.js';
import {RoomEnvironment} from './vendor/RoomEnvironment.js';
import {KEYFRAMES,CHAPTER_PROGRESS,clamp,ramp,copyAt,curveFor,stateAt,editorialAt} from './choreography.js';

const $=id=>document.getElementById(id);
export async function startStage(){
 const params=new URLSearchParams(location.search);
 const polished=!(params.has('qa')&&params.get('render')==='g'); // Local QA rendering control; choreography is shared.
 const preference=matchMedia('(prefers-reduced-motion: reduce)');
 const desktop=matchMedia('(min-width: 901px) and (min-height: 621px)');
 let reading=false,disposed=false,mode=false,trigger,timeline,queued=false,benchmark=null,renderCount=0;
 const state={...KEYFRAMES[0]},scene=new THREE.Scene(),target=new THREE.Vector3(),point=new THREE.Vector3();
 const camera=new THREE.PerspectiveCamera(34,innerWidth/innerHeight,.02,30);
 const started=performance.now();
 if(params.get('test')==='webgl-fail')throw Error('Test: WebGL initialization unavailable');
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
 renderer.setClearColor(0,0);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.86;
 const gl=renderer.getContext(),gpuTimer=params.has('qa')?gl.getExtension('EXT_disjoint_timer_query_webgl2'):null;
 const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();
 const environment=pmrem.fromScene(room,.04).texture;scene.environment=environment;room.dispose();pmrem.dispose();
 const hemisphere=new THREE.HemisphereLight(0xffffff,0x7c826b);scene.add(hemisphere);
 const light=new THREE.DirectionalLight(0xfff8ed);scene.add(light);
 const rim=new THREE.DirectionalLight(0xe5ebf0);scene.add(rim);
 const draco=new DRACOLoader().setDecoderPath('./vendor/draco/').setWorkerLimit(2);
 const loader=new GLTFLoader().setDRACOLoader(draco);
 let model;
 try{model=await loader.loadAsync(params.get('test')==='model-fail'?'./assets/missing.glb':'./assets/cr5af-authorized.glb');}
 catch(error){draco.dispose();environment.dispose();renderer.dispose();throw error;}
 draco.dispose();
 const robot=model.scene,joints=Array.from({length:6},(_,i)=>robot.getObjectByName('J'+(i+1)));
 if(joints.some(j=>!j)){environment.dispose();renderer.dispose();throw Error('Original J1–J6 hierarchy unavailable');}
 const rest=joints.map(j=>j.quaternion.clone());
 const axes=joints.map((_,i)=>i===0||i===4?new THREE.Vector3(0,1,0):new THREE.Vector3(0,0,1));
 const q=new THREE.Quaternion();
 robot.name='CR5AF-persistent-object';scene.add(robot);
 // Preserve authored color, metalness and flange response. Shared materials are tuned once.
 const materials=new Set();robot.traverse(node=>{if(node.isMesh)for(const m of [].concat(node.material))materials.add(m);});
 const shells=[...materials].filter(m=>['机身白','机身白.003','定白.003'].includes(m.name));
 // Illustrative contact only: anchored to the real base, not a computed arm shadow.
 const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;
 const context=shadowCanvas.getContext('2d'),gradient=context.createRadialGradient(64,64,8,64,64,64);
 gradient.addColorStop(0,'rgba(37,43,38,.27)');gradient.addColorStop(.28,'rgba(37,43,38,.15)');gradient.addColorStop(1,'rgba(37,43,38,0)');
 context.fillStyle=gradient;context.fillRect(0,0,128,128);
 const contactTexture=new THREE.CanvasTexture(shadowCanvas);contactTexture.colorSpace=THREE.SRGBColorSpace;
 const contact=new THREE.Mesh(new THREE.PlaneGeometry(.52,.44),new THREE.MeshBasicMaterial({map:contactTexture,transparent:true,depthWrite:false,toneMapped:false}));
 contact.rotation.x=-Math.PI/2;scene.add(contact);
 function setRendering(h){
  scene.environmentIntensity=h?.46:.6;scene.environmentRotation.y=h?.45:0;hemisphere.intensity=h?.20:.4;
  light.intensity=h?2.1:1.8;light.position.set(h?-3:3,5,4);
  rim.intensity=h?1:.55;rim.position.set(h?3:-3,2,h?-3:-2);
  shells.forEach(m=>{m.roughness=h?.58:.6;});contact.visible=h;document.body.classList.toggle('render-depth',h);
  loopPaths[1].visible=state.p>.40&&(h||state.p>.76);
  loopPaths[1].material.opacity=.72*(h?1-.6*ramp(state.p,.76,.92):ramp(state.p,.76,.82));
 }
 // Conceptual spatial study, in scene units around the robot base. Not calibration data.
 const spatial=new THREE.Group();scene.add(spatial);
 const sensor=[-.43,.78,.23],region=[-.50,.18,.18];
 const corners=[[-.66,.18,.04],[-.34,.18,.04],[-.34,.18,.32],[-.66,.18,.32]];
 function segments(pairs,color){
  const geometry=new THREE.BufferGeometry().setFromPoints(pairs.flat().map(v=>new THREE.Vector3(...v)));
  const line=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color,transparent:true,opacity:.55,depthWrite:false}));
  spatial.add(line);return line;
 }
 const volume=segments(corners.map(c=>[sensor,c]),0x89937b);
 const regionLine=segments(corners.map((c,i)=>[c,corners[(i+1)%4]]),0xbc4d24);
 const frame=segments([[[0,.012,0],[.42,.012,0]],[[0,.012,0],[0,.012,.36]],[[0,.012,0],[0,.28,0]],
  [[-.66,.012,-.12],[-.66,.012,.36]],[[-.66,.012,.36],[.46,.012,.36]]],0x9da48e);
 const viewpoint=segments([[sensor,[-.34,.78,.23]],[sensor,[-.43,.87,.23]],[sensor,[-.43,.78,.32]]],0x89937b);
 // Final connections inhabit this same world and can pass behind the real robot.
 const loopPaths=[0x7d8875,0xbc4d24,0xbc4d24,0x7d8875].map(color=>{
  const geometry=new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(new Float32Array(65*3),3));
  const line=new THREE.Line(geometry,new THREE.LineBasicMaterial({color,transparent:true,opacity:0,depthTest:true,depthWrite:false}));
  line.visible=false;spatial.add(line);return line;
 });
 setRendering(polished);
 const curve=new THREE.CubicBezierCurve3(),curvePoint=new THREE.Vector3(),localTip=new THREE.Vector3();
 let loopFingerprint=[],spatialFingerprint=[];
 function worldPath(index,controls,progress,opacity){
  const line=loopPaths[index];line.visible=opacity>0&&progress>0;
  if(!line.visible)return;
  [curve.v0,curve.v1,curve.v2,curve.v3].forEach((v,i)=>v.fromArray(controls[i]));
  const position=line.geometry.attributes.position;
  for(let i=0;i<=64;i++){curve.getPoint((i/64)*progress,curvePoint);position.setXYZ(i,curvePoint.x,curvePoint.y,curvePoint.z);}
  position.needsUpdate=true;line.geometry.setDrawRange(0,65);
  line.geometry.computeBoundingSphere();line.material.opacity=opacity;
  loopFingerprint.push(progress,line.material.opacity,...[0,32,64].flatMap(i=>[position.getX(i),position.getY(i),position.getZ(i)]));
 }

 const loadMs=performance.now()-started;
 const chapters=Array.from(document.querySelectorAll('.chapter'));
 const name=$('identity').querySelector('h1'),heroCopy=$('identity').querySelector('.hero-copy');
 const savedStyles=new Map(chapters.map(el=>[el,el.getAttribute('style')]));
 let active='identity',firstFrameMs=0;
 let fpsSample=null;
 gsap.registerPlugin(ScrollTrigger);

 function schedule(){
  if(!queued&&!disposed&&!document.hidden){queued=true;requestAnimationFrame(draw);}
 }
 function apply(){
  robot.position.set(state.x,state.y,0);robot.scale.setScalar(.001*state.scale);robot.rotation.y=state.ry;
  joints.forEach((joint,i)=>joint.quaternion.copy(rest[i]).multiply(q.setFromAxisAngle(axes[i],state['j'+(i+1)])));
  camera.position.set(state.cx,state.cy,state.cz);target.set(state.tx,state.ty,state.tz);
  if(!mode){camera.position.set(1.4,1.1,2.3);target.set(.25,.54,0);robot.position.x=.25;robot.scale.setScalar(.001);}
  contact.position.copy(robot.position);contact.position.y-=.0002;contact.rotation.z=state.ry;contact.scale.setScalar(mode?state.scale:1);
  spatial.position.copy(robot.position);spatial.rotation.y=state.ry;spatial.scale.setScalar(state.space);
  spatial.visible=mode&&state.p>.12;
  camera.lookAt(target);camera.updateMatrixWorld();scene.updateMatrixWorld(true);
  if(mode){
   const p=state.p,offset=clamp(scrollY-($('story').getBoundingClientRect().top+scrollY),0,trigger?trigger.end-trigger.start:0);
   const copy=copyAt(p),contract=ramp(p,0,.18),quiet=editorialAt(p);
   active=chapters[copy.index].id;
   const type=$('shot-type'),word=type.firstElementChild;
   type.dataset.shot=active;type.style.visibility=copy.index?'visible':'hidden';
   const systemTitle=copy.index===4&&p>=.90;
   word.textContent=systemTitle?'AI FOR SCIENCE':['','AGENT','PERCEPTION','EXECUTION','FEEDBACK'][copy.index];
   type.dataset.title=systemTitle?'system':'';
   $('visual').classList.toggle('payoff',p>.76);
   type.style.clipPath='inset('+((1-copy.enter)*100)+'% 0 '+(copy.exit*100)+'% 0)';
   if(copy.index===4){const enter=systemTitle?1-Math.pow(1-ramp(p,.94,.98),3):copy.enter;type.style.clipPath='inset('+((1-enter)*100)+'% 0 '+(systemTitle?0:100*ramp(p,.82,.89))+'% 0)';}
   const lateral=active==='perception'?-1:1;
   word.style.transform='translate('+lateral*((1-copy.enter)*110-copy.exit*95)+'px,'+((1-copy.enter)*35-copy.exit*45)+'px)';
   chapters.forEach((el,i)=>{
    el.style.top=offset+'px';el.style.opacity=1;
    if(i===0){
     el.style.visibility='visible';el.inert=false;el.removeAttribute('aria-hidden');
     name.style.transform='translateY('+(-Math.min(innerHeight*.09,innerHeight*.22-100)*contract)+'px) scale('+(1-.84*contract)+')';
     heroCopy.style.clipPath='inset(0 0 '+(100*ramp(p,.045,.135))+'% 0)';
     heroCopy.style.transform='translateY('+(-28*ramp(p,0,.135))+'px)';
     heroCopy.inert=p>=.135;heroCopy.setAttribute('aria-hidden',p>=.135);
    }else{
     const shown=i===copy.index;
     el.style.visibility=shown?'visible':'hidden';el.style.opacity=1-quiet;
     el.inert=!shown||quiet===1;el.setAttribute('aria-hidden',el.inert);
     el.style.clipPath='inset('+((1-copy.enter)*100)+'% 0 '+(copy.exit*100)+'% 0)';
     el.style.transform='translateY('+((1-copy.enter)*28-copy.exit*28)+'px)';
    }
   });
   updateWorld(p);
   $('phase').textContent=['ADRIAN / AI FOR SCIENCE','01 / AGENT','02 / PERCEPTION','03 / EXECUTION','04 / DATA FEEDBACK'][copy.index];
   $('progress').textContent=String(Math.round(p*100)).padStart(3,'0')+'%';$('progress-fill').style.width=p*100+'%';
  }
  $('visual').dataset.state=JSON.stringify({p:state.p,scrollY,active,mode:mode?'desktop':'flow',camera:camera.position.toArray(),target:target.toArray(),robot:robot.position.toArray(),scale:state.scale,nameContract:ramp(state.p,0,.18),joints:joints.map((_,i)=>state['j'+(i+1)]),canvasCount:document.querySelectorAll('canvas').length,object:robot.uuid,spatial:spatialFingerprint,loop:loopFingerprint,loopClosed:state.p>=.94});
 }
 function updateWorld(p){
  const rect=$('visual').getBoundingClientRect(),w=rect.width,h=rect.height;
  const reveal=ramp(p,.28,.43),resolve=ramp(p,.79,.96),inspection=ramp(p,.56,.63)*(1-ramp(p,.77,.86)),quiet=editorialAt(p);
  // All anchors share the robot's base transform and the actual camera projection.
  const project=v=>{point.set(...v).applyMatrix4(spatial.matrixWorld).project(camera);return[(point.x*.5+.5)*w,(-point.y*.5+.5)*h];};
  const settle=ramp(p,.76,.94),goalLocal=[-.70-.10*settle,.77-.21*settle,.15-.40*settle];
  const senseLocal=[sensor[0],sensor[1]-.36*settle,sensor[2]];
  const goal=project(goalLocal),plan=project([-.48,.58,.10]);
  const view=project(senseLocal),regionPoint=project(region),base=project([0,0,0]);
  const expand=ramp(p,.76,.90),outputLocal=[.25+.13*expand,.025+.095*expand,.48+.20*expand];
  const output=project(outputLocal),returnPoint=project([-.76,.44,.38]);
  joints[5].getWorldPosition(point).project(camera);
  const tip=[(point.x*.5+.5)*w,(-point.y*.5+.5)*h];
  spatialFingerprint=[goal,plan,view,regionPoint,base,output,tip].flat();
  function label(id,xy,dx,dy,amount){
   const el=$(id);el.style.left=clamp(xy[0]+dx,w*.08,w*.86)+'px';el.style.top=clamp(xy[1]+dy,id==='planning'?h*(p>.76?.34:.43):h*.19,h*.88)+'px';
   el.style.opacity=amount;el.style.transform='translateY('+(1-amount)*8+'px)';
  }
  const intent=ramp(p,.10,.19);
  label('planning',goal,-5,-15,resolve);
  label('field',regionPoint,-115,30,resolve);
  label('execution-node',base,32,-32,ramp(p,.79,.86));
  label('feedback-node',output,-65,12,resolve);
  const senseEnd=[tip[0]+(view[0]-tip[0])*reveal,tip[1]+(view[1]-tip[1])*reveal];
  drawLink('planning-trace','M '+goal+' Q '+plan+' '+tip,ramp(p,.12,.30));
  $('planning-trace').style.opacity=intent*(1-reveal)*.65;
  drawLink('agent-perception','M '+goal+' Q '+returnPoint+' '+senseEnd,reveal);
  $('agent-perception').style.opacity=reveal*resolve*.65;
  drawLink('perception-execution','M '+regionPoint+' Q '+[regionPoint[0]+40,tip[1]+60]+' '+tip,ramp(p,.40,.65));
  drawLink('execution-feedback','M '+base+' C '+[base[0],output[1]]+' '+[output[0]+80,output[1]]+' '+output,ramp(p,.79,.92));
  drawLink('feedback-agent','M '+output+' C '+[returnPoint[0],output[1]]+' '+returnPoint+' '+goal,ramp(p,.87,1));
  corners.forEach((c,i)=>{volume.geometry.attributes.position.setXYZ(i*2,...senseLocal);volume.geometry.attributes.position.setXYZ(i*2+1,...c.map((v,k)=>senseLocal[k]+(v-senseLocal[k])*reveal));});
  viewpoint.position.y=senseLocal[1]-sensor[1];
  volume.geometry.attributes.position.needsUpdate=true;volume.material.opacity=.38*(1-.72*resolve)*(1-.75*inspection);
  regionLine.material.opacity=.65*reveal*(1-.5*resolve);
  frame.material.opacity=.22*ramp(p,.28,.43);viewpoint.material.opacity=.40*reveal*(1-resolve);
  const dot=$('action-point');dot.setAttribute('cx',tip[0]);dot.setAttribute('cy',tip[1]);dot.style.opacity=ramp(p,.16,.28)*(1-quiet)*(1-.5*resolve);
  $('concept-note').style.opacity=intent;
  document.querySelector('.object-caption').style.opacity=(1-ramp(p,.20,.38))*(1-quiet);
  $('release-rule').style.transform='scaleY('+ramp(p,.95,1)+')';
  loopFingerprint=[];loopPaths.forEach(line=>{line.visible=false;});
  if((polished||benchmark?.paired)&&p<=.76){
   joints[5].getWorldPosition(localTip);spatial.worldToLocal(localTip);
   const tip3=localTip.toArray();
   worldPath(1,[region,[-.4,.32,.34],[tip3[0]-.12,tip3[1]-.06,tip3[2]+.12],tip3],ramp(p,.40,.65),.72);
   $('perception-execution').style.opacity=0;
  }
  if(p>.76){
   const lift=ramp(p,.76,.82),secondary=1-.6*ramp(p,.76,.92);
   joints[5].getWorldPosition(localTip);spatial.worldToLocal(localTip);
   const tip3=localTip.toArray();
   worldPath(0,[goalLocal,[-.82,.59,-.48],[-.59,.57,-.33],senseLocal],ramp(p,.79,.86),.55*lift*(1-.35*resolve));
   worldPath(1,[region,[-.4,.32,.34],[tip3[0]-.12,tip3[1]-.06,tip3[2]+.12],tip3],1,.72*(polished?secondary:lift));
   worldPath(2,[tip3,[tip3[0]+.30,tip3[1]+.04,tip3[2]+.20],[.52,.12,.58],outputLocal],ramp(p,.80,.89),.70*lift*secondary);
   worldPath(3,[outputLocal,[-.10,.07,1.0],[-.94,.15,.75],goalLocal],ramp(p,.86,.94),.55*lift*(1-.35*resolve));
   for(const id of ['agent-perception','perception-execution','execution-feedback','feedback-agent'])$(id).style.opacity*=1-lift;
   if(polished)$('perception-execution').style.opacity=0;
   volume.material.opacity=.38*(1-.28*resolve)*(1-.75*inspection);
  }
  // A quiet editorial beat inside the same moving world; disclosures remain visible.
  for(const line of [volume,regionLine,frame,viewpoint])line.material.opacity*=1-quiet;
  $('planning-trace').style.opacity*=1-quiet;
 }
 function drawLink(id,path,progress){
  const el=$(id);el.setAttribute('d',path);el.setAttribute('pathLength','1');
  el.style.strokeDasharray='1';el.style.strokeDashoffset=1-progress;el.style.opacity=progress>0?1:0;
  el.setAttribute('marker-end',progress>.99?'url(#flow-arrow)':'');
 }
 function stopBenchmark(){
  benchmark?.pending.forEach(({query})=>gl.deleteQuery(query));
  benchmark=null;$('benchmark').disabled=false;setRendering(polished);
 }
 function measuredRender(sample,variant,pair){
  let query;
  if(sample&&gpuTimer&&!sample.disjoint){query=gl.createQuery();if(query)gl.beginQuery(gpuTimer.TIME_ELAPSED_EXT,query);}
  const before=sample?.paired?performance.now():0;
  try{renderer.render(scene,camera);renderCount++;}
  finally{
   const cpuMs=sample?.paired?performance.now()-before:0;
   if(query){
    if(!gl.isContextLost())gl.endQuery(gpuTimer.TIME_ELAPSED_EXT);
    if(sample===benchmark)sample.pending.push({query,variant,pair});else gl.deleteQuery(query);
   }
   if(sample?.paired){const result=sample.variants[variant];result.cpu.push(cpuMs);result.drawCalls=renderer.info.render.calls;result.triangles=renderer.info.render.triangles;}
  }
 }
 function draw(time){
  queued=false;if(disposed||document.hidden)return;
  const before=performance.now(),sample=benchmark;apply();
  if(sample&&gpuTimer){
   const disjoint=gl.getParameter(gpuTimer.GPU_DISJOINT_EXT);
   sample.pending=sample.pending.filter(({query,variant,pair})=>{
    if(disjoint||gl.getQueryParameter(query,gl.QUERY_RESULT_AVAILABLE)){
     if(!disjoint&&!sample.disjoint){
      const ms=gl.getQueryParameter(query,gl.QUERY_RESULT)/1e6;
      if(pair){
       pair[variant]=ms;
       if(Number.isFinite(pair.G)&&Number.isFinite(pair.I))for(const key of ['G','I'])sample.variants[key].gpu.push(pair[key]);
      }else sample.gpu.push(ms);
     }
     gl.deleteQuery(query);return false;
    }return true;
   });
   if(disjoint){sample.gpu=[];for(const value of Object.values(sample.variants))value.gpu=[];sample.disjoint=true;}
  }
  try{
   if(sample?.paired){
    const pair={},order=sample.frames.length%2?['I','G']:['G','I'];
    for(const variant of order){setRendering(variant==='I');measuredRender(sample,variant,pair);}
    // Counterbalance cache/order effects; the optional untimed redraw keeps I on screen.
    if(order[1]==='G'){setRendering(true);measuredRender(null);}
   }else measuredRender(sample);
  }catch(error){stopBenchmark();throw error;}
  if(disposed)return;
  if(!firstFrameMs){firstFrameMs=performance.now()-started;metrics();}
  if(benchmark){
   if(benchmark.last)benchmark.frames.push(time-benchmark.last);
   benchmark.last=time;benchmark.cpu.push(performance.now()-before);
   if(time-benchmark.start<5000)schedule();
   else{
    const percentile=(values,p)=>[...values].sort((a,b)=>a-b)[Math.floor((values.length-1)*p)];
    fpsSample={paired:benchmark.paired,fps:+(benchmark.frames.length*1000/benchmark.frames.reduce((a,b)=>a+b,0)).toFixed(1),frameP95Ms:percentile(benchmark.frames,.95),gpuDisjoint:benchmark.disjoint,viewport:benchmark.viewport};
    const result=value=>({cpuMedianMs:percentile(value.cpu,.5),cpuP95Ms:percentile(value.cpu,.95),gpuMedianMs:!benchmark.disjoint&&value.gpu.length?percentile(value.gpu,.5):null,gpuP95Ms:!benchmark.disjoint&&value.gpu.length?percentile(value.gpu,.95):null,gpuSamples:value.gpu.length});
    if(benchmark.paired){
     fpsSample.scope='Alternating G-lighting-control/I order in one rAF/context/pose; GPU samples require both queries. CPU measures renderer.render submission only. An untimed I redraw follows I/G pairs. Paired FPS is not production FPS.';
     fpsSample.variants=Object.fromEntries(Object.entries(benchmark.variants).map(([key,value])=>[key,{...result(value),cpuSamples:value.cpu.length,drawCalls:value.drawCalls,triangles:value.triangles}]));
    }else Object.assign(fpsSample,result(benchmark));
    const restoreFrame=benchmark.paired&&!polished;stopBenchmark();metrics();if(restoreFrame)schedule();
   }
  }
 }
 function metrics(extra={}){
  const value={loadMs:+loadMs.toFixed(1),firstFrameMs:+firstFrameMs.toFixed(1),modelBytes:3564832,triangles:renderer.info.render.triangles,drawCalls:renderer.info.render.calls,viewport:[innerWidth,innerHeight],dpr:renderer.getPixelRatio(),rendering:{variant:polished?'I':'G-lighting-control',fov:camera.fov,exposure:renderer.toneMappingExposure,environmentIntensity:scene.environmentIntensity,contact:polished?'illustrative base contact':'none',materials:[...materials].map(m=>({name:m.name,roughness:m.roughness,metalness:m.metalness,color:m.color?.getHexString()}))},scrollDistance:trigger?trigger.end-trigger.start:0,renderCount,fpsSample,...extra};
  $('metrics').textContent=JSON.stringify(value,null,2);
 }
 function resize(){
  const rect=$('visual').getBoundingClientRect();if(!rect.width||!rect.height)return;
  renderer.setPixelRatio(Math.min(devicePixelRatio,mode?1.5:1.25));renderer.setSize(rect.width,rect.height);camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();schedule();
 }
 function clearChapters(){
  name.removeAttribute('style');heroCopy.removeAttribute('style');heroCopy.inert=false;heroCopy.removeAttribute('aria-hidden');
  chapters.forEach(el=>{const style=savedStyles.get(el);if(style===null)el.removeAttribute('style');else el.setAttribute('style',style);el.inert=false;el.removeAttribute('aria-hidden');});
 }
 function configure(){
  if(disposed)return;
  trigger?.kill();timeline?.kill();trigger=null;timeline=null;
  mode=desktop.matches&&!preference.matches&&!reading&&params.get('test')!=='reduced-motion';
  document.body.classList.toggle('desktop-stage',mode);
  clearChapters();Object.assign(state,KEYFRAMES[0]);
  if(mode){
   timeline=gsap.timeline({paused:true,defaults:{ease:'none'},onUpdate:schedule});
   for(let i=1;i<KEYFRAMES.length;i++){
    const a=KEYFRAMES[i-1],b=KEYFRAMES[i],duration=b.p-a.p;
    for(const keys of [['p'],['cx','cy','cz','tx','ty','tz'],['x','y','ry','j1','j2','j3','j4','j5','j6'],['scale','space']])
     timeline.to(state,{...Object.fromEntries(keys.map(k=>[k,b[k]])),duration,ease:curveFor(keys[0],i)},a.p);
   }
   trigger=ScrollTrigger.create({trigger:'#story',start:'top top',end:'bottom bottom',scrub:true,animation:timeline,invalidateOnRefresh:true});
   ScrollTrigger.refresh();
  }
  $('enhancement-status').textContent=mode?'CR5AF / 已获 Dobot 客服许可用于本项目展示':'静态 3D 视图 / 正文按普通文流阅读';
  resize();metrics();
 }
 preference.addEventListener('change',configure);desktop.addEventListener('change',configure);
 addEventListener('resize',resize);document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();});
 const sizeObserver=new ResizeObserver(resize);sizeObserver.observe($('visual'));
 renderer.domElement.addEventListener('webglcontextlost',event=>{
  event.preventDefault();stopBenchmark();
  sizeObserver.disconnect();
  disposed=true;trigger?.kill();timeline?.kill();clearChapters();
  document.body.classList.remove('enhanced','desktop-stage');renderer.domElement.remove();
  $('enhancement-status').textContent='3D 上下文已丢失，已恢复完整静态阅读。';$('motion-toggle').hidden=true;
 });
 $('audit').addEventListener('click',()=>{
  if(!timeline){metrics({audit:'普通文流模式，无滚动绑定'});return;}
  const saved=timeline.progress(),fingerprints=[],screens=[];let reverseError=0,pureError=0,minPx=Infinity,maxMainStatements=0,finiteLoop=true;
  const fingerprint=()=>[...camera.position.toArray(),...target.toArray(),...robot.position.toArray(),state.scale,...joints.flatMap(j=>j.quaternion.toArray()),...spatialFingerprint,...loopFingerprint];
  for(let i=0;i<=100;i++){
   timeline.progress(i/100);apply();fingerprints.push(fingerprint());
   finiteLoop=finiteLoop&&loopFingerprint.every(Number.isFinite);
   Object.entries(stateAt(i/100)).forEach(([k,v])=>pureError=Math.max(pureError,Math.abs(state[k]-v)));
   maxMainStatements=Math.max(maxMainStatements,chapters.slice(1).filter(el=>el.style.visibility==='visible').length);
   screens.push(joints.map(j=>{j.getWorldPosition(point).project(camera);return[(point.x*.5+.5)*innerWidth,(-point.y*.5+.5)*innerHeight];}));
  }
  for(let i=100;i>=0;i--){timeline.progress(i/100);apply();const actual=fingerprint();if(actual.length!==fingerprints[i].length)reverseError=Infinity;actual.forEach((v,k)=>reverseError=Math.max(reverseError,Math.abs(v-fingerprints[i][k])));}
  for(let i=1;i<screens.length;i++)minPx=Math.min(minPx,Math.max(...screens[i].map((v,k)=>Math.hypot(v[0]-screens[i-1][k][0],v[1]-screens[i-1][k][1]))));
  timeline.progress(saved);apply();schedule();metrics({audit:{samples:101,reverseError,pureError,finiteLoop,maxMainStatements,minLargestJointMovementPxPer1Percent:minPx,pass:finiteLoop&&reverseError<1e-6&&pureError<1e-5&&minPx>0&&maxMainStatements===1}});
 });
 $('benchmark').addEventListener('click',()=>{
  benchmark={start:performance.now(),last:0,frames:[],cpu:[],gpu:[],pending:[],disjoint:false,paired:params.has('qa')&&params.get('compare')==='1',variants:{G:{cpu:[],gpu:[]},I:{cpu:[],gpu:[]}},viewport:[innerWidth,innerHeight]};$('benchmark').disabled=true;schedule();
 });
 // Only enable the enhanced layout after a real model has rendered successfully.
 renderer.setSize(innerWidth,innerHeight);robot.scale.setScalar(.001);camera.position.set(1.65,1.12,2.02);camera.lookAt(0,.5,0);renderer.render(scene,camera);
 $('canvas-host').appendChild(renderer.domElement);document.body.classList.add('enhanced');configure();
 return{
  scrollPosition(id){return !disposed&&mode&&trigger&&Object.hasOwn(CHAPTER_PROGRESS,id)?trigger.start+CHAPTER_PROGRESS[id]*(trigger.end-trigger.start):null;},
  setReading(value){const id=active;reading=value;configure();if(value)requestAnimationFrame(()=>$(id).scrollIntoView({block:'start',behavior:'instant'}));}
 };
}
