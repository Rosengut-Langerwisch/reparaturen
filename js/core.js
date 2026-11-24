'use strict';
async function initApp(){
 await createMsal();let rr=null;try{rr=await S.app.handleRedirectPromise()}catch(e){console.warn('MSAL-Zwischenspeicher wird zurückgesetzt',e);resetMsalCache();await createMsal()}S.account=(rr&&rr.account)||S.app.getAllAccounts()[0];
 if(!S.account){$('login').classList.remove('hidden');$('loginBtn').onclick=()=>S.app.loginRedirect({scopes:SCOPES});return}
 await token();S.site=await api('/sites/'+CFG.host+':'+CFG.path);
 const ls=await api(`/sites/${S.site.id}/lists?$select=id,displayName`);(ls.value||[]).forEach(x=>S.lists[x.displayName]=x);
 for(const n of ['Fälle','Verlauf','Admins','Fotos','Mitarbeiter'])if(!S.lists[n])throw Error(`SharePoint-Element „${n}“ fehlt.`);
 const caseColumns=await api(`/sites/${S.site.id}/lists/${S.lists['Fälle'].id}/columns?$select=name,displayName`);
 const photoColumn=(caseColumns.value||[]).find(c=>(c.displayName||'').toLowerCase()==='fotoids'||(c.name||'').toLowerCase()==='fotoids');
 S.photoField=photoColumn?.name||null;
 const photoDrive=await api(`/sites/${S.site.id}/lists/${S.lists.Fotos.id}/drive`);S.photoDriveId=photoDrive.id;
 const historyColumns=await api(`/sites/${S.site.id}/lists/${S.lists.Verlauf.id}/columns?$select=name,displayName`);
 const typeColumn=(historyColumns.value||[]).find(c=>(c.displayName||'').toLowerCase()==='eintragsart'||(c.name||'').toLowerCase()==='eintragsart');
 const historyPhoto=(historyColumns.value||[]).find(c=>['fotoids','fotoid'].includes((c.displayName||'').toLowerCase())||['fotoids','fotoid'].includes((c.name||'').toLowerCase()));
 S.historyTypeField=typeColumn?.name||null;S.historyPhotoField=historyPhoto?.name||null;
 const admins=await pages(`/sites/${S.site.id}/lists/${S.lists.Admins.id}/items?$expand=fields&$top=200`);
 S.adminEmails=admins.map(x=>String(x.fields?.Title||'').trim().toLowerCase()).filter(Boolean);
  S.admin=S.adminEmails.includes(String(S.account.username||'').toLowerCase());
 const empCols=await api(`/sites/${S.site.id}/lists/${S.lists.Mitarbeiter.id}/columns?$select=name,displayName`);
 const empCol=(label)=>((empCols.value||[]).find(c=>(c.displayName||'').toLowerCase()===label.toLowerCase()||(c.name||'').toLowerCase()===label.toLowerCase())||{}).name;
 S.employeeNameField=empCol('MitarbeiterName')||'MitarbeiterName';S.employeeRoleField=empCol('Rolle')||'Rolle';
 const accountName=S.account.name||S.account.username||'';const accountParts=accountName.trim().split(/\s+/).filter(Boolean);const initials=(accountParts.length>1?[accountParts[0],accountParts[accountParts.length-1]]:[accountParts[0]||'']).map(v=>v.charAt(0)).join('').toUpperCase()||'•';$('profileBtn').textContent=initials;$('profileName').textContent=S.account.name||S.account.username||'';$('profileEmail').textContent=S.account.username||'';$('profileBtn').classList.remove('hidden');$('profileBtn').onclick=toggleProfileMenu;$('myCasesBtn').onclick=showMyCases;$('logout').onclick=()=>S.app.logoutRedirect({account:S.account});$('homeBtn').classList.remove('hidden');$('homeBtn').onclick=()=>go('home');$('notificationBtn').classList.remove('hidden');$('notificationBtn').onclick=toggleNotifications;
 $('logout').onclick=()=>S.app.logoutRedirect({account:S.account});$('greeting').textContent='Hallo '+(S.account.name||'!');$('role').textContent=S.admin?'Administrator':'Mitarbeiter';
 $('app').classList.remove('hidden');
 renderTiles();
 document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>go(b.dataset.view));
 $('brandHome').onclick=e=>{e.preventDefault();go('home')};
 document.querySelectorAll('[data-home]').forEach(b=>b.onclick=()=>go('home'));
 MODULES.forEach(m=>m.ready&&m.ready());
 for(const m of MODULES)if(m.load)await m.load();
 const params=new URLSearchParams(location.search);let handled=false;
 for(const m of MODULES){if(m.deepLink&&await m.deepLink(params)){handled=true;break}}
 if(!handled)go('home');
 sessionStorage.removeItem('msalAutoReset');
 setInterval(()=>MODULES.forEach(m=>m.poll&&m.poll()),60000);
}
function renderTiles(){$('homeTiles').innerHTML=MODULES.filter(m=>m.tile).map(m=>`<button class="tile" data-view="${esc(m.tile.view)}"><div class="symbol">${esc(m.tile.symbol)}</div><b>${esc(m.tile.title)}</b><span>${esc(m.tile.text)}</span></button>`).join('')}
function go(v,openPerson=''){closeHeaderMenus();const views=[...document.querySelectorAll('#app>section[id^="v-"]')].map(s=>s.id.slice(2));if(!views.includes(v)&&v!=='home')v='home';$('homeMenu').classList.toggle('hidden',v!=='home');views.forEach(x=>$('v-'+x).classList.toggle('hidden',x!==v));const hook=VIEWS[v];if(hook)hook(openPerson)}
function toggleProfileMenu(){const menu=$('profileMenu'),open=menu.classList.contains('hidden');$('notificationPanel').classList.add('hidden');menu.classList.toggle('hidden',!open);$('profileBtn').setAttribute('aria-expanded',String(open))}
function showMyCases(){$('profileMenu').classList.add('hidden');$('profileBtn').setAttribute('aria-expanded','false');go('employees',S.account.username||'')}
function closeProfileMenu(){$('profileMenu').classList.add('hidden');$('profileBtn').setAttribute('aria-expanded','false')}
function closeHeaderMenus(){$('notificationPanel').classList.add('hidden');closeProfileMenu()}
document.addEventListener('click',e=>{if(!e.target.closest('.header-right')){$('notificationPanel').classList.add('hidden');$('profileMenu').classList.add('hidden');$('profileBtn').setAttribute('aria-expanded','false')}});
