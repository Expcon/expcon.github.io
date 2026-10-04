import './algorithm-visual.js';

const WIDTH=1600,HEIGHT=850,MAX_HEIGHT=1000,STEPS=240,MAX_OPACITY=.72,FADE=.025;
const FRAME_MS=1000/30,MAX_DELTA_MS=100,PLAY_MS=8000,HOLD_MS=1400,FADE_OUT_MS=220,FADE_IN_MS=320;
const clamp=value=>Math.max(0,Math.min(1,value));
const smooth=value=>{const t=clamp(value);return t*t*(3-2*t)};
let tracePromise;

// The trace file is shared by every instance and is never requested by an
// initially disabled reading/mobile stage. A failed load stays optional.
function loadTraces(){
 if(!tracePromise)tracePromise=(async()=>{
  try{
   const response=await fetch(new URL('./algorithm-traces.json',import.meta.url));
   if(!response.ok)return null;
   const data=await response.json();
   return ['handEye','bundleAdjustment','visualServo'].every(key=>Array.isArray(data?.[key]?.states)&&data[key].states.length>0)?data:null;
  }catch{return null}
 })();
 return tracePromise;
}

export function algorithmSceneAt(value){
 const p=clamp(Number.isFinite(value)?value:0);
 const [mode,start,end]=p<.355?['hand',0,.355]:p<.585?['ba',.355,.585]:['servo',.585,1];
 const progress=Math.round(clamp((p-start)/(end-start))*STEPS)/STEPS;
 const fadeIn=start===0?1:smooth((p-start)/FADE);
 const fadeOut=end===1?1:smooth((end-p)/FADE);
 return {mode,progress,opacity:MAX_OPACITY*Math.min(fadeIn,fadeOut)};
}

// SVG pathLength reveals by arc length, not by Bézier parameter. Sample the
// existing projected controls, then trim the polyline to the same visible length.
// This is presentation geometry only; computed algorithm traces are untouched.
export function visibleCurvePoints(controls,progress){
 if(!Array.isArray(controls)||controls.length<2||controls.length>4||!controls.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)))return [];
 const amount=clamp(Number.isFinite(progress)?progress:0);if(!amount)return [];
 const points=Array.from({length:65},(_,i)=>{
  let level=controls.map(p=>[...p]),t=i/64;
  while(level.length>1)level=level.slice(1).map((p,k)=>p.map((n,j)=>level[k][j]*(1-t)+n*t));
  return level[0];
 });
 if(amount===1)return points;
 const lengths=points.slice(1).map((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1]));
 let remaining=lengths.reduce((sum,n)=>sum+n,0)*amount,result=[points[0]];
 for(let i=0;i<lengths.length;i++){
  if(remaining>=lengths[i]){result.push(points[i+1]);remaining-=lengths[i];continue}
  const t=lengths[i]?remaining/lengths[i]:0;
  result.push(points[i].map((n,j)=>n+(points[i+1][j]-n)*t));break;
 }
 return result;
}

