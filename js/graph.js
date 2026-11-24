'use strict';
async function token(){try{return (await S.app.acquireTokenSilent({scopes:SCOPES,account:S.account})).accessToken}catch(e){return (await S.app.acquireTokenPopup({scopes:SCOPES,account:S.account})).accessToken}}
async function api(path,opts={}){const t=await token(),r=await fetch('https://graph.microsoft.com/v1.0'+path,{...opts,headers:{Authorization:'Bearer '+t,...(opts.body?{'Content-Type':'application/json'}:{}),...(opts.headers||{})}}),d=r.status===204?{}:await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error?.message||`Graph-Fehler ${r.status}`);return d}
async function pages(path){let p=path,a=[];while(p){const d=await api(p.replace('https://graph.microsoft.com/v1.0',''));a.push(...(d.value||[]));p=d['@odata.nextLink']||''}return a}

async function createMsal(){S.app=new msal.PublicClientApplication({auth:{clientId:CFG.clientId,authority:'https://login.microsoftonline.com/'+CFG.tenantId,redirectUri:location.origin+location.pathname},cache:{cacheLocation:'localStorage'}});await S.app.initialize()}
/* Löscht nur die Anmelde-Zwischenspeicher dieser App (MSAL) und bereinigt die Adresszeile; Gelesen-Markierungen bleiben erhalten */
function resetMsalCache(){[localStorage,sessionStorage].forEach(st=>{try{Object.keys(st).filter(k=>/^msal\./i.test(k)||k.includes(CFG.clientId)).forEach(k=>st.removeItem(k))}catch(_){}});try{window.history.replaceState(null,'',location.pathname+location.search)}catch(_){}}
function resetAndReload(){resetMsalCache();sessionStorage.removeItem('msalAutoReset');location.replace(location.pathname)}
