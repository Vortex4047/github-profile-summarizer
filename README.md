# GitHub Journey Dashboard

Frontend-only GitHub analytics portfolio dashboard built with vanilla HTML/CSS/JS.

## What was changed

- Backend has been removed.
- App now fetches live data directly from GitHub API in the browser.
- Search/load flow was rewritten for stability (profile image + stats + events now render reliably).
- Reveal animations are fail-safe and will not blank the page if JS fails.

## Run

```bash
npm start
```

Then open:

```text
http://localhost:8000
```

## Tech

- `index.html`
- `styles.css`
- `app.js`

## Features

- User search and profile snapshot
- Repo filtering, sorting, and pagination
- Contributions heatmap (30/90/180 days)
- Language breakdown
- Activity stream and momentum cards
- Comparison of two GitHub users
- JSON / PNG / PDF export
- Terminal mode (`terminal` in username input or `Ctrl + Alt + T`)
