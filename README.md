# Thought Organizer (مجموعۂ افکار و علمی ذخیرہ)

[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.1-646CFF.svg)](https://vitejs.dev/)
[![Capacitor](https://img.shields.io/badge/Capacitor-8.5-119EFF.svg)](https://capacitorjs.com/)
[![Deployment](https://img.shields.io/badge/Deploy-Vercel%20%7C%20Netlify-black.svg)](https://vercel.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> **Thought Organizer** is an academic-grade digital compendium and personal knowledge repository designed for cataloging, contemplating, and exploring profound literary, historical, philosophical, and spiritual reflections. Built with native support for classical **Jameel Noori Nastaleeq** (خط نستعلیق), modern Urdu typography, and English prose.

---

## 🌟 Key Features

### 📖 Full-Page Academic Reading Mode
- **Dedicated Reading View**: Each thought opens as a full-page scholarly article (`#/thought/:id`) with no distracting popup backdrops.
- **Dynamic Font Size Scaler**: Interactive `A-` and `A+` controls allowing readers to smoothly adjust typography size from 16px to 36px with automatic persistence.
- **Jameel Noori Nastaleeq Typography**: Ample `2.45` line-height ensuring dots (*nuqte*) and diacritics (*zer, zabar, pesh*) render flawlessly without clipping.
- **Reading Time & Metadata**: Real-time reading time estimation (`مطالعہ: ~X منٹ`), category tag badges, date formatting, and word counts.
- **Manuscript Ornamentation**: Classical dividers (`✦ • ✦ • ✦`) and pull quotes formatted like archival manuscripts.

### 🧭 Hash-Based SPA Routing & Deep Linking
- **Direct Bookmarks & Sharing**: Deep links for every section and thought:
  - `#/` — All Thoughts (تمام افکار)
  - `#/similar` — Thematic Strands & Similar Thoughts (مماثل افکار)
  - `#/add` — Thought Composer
  - `#/settings` — Application Settings
  - `#/thought/:id` — Direct permalink for any thought
  - `#/thought/:id/edit` — In-place thought editor
- **Browser & Mobile Back-Button Integration**: Full history stack supporting browser back/forward buttons, swipe navigation, and Capacitor Android hardware back buttons.
- **One-Click Link Copy**: Built-in `Share2` icon button to copy deep links directly to clipboard with instant toast notifications.

### 🔍 Similar Thoughts & Thematic Strands (مماثل افکار)
- **Curated Strands**: Explore pre-configured intellectual strands including:
  - *کوفہ کے مسافر* (Historical & Karbala Narratives)
  - *سیدہ فاطمہ زہراؑ* (Elegies & Spiritual Reflections)
  - *فلسفہ و شریعتی* (Dr. Ali Shariati & Critical Philosophy)
  - *ادعیہ و مناجات* (Supplications & Whispered Prayers)
  - *ادب و شاعری* (Classical Urdu Poetry & Literature)
  - *اقوال و حکمت* (Nahj al-Balagha & Wisdom Sayings)
  - *AI و پرامپٹس* (Modern Artificial Intelligence Prompts)
- **Automated Similarity Engine**: Real-time keyword extraction and similarity score calculation between thoughts with interactive seed spotlighting.

### 🗂️ 115 Pre-Loaded Curated Thoughts
- Embedded dataset of 115 rich thoughts classified across 15 distinct intellectual domains.
- Fully offline-ready with `initialData.json` fallback and `localStorage` synchronization.

### 🎠 Category Carousel with Scroll Arrows
- Intuitive horizontal category chips bar equipped with dedicated **Left (`ChevronLeft`) and Right (`ChevronRight`) scroll buttons**.
- Smooth 280px step navigation allowing readers to effortlessly browse all collections without awkward trackpad gestures.

### 🎙️ Audio Narrator & Spiritual Voice Export
- **Gemini AI Audio Player**: Embedded `PostSoundPlayer` with visual track scrubber and time elapsed display.
- **WAV Audio Export**: Download spiritual voice audio files (`.wav`) per thought with a single click.

### 🎨 Oxford Academic Aesthetics
- **Vellum Palette**: Warm archival paper (`#fbf9f5`), Oxford navy (`#1b3a5c`), and subtle gold highlights (`#b3822a`).
- **Oxford Midnight Dark Mode**: Deep slate background (`#0e1217` / `#151b22`) with gold contrast accents.
- **Icon-First UI**: Clean icon buttons for backup, settings, theme toggle, and card actions.

---

## 🏗️ Architecture

```
thought-organizer/
├── src/
│   ├── App.jsx                 # Main application shell, hash router, and full reading view
│   ├── App.css                 # Academic typography, Oxford theme, and responsive styling
│   ├── CollectionsView.jsx     # Card grid, category scroll carousel, and search/filter
│   ├── SimilarThoughtsView.jsx # Thematic strands, keyword engine, and thought spotlight
│   ├── initialData.json        # 115 embedded scholarly thoughts & 15 categories
│   ├── fontUtils.js            # Font family resolver & category frequency ranking
│   ├── audioExporter.js        # Spiritual voice audio synthesizer & WAV generator
│   ├── useTTS.js               # Text-to-speech engine hook
│   └── useTranslate.js         # Urdu-English bidirectional translation hook
├── vercel.json                 # Vercel SPA rewrite configuration
├── netlify.toml                # Netlify SPA redirect rules
├── capacitor.config.json       # Android / iOS Capacitor configuration
└── package.json                # Project dependencies
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/Kaiserabbas/thought-organizer.git
cd thought-organizer

# Install dependencies
npm install

# Start development server
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 📦 Production Build & Deployment

### Build for Production

```bash
npm run build
```
The optimized bundle will be generated in `dist/`.

### Deploy to Vercel
```bash
npx vercel --prod
```
Or push to GitHub and connect repository to [Vercel](https://vercel.com). (Pre-configured via `vercel.json`).

### Deploy to Netlify
```bash
npx netlify deploy --prod --dir=dist
```
Or connect repository to [Netlify](https://netlify.com). (Pre-configured via `netlify.toml`).

---

## 📱 Mobile Android Build (Capacitor)

```bash
# Sync web build to Android project
npx cap sync android

# Open in Android Studio
npx cap open android
```

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

**Developed with scholarly contemplation by [@Kaiserabbas](https://github.com/Kaiserabbas)**
