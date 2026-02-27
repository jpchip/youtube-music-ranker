# YouTube Music Ranker

A web app to rank your YouTube Music songs through head-to-head battles using the Glicko-2 rating system.

## Features

- **Import Playlists** -- Paste a YouTube Music or Spotify playlist URL to import all songs
- **Head-to-Head Battles** -- Songs compete against each other with embedded YouTube playback
- **Glicko-2 Rankings** -- Statistically robust ranking system with rating deviation tracking
- **Smart Matchmaking** -- Prioritizes uncertain songs (high RD) and avoids repeat matchups
- **Share Rankings** -- Generate shareable links for your rankings

## Tech Stack

- **Frontend**: React, TypeScript, TailwindCSS, Vite
- **Backend**: Express, TypeScript
- **Database**: SQLite (via sql.js)
- **YouTube Music**: ytmusic-api (unofficial)
- **Spotify**: Spotify Web API (public playlists via client credentials)
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

### Spotify Setup (optional)

To enable Spotify playlist imports:

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create an app and copy the Client ID and Client Secret
3. Create `server/.env` (see `server/.env.example`):
   ```
   SPOTIFY_CLIENT_ID=your_client_id
   SPOTIFY_CLIENT_SECRET=your_client_secret
   ```

YouTube Music import works without any configuration.

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

1. Go to **Import** and paste a YouTube Music or Spotify playlist URL
2. Head to **Battle** to start ranking songs head-to-head
3. View your **Rankings** leaderboard
4. Click **Share** to generate a link others can view

## Importing Uploaded Songs

YouTube Music doesn't expose private/uploaded songs via its API. Use the included scraper script to export them.

### 1. Install scraper dependencies

```bash
cd scripts
npm install
```

### 2. Launch Chrome with remote debugging

The scraper connects to a real Chrome session so Google doesn't block the login. You must close any existing Chrome windows first, then run:

```bash
google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug
```

Log into your YouTube Music account in that window and navigate to your uploaded songs library if it doesn't redirect automatically.

### 3. Run the scraper

In a separate terminal:

```bash
cd scripts
node scrape-uploads.js
```

The script will open `https://music.youtube.com/library/uploaded_songs`, scroll through the full list (this may take a few minutes for large libraries), and save the results to `scripts/uploads.json`.

### 4. Import into the app

1. Open the app and go to **Import → Video IDs**
2. Click **Choose uploads.json** and select `scripts/uploads.json`
3. Click **Import**

The server searches the YouTube Music catalog for each song to get proper metadata. If a song isn't found in the catalog, it falls back to the scraped title and artist.
