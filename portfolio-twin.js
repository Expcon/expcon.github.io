import {answerQuestion, KNOWLEDGE} from './portfolio-knowledge.js';
import {createApiResponder,validateLiveAnswer} from './twin-api.js';
import {TWIN_CONFIG} from './twin-config.js';

/** Local curated notes keep the original topic matching, with guide identity. */
export function localAdapter({request}){
 const answer=answerQuestion(request.question,request.language);
 const text=answer.text.replace('My work explores','Adrian’s work explores')
  .replace('My portfolio focuses','His portfolio focuses')
  .replace('I’m Adrian Chen / 陈谦, a Computer Science undergraduate','Adrian Chen / 陈谦 is a Computer Science undergraduate')
  .replace('I welcome discussion','Adrian welcomes discussion').replace('on my behalf','on his behalf')
  .replace('我正在探索','陈谦正在探索').replace('我理解','他理解').replace('这是我持续探索中的科研方向','这是陈谦持续探索中的科研方向')
  .replace('我是 Adrian Chen / 陈谦，就读于','Adrian Chen / 陈谦就读于').replace('不能替我','不能替陈谦');
 return {...answer,text};
}
const mounted=new WeakSet();
/** Page-memory transcript only. An injected responder uses the same async boundary.
 * @param {Element} root
 * @param {(args:{request:object,signal:AbortSignal})=>object|Promise<object>} [respond]
 * @param {{mode?:'offline'|'live'}} [options]
 */
