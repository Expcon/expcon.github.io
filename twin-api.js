/** @typedef {{requestId:string,question:string,language:'zh'|'en',history:Array<{role:'user'|'assistant',content:string}>}} ChatRequest */
/** @typedef {{id:string,label:string,href:string}} Source */
/** @typedef {{kind:'answer'|'unknown',text:string,sources:Source[],choices:[]}} ChatAnswer */

// Deliberately separate from server modules: these are the only rendered live links.
const SOURCES=Object.freeze(Object.fromEntries([
 ['closing','Adrian Chen／陈谦'],['directions','Research directions／研究方向'],
 ['cr5af-project','CR5AF Intelligent Pipetting'],['rm65b','RM65B Vision-Guided Manipulation'],
 ['jarvis','JARVIS'],['perception','Spatial illustration／空间示意'],
 ['execution','Display poses／展示姿态'],['science','Long-term research direction／长期研究方向']
].map(([id,label])=>[id,Object.freeze({id,label,href:'#'+id})])));
const CODES=new Set(['INVALID_REQUEST','CONSENT_REQUIRED','DISABLED','RATE_LIMITED','DUPLICATE','UNAVAILABLE','TIMEOUT']);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const exact=(value,keys)=>value!==null&&typeof value==='object'&&!Array.isArray(value)
 && [Object.prototype,null].includes(Object.getPrototypeOf(value))
 && Reflect.ownKeys(value).length===keys.length
 && keys.every(key=>{const d=Object.getOwnPropertyDescriptor(value,key);return d&&Object.hasOwn(d,'value')});
const text=(value,max)=>typeof value==='string'&&value.trim().length>0&&[...value].length<=max;
const dataArray=value=>Array.isArray(value)&&Array.from({length:value.length},(_,i)=>Object.getOwnPropertyDescriptor(value,String(i))).every(d=>d&&Object.hasOwn(d,'value'));
const failure=code=>Object.assign(new Error('Portfolio chat is unavailable.'),{code:CODES.has(code)?code:'UNAVAILABLE'});
const aborted=()=>new DOMException('The request was cancelled.','AbortError');

/** Validate raw backend answers before rendering anything, including source labels.
 * @param {unknown} value
 * @returns {ChatAnswer}
 */
export function validateLiveAnswer(value){
 if(!exact(value,['kind','text','sources','choices'])||!['answer','unknown'].includes(value.kind)
  ||!text(value.text,2000)||!dataArray(value.sources)||value.sources.length>8
  ||!dataArray(value.choices)||value.choices.length!==0
  ||(value.kind==='answer'?value.sources.length===0:value.sources.length!==0))throw failure('UNAVAILABLE');
 const seen=new Set(),sources=[];
 for(const source of value.sources){
  if(!exact(source,['id','label','href'])||typeof source.id!=='string'||!Object.hasOwn(SOURCES,source.id)
   ||source.href!==SOURCES[source.id].href||source.label!==SOURCES[source.id].label||seen.has(source.id))throw failure('UNAVAILABLE');
  seen.add(source.id);sources.push({...SOURCES[source.id]});
 }
 return {kind:value.kind,text:value.text,sources,choices:[]};
}

/** @param {unknown} value @returns {ChatRequest} */
function validateRequest(value){
 if(!exact(value,['requestId','question','language','history'])||typeof value.requestId!=='string'||!uuid.test(value.requestId)
  ||!text(value.question,500)||!['zh','en'].includes(value.language)||!dataArray(value.history)||![0,2,4].includes(value.history.length))throw failure('INVALID_REQUEST');
 const history=value.history.map((message,i)=>{
  if(!exact(message,['role','content'])||message.role!==(i%2?'assistant':'user')||!text(message.content,1200))throw failure('INVALID_REQUEST');
  return {role:message.role,content:message.content};
 });
 return {requestId:value.requestId,question:value.question,language:value.language,history};
}
function validEndpoint(endpoint){
 if(typeof endpoint!=='string'||!endpoint||endpoint!==endpoint.trim()||endpoint.length>2048)return false;
 if(/^\/(?!\/)/.test(endpoint))return !/[\\#]/.test(endpoint);
 try{const url=new URL(endpoint);return url.protocol==='https:'&&!url.username&&!url.password&&!url.hash;}catch{return false;}
}

/** A non-streaming browser boundary with no retry or persistent state.
 * @param {{mode?:string,endpoint?:string}} config
 * @param {typeof fetch} [fetchImpl]
 * @returns {(args:{request:ChatRequest,signal:AbortSignal})=>Promise<ChatAnswer>}
 */
export function createApiResponder(config,fetchImpl=globalThis.fetch){
 const enabled=config?.mode==='live'&&validEndpoint(config.endpoint),endpoint=config?.endpoint;
 return async({request,signal})=>{
  if(!enabled)throw failure('DISABLED');
  if(signal?.aborted)throw aborted();
  const payload=JSON.stringify(validateRequest(request));
  if(new TextEncoder().encode(payload).byteLength>12288)throw failure('INVALID_REQUEST');
  if(typeof fetchImpl!=='function')throw failure('UNAVAILABLE');
  const controller=new AbortController();let timer,onAbort;
  const interruption=new Promise((_,reject)=>{
   onAbort=()=>{controller.abort();reject(aborted())};
   signal?.addEventListener('abort',onAbort,{once:true});
   timer=setTimeout(()=>{controller.abort();reject(failure('TIMEOUT'))},20000);
  });
  try{
   const operation=(async()=>{
    const response=await fetchImpl(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:payload,credentials:'omit',redirect:'error',signal:controller.signal});
    const value=await response.json();
    if(!response.ok){
     const code=exact(value,['error'])&&exact(value.error,['code','message'])&&CODES.has(value.error.code)?value.error.code:'UNAVAILABLE';
     throw failure(code);
    }
    return validateLiveAnswer(value);
   })();
   return await Promise.race([operation,interruption]);
  }catch(error){
   if(signal?.aborted)throw aborted();
   throw failure(error?.code);
  }finally{
   clearTimeout(timer);signal?.removeEventListener('abort',onAbort);
  }
 };
}
