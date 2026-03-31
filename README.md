# 🥊 BOX TRAINER

**Progressive Web App per allenamento boxe con combinazioni vocali**

Timer professionale per allenamento al sacco con:
- 🔔 Campanelle inizio/fine round (Web Audio API con armoniche realistiche)
- 🗣️ Voce italiana per combinazioni di colpi (Speech Synthesis API)
- ⚙️ Configurazione completa (rounds, durata, riposo, intervallo numeri)
- 📊 Storico allenamenti (IndexedDB)
- 📱 Installabile su iOS/Android (PWA)
- 🎨 UI ottimizzata per Safari mobile

## 🚀 Deploy su Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/raydalessandro/Box_Trainer)

## 🛠️ Tech Stack

- **React 18** + **TypeScript 5** (strict mode)
- **Vite 6** (build tool con HMR)
- **Web Audio API** (oscillatori per campane)
- **Speech Synthesis API** (TTS italiano)
- **IndexedDB** (storage offline con idb wrapper)
- **Service Worker** (caching offline-first)
- **PWA** (manifest + icone + iOS meta tags)

## 📦 Installazione locale

```bash
npm install
npm run dev     # Dev server su http://localhost:3006
npm run build   # Build produzione
npm run preview # Preview build locale
```

---

**Creato da Ray D'Alessandro** — Ottimizzato per allenamento sacco pesante 🥊