export function createAlgorithmBackdrop({host,requestRender}){
 const doc=host?.ownerDocument||globalThis.document;
 const annotation=host?.nextElementSibling?.classList?.contains('algorithm-disclosure')?host.nextElementSibling:null;
 if(annotation)annotation.style.opacity='0';
 let enabled=false,disposed=false,failed=false,loading=false,inView=true;
 let data=null,canvas=null,ctx=null,renderer=null,observer=null,watchVersion=0;
 let width=0,height=0,lastFrame='',lastOpacity=-1,wasHidden=!!doc?.hidden;
 let displayed=null,target=null,playTime=0,phase='play',phaseTime=0,phaseStart=1,alpha=1,loopReset=false;
 let frameId=null,clockVersion=0,lastTick=null;
 let foreground=null,foregroundKey='',foregroundVersion=0;
 let studyCanvas=null,studyContext=null,lastComposite='';

 // This is the only autoplay clock. It paints Canvas2D directly and never
 // asks the owner to rerender its stationary robot or advance its timeline.
 function stopClock(){
  clockVersion++;
  if(frameId!==null)globalThis.cancelAnimationFrame(frameId);
  frameId=null;lastTick=null;
 }
 function queueFrame(){
  if(frameId!==null||!canDraw()||!observer||!canvas||!displayed)return;
  const version=clockVersion;
  frameId=globalThis.requestAnimationFrame(time=>{
   if(version!==clockVersion)return;
   frameId=null;
   if(!canDraw()){stopClock();return}
   if(lastTick===null)lastTick=time;
   const elapsed=time-lastTick;
   if(elapsed+1e-7>=FRAME_MS){
    lastTick=time;advance(Math.min(MAX_DELTA_MS,Math.max(0,elapsed)));paint();
   }
   queueFrame();
  });
 }
 function startClock(){
  if(frameId!==null||!canDraw()||!canvas)return;
  lastTick=globalThis.performance.now();queueFrame();
 }
 function fade(next,reset=false){
  phase=next;phaseTime=0;phaseStart=alpha;loopReset=reset;
 }
 function select(mode){
  target=mode;
  if(!displayed||!observer||(!canvas&&displayed!==target)){
   if(displayed!==target)playTime=0;
   displayed=target;phase='play';phaseTime=0;alpha=1;loopReset=false;
  }else if(displayed!==target){
   if(phase!=='out')fade('out');
  }else if(phase==='out'&&!loopReset){
   // Reversing before the switch restores the same outgoing study smoothly.
   fade('in');
  }
 }
 function advance(delta){
  if(phase==='out'||phase==='in'){
   phaseTime+=delta;
   const duration=phase==='out'?FADE_OUT_MS:FADE_IN_MS;
   const amount=smooth(phaseTime/duration);
   alpha=phase==='out'?phaseStart*(1-amount):phaseStart+(1-phaseStart)*amount;
   if(phaseTime>=duration){
    if(phase==='out'){
     // Paint the first state while fully invisible. Both stage switches and
     // loop resets then reveal forward-only trace playback, never a rewind.
     setOpacity(0);displayed=target;playTime=0;alpha=0;fade('in');
    }else{phase='play';phaseTime=0;alpha=1}
   }
  }else{
   playTime=Math.min(PLAY_MS+HOLD_MS,playTime+delta);
   if(playTime===PLAY_MS+HOLD_MS)fade('out',true);
  }
 }

 function setOpacity(value){
  if(canvas&&lastOpacity!==value){canvas.style.opacity=String(value);lastOpacity=value}
  if(annotation){const alpha=String(value/MAX_OPACITY);if(annotation.style.opacity!==alpha)annotation.style.opacity=alpha}
 }
 function canDraw(){return enabled&&!disposed&&!failed&&inView&&!doc?.hidden}
 function request(){if(data&&canDraw())requestRender?.()}
 function visibilityChanged(){
  const hidden=!!doc?.hidden,reentered=wasHidden&&!hidden;wasHidden=hidden;
  if(hidden)stopClock();
  if(reentered)request();
 }
 function stopWatching(){
  stopClock();watchVersion++;
  observer?.disconnect();observer=null;
  doc?.removeEventListener('visibilitychange',visibilityChanged);
 }
 function startWatching(){
  // Without visibility observation, keep a static diagram that still follows
  // stage selection instead of running decorative work offscreen indefinitely.
  inView=true;wasHidden=!!doc?.hidden;
  doc?.addEventListener('visibilitychange',visibilityChanged);
  const version=++watchVersion;
  if(typeof globalThis.IntersectionObserver!=='function')return;
  try{
   observer=new globalThis.IntersectionObserver(entries=>{
    if(version!==watchVersion||!enabled||disposed)return;
    const entry=entries.find(item=>item.target===host);
    if(!entry)return;
    const reentered=!inView&&entry.isIntersecting;inView=!!entry.isIntersecting;
    if(!inView)stopClock();
    if(reentered)request();
   });
   observer.observe(host);
  }catch{
   watchVersion++;observer?.disconnect();observer=null;inView=true;
  }
 }
 function releaseCanvas(){
  setOpacity(0);canvas?.remove();canvas=null;ctx=null;renderer=null;lastFrame='';lastOpacity=-1;
  if(studyCanvas){studyCanvas.width=1;studyCanvas.height=1}
  studyCanvas=null;studyContext=null;lastComposite='';
 }
 function fail(){
  failed=true;stopWatching();setOpacity(0);releaseCanvas();
 }
 function prepareCanvas(){
  if(canvas)return true;
  try{
   const visual=globalThis.AlgorithmVisual;
   if(!host||!doc||!visual?.CanvasRenderer||!visual?.renderFrame){fail();return false}
   canvas=doc.createElement('canvas');
   canvas.className='algorithm-backdrop-canvas';canvas.setAttribute('aria-hidden','true');
   ctx=canvas.getContext('2d');
   if(!ctx){fail();return false}
   canvas.width=width;canvas.height=height;setOpacity(0);
   renderer=makeRenderer(ctx);
   host.appendChild(canvas);return true;
  }catch{fail();return false}
 }
 function makeRenderer(context){
  const renderer=new globalThis.AlgorithmVisual.CanvasRenderer(context),circle=renderer.circle.bind(renderer);
  // Only the approved renderer's optional decorative dot grid is omitted.
  renderer.circle=(x,y,r,color,alpha=1,stroke=null)=>{if(r<1&&alpha<=.1)return;circle(x,y,r,color,alpha,stroke)};
  return renderer;
 }
 function prepareStudyCache(){
  if(studyCanvas||(!foreground?.paths.length&&!foreground?.tip))return;
  // A detached Canvas2D raster keeps the costly computed study at its original
  // 30 Hz budget. Only copying that raster and cutting foreground corridors
  // follows scroll; the DOM still contains exactly one backdrop canvas.
  studyCanvas=doc.createElement('canvas');studyCanvas.width=width;studyCanvas.height=height;
  studyContext=studyCanvas.getContext('2d');
  if(!studyContext)throw Error('Study cache context unavailable');
  renderer=makeRenderer(studyContext);lastFrame='';lastComposite='';
 }
 function setEnabled(value){
  if(disposed)return;
  const next=!!value;if(enabled===next)return;
  enabled=next;
  // Mode switches release the extra canvas so mobile's broad style cleanup
  // and existing canvas count never encounter a retained desktop backdrop.
  if(!enabled){stopWatching();setOpacity(0);releaseCanvas();return}
  // Mobile cleanup removes inline styles; hide stale explanatory text until
  // this desktop mode has successfully painted, including failed backdrops.
  setOpacity(0);
  if(failed)return;
  startWatching();
  if(data){request();return}
  if(loading)return;
  loading=true;
  loadTraces().then(result=>{
   loading=false;if(disposed)return;
   data=result;
   if(!data){fail();return}
   request();
  });
 }
 function resize(cssWidth,cssHeight,devicePixelRatio){
  if(disposed||![cssWidth,cssHeight].every(value=>Number.isFinite(value)&&value>0))return;
  const dpr=Number.isFinite(devicePixelRatio)&&devicePixelRatio>0?Math.min(1,devicePixelRatio):1;
  const scale=Math.min(dpr,WIDTH/cssWidth,MAX_HEIGHT/cssHeight);
  const nextWidth=Math.max(1,Math.floor(cssWidth*scale)),nextHeight=Math.max(1,Math.floor(cssHeight*scale));
  if(nextWidth===width&&nextHeight===height)return;
  width=nextWidth;height=nextHeight;lastFrame='';lastComposite='';
  if(canvas){canvas.width=width;canvas.height=height}
  if(studyCanvas){studyCanvas.width=width;studyCanvas.height=height}
 }
 // Coordinates come from the robot's measured viewport and actual projection.
 // No DOM measurements, second animation clock, path relocation, or new study data.
 function setForeground(value){
  if(disposed||!value||![value.width,value.height].every(n=>Number.isFinite(n)&&n>0))return;
  const valid=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite);
  const paths=(value.paths||[]).filter(path=>Array.isArray(path.points)&&path.points.length>1&&path.points.every(valid)&&Number.isFinite(path.opacity)&&path.opacity>0)
   .map(path=>({points:path.points.map(p=>[...p]),opacity:clamp(path.opacity*5)}));
  const tip=valid(value.tip?.point)&&Number.isFinite(value.tip?.opacity)&&value.tip.opacity>0?{point:[...value.tip.point],opacity:clamp(value.tip.opacity*5)}:null;
  const next={width:value.width,height:value.height,paths,tip};
  const key=JSON.stringify(next,(_,n)=>typeof n==='number'?Math.round(n*100)/100:n);
  if(key===foregroundKey)return;
  foreground=next;foregroundKey=key;foregroundVersion++;
 }
 function maskForeground(){
  if(!foreground||(!foreground.paths.length&&!foreground.tip))return;
  ctx.save();
  ctx.setTransform(width/foreground.width,0,0,height/foreground.height,0,0);
  ctx.globalCompositeOperation='destination-out';ctx.strokeStyle='#000';ctx.fillStyle='#000';ctx.lineCap='round';ctx.lineJoin='round';
  // Four nested bands keep a fully clear center and a small feathered edge.
  // The large study remains visible everywhere beyond these narrow corridors.
  for(const path of foreground.paths){
   for(const [size,opacity] of [[56,.10],[42,.22],[28,.55],[18,1]]){
    ctx.globalAlpha=opacity*path.opacity;ctx.lineWidth=size;ctx.beginPath();
    path.points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.stroke();
   }
  }
  if(foreground.tip)for(const [radius,opacity] of [[52,.10],[44,.22],[36,.55],[28,1]]){
   ctx.globalAlpha=opacity*foreground.tip.opacity;ctx.beginPath();ctx.arc(...foreground.tip.point,radius,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
 }
 function paint(){
  if(!canDraw()||!data||!width||!height||!displayed)return;
  if(!prepareCanvas())return;
  const progress=Math.round(clamp(playTime/PLAY_MS)*STEPS)/STEPS;
  const key=`${displayed}:${Math.round(progress*STEPS)}:${width}:${height}`;
  try{
   prepareStudyCache();
   if(key!==lastFrame){
    const context=studyContext||ctx;
    context.setTransform(1,0,0,1,0,0);context.globalAlpha=1;context.globalCompositeOperation='source-over';
    context.fillStyle='#121716';context.fillRect(0,0,width,height);
    const scale=Math.min(width/WIDTH,height/HEIGHT);
    context.setTransform(scale,0,0,scale,(width-WIDTH*scale)/2,(height-HEIGHT*scale)/2);
    globalThis.AlgorithmVisual.renderFrame(renderer,data,displayed,progress,{background:true});
    lastFrame=key;if(host.dataset.study!==displayed)host.dataset.study=displayed;
   }
   const compositeKey=`${key}:${foregroundVersion}`;
   if(studyCanvas&&compositeKey!==lastComposite){
    ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
    ctx.clearRect(0,0,width,height);ctx.drawImage(studyCanvas,0,0);maskForeground();lastComposite=compositeKey;
   }
  }catch{fail();return}
  setOpacity(MAX_OPACITY*alpha);
 }
 function draw(p){
  if(disposed||failed)return;
  // Scroll chooses only the active study. Time owns playback within it, so
  // stationary, reverse and rapid scroll cannot replay solver states backward.
  select(algorithmSceneAt(p).mode);
  if(!canDraw()||!data||!width||!height)return;
  paint();startClock();
 }
 function dispose(){
  if(disposed)return;
  disposed=true;enabled=false;stopWatching();
  releaseCanvas();data=null;
 }
 return {setEnabled,resize,setForeground,draw,dispose};
}
