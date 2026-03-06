import "dotenv/config";
import "./types.js";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { initSql } from "./db.js";
import { initUsersDb } from "./usersDb.js";
import { authMiddleware } from "./middleware/auth.js";
import { adminMiddleware } from "./middleware/admin.js";
import authRoutes from "./routes/auth.js";
import playlistRoutes from "./routes/playlist.js";
import songsRoutes from "./routes/songs.js";
import battleRoutes from "./routes/battle.js";
import shareRoutes from "./routes/share.js";
import settingsRoutes from "./routes/settings.js";
import adminRoutes from "./routes/admin.js";
import playlistsRoutes from "./routes/playlists.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3001;

app.set("trust proxy", 1);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://www.youtube.com", "https://s.ytimg.com"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: [
          "'self'",
          "data:",
          "https://i.ytimg.com",
          "https://yt3.ggpht.com",
          "https://lh3.googleusercontent.com",
          "https://i.scdn.co",        // Spotify album art
          "https://mosaic.scdn.co",
        ],
        frameSrc: [
          "https://www.youtube.com",
          "https://www.youtube-nocookie.com",
          "https://open.spotify.com",
        ],
        connectSrc: ["'self'", "https://www.youtube.com", "https://youtubei.googleapis.com"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
  })
);
app.use(cors({
  origin: process.env.CORS_ORIGIN || undefined,
}));
app.use(express.json({ limit: "10mb" }));

app.use("/api/auth", authRoutes);
app.use("/api/share", shareRoutes);
app.use("/api/playlist", authMiddleware, playlistRoutes);
app.use("/api/songs", authMiddleware, songsRoutes);
app.use("/api/battle", authMiddleware, battleRoutes);
app.use("/api/settings", authMiddleware, settingsRoutes);
app.use("/api/playlists", authMiddleware, playlistsRoutes);
app.use("/api/admin", authMiddleware, adminMiddleware, adminRoutes);

// Serve static client build in production
const clientDist = path.join(__dirname, "..", "..", "client", "dist");
app.use(express.static(clientDist));
app.get("*", (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

async function start() {
  await initSql();
  await initUsersDb();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start().catch(console.error);
