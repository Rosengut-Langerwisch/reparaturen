'use strict';
async function loadCases(){const rows=await pages(`/sites/${S.site.id}/lists/${S.lists['Fälle'].id}/items?$expand=fields&$top=200`);S.cases=rows.map(r=>({id:r.id,...r.fields})).sort((a,b)=>new Date(b.Created||0)-new Date(a.Created||0));}
function card(c){return `<article class="case ${c.Status==='Neu'?'case-new':c.Status==='Erledigt'?'case-done':'case-progress'}" data-open="${esc(c.id)}" role="button" tabindex="0" aria-label="Fall ${esc(c.id)}: ${esc(c.Title)} öffnen"><div class="case-main">${photoMarkup(c)}<div><h3>#${esc(c.id)} · ${esc(c.Title)}</h3><div class="meta">${esc(c.Bereich||'–')} · ${esc(c.MelderName||c.Melder||'–')} · ${dt(c.Created)}</div><div class="meta">${statusPill(c.Status)} ${prioPill(c.Prioritaet)} ${c.BearbeiterName?`<span class="pill">Zuständig: ${esc(c.BearbeiterName)}</span>`:''}</div></div></div><span class="case-arrow" aria-hidden="true">›</span></article>`}
function bindOpen(el){el.querySelectorAll('[data-open]').forEach(card=>{const open=()=>detail(card.dataset.open).catch(e=>{go('detail');$('detail').innerHTML=`<div class="notice error">Die Details konnten nicht geöffnet werden: ${esc(e.message)}</div>`});card.addEventListener('click',e=>{if(e.target.closest('img'))return;open()});card.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target===card){e.preventDefault();open()}})})}
function caseMatches(c,{q='',statusFilter='',creator='',assignee=''}={}){
 const textMatch=!q||[c.Title,c.Beschreibung,c.Bereich,c.MelderName,c.Melder,c.BearbeiterName,c.Bearbeiter].some(v=>String(v||'').toLowerCase().includes(q));
 const statusMatch=!statusFilter||(statusFilter==='open'?(c.Status==='Neu'||c.Status==='In Bearbeitung'):c.Status===statusFilter);
 const creatorMatch=!creator||String(c.Melder||'').toLowerCase()===creator.toLowerCase();
 const assigneeMatch=!assignee||(assignee==='__unassigned__'?!c.Bearbeiter:String(c.Bearbeiter||'').toLowerCase()===assignee.toLowerCase());
 return textMatch&&statusMatch&&creatorMatch&&assigneeMatch;
}
function personOptions(fieldEmail,fieldName){
 const map=new Map();S.cases.forEach(c=>{const email=String(c[fieldEmail]||'').trim();if(!email)return;const key=email.toLowerCase();const name=String(c[fieldName]||email).trim();if(!map.has(key))map.set(key,{email,name});});
 const ownEmail=String(S.account?.username||'').trim(),ownKey=ownEmail.toLowerCase();
 if(ownEmail)map.set(ownKey,{email:ownEmail,name:S.account?.name||ownEmail});
 return [...map.values()].sort((a,b)=>{if(a.email.toLowerCase()===ownKey)return -1;if(b.email.toLowerCase()===ownKey)return 1;return a.name.localeCompare(b.name,'de')||a.email.localeCompare(b.email,'de')});
}
function updateFilterOptions(q,statusFilter,creator,assignee){
 const statusBase=c=>caseMatches(c,{q,creator,assignee});
 const statusCounts={'open':S.cases.filter(c=>statusBase(c)&&(c.Status==='Neu'||c.Status==='In Bearbeitung')).length,'':S.cases.filter(statusBase).length,'Neu':S.cases.filter(c=>statusBase(c)&&c.Status==='Neu').length,'In Bearbeitung':S.cases.filter(c=>statusBase(c)&&c.Status==='In Bearbeitung').length,'Erledigt':S.cases.filter(c=>statusBase(c)&&c.Status==='Erledigt').length};
 const status=$('fStatus'),statusValue=status.value;
 status.innerHTML=`<option value="open">Offen (${statusCounts.open})</option><option value="">Alle (${statusCounts['']})</option><option value="Neu">Neu (${statusCounts.Neu})</option><option value="In Bearbeitung">In Bearbeitung (${statusCounts['In Bearbeitung']})</option><option value="Erledigt">Erledigt (${statusCounts.Erledigt})</option>`;status.value=statusValue;
 const creatorBase=c=>caseMatches(c,{q,statusFilter,assignee});
 const creatorOptions=personOptions('Melder','MelderName');
 const creatorCounts=new Map(creatorOptions.map(person=>[person.email.toLowerCase(),S.cases.filter(c=>creatorBase(c)&&String(c.Melder||'').toLowerCase()===person.email.toLowerCase()).length]));
 const creatorSelect=$('fCreator'),creatorValue=creatorSelect.value;
 creatorSelect.innerHTML=`<option value="">Alle (${S.cases.filter(creatorBase).length})</option>`+creatorOptions.map(person=>`<option value="${esc(person.email)}">${esc(person.name)} · ${esc(person.email)} (${creatorCounts.get(person.email.toLowerCase())||0})</option>`).join('');creatorSelect.value=creatorValue;
 const assigneeBase=c=>caseMatches(c,{q,statusFilter,creator});
 const assigneeOptions=personOptions('Bearbeiter','BearbeiterName');
 const assigneeCounts=new Map(assigneeOptions.map(person=>[person.email.toLowerCase(),S.cases.filter(c=>assigneeBase(c)&&String(c.Bearbeiter||'').toLowerCase()===person.email.toLowerCase()).length]));
 const unassigned=S.cases.filter(c=>assigneeBase(c)&&!c.Bearbeiter).length;
 const assigneeSelect=$('fAssignee'),assigneeValue=assigneeSelect.value;
 assigneeSelect.innerHTML=`<option value="">Alle (${S.cases.filter(assigneeBase).length})</option>`+assigneeOptions.map(person=>`<option value="${esc(person.email)}">${esc(person.name)} · ${esc(person.email)} (${assigneeCounts.get(person.email.toLowerCase())||0})</option>`).join('')+`<option value="__unassigned__">Nicht zugewiesen (${unassigned})</option>`;assigneeSelect.value=assigneeValue;
}
function renderAll(){
 const q=$('search').value.toLowerCase(),s=$('fStatus').value,creator=$('fCreator').value,assignee=$('fAssignee').value,sort=$('sortCases').value;
 updateFilterOptions(q,s,creator,assignee);
 const list=S.cases.filter(c=>caseMatches(c,{q,statusFilter:s,creator,assignee}));
 $('search').placeholder='Suchen …';
 const priorityRank={Dringend:0,Mittel:1,Niedrig:2};
 list.sort((a,b)=>{if(sort==='date-old')return new Date(a.Created||0)-new Date(b.Created||0);if(sort==='priority-high')return (priorityRank[a.Prioritaet]??99)-(priorityRank[b.Prioritaet]??99)||new Date(b.Created||0)-new Date(a.Created||0);if(sort==='priority-low')return (priorityRank[b.Prioritaet]??-1)-(priorityRank[a.Prioritaet]??-1)||new Date(b.Created||0)-new Date(a.Created||0);return new Date(b.Created||0)-new Date(a.Created||0)});
 $('allCases').innerHTML=list.length?list.map(card).join(''):'<div class="empty">Keine passenden Meldungen gefunden.</div>';bindOpen($('allCases'));loadPhotos($('allCases'));
}
function renderAdmin(){ $('adminCases').innerHTML=S.cases.length?S.cases.map(card).join(''):'<div class="empty">Keine Meldungen vorhanden.</div>';bindOpen($('adminCases'));loadPhotos($('adminCases'))}
async function addHistory(id,kind,text,photoId=''){
 if(!S.historyTypeField)throw Error('Die Spalte „Eintragsart“ wurde in der SharePoint-Liste „Verlauf“ nicht gefunden.');
 const fields={Title:kind,FallID:Number(id),Text:text,Autor:S.account.username,AutorName:S.account.name||S.account.username};
 fields[S.historyTypeField]=kind;if(photoId){if(!S.historyPhotoField)throw Error('Für Fotos an Kommentaren fehlt in der SharePoint-Liste „Verlauf“ eine Textspalte „FotoIDs“.');fields[S.historyPhotoField]=photoId;}
 await api(`/sites/${S.site.id}/lists/${S.lists.Verlauf.id}/items`,{method:'POST',body:JSON.stringify({fields})});
}
async function createCase(e){e.preventDefault();const btn=$('submitCase');if(btn.disabled)return;btn.disabled=true;btn.innerHTML='<span class="spinner" aria-hidden="true"></span>Wird gesendet …';try{const file=$('photo').files[0];if(file&&(!file.type.startsWith('image/')||file.size>10*1024*1024))throw Error('Das Foto muss ein Bild unter 10 MB sein.');if(file&&!S.photoField)throw Error('Die Foto-ID-Spalte in „Fälle“ wurde nicht gefunden.');const fields={Title:$('title').value.trim(),Bereich:$('area').value,Beschreibung:$('description').value.trim(),Prioritaet:$('priority').value,Status:'Neu',Melder:S.account.username,MelderName:S.account.name||S.account.username};let uploaded='';if(file){uploaded=await upload(file);fields[S.photoField]=uploaded;}const d=await api(`/sites/${S.site.id}/lists/${S.lists['Fälle'].id}/items`,{method:'POST',body:JSON.stringify({fields})});await addHistory(d.id,'System','Fall wurde erstellt.');$('newForm').reset();await loadCases();await refreshNotifications();go('overview');msg('createMsg',file?'Der Fall und das Foto wurden erfolgreich angelegt.':'Der Fall wurde erfolgreich angelegt.')}catch(err){msg('newMsg',err.message,true)}finally{btn.disabled=false;btn.textContent='Meldung absenden'}}
function ownCase(c){return String(c.Melder||'').toLowerCase()===String(S.account.username||'').toLowerCase()}
function editForm(c){return `<h3>Angaben bearbeiten</h3><div class="grid"><div class="field"><label>Titel</label><input id="editTitle" maxlength="180" value="${esc(c.Title||'')}"></div><div class="field"><label>Bereich</label><select id="editArea">${['Haus 8','Lager 1','Kasse','Café','Sonstiges'].map(x=>`<option ${c.Bereich===x?'selected':''}>${x}</option>`).join('')}</select></div><div class="field"><label>Priorität</label><select id="editPriority">${['Dringend','Mittel','Niedrig'].map(x=>`<option ${c.Prioritaet===x?'selected':''}>${x}</option>`).join('')}</select></div></div><div class="field"><label>Beschreibung</label><textarea id="editDescription">${esc(c.Beschreibung||'')}</textarea></div><button class="btn" id="saveEdit">Angaben speichern</button><div id="editMsg"></div>`}
async function saveCaseEdit(c){if(c.Status==='Erledigt')throw Error('Erledigte Fälle können nicht mehr bearbeitet werden.');if(!S.admin&&(c.Bearbeiter||adminHasEditedOrAssigned(c.id)))throw Error('Dieser Fall wurde bereits von einem Admin bearbeitet oder zugewiesen. Du kannst weiterhin kommentieren.');const fields={Title:$('editTitle').value.trim(),Bereich:$('editArea').value,Prioritaet:$('editPriority').value,Beschreibung:$('editDescription').value.trim()};if(!fields.Title||!fields.Beschreibung)throw Error('Bitte Titel und Beschreibung ausfüllen.');await api(`/sites/${S.site.id}/lists/${S.lists['Fälle'].id}/items/${c.id}/fields`,{method:'PATCH',body:JSON.stringify(fields)});const event=fields.Prioritaet!==c.Prioritaet?`Priorität wurde von „${c.Prioritaet||'–'}“ auf „${fields.Prioritaet}“ geändert.`:'Falldaten wurden aktualisiert.';await addHistory(c.id,'System',event);await loadCases();await detail(c.id)}
async function assignCase(c){if(c.Status==='Erledigt')throw Error('Erledigte Fälle können nicht mehr zugewiesen werden.');const rows=await pages(`/sites/${S.site.id}/lists/${S.lists.Mitarbeiter.id}/items?$expand=fields&$top=500`);const employees=rows.map(r=>({email:String(r.fields?.Title||'').trim(),name:String(r.fields?.[S.employeeNameField]||r.fields?.Title||'').trim()})).filter(e=>e.email).sort((a,b)=>a.name.localeCompare(b.name,'de'));if(!employees.length)throw Error('Es sind noch keine Mitarbeiter im System erfasst.');const current=String(c.Bearbeiter||'').toLowerCase();const overlay=document.createElement('div');overlay.className='modal-backdrop';overlay.innerHTML=`<div class="panel assign-dialog" role="dialog" aria-modal="true"><h3>Bearbeiter zuweisen</h3><label for="assignEmployee">Mitarbeiter</label><select id="assignEmployee" class="field">${employees.map(e=>`<option value="${esc(e.email)}" ${e.email.toLowerCase()===current?'selected':''}>${esc(e.name)} · ${esc(e.email)}</option>`).join('')}</select><div class="actions"><button type="button" class="btn secondary" id="assignCancel">Abbrechen</button><button type="button" class="btn" id="assignSave">Zuweisen</button></div></div>`;document.body.appendChild(overlay);const mail=await new Promise(resolve=>{overlay.querySelector('#assignCancel').onclick=()=>{overlay.remove();resolve(null)};overlay.querySelector('#assignSave').onclick=()=>{const value=overlay.querySelector('#assignEmployee').value;overlay.remove();resolve(value)};overlay.addEventListener('click',e=>{if(e.target===overlay){overlay.remove();resolve(null)}})});if(mail===null)return;const employee=employees.find(e=>e.email===mail);await api(`/sites/${S.site.id}/lists/${S.lists['Fälle'].id}/items/${c.id}/fields`,{method:'PATCH',body:JSON.stringify({Bearbeiter:mail,BearbeiterName:employee?.name||mail,Status:'In Bearbeitung'})});await addHistory(c.id,'System',`Mitarbeiter wurde zugewiesen: ${employee?.name||mail}. Status wurde auf „In Bearbeitung“ gesetzt.`);await loadCases();await detail(c.id)}
async function completeCase(c){if(c.Status==='Erledigt')return;const note=prompt('Bitte füge einen Abschlusskommentar hinzu (Pflichtfeld), z. B. den Ablageort des reparierten Geräts:');if(note===null)return;if(!note.trim()){alert('Ohne Abschlusskommentar kann der Fall nicht abgeschlossen werden.');return;}await api(`/sites/${S.site.id}/lists/${S.lists['Fälle'].id}/items/${c.id}/fields`,{method:'PATCH',body:JSON.stringify({Status:'Erledigt',ErledigtVon:S.account.name||S.account.username,ErledigtAm:new Date().toISOString()})});await addHistory(c.id,'Kommentar',note.trim());await addHistory(c.id,'System','Fall wurde abgeschlossen. Status auf „Erledigt“ gesetzt.');await loadCases();await refreshNotifications();await detail(c.id)}
function renderChatEntries(entries,caseId){
 const sorted=[...entries].sort((a,b)=>new Date(a.Created||0)-new Date(b.Created||0));
 if(!sorted.length)return '<p class="muted">Noch keine Einträge.</p>';
 let lastDay='';
 return sorted.map(x=>{
  const date=new Date(x.Created||0),dayKey=Number.isNaN(date.getTime())?'unbekannt':date.toLocaleDateString('de-DE');
  const dayLabel=Number.isNaN(date.getTime())?'Datum unbekannt':date.toLocaleDateString('de-DE',{day:'numeric',month:'long',year:'numeric'});
  const separator=dayKey!==lastDay?`<div class="chat-day"><span>${esc(dayLabel)}</span></div>`:'';lastDay=dayKey;
  const type=String(S.historyTypeField?x[S.historyTypeField]||'Eintrag':'Eintrag');
  const isComment=['Kommentar','Notiz'].includes(type);
  const isOwn=String(x.Autor||'').toLowerCase()===String(S.account.username||'').toLowerCase();
  const author=x.AutorName||x.Autor||'Mitarbeiter';
  const initials=author.trim().split(/\s+/).slice(0,2).map(v=>v.charAt(0)).join('').toUpperCase()||'•';
  const time=Number.isNaN(date.getTime())?'':date.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})+' Uhr';
  const photo=x[S.historyPhotoField||'FotoIDs']?`<img class="chat-photo" data-photo-id="${esc(String(x[S.historyPhotoField||'FotoIDs']).split(',')[0].trim())}" alt="Foto zum Kommentar">`:'';
  if(!isComment){
   const txt=String(x.Text||'');
   const lower=txt.toLowerCase();const label=lower.includes('priorität')?'PRIORITÄT GEÄNDERT':lower.includes('zugewiesen')?'MITARBEITER ZUGEWIESEN':(lower.includes('abgeschlossen')||lower.includes('status auf erledigt'))?'FALL ABGESCHLOSSEN':(lower.includes('status')?'STATUSÄNDERUNG':(lower.includes('erstellt')||lower.includes('meldung erstellt'))?'FALL ERSTELLT':'SYSTEM · AKTUALISIERUNG');
   return `${separator}<div class="chat-system"><div class="chat-system-label"><span aria-hidden="true">▧</span><span>SYSTEM · ${label.replace('SYSTEM · ','')}</span></div><div class="chat-system-text">${esc(txt)}</div>${photo}<div class="chat-time">${esc(time)}</div></div>`;
  }
  return `${separator}<div class="chat-row ${isOwn?'own':'other'}">${isOwn?'':`<div class="chat-avatar" aria-hidden="true">${esc(initials)}</div>`}<div class="chat-bubble"><div class="chat-author">${esc(isOwn?'Du':author)}</div><div class="chat-message">${esc(x.Text||'')}</div>${photo}<div class="chat-time">${esc(time)}</div></div></div>`;
 }).join('');
}
function adminHasEditedOrAssigned(caseId){
 return S.historyEntries.some(entry=>{
  if(String(entry.FallID)!==String(caseId))return false;
  if(!S.adminEmails.includes(String(entry.Autor||'').trim().toLowerCase()))return false;
  const kind=String(entry[S.historyTypeField||'Eintragsart']||'');
  const text=String(entry.Text||'').toLowerCase();
  return kind==='System'&&(text.includes('falldaten wurden aktualisiert')||text.includes('priorität wurde von')||text.includes('mitarbeiter wurde zugewiesen'));
 });
}
async function detail(id){const c=S.cases.find(x=>String(x.id)===String(id));if(!c)return;S.back='overview';go('detail');$('detail').innerHTML='<div class="notice">Details werden geladen …</div>';let entries=[];let historyError='';try{const h=await pages(`/sites/${S.site.id}/lists/${S.lists.Verlauf.id}/items?$expand=fields&$top=500`);S.historyEntries=h.map(x=>({id:x.id,...x.fields}));entries=S.historyEntries.filter(f=>String(f.FallID)===String(id)).sort((a,b)=>new Date(a.Created||0)-new Date(b.Created||0));}catch(e){historyError=e.message||'Der Verlauf konnte nicht geladen werden.';}
 const canEdit=ownCase(c)&&!S.admin&&c.Status!=='Erledigt'&&!c.Bearbeiter&&!adminHasEditedOrAssigned(c.id);
 $('detail').innerHTML=`<div class="detail-heading"><div class="detail-title-group"><button type="button" class="page-back" id="detailBack" aria-label="Zur Reparaturübersicht" title="Zur Reparaturübersicht">‹</button><h2>#${esc(c.id)} · ${esc(c.Title)}</h2></div>${(canEdit||(S.admin&&c.Status!=='Erledigt'))?'<button type="button" class="icon-action" id="detailEditToggle" title="Angaben bearbeiten" aria-label="Angaben bearbeiten"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg></button>':''}</div><div class="meta">${statusPill(c.Status)} ${prioPill(c.Prioritaet)} <span>${esc(c.Bereich||'')}</span></div><h3>Beschreibung</h3><p style="white-space:pre-wrap">${esc(c.Beschreibung||'–')}</p>${photoMarkup(c,true)}<p class="muted">Gemeldet von: ${esc(c.MelderName||c.Melder)} · ${dt(c.Created)}</p>${c.BearbeiterName?`<p><b>Zuständig:</b> <button type="button" class="btn secondary" id="assigneeTeamBtn">${esc(c.BearbeiterName)}</button></p>`:''}
 ${canEdit?`<section class="panel" style="padding:16px;background:#f8faf8"><h3 style="margin-top:0">Deine Meldung</h3><div id="employeeEdit" class="hidden" style="margin-top:14px">${editForm(c)}</div></section>`:''}
 ${S.admin?`<section class="panel" style="padding:16px;background:#f8faf8"><h3 style="margin-top:0">Administration</h3>${c.Status==='Erledigt'?'<div class="notice">Dieser Fall ist erledigt und vollständig gesperrt. Änderungen und neue Kommentare sind nicht mehr möglich.</div>':'<div class="actions"><button class="btn secondary" id="assignBtn">Bearbeiter zuweisen</button><button class="btn" id="completeBtn">Als erledigt markieren</button></div><div id="adminEdit" class="hidden">'+editForm(c)+'</div><div id="adminMsg"></div>'}</section>`:''}
 <h3>Kommentare</h3>${historyError?`<div class="notice error">Der Verlauf konnte nicht geladen werden: ${esc(historyError)}</div>`:''}<div class="chat-thread">${renderChatEntries(entries,id)}</div>
 ${c.Status==='Erledigt'?'<div class="notice">Kommentare sind bei erledigten Fällen nicht mehr möglich.</div>':'<h3>Kommentar hinzufügen</h3><div class="comment-composer"><div class="comment-compose-main"><textarea id="note" placeholder="Nachricht schreiben …"></textarea><div class="comment-compose-footer"><label class="photo-attach" for="notePhoto"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.82-2.83l8.49-8.48"/></svg>Foto anhängen<input id="notePhoto" type="file" accept="image/*" hidden></label><span id="noteFileName" class="comment-file-name">Ein Bild, maximal 10 MB</span></div></div><button type="button" class="comment-send" id="addNote" title="Senden" aria-label="Senden"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg></button></div><div id="detailMsg"></div>'}`;
 loadPhotos($('detail'));
 if($('detailBack'))$('detailBack').onclick=()=>go('overview');
 if($('assigneeTeamBtn'))$('assigneeTeamBtn').onclick=()=>go('employees',c.Bearbeiter||c.BearbeiterName||'');
 if($('detailEditToggle'))$('detailEditToggle').onclick=()=>{const target=canEdit?'employeeEdit':'adminEdit';$(target)?.classList.toggle('hidden');};
 if($('notePhoto'))$('notePhoto').onchange=()=>{$('noteFileName').textContent=$('notePhoto').files[0]?.name||'Ein Bild, maximal 10 MB'};
 if(canEdit){$('employeeEdit').querySelector('#saveEdit').onclick=async()=>{try{await saveCaseEdit(c)}catch(e){msg('editMsg',e.message,true)}}}
 if(S.admin&&c.Status!=='Erledigt'){$('assignBtn').onclick=()=>assignCase(c).catch(e=>msg('adminMsg',e.message,true));$('completeBtn').onclick=()=>completeCase(c).catch(e=>msg('adminMsg',e.message,true));$('adminEdit').querySelector('#saveEdit').onclick=async()=>{try{await saveCaseEdit(c)}catch(e){msg('editMsg',e.message,true)}}}
 if(c.Status!=='Erledigt')$('addNote').onclick=async()=>{try{const n=$('note').value.trim(),file=$('notePhoto').files[0];if(!n&&!file)throw Error('Bitte gib eine Nachricht ein oder füge ein Foto hinzu.');if(file&&(!file.type.startsWith('image/')||file.size>10*1024*1024))throw Error('Das Foto muss ein Bild unter 10 MB sein.');if(file&&!S.historyPhotoField)throw Error('In der SharePoint-Liste „Verlauf“ fehlt eine Textspalte „FotoIDs“. Bitte lege diese Spalte an.');let fid='';if(file)fid=await upload(file);await addHistory(c.id,'Kommentar',n,fid);await refreshNotifications();await detail(id);msg('detailMsg','Kommentar gesendet.')}catch(e){msg('detailMsg',e.message,true)}};

}
registerModule({
 id:'repairs',
 tile:{view:'overview',symbol:'▤',title:'Reparaturübersicht',text:'Alle Reparaturmeldungen ansehen'},
 views:{overview:()=>renderAll(),admin:()=>{if(!S.admin)return go('home');renderAdmin()}},
 ready(){$('newCaseBtn').onclick=()=>go('new');$('newForm').onsubmit=createCase;['search','fStatus','fCreator','fAssignee','sortCases'].forEach(id=>$(id).addEventListener('input',renderAll))},
 load:loadCases,
 async deepLink(params){const id=params.get('caseId');if(id&&S.cases.some(c=>String(c.id)===String(id))){await detail(id);return true}return false}
});
