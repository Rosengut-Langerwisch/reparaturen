'use strict';
const CFG={clientId:'0fb63a5b-1b13-4e0a-8557-2539b2b96258',tenantId:'a1401f5e-c83f-4acf-adcb-93291e8b26aa',host:'rosengutde.sharepoint.com',path:'/sites/Reparaturen'};
const SCOPES=['User.Read','Sites.ReadWrite.All'], $=id=>document.getElementById(id);
const S={app:null,account:null,site:null,lists:{},photoField:null,photoDriveId:null,photoUrls:{},historyTypeField:null,historyPhotoField:null,employeeNameField:null,employeeRoleField:null,admin:false,cases:[],back:'overview',historyEntries:[],notifications:[],adminEmails:[]};
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dt=x=>x?new Date(x).toLocaleString('de-DE',{dateStyle:'medium',timeStyle:'short'}):'–';
const statusPill=x=>`<span class="pill ${x==='Erledigt'?'status-done':x==='Neu'?'status-new':'status-progress'}">${esc(x||'Unbekannt')}</span>`;
const prioPill=x=>`<span class="pill ${x==='Dringend'?'red':x==='Niedrig'?'':'purple'}">${esc(x||'–')}</span>`;
function msg(id,t,err=false){$(id).innerHTML=`<div class="notice ${err?'error':''}">${esc(t)}</div>`}
/* Modul-Registry: Jede Funktion des Hubs (Reparaturen, Team, später Seminare, Schwarzes Brett …)
   meldet sich mit registerModule({...}) an. Mögliche Felder:
   id, tile:{view,symbol,title,text}, views:{viewId:(arg)=>…}, ready(), load(), poll(), deepLink(params) */
const MODULES=[],VIEWS={};
function registerModule(m){MODULES.push(m);Object.assign(VIEWS,m.views||{})}
