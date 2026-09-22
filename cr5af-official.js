// Human-accepted public CR5AF, converted exclusively from pinned official meshes.
import * as THREE from './vendor/three.module.min.js';
import {GLTFLoader} from './vendor/three-addons/loaders/GLTFLoader.js';
import {CR5AF_LABEL} from './cr5af-label.js';
export function adaptCandidate(gltf){
 const source=gltf.scene,joints=[];
 for(let i=1;i<=6;i++){
  const link=source.getObjectByName('Link'+i);
  if(!link)throw Error('Official link unavailable: '+i);
  // S R(stage-axis) S^-1 equals R(URDF-axis). Official origin and visual vertices stay intact.
  const control=new THREE.Group(),inverse=new THREE.Group();control.name='J'+i;
  control.rotation.x=i===1||i===5?Math.PI/2:-Math.PI/2;
  inverse.quaternion.copy(control.quaternion).invert();
  for(const child of [...link.children])inverse.add(child);
  control.add(inverse);link.add(control);joints.push(control);
 }
 const robot=new THREE.Group(),basis=new THREE.Group();
 basis.rotation.x=-Math.PI/2;
 basis.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),Math.PI));
 basis.scale.setScalar(1000);basis.add(source);robot.add(basis);
 const endpoint=source.getObjectByName('tool0');if(endpoint)endpoint.name='ENDPOINT';
 const materials=new Set();source.traverse(n=>{if(n.isMesh)[].concat(n.material).forEach(m=>materials.add(m));});
 return {robot,joints,shells:[...materials].filter(m=>m.name==='presentation-white-shell'),bytes:1148116,
  source:'dobot-public-cr5af-geometry',label:CR5AF_LABEL,contact:[.52,.44]};
}
export async function createStageModel(){
 const path=new URLSearchParams(location.search).get('test')==='model-fail'?'./assets/missing.glb':'./assets/cr5af-official.glb';
 return adaptCandidate(await new GLTFLoader().loadAsync(path));
}
