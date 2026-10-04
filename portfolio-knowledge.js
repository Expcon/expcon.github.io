// Curated public portfolio facts only. This module runs locally without a model,
// network request, question history or access to private documents.
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value)}return value};
export const KNOWLEDGE=freeze([
 {id:'research',title:{en:'Research focus',zh:'研究方向'},question:{en:'What is your research focus?',zh:'你的研究方向是什么？'},answer:{
  en:'My work explores AI for Science, embodied intelligence and laboratory automation. Robotics projects are practical starting points for understanding perception, execution and experimental feedback.',
  zh:'我正在探索 AI for Science、具身智能与实验室自动化。机器人项目是我理解感知、执行和实验反馈的具体起点。'},sources:[{label:'Research directions',href:'#directions'}]},
 {id:'cr5af',title:{en:'CR5AF',zh:'CR5AF'},question:{en:'Tell me about CR5AF.',zh:'介绍一下 CR5AF 项目。'},answer:{
  en:'CR5AF Intelligent Pipetting explores robotic manipulation, automated pipetting and laboratory execution workflows. The homepage presents a CR5AF model in display poses.',
  zh:'CR5AF Intelligent Pipetting 围绕机器人操作、自动移液与实验室自动化，探索任务流程到物理执行的连接。主页以 CR5AF 模型呈现演示姿态。'},sources:[{label:'CR5AF project',href:'#cr5af-project'}]},
 {id:'rm65b',title:{en:'RM65B',zh:'RM65B'},question:{en:'Tell me about RM65B.',zh:'介绍一下 RM65B 项目。'},answer:{
  en:'RM65B Vision-Guided Manipulation is a separate project exploring vision-guided grasping through RealSense, hand–eye calibration and visual localization. The homepage stage features a CR5AF model.',
  zh:'RM65B Vision-Guided Manipulation 是独立于 CR5AF 的项目，以 RealSense、手眼标定和视觉定位探索视觉引导抓取。主页舞台展示的是 CR5AF 模型。'},sources:[{label:'RM65B project',href:'#rm65b'}]},
 {id:'jarvis',title:{en:'JARVIS',zh:'JARVIS'},question:{en:'What is JARVIS?',zh:'JARVIS 是什么？'},answer:{
  en:'JARVIS is exploring a tool-augmented agent that connects experimental data, literature evidence and simulation to form testable hypotheses and guide the next experiment. It is an exploratory research direction.',
  zh:'JARVIS 探索用工具增强智能体连接实验数据、文献证据与模拟，形成可检验的假设并辅助选择下一步实验。这是我持续探索中的科研方向。'},sources:[{label:'JARVIS project',href:'#jarvis'}]},
 {id:'methods',title:{en:'Methods',zh:'方法与技术'},question:{en:'What methods appear in your work?',zh:'项目涉及哪些方法与技术？'},answer:{
  en:'The RM65B project names RealSense, hand–eye calibration, visual localization and robotic grasping. CR5AF focuses on manipulation and automated-pipetting workflows. The animated hand–eye, bundle-adjustment and visual-servo studies are synthetic explanations, not project experiment results.',
  zh:'RM65B 项目涉及 RealSense、手眼标定、视觉定位与机器人抓取；CR5AF 聚焦机器人操作和自动移液流程。背景里的手眼标定、Bundle Adjustment 与视觉伺服是合成计算示例，不是这些项目的实验结果。'},sources:[{label:'RM65B methods',href:'#rm65b'},{label:'CR5AF workflows',href:'#cr5af-project'}]},
 {id:'synthetic',title:{en:'Simulation boundaries',zh:'仿真与实测的区别'},question:{en:'Which parts are simulations?',zh:'哪些画面是仿真或示意？'},answer:{
  en:'The algorithm backgrounds replay precomputed synthetic hand–eye, bundle-adjustment and visual-servo studies. They are not CR5AF or RM65B measurements. The CR5AF model shows presentation poses; the spatial overlay is conceptual. Project descriptions do not claim these visuals as validated experiment results.',
  zh:'算法背景回放预先计算的合成手眼标定、Bundle Adjustment 与视觉伺服轨迹，不是 CR5AF 或 RM65B 的测量结果。CR5AF 模型展示演示姿态，空间图层是概念示意；主页没有把这些画面当作已验证的实验结果。'},sources:[{label:'Perception disclosure',href:'#perception'},{label:'CR5AF disclosure',href:'#cr5af-project'}]},
 {id:'about',title:{en:'About & education',zh:'个人与教育背景'},question:{en:'What is your education?',zh:'你的教育背景是什么？'},answer:{
  en:'I’m Adrian Chen / 陈谦, a Computer Science undergraduate in the Tianjin University × Hong Kong Polytechnic University collaborative program in Shenzhen. My portfolio focuses on AI for Science, embodied intelligence and automated laboratories.',
  zh:'我是 Adrian Chen / 陈谦，就读于天津大学与香港理工大学在深圳的合作项目，学习计算机科学。主页关注 AI for Science、具身智能与自动化实验室。'},sources:[{label:'About Adrian',href:'#closing'}]},
 {id:'contact',title:{en:'Contact',zh:'联系方式'},question:{en:'How can I contact you?',zh:'怎么联系你？'},answer:{
  en:'The public contact email on this portfolio is expcon@qq.com. I welcome discussion about AI for Science, embodied intelligence and laboratory automation. This preview cannot send messages, book meetings or make commitments on my behalf.',
  zh:'主页公开的联系邮箱是 expcon@qq.com。欢迎围绕 AI for Science、具身智能与实验室自动化交流。这个预览不能替我发消息、预约会议或作出承诺。'},sources:[{label:'Contact details',href:'#contact'}]},
 {id:'compare',title:{en:'CR5AF and RM65B',zh:'CR5AF 与 RM65B'},question:{en:'How do CR5AF and RM65B differ?',zh:'CR5AF 和 RM65B 有什么区别？'},answer:{
  en:'CR5AF explores robotic execution and automated-pipetting workflows. RM65B is a separate vision-guided grasping project using RealSense, hand–eye calibration and visual localization. The animated robot model on this homepage is CR5AF.',
  zh:'CR5AF 探索机器人执行与自动移液流程；RM65B 是独立的视觉引导抓取项目，涉及 RealSense、手眼标定和视觉定位。主页中的动态机械臂模型是 CR5AF。'},sources:[{label:'CR5AF project',href:'#cr5af-project'},{label:'RM65B project',href:'#rm65b'}]}
]);
export const SUGGESTED_TOPICS=Object.freeze(['research','cr5af','rm65b','jarvis','methods','synthetic','about','contact']);
const patterns={
 cr5af:/\bcr5af\b/i,rm65b:/\brm65b\b/i,jarvis:/\bjarvis\b/i,
 research:/research (?:focus|direction)|interests?|ai for science|embodied|laboratory automation|work(?:ing)? on|研究方向|科研方向|兴趣|关注|具身智能|智能实验室|实验室自动化/i,
 methods:/methods?|techniques?|technolog|realsense|hand[-– ]?eye|calibrat|visual locali[sz]|方法|技术|标定|视觉定位/i,
 synthetic:/simulat|synthetic|illustrat|experiment results?|real (?:data|measurements?|results?|experiments?)|which parts|动画|仿真|示意|真实数据|实验结果|合成|算法背景/i,
 about:/background|education|universit|undergraduate|student|who are you|about (?:you|adrian)|adrian chen|陈谦|学校|教育|本科|大学|个人介绍|你是谁|介绍自己/i,
 contact:/contact|reach you|get in touch|\be-?mail\b|expcon@qq\.com|联系|邮箱/i
};
const unsupported=/<[^>]*>|ignore.{0,24}instructions|password|secret|api\s*keys?|access token|private|\bgpa\b|grades?|salary|health|diagnos|\bssn\b|credit card|send\b|\bwhen\b|deadline|availability|\bavailable\b|book.{0,12}meeting|promise|commitment|success rate|accuracy|latest|password|密码|密钥|隐私|私密|成绩|绩点|薪资|健康|住址|家庭|内部|帮我发|替我发|发邮件|保证|承诺|截止|什么时候|何时|完成时间|准确率|成功率|性能指标|最新|多少钱|有空|预约/i;
const localized=(en,zh,lang)=>lang==='zh'?zh:en;
function answerTopic(id,lang){
 const item=KNOWLEDGE.find(record=>record.id===id);
 return {kind:'answer',topic:id,title:item.title[lang],text:item.answer[lang],sources:item.sources.map(source=>({...source})),choices:[]};
}
export function answerQuestion(question,language='en'){
 const lang=language==='zh'?'zh':'en';
 const raw=typeof question==='string'?question.trim():'';
 if(!raw)return {kind:'empty',title:localized('Choose a topic','选择一个话题',lang),text:localized('Ask about a project, method, research focus or public contact detail.','可以询问项目、方法、研究方向或公开联系方式。',lang),sources:[],choices:[...SUGGESTED_TOPICS]};
 const unknown=()=>({kind:'unknown',title:localized('Not covered by these notes','这份知识库暂未收录',lang),text:localized('This offline preview has no verified answer to that question. Try a suggested portfolio topic or contact Adrian directly.','这份公开资料暂未收录相关答案。可以继续聊已有项目，或通过主页联系方式直接交流。',lang),sources:[{label:'Contact / 联系',href:'#contact'}],choices:[]});
 const q=raw.normalize('NFKC');
 if(raw.length>280||unsupported.test(q)||/funded|funding|payload|weather|home address|how old|born|source code|architecture|cost|price|成本|毕业|年龄|出生|资金|架构|源码/i.test(q))return unknown();
 const projects=['cr5af','rm65b','jarvis'].filter(id=>patterns[id].test(q));
 // A project name alone is not evidence for arbitrary specifics. Only accept
 // introductory/comparison phrasing; unfamiliar wording gets an honest fallback.
 if(projects.length){
  const remainder=q.toLowerCase().replace(/cr5af|rm65b|jarvis/g,'')
   .replace(/\b(?:can|could|you|please|tell|me|about|the|a|an|project|projects|what|is|are|does|do|for|your|work|how|and|differ|different|difference|between|compare|comparison|vs|versus|introduce|explain|overview|summary|research|ai|science|to|of|in|on)\b/g,'')
   .replace(/介绍一下|介绍|一下|项目|是什么|是做什么的|有什么区别|区别|比较|对比|分别|和|与|以及|请|你|的|研究|方向/g,'').replace(/[\s\p{P}]/gu,'');
  if(remainder)return unknown();
 }

 if(!projects.length){
  const remainder=q.toLowerCase()
   .replace(/\b(?:what|which|who|how|can|could|you|your|are|is|do|i|me|my|the|a|an|and|or|of|in|on|to|for|about|tell|please|introduce|overview|summary|research|focus|directions?|interests?|ai|science|embodied|intelligence|laboratory|automation|working|work|methods?|techniques?|technologies|technology|appear|use|realsense|hand|eye|calibration|visual|localization|localisation|simulations?|simulated|synthetic|illustrations?|illustrated|experiment|experiments|experimental|results?|real|data|measurements?|parts|education|background|university|universities|undergraduate|student|adrian|chen|contact|reach|email|e-mail|get|touch)\b/g,'')
   .replace(/你的|是什么|是哪些|哪些|我的|你|我|是|的|有|什么|怎么|如何|一下|介绍|研究方向|科研方向|研究|方向|兴趣|关注|具身智能|智能实验室|实验室自动化|项目|涉及|方法|技术|与|和|标定|视觉定位|动画|仿真|示意|真实数据|实验结果|合成|算法背景|画面|教育背景|教育|背景|本科|大学|学校|个人介绍|自己|谁|陈谦|联系|邮箱|或/g,'')
   .replace(/[\s\p{P}]/gu,'');
  if(remainder||/^how\s+(?:does|do)\b/i.test(q))return unknown();
 }
 if(patterns.synthetic.test(q))return answerTopic('synthetic',lang);
 if(projects.includes('cr5af')&&projects.includes('rm65b')&&/differ|compar|\bvs\b|versus|区别|比较|对比|分别/i.test(q))return answerTopic('compare',lang);
 const matches=projects.length?projects:Object.keys(patterns).filter(id=>!['cr5af','rm65b','jarvis'].includes(id)&&patterns[id].test(q));
 if(matches.length===1)return answerTopic(matches[0],lang);
 if(matches.length>1)return {kind:'ambiguous',title:localized('Choose one topic','请先选择一个话题',lang),text:localized('These notes cover several parts of your question. Choose a topic below to see its verified summary.','这个问题涉及多个已收录话题。请先选一个，查看对应的已核实摘要。',lang),sources:[],choices:matches};
 return unknown();
}
