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

export function createAlgorithmBackdrop({host,requestRender}){
 const doc=host?.ownerDocument||globalThis.document;
 const annotation=host?.nextElementSibling?.classList?.contains('algorithm-disclosure')?host.nextElementSibling:null;
 if(annotation)annotation.style.opacity='0';
 let enabled=false,disposed=false,failed=false,loading=false,inView=true;
 let data=null,canvas=null,ctx=null,renderer=null,observer=null,watchVersion=0;
 let width=0,height=0,lastFrame='',lastOpacity=-1,wasHidden=!!doc?.hidden;
 let displayed=null,target=null,playTime=0,phase='play',phaseTime=0,phaseStart=1,alpha=1,loopReset=false;
 let frameId=null,clockVersion=0,lastTick=null;

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
   renderer=new visual.CanvasRenderer(ctx);
   const circle=renderer.circle.bind(renderer);
   // The approved renderer's optional dot grid is decorative; landmarks,
   // matrix blocks and every other geometry command remain unchanged.
   renderer.circle=(x,y,r,color,alpha=1,stroke=null)=>{
    if(r<1&&alpha<=.1)return;
    circle(x,y,r,color,alpha,stroke);
   };
   host.appendChild(canvas);return true;
  }catch{fail();return false}
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
  width=nextWidth;height=nextHeight;lastFrame='';
  if(canvas){canvas.width=width;canvas.height=height}
 }
 function paint(){
  if(!canDraw()||!data||!width||!height||!displayed)return;
  if(!prepareCanvas())return;
  const progress=Math.round(clamp(playTime/PLAY_MS)*STEPS)/STEPS;
  const key=`${displayed}:${Math.round(progress*STEPS)}:${width}:${height}`;
  if(key!==lastFrame){
   try{
    ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;
    ctx.fillStyle='#121716';ctx.fillRect(0,0,width,height);
    const scale=Math.min(width/WIDTH,height/HEIGHT);
    ctx.setTransform(scale,0,0,scale,(width-WIDTH*scale)/2,(height-HEIGHT*scale)/2);
    globalThis.AlgorithmVisual.renderFrame(renderer,data,displayed,progress,{background:true});
    lastFrame=key;if(host.dataset.study!==displayed)host.dataset.study=displayed;
   }catch{fail();return}
  }
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
 return {setEnabled,resize,draw,dispose};
}
