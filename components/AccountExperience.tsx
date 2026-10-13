'use client';
import { usePathname } from 'next/navigation';
import BrandHeader from './BrandHeader';
import { useLocale } from './LocaleProvider';
import {copy,localizedOptions,localizedFamilies,localizedProfileSummary,localizedError} from '@/lib/accounts/locale';
import { createContext,useContext,useEffect,useState,type ReactNode } from 'react';
import { families,affinities,contexts,avoidances,sweetness,presence,experience,exploration,emptyAnswers,validateAnswers,profileSummary,type Answers } from '@/lib/accounts/questionnaire';
type Profile = {answers:Answers;version:number;summary:string};
type Memory = {id:string;field:string;value:string;evidence:string;status:string};
type Account = { user:{id:string;name:string;email:string;isAdmin:boolean};profile:Profile|null;memories:Memory[] };
type AccountContextValue = { temporaryAnswers:Answers|null; refresh:()=>Promise<void> };
const AccountContext = createContext<AccountContextValue>({temporaryAnswers:null,refresh:async()=>{}});
export const useAccount = () => useContext(AccountContext);
async function api(path:string,method='GET',body?:unknown) {
  const response=await fetch(path,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});
  const data=await response.json();
  if(!response.ok) throw new Error(data.error?.message || data.error || data.message || '操作失败，请稍后重试。');
  return data;
}
function Options({title,items,value,onChange,hint}:{title:string;items:readonly(readonly[string,string])[];value:string;onChange:(v:string)=>void;hint?:string}) {
  return <fieldset className="account-question"><legend>{title}</legend>{hint&&<p className="account-hint">{hint}</p>}<div className="account-options">{items.map(([id,label])=><label key={id} className={value===id?'selected':''}><input type="radio" name={title} value={id} checked={value===id} onChange={()=>onChange(id)}/><span>{label}</span></label>)}</div></fieldset>;
}
function Multiple({title,items,value,onChange,exclusive=[]}:{title:string;items:readonly(readonly[string,string])[];value:string[];onChange:(v:string[])=>void;exclusive?:string[]}) {
  return <fieldset className="account-question"><legend>{title}</legend><div className="account-options">{items.map(([id,label])=><label key={id} className={value.includes(id)?'selected':''}><input type="checkbox" checked={value.includes(id)} onChange={()=>onChange(value.includes(id)?value.filter(v=>v!==id):exclusive.includes(id)?[id]:[...value.filter(v=>!exclusive.includes(v)),id])}/><span>{label}</span></label>)}</div></fieldset>;
}
function Questionnaire({initial,version,onDone,onCancel}:{initial:Answers;version:number;onDone:(p:Profile|null,a:Answers|null)=>void;onCancel?:()=>void}) {
  const {lang}=useLocale(); const tx=(text:string)=>copy(lang,text);
  const [a,setA]=useState<Answers>(initial),[step,setStep]=useState(0),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [review,setReview]=useState(false),[persist,setPersist]=useState<boolean|null>(version>0?true:null);
  const change=<K extends keyof Answers>(key:K,value:Answers[K])=>setA(prev=>({...prev,[key]:value}));
  async function submit() {
    setError('');
    try {
      const answers=validateAnswers(a);
      if(persist===null) throw new Error('请选择保存到账号，或仅用于本次。');
      setBusy(true);
      if(persist) { const result=await api('/api/me/questionnaire','PUT',{answers,expectedVersion:version}); onDone(result.profile,null); }
      else onDone(null,answers);
    } catch(e) {setError(e instanceof Error?e.message:'保存失败。');} finally {setBusy(false);}
  }
  function next() {
    setError('');
    if(step===0&&(!a.experienceLevel||!a.usualContexts.length)){setError('请回答使用经验和场景，也可以选择不确定。');return;}
    if(step===1&&families.some(([id])=>!a.familyAffinity[id])){setError('请评价每类气味，也可以选择说不清。');return;}
    if(step===2) {try{validateAnswers({...a,explorationPreference:a.explorationPreference||'unknown'});}catch(e){setError((e as Error).message);return;}}
    if(step<3)setStep(step+1);else {try{validateAnswers(a);setReview(true);}catch(e){setError((e as Error).message);}}
  }
  return <section className="account-card questionnaire"><p className="account-eyebrow">{tx("你的香气偏好")}</p><h1>{review?tx("我们这样理解你的日常偏好"):tx("让我们先了解你喜欢的香气")}</h1>
    <p className="account-hint">{tx("回答平时的偏好，每次生成仍可提出不同要求。没有标准答案，说不清时可以选不确定；答案以后可以修改。")}</p>
    {!review&&<><div className="account-progress" aria-label={lang==='en'?`Step ${step+1} of 4`:`第${step+1}步，共4步`}>{[tx("基本情况"),tx("气味喜好"),tx("日常目标与避让"),tx("补充与确认")].map((s,i)=><span key={s} className={i===step?'active':''}>{i+1} {s}</span>)}</div>
    {step===0&&<><label className="account-input">{tx("1. 我们可以怎么称呼你？（可选）")}<input maxLength={30} value={a.displayName} onChange={e=>change('displayName',e.target.value)} placeholder={tx("昵称就可以，不需要真实姓名")}/></label>
      <Options title={tx("2. 你对香水的使用经验更接近哪一种？")} items={localizedOptions(experience,'experience',lang)} value={a.experienceLevel} onChange={v=>change('experienceLevel',v)}/>
      <Multiple title={tx("3. 你通常想在哪些场景使用香水？")} items={localizedOptions(contexts,'contexts',lang)} value={a.usualContexts} exclusive={['unknown']} onChange={v=>change('usualContexts',v)}/>
      {a.usualContexts.includes('other')&&<label className="account-input">{tx("其他场景")}<input maxLength={60} value={a.contextOther} onChange={e=>change('contextOther',e.target.value)}/></label>}</>}
    {step===1&&<><h2>{tx("4. 对下面这些气味，你平时的感受是什么？")}</h2><p className="account-hint">{tx("喜欢程度与希望它有多浓不同。这些例子帮助理解类别，不代表同一类气味你都喜欢。")}</p>
      <button className="account-link" onClick={()=>setA(prev=>({...prev,familyAffinity:Object.fromEntries(families.map(([id])=>[id,prev.familyAffinity[id]||'unknown']))}))}>{tx("把尚未回答的类别标为“说不清”")}</button>
      {localizedFamilies(lang).map(([id,label,hint])=><Options key={id} title={label} hint={hint} items={localizedOptions(affinities,'affinities',lang)} value={a.familyAffinity[id]||''} onChange={v=>change('familyAffinity',{...a.familyAffinity,[id]:v})}/>)}</>}
    {step===2&&<><Options title={tx("5. 你平时希望香水里有多少甜感？")} items={localizedOptions(sweetness,'sweetness',lang)} value={a.sweetnessPreference} onChange={v=>change('sweetnessPreference',v)} hint={tx("可以喜欢香草，同时只希望配方有一点甜感。")}/>
      <Options title={tx("6. 你希望香气的存在感怎样？")} items={localizedOptions(presence,'presence',lang)} value={a.presencePreference} onChange={v=>change('presencePreference',v)} hint={tx("这里问容易被闻到的程度，不是持续多久。")}/>
      <Multiple title={tx("7. 有没有希望配方尽量避免的气味？")} items={localizedOptions(avoidances,'avoidances',lang)} value={a.odorAvoidances} exclusive={['none','unknown']} onChange={v=>change('odorAvoidances',v)}/>
      {a.odorAvoidances.includes('specific_floral')&&<label className="account-input">{tx("希望避免的特定花香")}<input maxLength={120} value={a.specificFloral} onChange={e=>change('specificFloral',e.target.value)} placeholder={tx("例如玫瑰")}/></label>}
      {a.odorAvoidances.includes('other')&&<label className="account-input">{tx("其他希望避免的气味")}<input maxLength={120} value={a.odorAvoidanceOtherText} onChange={e=>change('odorAvoidanceOtherText',e.target.value)}/></label>}
      <Options title={tx("8. 有没有希望系统始终排除的具体原料？")} items={[['named',tx("有，我知道具体名称")],['none_known',tx("目前没有已知需要排除的原料")],['unknown',tx("我不清楚")],['withheld',tx("暂不提供")]]} value={a.ingredientExclusionAnswer} onChange={v=>change('ingredientExclusionAnswer',v as Answers['ingredientExclusionAnswer'])} hint={tx("不喜欢某种气味可以填上一题。原料排除需要核对，记录要求不等于安全保证。")}/>
      {a.ingredientExclusionAnswer==='named'&&<label className="account-input">{tx("请填写原料名称，多项可用顿号分隔")}<textarea maxLength={300} value={a.ingredientExclusionText} onChange={e=>change('ingredientExclusionText',e.target.value)} placeholder={tx("填写具体名称；无法核对时系统会提示，不会忽略。")}/></label>}
      <Options title={tx("9. 没有特别要求时，希望推荐多接近已有偏好？")} items={localizedOptions(exploration,'exploration',lang)} value={a.explorationPreference} onChange={v=>change('explorationPreference',v)}/></>}
    {step===3&&<><h2>{tx("10. 有没有具体气味或香水，能帮助我们了解你？（可选）")}</h2><label className="account-input">{tx("你喜欢什么，喜欢它的哪一点？")}<textarea maxLength={300} value={a.likedExamplesText} onChange={e=>change('likedExamplesText',e.target.value)} placeholder={tx("例如：喜欢乌龙茶，但不想要明显甜感")}/></label>
      <label className="account-input">{tx("你不喜欢什么，不喜欢它的哪一点？")}<textarea maxLength={300} value={a.dislikedExamplesText} onChange={e=>change('dislikedExamplesText',e.target.value)} placeholder={tx("生活中的气味也可以，不需要专业术语")}/></label></>}
    </>}
    {review&&<><pre className="account-summary">{localizedProfileSummary(a,lang)}</pre><Options title={tx("这些偏好如何使用？")} items={[['persistent',tx("保存到账号，以后继续使用")],['temporary',tx("仅用于本次，不保存为长期偏好")]]} value={persist===null?'':persist?'persistent':'temporary'} onChange={v=>setPersist(v==='persistent')}/><p className="account-hint">{tx("生成时，必要偏好和本次需求会提供给 AI；邮箱和登录凭证不会作为调香信息发送。仅本次模式不会替换已保存的原料排除要求。")}</p></>}
    {error&&<p className="account-error" role="alert">{localizedError(error,lang)}</p>}<div className="account-actions">
      {onCancel&&<button className="account-secondary" onClick={onCancel} disabled={busy}>{tx("取消修改")}</button>}
      {(step>0||review)&&<button className="account-secondary" disabled={busy} onClick={()=>{setError('');if(review)setReview(false);else setStep(step-1);}}>{tx("上一步")}</button>}
      <button className="account-primary" disabled={busy} onClick={review?submit:next}>{busy?tx("正在保存…"):review?(persist?tx("确认并保存，开始生成"):tx("确认，开始生成")):step===3?tx("查看画像摘要"):tx("下一步")}</button>
    </div>
  </section>;
}
export default function AccountExperience({children}:{children:ReactNode}) {
  const {lang}=useLocale(); const tx=(text:string)=>copy(lang,text);
  const [account,setAccount]=useState<Account|null>(null),[loading,setLoading]=useState(true),[failure,setFailure]=useState('');
  const [register,setRegister]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[passwordConfirm,setPasswordConfirm]=useState(''),[name,setName]=useState('');
  const pathname=usePathname();
  const [edit,setEdit]=useState(false),[panel,setPanel]=useState(false),[temporaryAnswers,setTemporary]=useState<Answers|null>(null);
  const [oldPassword,setOldPassword]=useState(''),[newPassword,setNewPassword]=useState('');
  async function refresh(){
    const response=await fetch('/api/me',{cache:'no-store'});
    if(response.status===401){setAccount(null);setFailure('');return;}
    const data=await response.json();if(!response.ok)throw new Error(data.error||'账号服务暂时不可用。');setAccount(data);setFailure('');
  }
  useEffect(()=>{refresh().catch(e=>setFailure(e.message)).finally(()=>setLoading(false));},[]);
  async function authenticate(e:React.FormEvent){
    e.preventDefault();setError('');
    if(register&&password!==passwordConfirm){setError('两次输入的密码不一致，请重新确认。');return;}
    setBusy(true);
    try{await api(`/api/auth/${register?'sign-up':'sign-in'}/email`,'POST',register?{email,password,passwordConfirm,name:name.trim()||email.split('@')[0].slice(0,30)}:{email,password});await refresh();setPassword('');setPasswordConfirm('');}
    catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  async function memory(id:string,action:string){setBusy(true);setError('');try{await api('/api/me/memories','POST',{id,action,expectedVersion:account?.profile?.version});await refresh();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  async function logout(){setBusy(true);try{await api('/api/auth/sign-out','POST',{});window.location.assign('/');}catch(e){setError((e as Error).message);setBusy(false);}}
  if(loading)return <div className="account-shell"><p>{tx("正在读取账号…")}</p></div>;
  if(failure)return <div className="account-shell"><section className="account-card"><h1>{tx("账号服务暂时不可用")}</h1><p role="alert">{localizedError(failure,lang)}</p><button className="account-primary" onClick={()=>window.location.reload()}>{tx("重试")}</button></section></div>;
  if(!account)return <div className="account-shell"><BrandHeader/><div className="account-auth-layout"><aside className="account-intro"><p className="eyebrow">{tx("一份属于你的香气")}</p><h2>{tx("从你的喜好，")}<br/>{tx("开始调香。")}</h2><div className="hand-line" aria-hidden="true"/><p>{tx("记下平时喜欢的气味，让每一次新的灵感，都有属于你的起点。")}</p><img src="/brand/floral-mascot.gif" alt="" aria-hidden="true"/></aside><form className="account-card account-login" onSubmit={authenticate}><p className="account-eyebrow">{tx("你的香气手记")}</p><h1>{register?tx("创建你的香气账号"):tx("欢迎回来")}</h1><p className="account-hint">{tx("首次登录后填写问卷，之后可以随时修改。")}</p>
    {register&&<label className="account-input">{tx("昵称（可选）")}<input maxLength={30} value={name} onChange={e=>setName(e.target.value)} autoComplete="nickname"/></label>}
    <label className="account-input">{tx("邮箱")}<input type="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></label>
    <label className="account-input">{tx("密码")}<input type="password" required minLength={register?12:1} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} autoComplete={register?'new-password':'current-password'}/></label>
    {register&&<label className="account-input">{tx("确认密码")}<input type="password" required minLength={12} maxLength={128} value={passwordConfirm} onChange={e=>setPasswordConfirm(e.target.value)} autoComplete="new-password"/></label>}
    <p className="account-hint">{register?tx("使用至少12个字符的密码。"):''}{tx("尚未配置邮件找回密码，请妥善保存密码。")}</p>
    {error&&<p className="account-error" role="alert">{localizedError(error,lang)}</p>}<button className="account-primary" disabled={busy}>{busy?tx("请稍候…"):register?tx("注册并填写问卷"):tx("登录")}</button>
    <button className="account-link" type="button" onClick={()=>{setRegister(!register);setError('');setPassword('');setPasswordConfirm('');}}>{register?tx("已有账号，去登录"):tx("没有账号？创建账号")}</button>
  </form></div></div>;
  if(pathname.startsWith('/admin'))return <AccountContext.Provider value={{temporaryAnswers,refresh}}>{children}</AccountContext.Provider>;
  const needsQuestionnaire=!account.profile&&!temporaryAnswers;
  return <AccountContext.Provider value={{temporaryAnswers,refresh}}><div className="account-bar"><span>{account.profile?.answers.displayName||account.user.name} · {temporaryAnswers?tx("本次偏好"):account.profile?tx("已载入日常偏好"):tx("待填写偏好")}</span><div>{account.user.isAdmin&&<a className="account-admin-link" href="/admin">{tx("数据后台")}</a>}<button onClick={()=>{setPanel(!panel);setError('');}}>{tx("偏好与记忆")}{account.memories.some(m=>m.status==='pending')?tx(" · 有待确认"):''}</button><button disabled={busy} onClick={logout}>{tx("退出账号")}</button></div></div>
    {(needsQuestionnaire||edit)?<div className="account-shell"><BrandHeader/><Questionnaire key={account.profile?.version||0} initial={account.profile?.answers||emptyAnswers(account.user.name)} version={account.profile?.version||0} onCancel={needsQuestionnaire?undefined:()=>setEdit(false)} onDone={(p,a)=>{if(p)setAccount({...account,profile:p,memories:[]});setTemporary(a);setEdit(false);setPanel(false);}}/></div>:
    panel?<div className="account-shell"><BrandHeader/><section className="account-card"><h1>{tx("你的偏好与记忆")}</h1><pre className="account-summary">{temporaryAnswers?localizedProfileSummary(temporaryAnswers,lang):account.profile?localizedProfileSummary(account.profile.answers,lang):undefined}</pre><div className="account-actions"><button className="account-primary" onClick={()=>{setEdit(true);setError('');}}>{tx("修改问卷")}</button><button className="account-secondary" onClick={()=>setPanel(false)}>{tx("返回生成")}</button></div>
      <h2>{tx("从反馈得到的记忆")}</h2><p className="account-hint">{tx("只有你确认的记忆才影响以后的生成。撤销后恢复问卷或仍有效的其他记忆。")}</p>
      {account.memories.length?account.memories.map(m=><article className="account-memory" key={m.id}><strong>{m.field==='sweetnessPreference'?tx("日常甜感"):tx("日常存在感")}：{localizedOptions(m.field==='sweetnessPreference'?sweetness:presence,m.field==='sweetnessPreference'?'sweetness':'presence',lang).find(([id])=>id===m.value)?.[1]||m.value}</strong><p>{tx("依据：")}{m.evidence}</p><div className="account-actions">{m.status==='pending'&&<button disabled={busy} className="account-primary" onClick={()=>memory(m.id,'confirm')}>{tx("确认记住")}</button>}<button disabled={busy} className="account-secondary" onClick={()=>memory(m.id,'revoke')}>{m.status==='pending'?tx("不记住"):tx("撤销记忆")}</button></div></article>):<p>{tx("还没有从反馈产生的记忆。")}</p>}
      <h2>{tx("账号管理")}</h2><p className="account-hint">{tx("邮箱用于登录，尚未进行邮件验证。导出包含你的问卷、配方和反馈。")}</p><a className="account-link" href="/api/me/export">{tx("下载我的数据")}</a>
      <form onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{await api('/api/auth/change-password','POST',{currentPassword:oldPassword,newPassword,revokeOtherSessions:true});setOldPassword('');setNewPassword('');setError(tx("密码已更新。"));}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>
        <label className="account-input">{tx("当前密码")}<input type="password" autoComplete="current-password" required value={oldPassword} onChange={e=>setOldPassword(e.target.value)}/></label>
        <label className="account-input">{tx("新密码")}<input type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={newPassword} onChange={e=>setNewPassword(e.target.value)}/></label><button className="account-secondary" disabled={busy}>{tx("更新密码")}</button>
      </form><button className="account-link account-danger" disabled={busy} onClick={async()=>{const p=window.prompt(tx("删除账号将删除问卷、记忆、配方和反馈。请输入当前密码确认："));if(!p)return;setBusy(true);try{await api('/api/auth/delete-user','POST',{password:p});window.location.assign('/');}catch(e){setError((e as Error).message);setBusy(false);}}}>{tx("删除账号与个人数据")}</button>
      {error&&<p className="account-error" role="status">{localizedError(error,lang)}</p>}
    </section></div>:children}
  </AccountContext.Provider>;
}
