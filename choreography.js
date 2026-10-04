// Display poses in original GLB-local radians; never hardware commands or trajectories.
const A={j1:-.12,j2:-.48,j3:1.02,j4:.57,j5:.20,j6:0};
const B={...A,j2:-.34,j3:.83};
const C={...A,j1:.06,j2:-.57,j3:1.14};
export const KEYFRAMES=[
 {p:0,x:.37,y:-.08,scale:1.18,space:1.18,ry:-.32,cx:1.65,cy:1.12,cz:2.02,tx:-.13,ty:.48,tz:0,...A},
 {p:.08,x:.12,y:-.07,scale:1.17,space:1.17,ry:-.52,cx:1.70,cy:1.20,cz:2.12,tx:-.05,ty:.50,tz:0,...A},
 {p:.22,x:-.55,y:-.10,scale:1.07,space:1.07,ry:-.82,cx:1.50,cy:1.18,cz:2.40,tx:.02,ty:.48,tz:0,...A},
 {p:.31,x:-.45,y:-.05,scale:1.02,space:1.02,ry:-.95,cx:1.36,cy:1.20,cz:2.50,tx:.03,ty:.52,tz:0,...B},
 {p:.44,x:-.04,y:-.08,scale:1.35,space:.80,ry:.12,cx:.20,cy:1.18,cz:1.35,tx:.10,ty:.44,tz:0,...B},
 {p:.53,x:-.12,y:-.12,scale:1.32,space:.90,ry:.22,cx:.42,cy:1.05,cz:1.25,tx:.08,ty:.43,tz:0,...B},
 {p:.67,x:.51,y:-.10,scale:1.06,space:1.06,ry:.24,cx:1.27,cy:1.06,cz:1.80,tx:-.12,ty:.53,tz:0,...C},
 {p:.76,x:.40,y:-.07,scale:.95,space:1.01,ry:.41,cx:1.48,cy:1.23,cz:2.20,tx:-.08,ty:.48,tz:0,...C},
 {p:.90,x:.60,y:.015,scale:.80,space:1.50,ry:-.12,cx:2.05,cy:2.25,cz:3.90,tx:0,ty:.68,tz:0,...B},
 {p:1,x:.60,y:.025,scale:.78,space:1.65,ry:-.28,cx:2.30,cy:2.40,cz:4.25,tx:0,ty:.67,tz:0,...B}
];
export const CHAPTER_PROGRESS={identity:0,agent:.20,perception:.44,execution:.67,science:.96};
export const COPY_STARTS=[0,.135,.355,.585,.785];
export const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
export const ramp=(p,a,b)=>clamp((p-a)/(b-a));
const smoothstep=t=>t*t*(3-2*t);
// Reduce information, not motion, during the existing Agent → Perception transition.
export const editorialAt=p=>smoothstep(ramp(p,.24,.285))*(1-smoothstep(ramp(p,.355,.40)));
export const sine=t=>(1-Math.cos(Math.PI*t))/2;
export const power=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
// A linear contribution preserves useful motion at boundaries; the initial gesture stays direct.
export function curveFor(key,segment=2){
 if(key==='p'||segment===1)return t=>t;
 if(key==='scale'||key==='space')return t=>.2*t+.8*power(t);
 if(key.startsWith('c')||key.startsWith('t'))return t=>.2*t+.8*sine(t);
 return t=>.3*t+.7*sine(t);
}
const safeProgress=p=>Number.isFinite(p)?clamp(p):p===Infinity?1:0;
// Copy and robot sample the same scroll position; no independent animation clock.
export function copyAt(progress,{starts=COPY_STARTS,enterDuration=.045,exitDuration=.035,travel=16}={}){
 const p=safeProgress(progress),index=Math.max(0,starts.findLastIndex(start=>p>=start));
 const start=starts[index],end=starts[index+1];
 const enter=index?smoothstep(ramp(p,start,start+enterDuration)):1;
 const exit=end===undefined?0:smoothstep(ramp(p,end-exitDuration,end));
 return {index,enter,exit,opacity:enter*(1-exit),y:travel*(1-enter-exit)};
}

// Shape-preserving piecewise cubic Hermite interpolation. Slopes are shared at
// each waypoint (C1), zero at reversals, and limited to avoid segment overshoot.
// Precompute once for each fixed timeline; sampling is pure and reversible.
export function createStateInterpolator(keyframes){
 const fields=Object.keys(keyframes[0]).filter(key=>key!=='p');
 const last=keyframes.length-1,h=keyframes.slice(1).map((key,i)=>key.p-keyframes[i].p);
 const endpoint=(a,b,da,db)=>{
  const slope=((2*a+b)*da-a*db)/(a+b);
  return Math.sign(slope)!==Math.sign(da)?0:Math.sign(da)*Math.min(Math.abs(slope),3*Math.abs(da));
 };
 const slopes=Object.fromEntries(fields.map(field=>{
  const d=h.map((width,i)=>(keyframes[i+1][field]-keyframes[i][field])/width);
  const m=new Array(last+1);
  m[0]=last===1?d[0]:endpoint(h[0],h[1],d[0],d[1]);
  m[last]=last===1?d[0]:endpoint(h[last-1],h[last-2],d[last-1],d[last-2]);
  for(let i=1;i<last;i++){
   const left=d[i-1],right=d[i],w1=2*h[i]+h[i-1],w2=h[i]+2*h[i-1];
   m[i]=left*right<=0?0:(w1+w2)/(w1/left+w2/right);
  }
  return [field,m];
 }));
 return progress=>{
  const p=clamp(safeProgress(progress),keyframes[0].p,keyframes[last].p);
  const i=Math.max(1,keyframes.findIndex(key=>key.p>=p)),a=keyframes[i-1],b=keyframes[i];
  // Return authored values exactly, without introducing floating-point drift.
  if(p===a.p)return {...a};
  if(p===b.p)return {...b};
  const t=(p-a.p)/h[i-1],t2=t*t,t3=t2*t;
  const h00=2*t3-3*t2+1,h10=t3-2*t2+t,h01=-2*t3+3*t2,h11=t3-t2;
  const state={p};
  for(const field of fields){
   const m=slopes[field];
   const value=h00*a[field]+h10*h[i-1]*m[i-1]+h01*b[field]+h11*h[i-1]*m[i];
   // Numerical guard only; monotone slopes already enforce the segment bounds.
   state[field]=clamp(value,Math.min(a[field],b[field]),Math.max(a[field],b[field]));
  }
  return state;
 };
}
export const stateAt=createStateInterpolator(KEYFRAMES);

// Architectural atmosphere shares native scroll progress with the persistent robot.
// These are presentation layers, not representations of an actual laboratory.
export function atmosphereAt(progress){
 const p=safeProgress(progress),ease=(a,b)=>smoothstep(ramp(p,a,b));
 return {
  depth:.15+.65*ease(0,.72),
  arcY:42-62*ease(0,.38),arcOpacity:.85*(1-ease(.35,.64)),
  labY:120*(1-ease(.22,.58)),labOpacity:.60*ease(.25,.52),
  gridOpacity:.10+.32*ease(.33,.72),
  scanX:-35+120*ease(.33,.82),scanOpacity:.36*ease(.35,.48)*(1-ease(.70,.85))
 };
}
