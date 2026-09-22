// Core navigation works as native HTML even if all enhancement dependencies fail.
(() => {
 const button=document.getElementById('motion-toggle');
 const status=document.getElementById('enhancement-status');
 const params=new URLSearchParams(location.search);
 button.hidden=false;
 if(params.has('qa')) document.getElementById('study-controls').hidden=false;
 let controller;
 const preference=matchMedia('(prefers-reduced-motion: reduce)');
 let travel=null,arrival=0,destination=null,restoreOnEnhance=true;
 function cancelTravel(){travel?.kill();travel=null;destination=null;cancelAnimationFrame(arrival);arrival=0;}
 function interruptTravel(){restoreOnEnhance=false;cancelTravel();}
 function hashTarget(){try{return document.getElementById(decodeURIComponent(location.hash.slice(1)));}catch{return null;}}
 function navigate(target,animate=true){
  cancelTravel();if(!target)return;
  restoreOnEnhance=true;
  const top=controller?.scrollPosition(target.id)??(target.getBoundingClientRect().top+scrollY-(parseFloat(getComputedStyle(target).scrollMarginTop)||0));
  const end=Math.max(0,Math.min(top,document.documentElement.scrollHeight-innerHeight));
  const finish=()=>{
   travel=null;destination=null;window.ScrollTrigger?.update();
   arrival=requestAnimationFrame(()=>{arrival=0;target.focus({preventScroll:true});});
  };
  if(!animate||preference.matches||params.get('test')==='reduced-motion'||!window.gsap||Math.abs(end-scrollY)<1){
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
  controller?.setReading(reading);
 });
 if(!window.gsap || !window.ScrollTrigger) {
  status.textContent='当前为静态阅读模式：动画资源未加载，全部项目内容仍可阅读。';button.hidden=true;return;
 }
 import('./robot-stage.js').then(async ({startStage})=>{
  controller=await startStage();
  controller.setReading(button.getAttribute('aria-pressed')==='true');
  // Enhancement changes document geometry; resolve the real destination again.
  if(destination)navigate(destination);else if(restoreOnEnhance&&location.hash)restoreHash();
 }).catch(error=>{
  document.body.classList.remove('enhanced','desktop-stage');
  status.textContent='当前为静态阅读模式：3D 舞台不可用，全部项目内容仍可阅读。';
  button.hidden=true;
  console.info('3D enhancement unavailable:',error.message);
 });
})();
