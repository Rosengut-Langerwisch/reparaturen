'use strict';
initApp().catch(e=>{
 const authError=/no_token_request_cache|interaction_in_progress|state_not_found|nonce|hash_empty|monitor_window|BrowserAuthError|ClientAuthError|InteractionRequired/i.test((e.errorCode||'')+' '+(e.name||'')+' '+(e.message||''));
 if(authError&&!sessionStorage.getItem('msalAutoReset')){sessionStorage.setItem('msalAutoReset','1');resetMsalCache();location.replace(location.pathname+location.search);return}
 $('login').classList.remove('hidden');$('login').innerHTML=`<h2>Verbindung fehlgeschlagen</h2><div class="notice error">${esc(e.message)}</div><div class="actions"><button class="btn" onclick="location.reload()">Erneut versuchen</button><button class="btn secondary" onclick="resetAndReload()">Zurücksetzen und neu anmelden</button></div>`;
});
