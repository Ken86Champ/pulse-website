# PULSE V4: Angebotsvorschau und 7-Tage-Test

Stand: 2026-11-24. Dies ist eine Umsetzung zur Prüfung, keine Aktivierung eines kostenlosen Tests.

## Umgesetzt
- Originale Hero-Headline und Beschreibung bleiben erhalten.
- Ein Angebot und vier einheitliche Test-CTAs, Preis und Kündigung zusammen sichtbar.
- Hero startet mit einer konkreten Alltagssituation: Zeitmangel und verkürzte Trainingsoption.
- Dekorative Hero-Karten verschwinden; das Produkt selbst zeigt den Unterschied.
- Fachlicher Absender: Ken Buser / 10X Personaltraining. Keine erfundenen Kundenergebnisse.
- Bestehendes Originalvideo, sechs Tagesmomente, App-Galerie, Szenarien und Datenschutz bleiben.
- Separater, nicht transaktionaler Test-Einstieg in DE/EN/FR/IT. Kein Formular, keine Zahlung.
- Automatisierte Quellen-, Syntax- und Regressionsprüfungen über GitHub Actions.

## Beobachtete technische Hindernisse
api/secure-checkout.js erstellt derzeit eine normale subscription ohne Trial-Konfiguration.
lib/pulse-fulfillment.js akzeptiert ausschließlich payment_status paid und amount_total 9800.
Ein Nullbetrag oder no_payment_required-Checkout würde daher keinen Coaching-Account einrichten.
Die manuelle Account-Einrichtung und die Coaching-Software haben hier keinen verifizierten Trial-Start/Expiry-Vertrag.
Deshalb darf das vorhandene Checkout nicht als kostenloser Test verwendet werden.

## Vor Aktivierung zwingend vollständig implementieren und im Stripe-Sandbox prüfen
1. Separater, serverseitig festgelegter Trial-Tarif; der Browser darf Preis oder Trial-Dauer nicht bestimmen.
2. Idempotente Einrichtung eines Trial-Profils im richtigen Tenant, bevor eine Zahlung erforderlich ist.
3. ready_at als bestätigter Zeitpunkt des bereitgestellten Coaching-Zugangs. Erst dann sieben volle Tage.
4. Persistierte trial_start, trial_end, Status und Kündigung. Keine Abrechnung während der Einrichtung.
5. Rechnungsbeginn und Stripe-Subscription müssen mit trial_end übereinstimmen. Wiederholte Webhooks dürfen keinen zweiten Account oder falschen Abrechnungsstart erzeugen.
6. Vorab sichtbare Bedingungen, tatsächliche Kündigung vor Ablauf, Beleg und Kundenportal.
7. Erinnerung vor Trial-Ende sowie definierter Zugriff nach Kündigung, Zahlungsfehler oder Ende.
8. Nachweis über Testfälle: bereitgestellter Zugang, verspätete Einrichtung, Kündigung, Trial-Ende, erste Zahlung, Fehler und erneute Webhook-Zustellung.
9. Onboarding, Bedingungen, Bestätigung und Angebot müssen dieselbe Preis-/Trial-Version verwenden.
10. Erst nach ausdrücklicher Freigabe Live-Kaufweg und Homepage umstellen und Preview-Sperre entfernen.

## Prüfgrenze
In dieser Sitzung waren Entwicklungsrechner und Browser nicht verfügbar. Deshalb kein neuer visueller oder vollständiger transaktionaler End-to-End-Test. Frühere Screenshots und Testergebnisse gelten nicht als Nachweis für diesen neuen Stand.
