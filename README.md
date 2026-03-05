<div align="center">

<img src="https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=white" />
<img src="https://img.shields.io/badge/Vite-6.3-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
<img src="https://img.shields.io/badge/Tailwind_CSS-4.1-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" />
<img src="https://img.shields.io/badge/Deployed-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" />

<br/><br/>

# 🧬 Developer Persona Dashboard

**A rich, interactive dashboard that turns any GitHub profile into a beautiful developer portfolio card — with contribution heatmaps, activity streams, repo analytics, and side-by-side comparisons.**

<br/>

[**🔴 Live Demo →**](https://github-summarizer-topaz.vercel.app)&nbsp;&nbsp;&nbsp;[**📁 Source Code →**](https://github.com/Vortex4047/github-summarizer)

<br/>

</div>

---

## ✨ Features

| Feature                     | Description                                                                  |
| --------------------------- | ---------------------------------------------------------------------------- |
| 🔍 **Profile Explorer**     | Search any GitHub username and load their full profile snapshot              |
| 🗓️ **Contribution Heatmap** | Visualize pushes, PRs, and issues across a configurable time window          |
| 📦 **Top Repositories**     | Sort by stars, forks, or recency — plus filter forks and star your favorites |
| 📡 **Activity Stream**      | A live-scrolling feed of the user's most recent public events                |
| 🔬 **Activity Lab**         | Aggregated stats: commit streaks, PR merge rate, top languages               |
| ⚖️ **Developer Compare**    | Load two profiles side-by-side and compare metrics at a glance               |
| 🎨 **3 Visual Themes**      | Switch between **Cyber**, **Hologram**, and **Quantum** color palettes       |
| 🎉 **Party Mode**           | Because sometimes you just need rainbow animations                           |
| 🔦 **Focus Mode**           | Hides the noise and shows only the most important metrics                    |
| ⌨️ **Command Palette**      | `Cmd+K` to instantly access any action in the dashboard                      |
| 📤 **Export Snapshot**      | Download a full JSON snapshot of the current dashboard state                 |
| 🎲 **Surprise Profile**     | `Shift+R` to instantly jump to a random well-known developer                 |

---

## 🖥️ Preview

> The dashboard defaults to **[@Vortex4047](https://github.com/Vortex4047)** on load. Enter any GitHub username in the search bar to explore any developer's persona.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18 or higher
- **npm** (or **pnpm**)

### Local Development

```bash
# 1. Clone the repository
git clone https://github.com/Vortex4047/github-summarizer.git
cd "github summarizer"

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

The app will be available at `http://localhost:5173`.

### Production Build

```bash
npm run build
```

The compiled, optimized assets are output to the `dist/` directory.

---

## ⌨️ Keyboard Shortcuts

| Shortcut       | Action                          |
| -------------- | ------------------------------- |
| `Cmd/Ctrl + K` | Open the Command Palette        |
| `Shift + R`    | Load a random developer profile |
| `Shift + P`    | Toggle Party Mode               |
| `Shift + F`    | Toggle Focus Mode               |

---

## 🛠️ Tech Stack

- **[React 18](https://react.dev/)** — UI component framework
- **[Vite 6](https://vitejs.dev/)** — Lightning-fast dev server & bundler
- **[Tailwind CSS 4](https://tailwindcss.com/)** — Utility-first styling
- **[Radix UI](https://www.radix-ui.com/)** — Accessible, unstyled component primitives
- **[Motion (Framer)](https://motion.dev/)** — Smooth animations and transitions
- **[Recharts](https://recharts.org/)** — Composable charting library
- **[GitHub REST API](https://docs.github.com/en/rest)** — Public data, no auth required

---

## 📦 Deployment

The app is deployed to **[Vercel](https://vercel.com/)** with automatic deployments on every push to `main`. The `vercel.json` configuration ensures all routes are correctly rewired to the SPA entry point.

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

---

## 📄 License

This project is open source. Feel free to fork, remix, and build upon it.

---

<div align="center">

Built with ❤️ by **[@Vortex4047](https://github.com/Vortex4047)**

</div>
