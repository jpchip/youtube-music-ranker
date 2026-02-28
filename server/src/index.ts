import "dotenv/config";
import "./types.js";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { initSql } from "./db.js";
import { initUsersDb } from "./usersDb.js";
import { authMiddleware } from "./middleware/auth.js";
import authRoutes from "./routes/auth.js";
import playlistRoutes from "./routes/playlist.js";
import songsRoutes from "./routes/songs.js";
import battleRoutes from "./routes/battle.js";
import shareRoutes from "./routes/share.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.use("/api/auth", authRoutes);
app.use("/api/share", shareRoutes);
app.use("/api/playlist", authMiddleware, playlistRoutes);
app.use("/api/songs", authMiddleware, songsRoutes);
app.use("/api/battle", authMiddleware, battleRoutes);

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
