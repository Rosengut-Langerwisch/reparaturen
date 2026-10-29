# Rosengut Reparaturmanagement – Google-Integration

## Dateien
- `Code.gs`: Apps-Script-Backend für Google Tabellen und Google Drive
- `Index.html`: Weboberfläche, basierend auf dem bestehenden Prototyp

## Vor dem Test
1. Öffne das Google Tabellen-Dokument mit den Blättern `Faelle`, `Verlauf` und `Admins`.
2. Kopiere die Tabellen-ID aus der URL (zwischen `/d/` und `/edit`) in `SPREADSHEET_ID` in `Code.gs`.
3. Öffne den Foto-Ordner in Google Drive und kopiere dessen Ordner-ID aus der URL in `PHOTO_FOLDER_ID`.
4. In `Admins` muss die erste Zeile `E-Mail | Aktiv` lauten. Für Admins darunter eine Rosengut-Adresse und `TRUE` eintragen.
5. Die Spalten im Blatt `Faelle` müssen lauten: `ID | Titel | Beschreibung | Ort | Prioritaet | Status | ErstelltVon | ErstelltAm | Zustaendig | FotoIDs`.
6. `Verlauf`: `Zeitpunkt | FallID | Benutzer | Aktion | AlterWert | NeuerWert`.
7. In Apps Script zwei Dateien anlegen: `Code.gs` und eine HTML-Datei mit dem Namen `Index`. Den Inhalt der jeweiligen Datei hineinkopieren.
8. Apps Script > Bereitstellen > Neue Bereitstellung > Typ „Web-App“:
   - Ausführen als: **Ich**
   - Zugriff: **Nur Nutzer innerhalb der Rosengut-Organisation** (oder die entsprechende Workspace-Domain-Option)
9. Bereitstellen, Berechtigungen prüfen und die erzeugte Web-App-URL öffnen. Für diese integrierte Version bitte die Apps-Script-URL verwenden, nicht die GitHub-Pages-URL.

## Sicherheit und Grenzen
- Diese Version setzt Google-Workspace-Konten unter `@rosengut.de` voraus. Sie ist nicht für private Gmail-Adressen gedacht.
- Die App prüft Adminrechte anhand des Tabellenblatts `Admins`. Der Umschalter „Testrolle“ wurde entfernt.
- Fotos werden im konfigurierten Drive-Ordner abgelegt; der Ordner sollte nur für berechtigte Rosengut-Mitarbeitende freigegeben sein.
- Vor produktivem Einsatz müssen parallele Bearbeitung, Fotozugriffsrechte und vollständige serverseitige Protokollierung noch getestet werden. Teste zunächst mit wenigen Personen und ohne vertrauliche Inhalte.
