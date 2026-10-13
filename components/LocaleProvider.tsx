'use client';
import { createContext,useContext,useEffect,useState,type ReactNode } from 'react';
import type { Lang } from '@/lib/i18n';
const Context=createContext<{lang:Lang;setLang:(lang:Lang)=>void}>({lang:'zh',setLang:()=>{}});
export const useLocale=()=>useContext(Context);
export default function LocaleProvider({children}:{children:ReactNode}){
  const [lang,update]=useState<Lang>('zh');
  useEffect(()=>{
    const query=new URLSearchParams(window.location.search).get('lang');
    const saved=document.cookie.match(/(?:^|;\s*)agent_lang=(zh|en)(?:;|$)/)?.[1];
    const next=query==='en'||query==='zh'?query:saved==='en'?'en':'zh';
    update(next);document.documentElement.lang=next==='en'?'en':'zh-CN';
    document.cookie=`agent_lang=${next}; Path=/; SameSite=Lax; Max-Age=31536000`;
  },[]);
  function setLang(next:Lang){
    update(next);document.documentElement.lang=next==='en'?'en':'zh-CN';
    document.cookie=`agent_lang=${next}; Path=/; SameSite=Lax; Max-Age=31536000`;
    const url=new URL(window.location.href);url.searchParams.set('lang',next);window.history.replaceState({},'',url);
  }
  return <Context.Provider value={{lang,setLang}}>{children}</Context.Provider>;
}
