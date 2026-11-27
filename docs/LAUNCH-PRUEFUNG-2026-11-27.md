# Launch-Prüfung 27.11.2026

## Stand

Neue Version zur Prüfung vorbereitet, noch nicht produktiv freigeschaltet. Der bisherige Kaufweg bleibt unverändert. Freigabe der neuen B2C-Seite erst nach verifiziertem 7-Tage-Test.

## Korrigiert

- 21 gemeinsame Footer geprüft; Affiliate-Seiten verweisen mit „AGBs“ auf die Partnerbedingungen.
- Alter Entwurfshinweis in den Affiliate-AGBs bereinigt; Konditionen bleiben unverändert.
- B2B-Demo verweist auf den bestehenden Cal.com-Termin; Videobezeichnung auf Google Meet berichtigt.
- Defekter Demo-Anker einer älteren B2C-Seite korrigiert.
- Alle vier Bestell-CTAs der freigegebenen B2C-Seite führen in denselben separaten Test-Einstieg; Sprachwechsel erhält diesen Weg.
- Bestehende Gestaltung und Kundenbilder bleiben erhalten.

## Gratis-Test

Separater Stripe-Setup-Checkout hinterlegt die Zahlungsmethode ohne Abo-Abbuchung. Nach bestätigtem Setup wird das Coaching über die bestehende Software vorbereitet. Die signierte Bereitmeldung verlangt dort aktives Profil, gespeicherten Livegang und versendete Einladung. Erst danach entsteht die siebentägige Stripe-Testsubscription. Gesundheitsfreigaben bleiben unverändert. Bestehende bezahlte Mitgliedschaften werden nicht umgestellt.

Kündigung ist bereits während der Vorbereitung möglich. Wiederholte Bereitmeldungen verlängern den Test nicht. Atomare Postgres-Funktionen, Stripe-Idempotenz und aktuelle Stripe-Statusabfragen sichern Doppelklicks, parallele Kündigung und verzögerte Webhooks ab. Start und Fristerinnerung laufen über den Kundenversand der App. Die Website versendet weiterhin keine E-Mails über einen neu eingerichteten Anbieter.

Migration: `supabase/migrations/20261127133559_pulse_b2c_trial.sql` im PULSE-Onboarding-Projekt; noch nicht produktiv angewandt. Nur serverseitige Zugriffe, RLS aktiv, keine öffentlichen Rollenrechte.

## Verifikation

- Bestehende und neue Website-Tests, einschließlich echter Postgres-Ausführung in PGlite, grün.
- Statische Prüfung sämtlicher HTML-Seiten: lokale Ziele, Anker, Bildbeschreibungen, eindeutige IDs und Syntax der Inline-Skripte.
- Prüfung der gemeinsamen Footer und Produktionsbau der Vorschau grün.
- Software-Anbindung: Tests für fehlendes Profil, wartende Einladung, signierte Bereitmeldung, einmalige Startbestätigung und Fristerinnerung.

## Noch offen vor Launch

1. Echte isolierte Stripe-Testumgebung mit Checkout, Webhooks, verzögerter Bereitstellung, Kündigung und Test-Uhr bis zur ersten CHF-98-Rechnung. Die automatische Sicherheitsprüfung hat das Anlegen einer neuen Sandbox mit Name und E-Mail abgelehnt; es wurde keine Sandbox erstellt.
2. Migration nach bestandenem Integrationstest anwenden, Konfiguration beider Projekte setzen und zusammenhängenden Ablauf erneut prüfen.
3. Erst danach Produktionsbau mit `PULSE_B2C_TRIAL_ENABLED=true` und `PULSE_TRIAL_LAUNCH_VERIFIED=true`. Ohne beide Schalter verweigert dieser Stand den Produktionsbau.
4. Abschliessender Browser- und Laufzeitcheck der veröffentlichten Version.

## Suchmaschinen

Der Build setzt die freigegebene B2C-Seite auf `/`, eindeutige Titel, Beschreibungen, kanonische URLs und WebPage-Daten. Sitemap, robots.txt und llms.txt sind vorbereitet. Vorschauen bleiben von der Indexierung ausgeschlossen. Bestell-, API- und ältere Vorschauseiten werden nicht als Suchergebnisse angeboten. Es wurde keine Indexierung bei Google oder Bing beantragt und keine garantierte Aufnahme behauptet.
