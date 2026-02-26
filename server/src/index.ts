import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { initDb } from "./db.js";
import playlistRoutes from "./routes/playlist.js";
import songsRoutes from "./routes/songs.js";
import battleRoutes from "./routes/battle.js";
import shareRoutes from "./routes/share.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use("/api/playlist", playlistRoutes);
app.use("/api/songs", songsRoutes);
app.use("/api/battle", battleRoutes);
app.use("/api/share", shareRoutes);

// Serve static client build in production
const clientDist = path.join(__dirname, "..", "..", "client", "dist");
app.use(express.static(clientDist));
app.get("*", (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

async function start() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start().catch(console.error);
