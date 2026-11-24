'use strict';
async function token(){try{return (await S.app.acquireTokenSilent({scopes:SCOPES,account:S.account})).accessToken}catch(e){return (await S.app.acquireTokenPopup({scopes:SCOPES,account:S.account})).accessToken}}
async function api(path,opts={}){const t=await token(),r=await fetch('https://graph.microsoft.com/v1.0'+path,{...opts,headers:{Authorization:'Bearer '+t,...(opts.body?{'Content-Type':'application/json'}:{}),...(opts.headers||{})}}),d=r.status===204?{}:await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error?.message||`Graph-Fehler ${r.status}`);return d}
async function pages(path){let p=path,a=[];while(p){const d=await api(p.replace('https://graph.microsoft.com/v1.0',''));a.push(...(d.value||[]));p=d['@odata.nextLink']||''}return a}
