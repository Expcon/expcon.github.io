import config from './feedback-config.js';

export function validConfig(value){
 return /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(value?.url||'')&&/^sb_publishable_[A-Za-z0-9_-]+$/.test(value?.publishableKey||'');
}
export async function submitFeedback(value,settings=config){
 const message=String(value).trim();
 if([...message].length<3||[...message].length>1000)throw Error('请填写 3–1000 字的反馈。');
 if(!validConfig(settings))throw Error('反馈通道尚未配置，请通过上方邮箱联系我。');
 try{
  const response=await fetch(settings.url+'/rest/v1/portfolio_feedback',{
   method:'POST',headers:{apikey:settings.publishableKey,'Content-Type':'application/json',Prefer:'return=minimal'},
   body:JSON.stringify({message}),credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(12000)
  });
  if(!response.ok)throw Error('Submission not confirmed');
 }catch{
  // A timeout may occur after the server accepted the row; never silently retry.
  throw Error('未能确认提交成功，内容已保留。网络恢复后可重试，也可通过邮箱联系我；重试可能重复提交。');
 }
}

if(typeof document!=='undefined'){
 const form=document.getElementById('feedback-form');
 if(form){
  const field=form.elements.message,button=form.querySelector('button'),status=document.getElementById('feedback-status');
  let sending=false;
  button.disabled=!validConfig(config);
  status.textContent=button.disabled?'反馈通道尚未配置，请通过上方邮箱联系我。':'';
  form.addEventListener('submit',async event=>{
   event.preventDefault();if(sending||!form.reportValidity())return;
   sending=true;button.disabled=true;form.setAttribute('aria-busy','true');status.textContent='正在提交…';
   try{await submitFeedback(field.value);field.value='';status.textContent='已提交，谢谢。反馈仅供 Adrian 查看，不会公开展示。';}
   catch(error){status.textContent=error.message;}
   finally{sending=false;button.disabled=!validConfig(config);form.setAttribute('aria-busy','false');}
  });
 }
}
