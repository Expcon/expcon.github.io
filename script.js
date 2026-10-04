// Core navigation works as native HTML even if all enhancement dependencies fail.
(() => {
 const button=document.getElementById('motion-toggle');
 const status=document.getElementById('enhancement-status');
 const params=new URLSearchParams(location.search);
 button.hidden=false;
 if(params.has('qa')) document.getElementById('study-controls').hidden=false;
 let controller;
 const preference=matchMedia('(prefers-reduced-motion: reduce)');
 // Independent of the 3D bundle: HTML stays visible until observation succeeds.
 const pageMotion=createPageMotion();
 function createPageMotion(){
  const targets=[...document.querySelectorAll('.section-intro h2,.section-intro>p,.project-row,.direction,.closing>h2,.closing-detail,.contact-email,.feedback-form')];
  const desktop=matchMedia('(min-width: 901px) and (min-height: 621px)');
  const shown=new Set(),pending=new Set();
  let observer=null,session=0,failed=false;
  const supported=typeof window.IntersectionObserver==='function'&&targets.length>0;
  function stop(){
   session++;
   const retired=observer;observer=null;
   try{retired?.disconnect();}catch{/* Visibility never depends on cleanup. */}
   pending.clear();
   document.body.classList.remove('page-motion');
   targets.forEach(node=>node.classList.remove('reveal-ready'));
  }
  function failOpen(){failed=true;stop();}
  function reveal(node){
   shown.add(node);node.classList.add('is-revealed');
   node.closest('section')?.classList.add('section-arrived');
   if(pending.delete(node))try{observer?.unobserve(node);}catch{failOpen();}
  }
  function revealTarget(target){
   if(!target||target===document.body||target===document.documentElement)return;
   targets.forEach(node=>{
    if(node.contains(target)||target.contains(node)){
     reveal(node);node.classList.remove('reveal-ready');
    }
   });
  }
  function refresh(){
   const enabled=supported&&!failed&&desktop.matches&&!preference.matches&&params.get('test')!=='reduced-motion'&&
    button.getAttribute('aria-pressed')!=='true'&&!document.body.classList.contains('reading-mode');
   if(!enabled){stop();return;}
   if(observer)return;
   const current=++session;
   try{
    observer=new window.IntersectionObserver(entries=>{
     if(current!==session)return;
     for(const entry of entries)if(entry.isIntersecting&&pending.has(entry.target))reveal(entry.target);
    },{threshold:.08,rootMargin:'0px 0px -24px 0px'});
    for(const node of targets){
     if(shown.has(node))continue;
     // Never conceal content that is already visible or has been passed.
     if(node.getBoundingClientRect().top<innerHeight){reveal(node);continue;}
     observer.observe(node);pending.add(node);node.classList.add('reveal-ready');
    }
    revealTarget(hashTarget());revealTarget(document.activeElement);
    if(!failed)document.body.classList.add('page-motion');
   }catch{failOpen();}
  }
  document.addEventListener('focusin',event=>revealTarget(event.target));
  desktop.addEventListener('change',refresh);preference.addEventListener('change',refresh);
  addEventListener('resize',refresh);
  refresh();
  return {refresh,revealTarget,get available(){return supported&&!failed;}};
 }
 let travel=null,arrival=0,destination=null,restoreOnEnhance=true;
 function cancelTravel(){travel?.kill();travel=null;destination=null;cancelAnimationFrame(arrival);arrival=0;}
 function interruptTravel(){restoreOnEnhance=false;cancelTravel();}
 function hashTarget(){try{return document.getElementById(decodeURIComponent(location.hash.slice(1)));}catch{return null;}}
 function navigate(target,animate=true){
  cancelTravel();if(!target)return;
  pageMotion.revealTarget(target);
  restoreOnEnhance=true;
  const top=controller?.scrollPosition(target.id)??(target.getBoundingClientRect().top+scrollY-(parseFloat(getComputedStyle(target).scrollMarginTop)||0));
  const end=Math.max(0,Math.min(top,document.documentElement.scrollHeight-innerHeight));
  const finish=()=>{
   travel=null;destination=null;window.ScrollTrigger?.update();
   arrival=requestAnimationFrame(()=>{arrival=0;target.focus({preventScroll:true});});
  };
  if(!animate||preference.matches||button.getAttribute('aria-pressed')==='true'||params.get('test')==='reduced-motion'||!window.gsap||Math.abs(end-scrollY)<1){
   scrollTo({top:end,behavior:'instant'});finish();return;
  }
  destination=target;
  const position={y:scrollY};
  travel=window.gsap.to(position,{y:end,duration:.7+.3*Math.min(Math.abs(end-scrollY)/(innerHeight*4),1),ease:'power2.inOut',
   onUpdate:()=>scrollTo({top:position.y,behavior:'instant'}),onComplete:finish});
 }
 document.addEventListener('click',event=>{
  const link=event.target.closest('a[href^="#"]');
  if(!link||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||link.hasAttribute('download')||link.getAttribute('target'))return;
  const hash=link.getAttribute('href');let target;
  try{target=document.getElementById(decodeURIComponent(hash.slice(1)));}catch{return;}
  if(!target)return;
  event.preventDefault();
  if(location.hash!==hash)history.pushState(null,'',hash);
  navigate(target,!link.classList.contains('skip-link'));
 });
 function restoreHash(){cancelTravel();arrival=requestAnimationFrame(()=>{arrival=0;navigate(hashTarget(),false);});}
 addEventListener('hashchange',restoreHash);addEventListener('popstate',restoreHash);
 for(const type of ['wheel','touchstart','touchmove','pointerdown'])addEventListener(type,interruptTravel,{passive:true});
 addEventListener('keydown',event=>{if(['Escape','ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' ','Tab'].includes(event.key))interruptTravel();});
 addEventListener('resize',interruptTravel);preference.addEventListener('change',interruptTravel);
 button.addEventListener('click',()=>{
  interruptTravel();
  const reading=button.getAttribute('aria-pressed')!=='true';
  button.setAttribute('aria-pressed',String(reading));
  button.textContent=reading?'启用动态':'阅读模式';
  document.body.classList.toggle('reading-mode',reading);
  pageMotion.refresh();
  controller?.setReading(reading);
 });
 document.addEventListener('portfolio:stage-lost',()=>{
  interruptTravel();controller=null;
  button.setAttribute('aria-pressed','true');button.textContent='启用动态';
  document.body.classList.add('reading-mode');pageMotion.refresh();
  button.hidden=!pageMotion.available;
  status.textContent=pageMotion.available?'3D 舞台已停止，已切换静态阅读；可重新启用正文动效。':'3D 舞台已停止，已恢复完整静态阅读。';
 });
 if(!window.gsap || !window.ScrollTrigger) {
  status.textContent=pageMotion.available?'3D 舞台未加载：全部项目内容仍可阅读，可通过阅读模式关闭页面动效。':'当前为静态阅读模式：动画资源未加载，全部项目内容仍可阅读。';
  button.hidden=!pageMotion.available;return;
 }
 /* MOBILE_LITE_BEGIN */
 // Keep navigation/HTML available; don't parse the 3D module graph before a phone paint.
 if(matchMedia('(max-width: 900px)').matches&&!preference.matches&&params.get('test')!=='reduced-motion'){
  requestAnimationFrame(()=>requestAnimationFrame(loadStage));
 }else loadStage();
 function loadStage(){
 /* MOBILE_LITE_END */
 import('./robot-stage.js').then(async ({startStage})=>{
  controller=await startStage();
  controller.setReading(button.getAttribute('aria-pressed')==='true');
  // Enhancement changes document geometry; resolve the real destination again.
  if(destination)navigate(destination);else if(restoreOnEnhance&&location.hash)restoreHash();
 }).catch(error=>{
  document.body.classList.remove('enhanced','desktop-stage');
  status.textContent=pageMotion.available?'3D 舞台不可用：全部项目内容仍可阅读，可通过阅读模式关闭页面动效。':'当前为静态阅读模式：3D 舞台不可用，全部项目内容仍可阅读。';
  button.hidden=!pageMotion.available;
  console.info('3D enhancement unavailable:',error.message);
 });
 /* MOBILE_LITE_BEGIN */
 }
 /* MOBILE_LITE_END */
})();
