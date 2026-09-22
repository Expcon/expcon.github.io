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
// Reduce information, not motion, during the existing Agent → Perception transition.
export const editorialAt=p=>ramp(p,.24,.285)*(1-ramp(p,.355,.40));
export const sine=t=>(1-Math.cos(Math.PI*t))/2;
export const power=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
// A linear contribution preserves useful motion at boundaries; the initial gesture stays direct.
export function curveFor(key,segment=2){
 if(key==='p'||segment===1)return t=>t;
 if(key==='scale'||key==='space')return t=>.2*t+.8*power(t);
 if(key.startsWith('c')||key.startsWith('t'))return t=>.2*t+.8*sine(t);
 return t=>.3*t+.7*sine(t);
}
export function copyAt(p){
 const index=Math.max(0,COPY_STARTS.findLastIndex(start=>p>=start));
 const start=COPY_STARTS[index],end=COPY_STARTS[index+1]??2;
 return {index,enter:index?1-Math.pow(1-ramp(p,start,start+.045),3):1,exit:Math.pow(ramp(p,end-.035,end),3)};
}
export function stateAt(progress){
 const p=clamp(progress),i=Math.max(1,KEYFRAMES.findIndex(k=>k.p>=p));
 const a=KEYFRAMES[i-1],b=KEYFRAMES[i],t=(p-a.p)/(b.p-a.p);
 return Object.fromEntries(Object.keys(a).map(k=>[k,a[k]+(b[k]-a[k])*curveFor(k,i)(t)]));
}
