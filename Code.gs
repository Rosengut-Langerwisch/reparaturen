/**
 * Rosengut Reparaturmanagement – Apps Script Backend
 *
 * VOR DEM EINSATZ:
 * 1. SPREADSHEET_ID und PHOTO_FOLDER_ID unten eintragen.
 * 2. Apps Script: Dienste/Scopes erlauben, dann deployen.
 * 3. Web-App: Ausführen als „Ich“, Zugriff nur innerhalb der Rosengut-Organisation.
 * 4. Nur intern testen. Die Identität wird über Google Workspace und die Admin-Liste geprüft.
 */

const SPREADSHEET_ID = 'HIER_SPREADSHEET_ID_EINTRAGEN';
const PHOTO_FOLDER_ID = 'HIER_DRIVE_FOTOORDNER_ID_EINTRAGEN';
const ALLOWED_DOMAIN = 'rosengut.de';

const SHEET_CASES = 'Faelle';
const SHEET_HISTORY = 'Verlauf';
const SHEET_ADMINS = 'Admins';

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Rosengut · Reparaturmanagement')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function getInitialData() {
  const email = getCurrentEmail_();
  const cases = readCases_();
  return { email: email, isAdmin: isAdmin_(email), cases: cases };
}

function getCurrentEmail_() {
  const email = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  if (!email) {
    throw new Error('Google konnte deine E-Mail-Adresse nicht ermitteln. Bitte mit einem Rosengut-Google-Konto anmelden und die Web-App nur innerhalb der Organisation bereitstellen.');
  }
  if (!email.endsWith('@' + ALLOWED_DOMAIN)) {
    throw new Error('Zugriff nur mit einem Google-Konto der Organisation @' + ALLOWED_DOMAIN + ' möglich.');
  }
  return email;
}

function isAdmin_(email) {
  const sh = getSheet_(SHEET_ADMINS);
  const values = sh.getDataRange().getValues();
  const normalized = String(email || '').trim().toLowerCase();
  for (let i = 1; i < values.length; i++) {
    const rowEmail = String(values[i][0] || '').trim().toLowerCase();
    const active = values[i][1] === true ||
      ['ja', 'aktiv', 'true', '1', 'yes'].includes(String(values[i][1] || '').trim().toLowerCase());
    if (rowEmail === normalized && active) return true;
  }
  return false;
}

function readCases_() {
  const sh = getSheet_(SHEET_CASES);
  const values = sh.getDataRange().getValues();
  if (values.length <= 1) return [];
  const headers = values[0].map(String);
  const idx = {};
  headers.forEach((h, i) => idx[h.trim()] = i);
  const required = ['ID','Titel','Beschreibung','Ort','Prioritaet','Status','ErstelltVon','ErstelltAm','Zustaendig','FotoIDs'];
  required.forEach(h => { if (idx[h] === undefined) throw new Error('Spalte fehlt im Blatt Faelle: ' + h); });

  const historyById = readHistory_();
  return values.slice(1).filter(r => r[idx.ID]).map(r => {
    const id = String(r[idx.ID]);
    const photoCell = r[idx.FotoIDs];
    return {
      id: id,
      title: String(r[idx.Titel] || ''),
      description: String(r[idx.Beschreibung] || ''),
      area: String(r[idx.Ort] || ''),
      priority: normalizePriority_(String(r[idx.Prioritaet] || 'Mittel')),
      status: normalizeStatus_(String(r[idx.Status] || 'Neu')),
      reporter: String(r[idx.ErstelltVon] || ''),
      createdAt: toIso_(r[idx.ErstelltAm]),
      assignee: String(r[idx.Zustaendig] || ''),
      photo: String(photoCell || ''),
      notes: [],
      history: historyById[id] || [],
      lastBy: '',
      lastAt: ''
    };
  }).map(f => {
    const h = f.history[0];
    if (h) { f.lastBy = h.user || ''; f.lastAt = h.time || ''; }
    return f;
  });
}

function saveAllCases(cases) {
  const email = getCurrentEmail_();
  if (!Array.isArray(cases)) throw new Error('Ungültige Daten.');
  const sh = getSheet_(SHEET_CASES);
  const oldCases = readCases_();
  const oldById = {};
  oldCases.forEach(c => oldById[c.id] = c);
  const newById = {};
  cases.forEach(c => { if (c && c.id) newById[String(c.id)] = c; });

  // Creating a case is allowed for any signed-in employee; changing/removing existing cases is admin-only.
  let privilegedChange = false;
  oldCases.forEach(old => {
    const next = newById[old.id];
    if (!next) privilegedChange = true;
    else if (old.status !== next.status || old.priority !== next.priority ||
             String(old.assignee || '') !== String(next.assignee || '') ||
             String(old.title || '') !== String(next.title || '') ||
             String(old.description || '') !== String(next.description || '') ||
             String(old.area || '') !== String(next.area || '')) privilegedChange = true;
  });
  if (privilegedChange && !isAdmin_(email)) {
    throw new Error('Nur aktive Admins dürfen bestehende Fälle ändern oder löschen.');
  }

  const rows = [[ 'ID','Titel','Beschreibung','Ort','Prioritaet','Status','ErstelltVon','ErstelltAm','Zustaendig','FotoIDs' ]];
  cases.forEach(c => {
    const existing = oldById[String(c.id)];
    if (!existing && String(c.reporter || '').toLowerCase() !== email) {
      throw new Error('Du kannst nur Meldungen unter deinem eigenen Google-Konto anlegen.');
    }
    rows.push([
      String(c.id || ''),
      String(c.title || '').slice(0,120),
      String(c.description || '').slice(0,3000),
      String(c.area || ''),
      normalizePriority_(String(c.priority || 'Mittel')),
      normalizeStatus_(String(c.status || 'Neu')),
      existing ? existing.reporter : email,
      existing ? (findCreatedAt_(existing.id) || new Date(c.createdAt || Date.now())) : new Date(),
      existing ? (existing.assignee || '') : '',
      String(c.photo || (existing && existing.photo) || '')
    ]);
  });

  sh.clearContents();
  sh.getRange(1,1,rows.length,rows[0].length).setValues(rows);
  sh.setFrozenRows(1);

  // Preserve existing history and append newly observed events.
  appendHistoryForCases_(cases, oldById, email);
  return { ok: true, count: cases.length };
}

