'use client';
import {useLocale} from './LocaleProvider';
import {copy} from '@/lib/accounts/locale';
export default function BrandHeader() {
  const {lang,setLang}=useLocale(); const tx=(text:string)=>copy(lang,text);
  return <header className="account-brand">
    <a className="brand-lockup" href="/" aria-label={tx("返回香气工作台")}>
      <img src="/brand/team-logo-westlake.png" alt="Westlake iGEM" className="brand-logo" />
      <div><p className="brand-name">{tx("AI 个性化香氛")}</p><p className="brand-team">{tx("西湖大学 iGEM 2026")}</p></div>
    </a>
    <div className="account-brand-tools"><div className="language-switch" aria-label="Language"><button type="button" onClick={()=>setLang('zh')} className={lang==='zh'?'is-active':''}>ZH</button><button type="button" onClick={()=>setLang('en')} className={lang==='en'?'is-active':''}>EN</button></div><span className="account-brand-note">{tx("你的香气手记")}<span aria-hidden="true">✦</span></span></div>
  </header>;
}
