# PULSE V4 – Wiederherstellung nach Originalreferenz

Referenz: vom Nutzer bereitgestellter Screenshot der ursprünglichen violetten Seite, 24.11.2026.
Quellreferenz: index.html, Blob e2f208e5bb9904bc89563f56e01aab3a09354f67.
Inhalt und Kaufweg: unverändert gegenüber der freigegebenen V4-Angebotsvorschau; der 7-Tage-Test bleibt gesperrt.

## Befund
Die V4 hatte den Hero-Rahmen von 343 × 655 auf 330 × 590 geändert und den Chatbereich separat verkleinert.
Der Tagesdemo wurden neue Breiten/Höhen und Drehungen gegeben.
Die ursprünglichen Hero-Karten waren zuletzt durch einen weiteren Override ausgeblendet.
Die App-Galerie war ohne ihre ursprünglichen grafischen Elemente und mit abweichenden Gerätemassen dargestellt.

## Korrektur
Die originalen Hero- und App-Galerie-Komponenten wurden aus index.html übernommen.
IDs, Produktdaten, Tab-Steuerung, Video, Slider und die freigegebenen Texte bleiben erhalten.
Die originalen Komponentenregeln inklusive ihrer ursprünglichen Media Queries bleiben in den bestehenden Inline-Styles unverändert erhalten. Spätere V4-Overrides für diese Komponenten werden entfernt, statt weitere Gerätestyles darüberzulegen.
Die originalen Smartphone-Radien, Rahmen, Schatten, Chatflächen und Geräte-Proportionen ersetzen die späteren Geometrie-Overrides.
Die zusätzlichen V4-Drehungen der beiden Tagesdemo-Geräte werden zurückgenommen.
Die Uhrzeiten der Hero-Trainingsszene werden intern angeglichen (16:45 / 16:46), ohne die gewählten Texte zu ändern.
Eine gemeinsame Skala regelt H1, H2, H3, Fliesstext, Hinweise, Buttons, Seitenränder und Sektionsabstände. Die Mockup-Innenflächen sind von der Marketing-Typografie ausgenommen.

## Bewusst erhalten
Violett, Originalheadline und Text, Originalvideo, grafische Produktinszenierung, interaktive Tagesdemo, App-Galerie und Alltagsszenarien.
Variante 2 der Angebotskarte, violetter Outline-Demo-Button und grösserer Folgepreis bleiben erhalten.
Die Nutzerreferenz hat Vorrang vor gegensätzlichen allgemeinen Stilregeln.

## Prüfung und Grenze
Die bisherigen Berichte wurden erneut gelesen. Ihre alten Browser-Screenshots sind KEIN Nachweis für diesen Stand.
Für diesen Stand werden Syntax, IDs, Hook-Erhalt, originale Gerätemasse, Vorschau-Sperre, Build und bestehende Regressionstests geprüft.
Entwicklungsrechner und Browser waren zu Beginn dieser Korrektur nicht verfügbar. Eine neue visuelle Prüfung kann erst mit echter Browserverfügbarkeit abgeschlossen werden.
Die Live-Homepage, das produktive Onboarding und die Zahlungslogik werden nicht geändert.
