# YouTube Music Ranker

A web app to rank your YouTube Music songs through head-to-head battles using the Glicko-2 rating system.

## Features

- **Import Playlists** -- Paste a YouTube Music playlist URL to import all songs
- **Head-to-Head Battles** -- Songs compete against each other with embedded YouTube playback
- **Glicko-2 Rankings** -- Statistically robust ranking system with rating deviation tracking
- **Smart Matchmaking** -- Prioritizes uncertain songs (high RD) and avoids repeat matchups
- **Share Rankings** -- Generate shareable links for your rankings

## Tech Stack

- **Frontend**: React, TypeScript, TailwindCSS, Vite
- **Backend**: Express, TypeScript
- **Database**: SQLite (via sql.js)
- **YouTube Music**: ytmusic-api (unofficial)
- **Rating System**: Glicko-2

## Getting Started

### Prerequisites

- Node.js 18+

### Install

```bash
npm install
cd client && npm install
cd ../server && npm install
```

### Development

Run both client and server concurrently:

```bash
npm run dev
```

Or run them separately:

```bash
npm run dev:client   # Vite dev server on :5173
npm run dev:server   # Express API on :3001
```

The Vite dev server proxies `/api` requests to the Express backend.

### Production Build

```bash
npm run build
npm start
```

## Usage

1. Go to **Import** and paste a YouTube Music playlist URL
2. Head to **Battle** to start ranking songs head-to-head
3. View your **Rankings** leaderboard
4. Click **Share** to generate a link others can view
