# Geburtstags-Jeopardy

Ein responsives, Jeopardy-inspiriertes Geburtstagsquiz auf Basis von SvelteKit. Die Anwendung wird vollständig statisch gebaut, lädt Fragen und Bilder aber beim Start aus dem öffentlichen Ordner `quiz/`.

## Lokal starten

```bash
npm install
npm run dev
```

Produktionsbuild prüfen:

```bash
npm run build
npm run preview
```

Die gebaute Anwendung liegt in `build/`. Sie muss über einen HTTP-Server ausgeliefert werden; ein direktes Öffnen von `index.html` über `file://` funktioniert wegen des dynamischen JSON-Ladevorgangs nicht.

## Quiz anpassen

Die Quelldaten stehen in [`static/quiz/quiz.json`](static/quiz/quiz.json). Bilder liegen darunter in `static/quiz/images/` und werden relativ zur JSON-Datei angegeben:

```json
{
  "id": "technology-300",
  "points": 300,
  "prompt": "Welche Dezimalzahl stellt das Bild dar?",
  "answer": "10",
  "jokerOptions": ["10", "8", "12"],
  "timerSeconds": 45,
  "image": "images/questions/binary.svg",
  "imageAlt": "Die Binärziffern eins, null, eins, null."
}
```

Nach einem Build kann der gesamte Ordner `build/quiz/` ersetzt werden, ohne den Anwendungscode neu zu kompilieren. Bei GitHub Pages werden Änderungen normalerweise committed und durch den Workflow erneut veröffentlicht.

Wichtige Regeln:

- `schemaVersion` ist aktuell `1` und `locale` ist `de`.
- Alle Themen-, Fragen- und Preis-IDs müssen innerhalb eines Quiz eindeutig sein.
- Punktwerte und Preisschwellen sind nicht-negative ganze Zahlen.
- `settings.defaultTimerSeconds` legt die allgemeine Fragezeit fest; Standard sind 60 Sekunden. Eine Frage kann sie optional mit `timerSeconds` überschreiben.
- `settings.jokerUses` konfiguriert die verfügbaren Telefon-, Drei-Antworten- und Publikumsjoker. Jede Frage braucht dafür genau drei unterschiedliche `jokerOptions`.
- Jedes konfigurierte Bild braucht einen beschreibenden `imageAlt`-Text.
- Die Oberfläche unterstützt beliebig viele Themen und Fragen; das mitgelieferte Set ist für sechs Themen mit jeweils fünf Fragen optimiert.
- Der Fortschritt wird unter der Quiz-`id` gespeichert. Eine neue `id` startet einen unabhängigen Spielstand. Bei unveränderter `id` bleiben Ergebnisse gleichnamiger Fragen erhalten.

## Spiel- und Adminmodus

Eine Frage startet mit einem animierten Countdown. Eine sanfte, synthetisierte Countdown-Melodie beschleunigt sich in den letzten zehn Sekunden; richtige und falsche Antworten haben eigene Signale. Der Lautsprecher im Fragedialog schaltet alle Töne ein oder aus. Telefon-, Drei-Antworten- und Publikumsjoker pausieren den Timer und setzen ihn auf die volle Fragezeit zurück. Ihr Verbrauch bleibt nach einem Neuladen erhalten.

Die Lösung wird von der moderierenden Person als **Richtig** oder **Falsch** bewertet. Nur richtige Antworten erhöhen den Punktestand und lösen einen kurzen Konfetti-Effekt aus. Titel, Beschreibung und Bild eines Preises bleiben bis zur jeweiligen Punkteschwelle geheim. Danach erscheint eine Freischaltmeldung; erst der Button **Preis enthüllen** startet einen hörbaren Trommelwirbel samt Schüttelanimation. Beim Aufdecken ertönt eine kurze Fanfare und der Preis bleibt dauerhaft sichtbar.

Mit einem Doppelklick auf das gelbe Sternsymbol oder dem URL-Parameter `?admin=true` erscheint ein lokaler Korrekturbereich. Dort lassen sich Punktestand, Standard-Fragezeit und Fragenstatus korrigieren oder der gesamte Fortschritt nach Bestätigung löschen. Der versteckte Auslöser und der Parameter sind kein Zugriffsschutz.

## Qualitätssicherung

```bash
npm run check
npm test
npm run test:e2e
```

Der E2E-Befehl baut die App und prüft sie mit Playwright in Desktop- und Mobilansicht.

## GitHub Pages

Der Workflow [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) prüft, testet und veröffentlicht jeden Push auf `main`. Im Repository muss unter **Settings → Pages → Source** einmalig **GitHub Actions** ausgewählt werden. Der Workflow setzt den Repository-Namen als SvelteKit-Basispfad, damit Anwendung, JSON und Bilder auch unter `https://BENUTZER.github.io/REPOSITORY/` geladen werden.
