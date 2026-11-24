'use strict';
const readKey=()=>`repairNotificationsRead_${S.account.username.toLowerCase()}`;
function readSet(){try{return new Set(JSON.parse(localStorage.getItem(readKey())||'[]'))}catch(_){return new Set()}}
async function refreshNotifications(){try{const h=await pages(`/sites/${S.site.id}/lists/${S.lists.Verlauf.id}/items?$expand=fields&$top=500`);S.historyEntries=h.map(x=>({id:x.id,...x.fields}));const events=[];
 if(S.admin){for(const c of S.cases)events.push({id:`case-${c.id}`,caseId:c.id,title:'Neue Reparaturmeldung',text:c.Title||'Ein neuer Fall wurde erstellt.',date:c.Created,kind:'new'});for(const x of S.historyEntries){const c=S.cases.find(y=>String(y.id)===String(x.FallID));if(c&&String(x.Autor||'').toLowerCase()!==S.account.username.toLowerCase()&&(['Notiz','Kommentar'].includes(x[S.historyTypeField||'Eintragsart'])))events.push({id:`history-${x.id}`,caseId:x.FallID,title:'Neuer Kommentar',text:`${c.Title}: ${x.Text||''}`,date:x.Created,kind:'note'})}}
 else{for(const x of S.historyEntries){const c=S.cases.find(y=>String(y.id)===String(x.FallID));if(!c||!ownCase(c)||String(x.Autor||'').toLowerCase()===S.account.username.toLowerCase())continue;const type=x[S.historyTypeField||'Eintragsart']||'';const text=String(x.Text||'');if(type==='Notiz'||type==='Kommentar'||text.includes('Status auf Erledigt gesetzt'))events.push({id:`history-${x.id}`,caseId:c.id,title:text.includes('Status auf Erledigt gesetzt')?'Fall erledigt':'Neuer Kommentar',text:`${c.Title}: ${text}`,date:x.Created,kind:'note'})}}
 S.notifications=events.sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));if(localStorage.getItem(readKey())===null)localStorage.setItem(readKey(),JSON.stringify(S.notifications.map(n=>n.id)));renderNotifications();renderNews();}catch(e){console.warn('Benachrichtigungen konnten nicht geladen werden',e)}}
function newsCaseLink(id){return `<a href="#" class="news-link" data-news-case="${esc(id)}">Fall #${esc(id)}</a>`}
function newsPersonLink(label,key){return `<a href="#" class="news-link" data-news-person="${esc(key)}">${esc(label)}</a>`}
function renderNews(){
 const box=$('newsList');if(!box)return;
 const typeField=S.historyTypeField||'Eintragsart';
 const items=S.historyEntries.filter(x=>S.cases.some(c=>String(c.id)===String(x.FallID))).sort((a,b)=>new Date(b.Created||0)-new Date(a.Created||0)).slice(0,10);
 box.innerHTML=items.length?items.map(x=>{
  const c=S.cases.find(y=>String(y.id)===String(x.FallID));
  const type=String(x[typeField]||''),txt=String(x.Text||''),low=txt.toLowerCase();
  const who=x.AutorName||x.Autor||'Unbekannt',whoLink=newsPersonLink(who,x.Autor||who),cl=newsCaseLink(c.id);
  let line;
  if(type==='Kommentar'||type==='Notiz'){const short=txt.length>90?txt.slice(0,90).trim()+'…':txt;line=`${cl} kommentiert von ${whoLink}${short?`: „${esc(short)}“`:' (Foto)'}`}
  else if(low.includes('erstellt'))line=`${cl} erstellt von ${whoLink}`;
  else if(low.includes('zugewiesen')){const m=txt.match(/zugewiesen:\s*(.+?)\.\s*Status/),to=m?m[1].trim():'';line=`${cl} zugewiesen an ${to?newsPersonLink(to,to):'–'}`}
  else if(low.includes('abgeschlossen'))line=`${cl} erledigt von ${whoLink}`;
  else if(low.includes('priorität'))line=`${cl}: ${esc(txt)}`;
  else line=`${cl} aktualisiert von ${whoLink}`;
  return `<div class="news-item">${line}<small>${esc(c.Title||'')} · ${dt(x.Created)}</small></div>`;
 }).join(''):'<p class="muted">Noch keine Ereignisse.</p>';
}
function renderNotifications(){const read=readSet(),unread=S.notifications.filter(n=>!read.has(n.id)).length;$('notificationCount').textContent=unread>99?'99+':unread;$('notificationCount').style.display=unread?'block':'none';$('notificationPanel').innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center"><b>Benachrichtigungen</b><button class="btn secondary" id="markAllRead" style="padding:6px 9px">Alle gelesen</button></div>${S.notifications.length?S.notifications.map(n=>`<div class="notification-item ${read.has(n.id)?'':'unread'}"><a href="#" data-notification-case="${esc(n.caseId)}" data-notification-id="${esc(n.id)}" style="color:inherit;text-decoration:none"><b>${esc(n.title)}</b><div>${esc(n.text)}</div><small>${dt(n.date)}</small></a></div>`).join(''):'<p class="muted">Keine Benachrichtigungen vorhanden.</p>'}`;$('markAllRead').onclick=()=>{localStorage.setItem(readKey(),JSON.stringify(S.notifications.map(n=>n.id)));renderNotifications()};$('notificationPanel').querySelectorAll('[data-notification-case]').forEach(a=>a.onclick=e=>{e.preventDefault();const set=readSet();set.add(a.dataset.notificationId);localStorage.setItem(readKey(),JSON.stringify([...set]));$('notificationPanel').classList.add('hidden');detail(a.dataset.notificationCase)})}
async function toggleNotifications(){closeProfileMenu();const p=$('notificationPanel');if(p.classList.contains('hidden')){await refreshNotifications();p.classList.remove('hidden')}else p.classList.add('hidden')}
registerModule({
 id:'notifications',
 views:{home:()=>renderNews()},
 ready(){$('newsBox').addEventListener('click',e=>{const a=e.target.closest('.news-link');if(!a)return;e.preventDefault();if(a.dataset.newsCase)detail(a.dataset.newsCase);else go('employees',a.dataset.newsPerson)})},
 load:refreshNotifications,
 poll:refreshNotifications
});
