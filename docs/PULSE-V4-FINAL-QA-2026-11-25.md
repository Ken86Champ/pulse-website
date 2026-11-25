# PULSE V4 – Funktions- und Regressionstest

Datum: 25. November 2026. Basis: V4 mit 14 Erfolgsbildern und Affiliate-Seite. Testdaten ausschliesslich synthetisch und lokal; keine Checkout-Sitzung, Zahlung, Kundenerstellung oder E-Mail ausgelöst.

## Änderungen

- Alle vier Anmelde-CTAs führen auf onboarding.html, einschliesslich Sprachparameter.
- Bestehender Footer-Einstieg zum Partnerprogramm ist enthalten und durchgeklickt.
- Logo-Links der Landingpage und des Onboardings führen zur gewählten personal-v4.html.
- Schrift, Typografie, Bilder und Layout nicht geändert.

## Bestanden

- 34 vorhandene automatisierte Tests: 34 bestanden, 0 fehlgeschlagen.
- Build und Prüfung lokaler Ressourcen, eindeutiger IDs und Anker von Landingpage, Onboarding, Affiliate-Seite und Affiliate-AGB.
- Alle vier Anmelde-CTAs einzeln im Browser bis zum Onboarding geöffnet.
- DE/EN/FR/IT: alle vier CTA-Ziele mit korrektem Sprachparameter.
- Vier Hero-Szenen, sechs interaktive Demo-Szenen und fünf App-Ansichten ausgewählt; Zustandswechsel geprüft.
- Galerie: 14 Karten vorhanden; Grossansicht des letzten Eintrags und Escape-Schliessen geprüft. Erst-/Letztgrenzen und weitere Bildzuordnungen waren in den vorangehenden Galerieprüfungen geprüft worden.
- Alle elf FAQ-Schalter per Tastatur betätigt; aria-expanded wechselt korrekt.
- Mobile Navigation öffnet und schliesst beim Navigieren.
- Originalvideo: Metadaten geladen, readyState 4, Dauer 164.53 Sekunden, kein Media-Fehler. Kein vollständiger Hör-/Filmtest.
- Footer-Navigation zur Affiliate-Seite und von dort zu den Affiliate-AGB durchgeklickt.
- Landingpage und Onboarding bei 320, 375, 390, 430, 768, 1024, 1280 und 1440 Pixel Iframe-Breite: Dokumentbreite entspricht jeweils der nutzbaren Viewport-Breite; kein horizontaler Seitenüberlauf.
- Onboarding mit synthetischem Profil durch alle sieben Schritte bis zur Zusammenfassung: Pflichtfeldschutz, Zurück und Datenerhalt, Ziele-Mehrfachauswahl, Trainingstage, Zuhause/Equipment-Rückfrage, Equipment-Auswahl, Ernährungsregeln, gegenseitiger Ausschluss von Keine und Allergieauswahl sowie Gesundheits-Ja-Rückfrage mit Pflichtdetailfeld geprüft.
- In der lokalen Zusammenfassung wird der Checkout korrekt nicht angeboten, solange die Verfügbarkeit negativ ist.

## Offene Punkte vor einem echten Launch

1. Veröffentlichtes GET /api/secure-checkout liefert available:false. Ein echter Abschlussweg ist derzeit nicht freigeschaltet. Kein vollständiger End-to-End-Kauf möglich.
2. Der vorhandene Stripe-Checkout-Code erzeugt ein reguläres CHF-98-Monatsabo und enthält keine trial_period_days-Konfiguration. Die beworbene siebentägige Testphase ist damit noch nicht implementiert; sie darf nicht allein durch Aktivierung des bestehenden Checkouts als verfügbar dargestellt werden. Auch Zugangsfreischaltung und Vertragsinformationen müssen dazu passen.
3. Affiliate-AGB bleiben als Vertragsentwurf gekennzeichnet; keine anwaltliche Einzelfallprüfung dokumentiert. Tracking und Partnerportal sind als geplant gekennzeichnet.

Ergebnis: Frontend-Verlinkung und geprüfte Funktionen bestanden. Keine vollständige Launch-Freigabe des Kauf- und Testangebots.
