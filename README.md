# RIFTO – OP.GG‑Style (Personal iOS PWA)

✅ Sieht aus wie eine echte App (Cards + Champion‑Icons + Dark UI)  
✅ iOS: Safari → „Zum Home‑Bildschirm“ (kein App Store)  
✅ Daily Stats Update via GitHub Actions (CN‑API basierte Quelle)

## Setup (GitHub Pages)
1) Repo erstellen und alle Dateien hochladen
2) Settings → Pages → Deploy from branch → main / root
3) iPhone: URL in Safari öffnen → Teilen → Zum Home‑Bildschirm

## Daily Updates
Der Workflow `.github/workflows/update-meta.yml` läuft täglich (08:00 Berlin) und schreibt `meta.json` neu.

## Hinweis zu Bildern
Champion‑Icons werden aus dem öffentlichen LoL Data‑Dragon CDN geladen (Placeholder).  
Wenn du 100% Wild‑Rift‑Assets willst, können wir später auf eine andere, rechtlich saubere Quelle umstellen oder eigene Icons einbauen.
