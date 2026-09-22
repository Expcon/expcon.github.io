// Phone-only display poses. The accepted desktop choreography is not sampled or changed.
const clamp=v=>Math.max(0,Math.min(1,v));
const ramp=(p,a,b)=>clamp((p-a)/(b-a));
export const MOBILE_CHAPTERS={identity:0,agent:.24,perception:.48,execution:.67,science:.94};
const pose={j1:-.12,j2:-.48,j3:1.02,j4:.57,j5:.20,j6:0};
export const MOBILE_KEYS=[
 {p:0,x:.06,y:0,scale:.92,ry:-.32,cx:1.5,cy:1.04,cz:2.7,tx:0,ty:.52,tz:0,...pose},
 {p:.24,x:-.06,y:.015,scale:.90,ry:-.48,cx:1.48,cy:1.08,cz:2.85,tx:0,ty:.52,tz:0,...pose},
 {p:.48,x:.09,y:-.04,scale:1.09,ry:-.15,cx:1.20,cy:1.04,cz:2.23,tx:0,ty:.57,tz:0,...pose,j2:-.34,j3:.83},
 {p:.69,x:.06,y:0,scale:.97,ry:.13,cx:1.37,cy:1.10,cz:2.55,tx:0,ty:.52,tz:0,...pose,j1:.06,j2:-.57,j3:1.14},
 {p:1,x:.19,y:0,scale:.72,ry:-.18,cx:1.55,cy:1.20,cz:3.0,tx:0,ty:.48,tz:0,...pose}
];
export function mobileStateAt(value){
 const p=clamp(value),i=Math.max(1,MOBILE_KEYS.findIndex(k=>k.p>=p));
 const a=MOBILE_KEYS[i-1],b=MOBILE_KEYS[i],t=(p-a.p)/(b.p-a.p);
 return Object.fromEntries(Object.keys(a).map(k=>[k,a[k]+(b[k]-a[k])*t]));
}

