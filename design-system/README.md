# PULSE Design System / Foundation V1

Dieses Fundament ist eine separate Arbeitsbasis, keine neue Live-Seite. Die Originalseite ist bei bf5df52b3afe78ac1cdfc61caf9100dbbc74c0a2 eingefroren; ihre exakte HTML-Datei (einschliesslich CSS/JS) liegt unter references/legacy-main/index.html. Die Dateien in sections/ sind exakt extrahierte Original-Markup-Referenzen, keine isolierten produktionsfähigen Module. Assets verbleiben am Originalpfad im Repository; die vollständige Seite ist über den Quell-Commit reproduzierbar. Nicht aus dem Archiv-Unterordner als Standalone-Datei öffnen, weil relative Pfade anders auflösen.

## Weiterarbeiten
1. AGENTS.md lesen. Gewünschte Section-ID und Quellrevision benennen.
2. registry.json / source-versions.json prüfen. Historische Varianten aus den fixierten Commits lesen; keine V-Nummern erraten.
3. HTML, CSS, JS, Original-Assets gemeinsam isolieren; Abhängigkeiten und CSS-Konflikte erfassen. Neue Revision anlegen, nie alte überschreiben.
4. Design-Tokens nach visueller Abnahme verbindlich machen, nicht vorab anwenden.
5. Erst nach Funktions- und visueller Parität module_ready=true setzen. Komposition nur mit freigegebenen Modulen; die Baseline ist das unveränderte index.html.
6. QA-Gate ausfüllen, Screenshot-Vergleich und Preview zur Abnahme. Kein Live-Release ohne Freigabe.

## Status
Original-Markup extrahiert, Historie teilweise inventarisiert, Token-Kandidaten und Manifest vorhanden. Noch offen: lokale V3-HTML/Bildreferenzen archivieren, weitere Branch-Varianten extrahieren, CSS/JS isolieren, Browser-Parität, Page Builder, CI-Integration. Keine fehlende Arbeit als erledigt markieren.
