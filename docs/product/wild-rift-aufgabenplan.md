# Wild Rift Aufgabenplan (Rifto)

Dieser Plan ist als umsetzbares Backlog strukturiert: **P0 zuerst**, dann P1/P2.

## Sprint 1–2 (P0): Fundament für Smart-Ban

### Aufgabe 1 — Datenquellen-Matrix definieren
- **Ziel:** Festlegen, welche Daten täglich/stündlich geladen werden (Matchdaten, Patchinfos, Item-Performance, Champion-Performance).
- **Deliverable:** `docs/product/data-source-matrix.md` mit Quelle, Update-Frequenz, Risiko, Fallback.
- **Akzeptanzkriterien:**
  - Alle Kernfeatures (Ban, Pick, Coach) sind mindestens einer Quelle zugeordnet.
  - Für jede Quelle gibt es rechtlichen/compliance Hinweis.

### Aufgabe 2 — Patch- und Item-Impact-Features in ETL aufnehmen
- **Ziel:** Das System soll OP-Items und Patch-Änderungen aktiv im Score berücksichtigen.
- **Deliverable:** Neue ETL-Features (`item_power_delta`, `patch_change_intensity`, `champ_patch_volatility`).
- **Akzeptanzkriterien:**
  - Features landen täglich in der Feature-Tabelle.
  - Historie für mindestens die letzten 3 Patches vorhanden.

### Aufgabe 3 — Smart-Ban v1 Scoring implementieren
- **Ziel:** Ban-Empfehlung mit Top-3 Ausgaben + Confidence.
- **Deliverable:** Erweiterung in `services/recommendation/ban_engine.py` und Tests.
- **Akzeptanzkriterien:**
  - Score nutzt mindestens: Gegner-Mastery, Matchup-Risiko, Patch-Power, Item-Abuse.
  - API/Output enthält pro Ban: `reason`, `confidence`, `alternatives`.

### Aufgabe 4 — Explainability-Textgenerator bauen
- **Ziel:** Jede Empfehlung muss verständlich begründet werden.
- **Deliverable:** Modul für Begründungen („Warum Ban X jetzt sinnvoll ist“).
- **Akzeptanzkriterien:**
  - Für jede Top-3 Empfehlung wird ein 1–2 Satz Grund erzeugt.
  - Bei dünner Datenlage: klarer „Low confidence“-Hinweis.

---

## Sprint 3–4 (P0): Auto-Coach für Anfänger + Pros

### Aufgabe 5 — Skill-Tier Routing (Beginner/Pro) einführen
- **Ziel:** Empfehlungen je nach Spielniveau unterschiedlich tief ausgeben.
- **Deliverable:** Routing-Logik + Konfigurationsdatei mit Schwellenwerten.
- **Akzeptanzkriterien:**
  - Beginner bekommen max. 3 einfache Next Steps.
  - Pro-User bekommen Trade-offs + Alternativen.

### Aufgabe 6 — Next-Best-Action Engine v1
- **Ziel:** Nach jedem Match konkrete nächste Aktion liefern.
- **Deliverable:** Priorisierte Empfehlung mit Impact-Score.
- **Akzeptanzkriterien:**
  - Mindestens 1 „nächster Schritt“ und 1 Alternative pro Analyse.
  - Jede Aktion ist mit geschätztem Impact markiert (Low/Med/High).

### Aufgabe 7 — Weekly Improvement Plan
- **Ziel:** Aus Einzel-Empfehlungen einen Wochenplan bauen.
- **Deliverable:** 7-Tage Plan (z. B. Fokus: Objective Timing, Lane-Sicherheit, Draftdisziplin).
- **Akzeptanzkriterien:**
  - Plan berücksichtigt Rolle + Champion-Pool.
  - Fortschritt kann als „umgesetzt/nicht umgesetzt“ markiert werden.

---

## Sprint 5 (P1): UX, Mobile-Speed, Vertrauen

### Aufgabe 8 — Mobile Draft UI auf 2-Klick-Flow trimmen
- **Ziel:** In unter 5 Sekunden zur Ban-Empfehlung.
- **Deliverable:** Vereinfachte Draft-Karte mit Top-3 Bans sofort sichtbar.
- **Akzeptanzkriterien:**
  - TTFV im Draft < 5 Sekunden auf Midrange-Smartphone.
  - Wichtige Elemente sind einhändig erreichbar.

### Aufgabe 9 — Confidence & Safety Layer
- **Ziel:** Keine scheinpräzisen Empfehlungen.
- **Deliverable:** Confidence-Grenzen + Fallback-Meta-Tipps.
- **Akzeptanzkriterien:**
  - Unter Confidence-Schwelle werden alternative sichere Bans angezeigt.
  - Monitoring für Ausreißer-Scores eingerichtet.

### Aufgabe 10 — KPI-Tracking Live nehmen
- **Ziel:** Wirkung messbar machen.
- **Deliverable:** Events für „Empfehlung gesehen“, „Empfehlung umgesetzt“, „Outcome verbessert“.
- **Akzeptanzkriterien:**
  - D7 Retention, Feature-Adoption, TTFV sind im Dashboard sichtbar.
  - Wöchentlicher KPI-Review-Prozess dokumentiert.

---

## Sprint 6+ (P2): Differenzierung & Scale

### Aufgabe 11 — Draft-Simulation (What-if)
- **Ziel:** Pros/Teams können Pick/Ban-Szenarien simulieren.
- **Deliverable:** Simulationsansicht mit Counter- und Synergie-Vergleich.
- **Akzeptanzkriterien:**
  - Mindestens 3 Szenarien pro Draft konfigurierbar.
  - Ergebnis zeigt Risiko und erwarteten Vorteil.

### Aufgabe 12 — Team-Coach Mode
- **Ziel:** Teambezogene Empfehlungen statt nur Einzelspieler-Logik.
- **Deliverable:** Rollenübergreifende Team-Insights + Export.
- **Akzeptanzkriterien:**
  - Team-Plan für nächste Scrim-Session generierbar.
  - Insights nach Rolle filterbar.

### Aufgabe 13 — Growth Features
- **Ziel:** Organisches Wachstum durch teilbare Ergebnisse.
- **Deliverable:** Shareable Draft Recap und Weekly Progress Card.
- **Akzeptanzkriterien:**
  - 1-Klick Share auf Mobile.
  - Tracking für Shares und Rückkehrquote vorhanden.

---

## Priorisierung (Kurz)
- **P0:** Aufgaben 1–7 (ohne diese kein „super intelligentes“ Kernprodukt)
- **P1:** Aufgaben 8–10 (UX-Qualität, Vertrauen, Messbarkeit)
- **P2:** Aufgaben 11–13 (Pro-Differenzierung und Wachstum)

## Team-Zuschnitt (minimal)
- **Data/Backend:** Aufgaben 1–4, 9
- **ML/Recommendation:** Aufgaben 3–7, 11
- **Frontend/Mobile UX:** Aufgaben 8, 10, 13
- **Product/Analytics:** Aufgaben 1, 10, KPI-Reviews