export function mountTwin(root,respond=localAdapter,{mode='offline'}={}){
 if(!root||mounted.has(root))return;
 const get=id=>root.querySelector('#'+id);
 const form=get('twin-form'),input=get('twin-question'),language=get('twin-language'),suggestions=get('twin-suggestions');
 const output=get('twin-answer'),clear=get('twin-clear'),status=get('twin-status'),send=get('twin-send');
 const consentPanel=get('twin-consent-panel'),consent=get('twin-consent'),cancel=get('twin-cancel'),retry=get('twin-retry'),local=get('twin-local');
 const modeLabel=get('twin-mode'),help=get('twin-help'),privacy=get('twin-privacy');
 const consentCopy=get('twin-consent-copy'),consentLabel=get('twin-consent-label');
 if(!form||!input||!language||!suggestions||!output||!clear)return;
 mounted.add(root);
 const doc=root.ownerDocument,history=[];
 let currentMode=mode==='live'?'live':'offline',active=null,generation=0,failed=null,consentGranted=false;
 if(consent)consent.checked=false;
 const topics=[...root.querySelectorAll('[data-twin-topic]')];
 const make=(tag,text,className)=>{const node=doc.createElement(tag);node.textContent=text;if(className)node.className=className;return node};
 const lang=()=>language.value==='zh'?'zh':'en';
 const say=(zh,en,locale=lang())=>locale==='zh'?zh:en;
 const setStatus=text=>{if(status)status.textContent=text};
 const copy={
  pending:['正在回答…','Preparing an answer…'],
  cancelled:['已取消，问题已保留。取消不保证停止计费；重试会计作新的请求。','Cancelled. Your question is kept. Cancellation may not stop billing; retrying counts as a new request.'],
  TIMEOUT:['回答超过 20 秒，已停止等待。问题已保留；重试会计作新的请求。','The answer timed out after 20 seconds. Your question is kept; retrying counts as a new request.'],
  RATE_LIMITED:['问答额度已达限制，请稍后再试或查看本地资料。','The chat limit has been reached. Try later or view the local notes.'],
  DUPLICATE:['该请求已处理，未重复调用。可以主动重试新请求或查看本地资料。','This request was already handled. You can retry as a new request or view the local notes.'],
  DISABLED:['远程问答已关闭。可以查看本地资料。','Remote chat is disabled. You can view the local notes.'],
  CONSENT_REQUIRED:['请先确认下方发送说明，再发送问题。','Confirm the sending notice below before sending a question.'],
  INVALID_REQUEST:['无法发送这个问题，请检查长度或清空对话后重试。','This question could not be sent. Check its length or clear the conversation and retry.'],
  UNAVAILABLE:['暂时无法连接远程问答，问题已保留。重试会计作新的请求，或查看本地资料。','Remote chat is unavailable. Your question is kept. A retry counts as a new request, or you can view local notes.'],
  offlineError:['暂时无法读取本地资料，问题已保留，请重试。','The local notes could not be read. Your question is kept; please retry.']
 };
 const message=(code,locale)=>say(...(copy[code]||copy.UNAVAILABLE),locale);
 function bubble(role,text,locale){
  const node=make('article','','twin-message twin-message-'+role);node.dataset.role=role;node.setAttribute('lang',locale==='zh'?'zh-CN':'en');
  node.append(make('p',role==='user'?say('你','You',locale):say('陈谦 · AI 导览助手','Adrian · AI guide',locale),'twin-speaker'),make('p',text,'twin-response'));return node;
 }
 function renderAnswer(turn,answer){
  const node=turn.assistant;node.dataset.state=answer.kind;node.replaceChildren(
   make('p',say('陈谦 · AI 导览助手','Adrian · AI guide',turn.language),'twin-speaker'),make('p',answer.text,'twin-response'));
  if(answer.sources.length){const sources=make('div','','twin-sources');for(const source of answer.sources){const link=make('a',source.label+' ↗');link.href=source.href;sources.append(link)}node.append(sources)}
  if(answer.choices.length){const choices=make('div','','twin-choices');for(const id of answer.choices){const record=KNOWLEDGE.find(item=>item.id===id);if(!record)continue;const button=make('button',record.title[turn.language]);button.type='button';button.addEventListener('click',()=>selectTopic(id));choices.append(button)}node.append(choices)}
 }
 function welcome(){return bubble('assistant',say(
  currentMode==='live'?'你好，我是陈谦主页的 AI 导览助手。项目、技术或日常话题，都可以聊聊。关于陈谦的经历，我会依据公开资料回答。想从哪里开始？':'我是 Adrian Chen／陈谦公开主页的 AI 导览助手，可以根据已公开资料介绍他的项目和研究方向。想从哪个问题开始？',
  currentMode==='live'?'Hi, I’m the AI guide to Adrian Chen’s portfolio. Ask about projects, technology, or everyday topics. Facts about Adrian come from public notes. Where shall we start?':'I am the AI guide to Adrian Chen／陈谦’s public portfolio. I can introduce his projects and research directions based on published information. What would you like to explore?'),lang())}
 function controls(){
  const busy=!!active;input.disabled=busy;if(send)send.disabled=busy;if(consent)consent.disabled=busy;
  for(const button of topics)button.disabled=busy;
  for(const turn of history)for(const choices of Array.from(turn.assistant.children))if(choices.className==='twin-choices')for(const button of choices.children)button.disabled=busy;
  output.setAttribute('aria-busy',String(busy));if(cancel)cancel.hidden=!busy;
  if(retry){retry.hidden=!failed||busy;retry.disabled=busy;retry.textContent=say('重试问题 ↗','Retry question ↗')}
  if(local){local.hidden=currentMode!=='live';local.textContent=say('查看本地资料','View local notes')}
 }
 function updateLabels(){
  const live=currentMode==='live';input.maxLength=live?1000:560;
  if(modeLabel)modeLabel.textContent=live?say('AI 通用问答 · 个人事实依据公开资料 · 可能有误','General AI chat · Personal facts use public notes · May be wrong'):say('本地资料预览','Local notes preview');
  if(consentPanel)consentPanel.hidden=!live;
  input.placeholder=live?say('聊聊项目、技术，或今天的一个想法…','Ask about a project, technology, or an idea…'):say('询问陈谦的项目、研究方向或经历…','Ask about Adrian’s projects or research…');
  if(consentCopy)consentCopy.textContent=say('问题、最近两轮完整对话及限定的公开主页资料会经 Supabase 发给阿里云百炼。勿输入隐私或未公开研究；服务商可能保留访问元数据，不保证零留存。','Your question, last two complete turns and limited public portfolio notes go through Supabase to Alibaba Cloud Model Studio. Avoid private or unpublished information. Providers may retain access metadata; zero retention is not guaranteed.');
  if(consentLabel)consentLabel.textContent=say('我同意发送以上内容（仅本页有效）','I understand and agree to send this information (this page only)');
  if(cancel)cancel.textContent=say('取消回答','Cancel answer');
  if(help)help.textContent=live?say('最多 500 字符 · 展示最近 12 轮 · 发送最近 2 轮','Up to 500 characters · 12 visible turns · 2 turns sent'):say('公开资料问答 · 最多 280 字符 · 保留最近 12 轮','Local public notes · Up to 280 characters · 12 visible turns');
  if(privacy)privacy.textContent=live?say(
   '这是 AI 导览助手。问题、最近两轮完整对话和限定的公开主页资料会经 Supabase 发给阿里云百炼。请勿输入隐私或未公开研究。对话的本地副本仅保留在本页内存；刷新或清空只移除本地副本，不会撤回已发送给服务商的信息。服务商可能保留访问元数据，不保证零留存。取消或超时不保证停止计费，重试会计作新的请求。',
   'This is an AI guide. Your question, the last two complete turns and the limited public portfolio notes are sent through Supabase to Alibaba Cloud Model Studio. Do not enter private information or unpublished research. This page stores a local transcript copy in memory only. Refresh or clear removes the local copy, but does not remove information already transmitted to providers. Providers may retain access metadata; zero retention is not guaranteed. Cancellation or timeout may not stop billing, and a retry counts as a new request.'):
   say('当前为本地资料预览：使用整理好的公开资料，按主题匹配回答。对话的本地副本仅保留在本页内存；刷新或清空会移除本地副本。请避免输入敏感信息。','This local preview matches questions to curated public notes. The local transcript copy stays only in this page’s memory; refresh or clear removes the local copy. Avoid sensitive information.');
  for(const button of topics){const item=KNOWLEDGE.find(x=>x.id===button.dataset.twinTopic);if(item)button.textContent=item.question[lang()]}
  controls();
 }
 function sentHistory(){return history.filter(turn=>turn.answer&&['answer','general','unknown'].includes(turn.answer.kind)).slice(-2).flatMap(turn=>[
  {role:'user',content:[...turn.question].slice(0,1200).join('')},{role:'assistant',content:[...turn.answer.text].slice(0,1200).join('')}
 ])}
 function newId(){return globalThis.crypto.randomUUID()}
 function trimHistory(){while(history.length>12){const turn=history.shift();output.removeChild(turn.user);output.removeChild(turn.assistant)}}
 function validLocal(answer){
  if(!answer||typeof answer.text!=='string'||!Array.isArray(answer.sources)||!Array.isArray(answer.choices))throw Error('Invalid local answer');
  if(!answer.sources.every(source=>typeof source.label==='string'&&/^#(?:closing|directions|cr5af-project|rm65b|jarvis|perception|execution|science|contact)$/.test(source.href)))throw Error('Invalid local source');
  return answer;
 }
 function failCurrent(code){
  if(!active)return;const operation=active;active=null;generation++;clearTimeout(operation.timer);operation.controller.abort();
  failed={question:operation.turn.question,language:operation.turn.language};input.value=failed.question;
  const text=message(currentMode==='offline'?'offlineError':code,failed.language);operation.turn.assistant.dataset.state='failed';operation.turn.assistant.children[1].textContent=text;setStatus(text);controls();input.focus();
 }
 function submit(question,locale=lang()){
  if(active)return;
  const q=String(question).trim(),limit=currentMode==='live'?500:280;
  if(!q||[...q].length>limit){setStatus(say(q?`请把问题缩短到 ${limit} 字符以内。`:'写下一个问题，再点击发送。',q?`Keep your question within ${limit} characters.`:'Type a question before sending.'));return;}
  if(currentMode==='live'&&!(consentGranted&&consent?.checked)){setStatus(message('CONSENT_REQUIRED'));consent?.focus();return;}
  let request;try{request={requestId:newId(),question:q,language:locale,history:sentHistory()}}catch{setStatus(message('UNAVAILABLE',locale));return;}
  const controller=new AbortController(),turn={question:q,language:locale,answer:null,user:bubble('user',q,locale),assistant:bubble('assistant',message('pending',locale),locale)};
  turn.assistant.dataset.state='pending';output.dataset.conversation='active';history.push(turn);output.append(turn.user,turn.assistant);trimHistory();output.scrollTop=output.scrollHeight;failed=null;
  const operation={turn,controller,generation:++generation,timer:null};active=operation;controls();setStatus(message('pending',locale));
  operation.timer=setTimeout(()=>{if(active===operation&&generation===operation.generation)failCurrent('TIMEOUT')},20000);
  // Await also handles local sync notes; rejected/late promises never escape.
  (async()=>{
   try{
    const answer=await respond({request,signal:controller.signal});
    if(active!==operation||generation!==operation.generation)return;
    const safe=currentMode==='live'?validateLiveAnswer(answer):validLocal(answer);
    turn.answer=safe;renderAnswer(turn,safe);active=null;clearTimeout(operation.timer);input.value='';setStatus('');controls();output.scrollTop=output.scrollHeight;
    if(!doc.activeElement||doc.activeElement===doc.body||doc.activeElement===input)input.focus();
   }catch(error){if(active===operation&&generation===operation.generation)failCurrent(error?.code||'UNAVAILABLE')}
  })();
 }
 function selectTopic(id){if(active)return;const record=KNOWLEDGE.find(item=>item.id===id);if(!record)return;input.value=record.question[lang()];submit(input.value);input.focus()}
 form.addEventListener('submit',event=>{event.preventDefault();submit(input.value)});
 language.addEventListener('change',()=>updateLabels());
 consent?.addEventListener('change',()=>{if(active)return;consentGranted=consent.checked===true;if(consentGranted)setStatus('')});
 cancel?.addEventListener('click',()=>failCurrent('cancelled'));
 retry?.addEventListener('click',()=>{if(!active&&failed)submit(failed.question)});
 clear.addEventListener('click',()=>{
  generation++;if(active){clearTimeout(active.timer);active.controller.abort();active=null}history.length=0;failed=null;input.value='';output.dataset.conversation='welcome';output.replaceChildren(welcome());setStatus('');controls();input.focus();
 });
 local?.addEventListener('click',()=>{
  if(active)failCurrent('cancelled');currentMode='offline';respond=localAdapter;failed=null;setStatus('');updateLabels();input.focus();
 });
 for(const button of topics)button.addEventListener('click',()=>selectTopic(button.dataset.twinTopic));
 form.hidden=false;suggestions.hidden=false;output.dataset.conversation='welcome';output.replaceChildren(welcome());updateLabels();
}
if(typeof document!=='undefined'){
 const live=TWIN_CONFIG.mode==='live'&&!!TWIN_CONFIG.endpoint;
 mountTwin(document.querySelector('#ask-work'),live?createApiResponder(TWIN_CONFIG):localAdapter,{mode:live?'live':'offline'});
}
