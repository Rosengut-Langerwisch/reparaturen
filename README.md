# Rosengut Mitarbeiter-Hub

Aufbau (alle Dateien liegen im selben Ordner wie `msal-browser.min.js` und `Reparaturen_Logo.png`):

```
index.html            Grundgerüst: Header, Startseite, Bereiche (<section id="v-…">)
css/styles.css        alle Styles
js/config.js          Einstellungen (CFG), Zustand (S), Hilfsfunktionen, Modul-Registry
js/graph.js           Microsoft-Anmeldung-Token, Graph-API (api, pages)
js/photos.js          Foto-Upload, Foto-Anzeige, Bild-Großansicht
js/core.js            Start (initApp), Navigation (go), Kacheln, Profil-Menü
js/repairs.js         Modul Reparaturen (Übersicht, Details, Verlauf, Zuweisen, Erledigen)
js/team.js            Modul Team
js/notifications.js   Benachrichtigungen (Glocke) und Neuigkeiten-Box
js/app.js             Startet die App
```

Die Skripte werden in dieser Reihenfolge geladen (siehe Ende von `index.html`).

## Neues Modul hinzufügen (z. B. Schwarzes Brett)

1. Neuen Bereich in `index.html` anlegen: `<section id="v-brett" class="panel hidden">…</section>`
   (innerhalb von `<section id="app">`, bei den anderen `v-…`-Bereichen).
2. Neue Datei `js/brett.js` mit eigenem Code anlegen und am Ende registrieren:

```js
registerModule({
 id:'brett',
 tile:{view:'brett',symbol:'📌',title:'Schwarzes Brett',text:'Aktuelle Mitteilungen'},
 views:{brett:()=>renderBrett()},   // wird beim Öffnen des Bereichs aufgerufen
 ready(){ /* Klick-Handler einmalig verdrahten */ },
 load:async()=>{ /* Daten laden */ }
});
```

3. In `index.html` die Zeile `<script src="js/brett.js"></script>` vor `js/app.js` einfügen.

Die Kachel auf der Startseite erscheint automatisch. Zugriff auf `go('brett')`, `api(...)`, `pages(...)` und `S` ist überall möglich.
Neue SharePoint-Listen müssen in `js/core.js` in der Prüfliste (`for(const n of [...]) …`) ergänzt werden.

Hinweis: Alle Skripte teilen sich einen gemeinsamen Namensraum. Funktionsnamen daher eindeutig wählen
(z. B. mit Präfix `brett…`) und keine Namen wie `history`, `status`, `name`, `top` oder `location` verwenden.
