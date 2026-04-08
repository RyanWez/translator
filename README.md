<div align="center">

<img width="80" height="80" src="public/favicon.ico" alt="Translator Logo" />

# Translator

**AI-Powered Multilingual Translation — Instant, Direct, Beautiful.**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![Gemini](https://img.shields.io/badge/Gemini_AI-Powered-4285F4?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-Pages-F38020?style=flat-square&logo=cloudflare&logoColor=white)](https://pages.cloudflare.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![License](https://img.shields.io/badge/License-Private-gray?style=flat-square)](#)

<br />

[**Live Demo →**](https://translator.ryanwez.com)


</div>

---

## ✨ Features

| | Feature | Description |
|---|---|---|
| 🌐 | **8 Languages** | Burmese, English, Japanese, Korean, Chinese, Thai, Spanish, French |
| 🤖 | **Auto-detect Input** | Automatically recognizes the source language — just type and translate |
| 💬 | **Chat Interface** | Conversational UI with message history and smooth animations |
| 🎨 | **Apple-style Design** | Polished iOS-inspired interface with rounded bubbles & fluid transitions |
| 🌙 | **Dark Mode** | Seamless light/dark theme toggle with localStorage persistence |
| 📋 | **One-click Copy** | Instantly copy any translation to clipboard |
| ⚡ | **Server-side API** | API key secured via server actions — never exposed to the client |
| 📱 | **Mobile-first** | Responsive design optimized for all screen sizes |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────┐
│                    Client                     │
│  Next.js 15 + React 19 + Framer Motion       │
│  ┌──────────────────────────────────────────┐ │
│  │  Chat UI  →  Server Action  →  Response  │ │
│  └──────────────────────────────────────────┘ │
└──────────────────┬───────────────────────────┘
                   │ POST (Server Action)
┌──────────────────▼───────────────────────────┐
│              Server (Edge)                    │
│  actions.ts → Google GenAI SDK → Gemini API  │
│  API Key stored as environment secret        │
└──────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

<table>
<tr>
<td><strong>Frontend</strong></td>
<td>Next.js 15, React 19, TypeScript 5.9</td>
</tr>
<tr>
<td><strong>Styling</strong></td>
<td>Tailwind CSS 4, Framer Motion</td>
</tr>
<tr>
<td><strong>AI Engine</strong></td>
<td>Google Gemini API via <code>@google/genai</code></td>
</tr>
<tr>
<td><strong>Deployment</strong></td>
<td>Cloudflare Pages via <code>@opennextjs/cloudflare</code></td>
</tr>
<tr>
<td><strong>Domain</strong></td>
<td><a href="https://translator.ryanwez.com">translator.ryanwez.com</a></td>
</tr>
</table>

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org) (v18+)
- [Gemini API Key](https://aistudio.google.com/apikey)

### 1. Clone & Install

```bash
git clone https://github.com/RyanWez/translator.git
cd translator
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Open `.env` and set your API key:

```env
GEMINI_API_KEY="your-gemini-api-key-here"
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — start translating! 🎉

---

## ☁️ Deploy to Cloudflare Pages

```bash
# Preview locally with Cloudflare Workers runtime
npm run preview

# Deploy to production
npm run deploy
```

> **Note:** Set `GEMINI_API_KEY` as a secret in your Cloudflare dashboard:
> **Workers & Pages → translator → Settings → Environment variables**

---

## 📁 Project Structure

```
translator/
├── app/
│   ├── page.tsx          # Main chat UI component
│   ├── actions.ts        # Server action (Gemini API call)
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── public/               # Static assets (favicon, etc.)
├── wrangler.jsonc         # Cloudflare Workers config
├── next.config.ts         # Next.js configuration
├── open-next.config.ts    # OpenNext adapter config
└── package.json
```

---

## 📜 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Build & preview with Cloudflare runtime |
| `npm run deploy` | Build & deploy to Cloudflare Pages |
| `npm run lint` | Run ESLint |

---

<div align="center">

Built with ❤️ using **Next.js** and **Gemini AI**

</div>