function appendHistoryForCases_(cases, oldById, email) {
  const sh = getSheet_(SHEET_HISTORY);
  const values = sh.getDataRange().getValues();
  const existingKeys = new Set();
  values.slice(1).forEach(r => existingKeys.add([String(r[1]), String(r[2]), String(r[3]), String(r[5])].join('|')));
  const additions = [];
  cases.forEach(c => {
    const old = oldById[String(c.id)];
    const events = Array.isArray(c.history) ? c.history : [];
    events.forEach(ev => {
      const key = [String(c.id), String(ev.user || email), String(ev.action || ''), String(ev.detail || '')].join('|');
      if (!existingKeys.has(key)) {
        additions.push([new Date(ev.time || Date.now()), String(c.id), String(ev.user || email), String(ev.action || ''), '', String(ev.detail || '')]);
        existingKeys.add(key);
      }
    });
    if (!old) {
      const key = [String(c.id), email, 'Fall erstellt', 'Status: Neu'].join('|');
      if (!existingKeys.has(key)) additions.push([new Date(c.createdAt || Date.now()), String(c.id), email, 'Fall erstellt', '', 'Status: Neu']);
    }
  });
  if (additions.length) sh.getRange(sh.getLastRow()+1,1,additions.length,6).setValues(additions);
}

function savePhoto(dataUrl, filename) {
  const email = getCurrentEmail_();
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) throw new Error('Ungültige Bilddatei.');
  if (dataUrl.length > 12 * 1024 * 1024) throw new Error('Foto ist zu groß. Bitte ein kleineres Foto verwenden.');
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/);
  if (!match) throw new Error('Unterstützt werden JPG, PNG, WEBP und GIF.');
  const bytes = Utilities.base64Decode(match[2]);
  const blob = Utilities.newBlob(bytes, match[1], String(filename || 'reparaturfoto.jpg').replace(/[^\w.-]/g, '_'));
  const folder = DriveApp.getFolderById(PHOTO_FOLDER_ID);
  const file = folder.createFile(blob);
  file.setDescription('Reparaturmeldung hochgeladen von ' + email);
  return file.getId();
}

function deleteCase(caseId) {
  const email = getCurrentEmail_();
  if (!isAdmin_(email)) throw new Error('Nur aktive Admins dürfen Fälle löschen.');
  const sh = getSheet_(SHEET_CASES);
  const values = sh.getDataRange().getValues();
  for (let i = values.length - 1; i >= 1; i--) {
    if (String(values[i][0]) === String(caseId)) {
      sh.deleteRow(i + 1);
      return { ok: true };
    }
  }
  return { ok: false, message: 'Fall nicht gefunden.' };
}

function readHistory_() {
  const sh = getSheet_(SHEET_HISTORY);
  const values = sh.getDataRange().getValues();
  const out = {};
  values.slice(1).forEach(r => {
    const id = String(r[1] || '');
    if (!id) return;
    (out[id] = out[id] || []).push({
      time: toIso_(r[0]), user: String(r[2] || ''),
      action: String(r[3] || ''), detail: String(r[5] || '')
    });
  });
  Object.keys(out).forEach(id => out[id].sort((a,b) => new Date(b.time)-new Date(a.time)));
  return out;
}

function findCreatedAt_(id) {
  const sh = getSheet_(SHEET_CASES);
  const values = sh.getDataRange().getValues();
  for (let i=1;i<values.length;i++) if (String(values[i][0])===String(id)) return values[i][7];
  return null;
}

function getSheet_(name) {
  if (SPREADSHEET_ID.indexOf('HIER_') === 0) throw new Error('Bitte zuerst SPREADSHEET_ID in Code.gs eintragen.');
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(name);
  if (!sh) throw new Error('Tabellenblatt nicht gefunden: ' + name);
  return sh;
}

function normalizePriority_(s) {
  return ['Niedrig','Mittel','Dringend'].includes(s) ? s : 'Mittel';
}
function normalizeStatus_(s) {
  return ['Neu','Unbearbeitet','In Bearbeitung','Erledigt'].includes(s) ? s : 'Neu';
}
function toIso_(value) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? String(value) : d.toISOString();
}
