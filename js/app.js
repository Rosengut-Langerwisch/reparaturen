'use strict';
initApp().catch(e=>{$('login').classList.remove('hidden');$('login').innerHTML=`<h2>Verbindung fehlgeschlagen</h2><div class="notice error">${esc(e.message)}</div><button class="btn" onclick="location.reload()">Erneut versuchen</button>`});