export function createMobileLite({schedule,robot,joints,rest,axes,q,camera,target,scene,contact,spatial,volume,regionLine,frame,viewpoint,loopPaths,point}){
 const $=id=>document.getElementById(id),chapters=[...document.querySelectorAll('.chapter')];
 const type=$('shot-type'),hero=$('identity').querySelector('h1');
 const bounds=()=>{const start=$('story').getBoundingClientRect().top+scrollY;return{start,distance:Math.max(1,$('story').offsetHeight-$('visual').offsetHeight)};};
 let active='identity';
 // Native scroll is the only production progress source. Schedule one frame per
 // event batch, with no tween clock or cached scroll coordinates to reconcile.
 addEventListener('scroll',schedule,{passive:true});
 function apply(auditProgress){
  const range=bounds(),p=auditProgress??clamp((scrollY-range.start)/range.distance),s=mobileStateAt(p),rect=$('visual').getBoundingClientRect(),w=rect.width,h=rect.height;
  const index=p<.14?0:p<.36?1:p<.58?2:p<.79?3:4;
  active=chapters[index].id;const offset=Math.max(0,Math.min(range.distance,scrollY-range.start));
  robot.position.set(s.x,s.y,0);robot.rotation.y=s.ry;robot.scale.setScalar(.001*s.scale);
  joints.forEach((j,i)=>j.quaternion.copy(rest[i]).multiply(q.setFromAxisAngle(axes[i],s['j'+(i+1)])));
  camera.position.set(s.cx,s.cy,s.cz);target.set(s.tx,s.ty,s.tz);
  // A tall portrait sensor needs more distance; landscape gets a wider side composition.
  const portrait=h>w;
  if(portrait){camera.position.sub(target).multiplyScalar(1.18).add(target);target.y+=.08;}
  else{target.x-=.34;}
  contact.position.copy(robot.position);contact.position.y-=.0002;contact.scale.setScalar(s.scale);contact.rotation.z=s.ry;
  spatial.position.copy(robot.position);spatial.rotation.y=s.ry;spatial.scale.setScalar(s.scale);
  spatial.visible=p>.35;
  volume.material.opacity=.19*ramp(p,.35,.48);regionLine.material.opacity=.35*ramp(p,.35,.48);
  frame.material.opacity=.10;viewpoint.material.opacity=0;loopPaths.forEach(line=>{line.visible=false;});
  camera.lookAt(target);camera.updateMatrixWorld();scene.updateMatrixWorld(true);
  const starts=[0,.14,.36,.58,.79],ends=[.14,.36,.58,.79,1.1];
  chapters.forEach((el,i)=>{
   const shown=i===index;
   el.style.top=offset+'px';el.style.visibility=shown?'visible':'hidden';el.inert=!shown;el.setAttribute('aria-hidden',!shown);
   // Short copy transitions; robot movement never pauses with the text.
   el.style.opacity=shown?Math.min(i?ramp(p,starts[i],starts[i]+.03):1,1-ramp(p,ends[i]-.025,ends[i])):0;
  });
  hero.style.transform='translateY('+(-12*ramp(p,0,.14))+'px) scale('+(1-.07*ramp(p,0,.14))+')';
  type.dataset.shot=active;type.style.visibility=index?'visible':'hidden';
  type.firstElementChild.textContent=['','AGENT','PERCEPTION','EXECUTION','AI FOR SCIENCE'][index];
  type.firstElementChild.style.transform='translateX('+(-10*(p-starts[index]))+'px)';
  $('visual').dataset.mobileShot=active;
  // One restrained projected cue, attached to the original J6 and a conceptual workspace.
  joints[5].getWorldPosition(point).project(camera);
  const tip=[(point.x*.5+.5)*w,(-point.y*.5+.5)*h];
  const projected=v=>{point.set(...v).applyMatrix4(spatial.matrixWorld).project(camera);return[(point.x*.5+.5)*w,(-point.y*.5+.5)*h];};
  const region=projected([-.40,.18,.18]);
  const cue=$('perception-execution');cue.setAttribute('d',`M ${region} Q ${region[0]},${tip[1]} ${tip}`);
  cue.style.opacity=.40*ramp(p,.36,.52)*(1-ramp(p,.79,.9));
  const mapX=x=>(portrait?x:.43+x*.50)*w;
  const labels=[['planning',.19,.36],['field',.20,.64],['execution-node',.70,.66],['feedback-node',.69,.34]];
  for(const [id,x,y] of labels){const el=$(id);el.style.left=mapX(x)+'px';el.style.top=y*h+'px';el.style.opacity=ramp(p,.80,.91);}
  const loop=$('feedback-agent');loop.setAttribute('d',`M ${mapX(.19)},${.38*h} Q ${mapX(.05)},${.53*h} ${mapX(.20)},${.65*h} L ${mapX(.70)},${.68*h} Q ${mapX(.94)},${.51*h} ${mapX(.69)},${.35*h} L ${mapX(.19)},${.38*h}`);
  loop.setAttribute('pathLength','1');loop.style.strokeDasharray='1';loop.style.strokeDashoffset=1-ramp(p,.79,.98);loop.style.opacity=.27;
  $('phase').textContent=['ADRIAN / AI FOR SCIENCE','01 / AGENT','02 / PERCEPTION','03 / EXECUTION','04 / DATA FEEDBACK'][index];
  $('progress').textContent=Math.round(p*100)+'%';$('progress-fill').style.width=p*100+'%';
  $('visual').dataset.state=JSON.stringify({mode:'mobile',p,active,scrollY,camera:camera.position.toArray(),robot:robot.position.toArray(),joints:joints.map(j=>j.quaternion.toArray()),object:robot.uuid,canvasCount:document.querySelectorAll('canvas').length,tip});
 }
 return {apply,bounds,active:()=>active,
  scrollPosition(id){if(!Object.hasOwn(MOBILE_CHAPTERS,id))return null;const range=bounds();return range.start+MOBILE_CHAPTERS[id]*range.distance;},
  dispose(){removeEventListener('scroll',schedule);hero.removeAttribute('style');
   for(const el of document.querySelectorAll('#visual [style]'))el.removeAttribute('style');
   type.removeAttribute('data-shot');delete $('visual').dataset.mobileShot;spatial.visible=false;
  }};
}
