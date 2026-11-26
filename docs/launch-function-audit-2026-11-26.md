# PULSE Vorschau – Funktions- und Linkprüfung
Datum: 26. November 2026. Basis: preview/business-product-tour, 0db5cc235e4bb5fa2db6b8896eeb90cd70264128.
Kein Produktions-Release, keine Zahlung, keine Demo-/Partneranfrage versendet.

## Umgesetzt
- Footer auf index.html, personal-v4.html, unternehmen.html und affiliate.html auf die gemeinsame Navigation und vorhandene Rechtstexte ergänzt.
- Allgemeine AGB auf Business-Seite korrekt als AGB PULSE Personal beschriftet. Keine Ausgabe als Business-AGB.
- Rechtliche Übersicht um Affiliate-AGB und Hinweis auf separat zu vereinbarende Business-Verträge ergänzt.
- Defekten Verweis unternehmen.html#demo auf business-demo.html umgestellt.
- Business-Conversion-CTAs zu business-demo.html vereinheitlicht.
- business-demo.html als unverbindlichen Fragebogen mit sechs Angaben, drei Schritten, Zusammenfassung und E-Mail-Übergabe erstellt. Keine automatische Speicherung, Übermittlung oder Terminbuchung. Datenschutzhinweis und Rechtslinks vorhanden. Kein zahlungspflichtiger Vertrag im Formular.

## Durchgeführte Prüfung
- Drei Landingpages sowie Impressum, Datenschutz, Personal-AGB, Affiliate-AGB, Gesundheits-/KI-Hinweis, Kündigung, Widerruf und Kontakt: HTTP 200 auf Basisdeployment.
- 145 interne Seiten-/Navigationsverweise und 50 Fragmentverweise anhand geladener Quellen geprüft. Alle Navigationsziele vorhanden. Sechs CSS-Referenzen separat erkannt, kein fehlender Seitenlink.
- Vorhandene Footer auf vier Einstiegsseiten bestätigt, inklusive älterer index.html-Variante.
- Inline-JavaScript der geänderten Seiten auf Syntax geprüft.
- Neue Formularlogik mit virtuellen DOM-Elementen geprüft: Leerfelder, ganzzahlige Kundenzahl, Weiter, Zurück/Datenerhalt, Enter in Schritt 1, ungültige E-Mail, Zusammenfassung, sichere Textausgabe, korrekt codierte Mailto-Daten und Empfänger, Clipboard-Fehlerfall. Keine Netzwerkübermittlung.
- Vorhandene Business-Mockups, Screenshotdateien und Animationen nicht umgestaltet.

## Tatsächlich offene Launch-Punkte
1. /api/secure-checkout antwortet mit available:false. Der beworbene 7-Tage-Test ist damit nicht als funktionierender Kauf-/Teststart bestätigt.
2. /api/portal-login?check=1 antwortet mit available:false. Das vorhandene Kündigungsformular bleibt erreichbar; Portalzugang ist nicht als verfügbar bestätigt.
3. Affiliate-Anfrage bereitet nur E-Mail vor. Partnerportal, automatisierte Zuordnung und Auszahlung sind laut veröffentlichten Affiliate-AGB in der Vorschau noch nicht freigeschaltet. Affiliate-AGB sind als Entwurf gekennzeichnet.
4. Allgemeine AGB gelten PULSE Personal. Eigenständige öffentlich abrufbare Business-Bedingungen/AVV wurden nicht gefunden; vor gewerblichem Pilot separat vereinbaren.
5. Kein Terminbuchungslink im Repo gefunden. Business-Fragebogen endet ehrlich in manueller E-Mail-Anfrage. Kein automatischer Versand oder Kalendereintrag.
6. Visueller Browser-Test inkl. Smartphone, echte Zustellung und Ende-zu-Ende-Terminbuchung sind in dieser Sitzung nicht durchgeführt; Browser und Ausführungsumgebung nicht verfügbar.
7. Endgültige Homepage festlegen: index.html und personal-v4.html sind unterschiedliche Fassungen. Keine Umleitung oder Produktions-Promotion in diesem Auftrag.
8. SEO gehört in den nächsten Release-Schritt: personal-v4.html und unternehmen.html tragen noindex; robots.txt und sitemap.xml fehlen im Branch. Build kopiert aktuell nur HTML/CSS, benannte JS-Dateien und assets; Sitemap/robots müssen beim späteren SEO-Release mit aufgenommen werden. Kanonische Produktionsdomain noch nicht festgelegt.

## Empfohlener endgültiger B2B-Ablauf
Persönliche Demo anfragen → sechs Business-Angaben → echte Eingangsbestätigung → Termin direkt auswählen → Beispielsetup für den Termin → Live-Softwarevorstellung → individuell vereinbarter Pilot.
Für die direkte Terminauswahl braucht es einen bestätigten Buchungslink. Für Speicherung/Benachrichtigung eine getestete Lead-Annahme; ein Mailto-Link ist kein automatischer Versand.


## Nachtrag: Cal.com und finale Partnerbedingungen
- Vom Nutzer bestätigter Buchungslink: https://cal.com/ken-buser-nyfsfe/pulse-demo. Screenshot nennt 45 Minuten und Cal Video.
- B2B-Conversion-CTAs führen direkt zu Cal.com. business-demo.html bleibt als kompatible Informationsseite mit demselben Buchungslink erhalten; der vorbereitende lokale E-Mail-Fragebogen ist aus dem Weg entfernt.
- Datenschutzerklärung um den externen Cal.com-Buchungsweg ergänzt. Kein eingebetteter Kalender, keine automatische Datenübergabe.
- Affiliate-Konditionen vom Nutzer als final bestätigt. Entwurfskennzeichnung entfernt, Fassung AF-2026-11-26-R3. Provisionssätze, Laufzeit, Auszahlungs- und Beendigungsregeln bleiben inhaltlich unverändert.
- Finale Bedingungen bedeuten nicht automatisch freigeschaltetes Partnerportal. Keine Änderungen an Tracking oder Auszahlungsinfrastruktur.
- Öffentliche Cal-Buchungsseite konnte mit der Web-Recherche nicht abgerufen werden; Link aus dem Screenshot übernommen. Kalenderanbindung, Benachrichtigungen und Erinnerungs-Workflows im privaten Cal-Konto nicht überprüfbar. Kein Testtermin angelegt, keine E-Mail ausgelöst.
