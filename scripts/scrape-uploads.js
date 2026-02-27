#!/usr/bin/env node
/**
 * Scrapes your YouTube Music uploaded songs (title, artist, videoId).
 * Run: node scripts/scrape-uploads.js
 * Output: scripts/uploads.json
 *
 * Prerequisites:
 *   google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug
 */

import puppeteer from "puppeteer";
import { writeFileSync } from "fs";
import { createInterface } from "readline";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = join(__dirname, "uploads.json");

function waitForEnter(prompt) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(prompt, () => { rl.close(); resolve(); });
  });
}

async function scrapeSongs(page) {
  const seen = new Map(); // videoId -> { videoId, title, artist }

  let staleTries = 0;
  const MAX_STALE = 5; // stop after 5 consecutive scrolls with no new songs

  while (staleTries < MAX_STALE) {
    const prevCount = seen.size;

    const found = await page.evaluate(() => {
      const results = [];
      const rows = document.querySelectorAll("ytmusic-responsive-list-item-renderer");
      for (const row of rows) {
        // Video ID from the watch link
        const link = row.querySelector('a[href*="watch?v="]');
        const match = link?.href.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
        const videoId = match?.[1];
        if (!videoId) continue;

        // Title: first yt-formatted-string with class "title", or first link text
        const titleEl =
          row.querySelector("yt-formatted-string.title") ||
          row.querySelector(".title") ||
          link;
        const title = titleEl?.textContent?.trim() || "Unknown";

        // Artist: text in the secondary flex columns (second column)
        const cols = row.querySelectorAll(
          ".secondary-flex-columns yt-formatted-string, .flex-column:nth-child(2) yt-formatted-string"
        );
        const artist = cols[0]?.textContent?.trim() || "";

        results.push({ videoId, title, artist });
      }
      return results;
    });

    for (const song of found) {
      if (!seen.has(song.videoId)) seen.set(song.videoId, song);
    }

    if (seen.size === prevCount) {
      staleTries++;
      console.log(`  ${seen.size} songs (no new — attempt ${staleTries}/${MAX_STALE})`);
    } else {
      staleTries = 0;
      console.log(`  Found ${seen.size} songs so far...`);
    }

    // Scroll to the very bottom each time to trigger next batch
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise((r) => setTimeout(r, 3000));
  }

  return [...seen.values()];
}

(async () => {
  console.log("Connecting to Chrome...");
  const browser = await puppeteer.connect({ browserURL: "http://localhost:9222" });

  const page = await browser.newPage();
  await page.goto("https://music.youtube.com/library/uploaded_songs", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });

  console.log("\n=== Log in if needed, then wait for songs to appear ===");
  await waitForEnter("Press Enter once the song list has loaded...\n");

  await page.waitForSelector("ytmusic-responsive-list-item-renderer", { timeout: 15000 }).catch(() => {
    console.log("Warning: could not detect song rows. Proceeding anyway...");
  });

  console.log("Scrolling through all songs...");
  const songs = await scrapeSongs(page);

  if (songs.length === 0) {
    console.error("No songs found.");
    await browser.disconnect();
    process.exit(1);
  }

  writeFileSync(OUTPUT_FILE, JSON.stringify(songs, null, 2));
  console.log(`\nDone! Saved ${songs.length} songs to: ${OUTPUT_FILE}`);

  await browser.disconnect();
})();
