export interface SpotifyTrack {
  id: string;
  name: string;
  artists: string[];
  thumbnail: string;
  durationMs: number;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set in environment variables"
    );
  }

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    throw new Error(`Spotify auth failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.token;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function extractSpotifyPlaylistId(input: string): string | null {
  // https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=...
  const urlMatch = input.match(
    /open\.spotify\.com\/playlist\/([a-zA-Z0-9]+)/
  );
  if (urlMatch) return urlMatch[1];

  // Bare Spotify playlist ID (22 base62 chars)
  if (/^[a-zA-Z0-9]{22}$/.test(input)) return input;

  return null;
}

export async function getSpotifyPlaylistTracks(
  playlistId: string
): Promise<SpotifyTrack[]> {
  const token = await getAccessToken();
  const tracks: SpotifyTrack[] = [];

  let url: string | null =
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks?fields=items(track(id,name,artists(name),album(images),duration_ms)),next&limit=100`;

  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      if (res.status === 404) {
        throw new Error("Spotify playlist not found. Make sure it is public.");
      }
      throw new Error(`Spotify API error: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as {
      items: Array<{
        track: {
          id: string;
          name: string;
          artists: Array<{ name: string }>;
          album: { images: Array<{ url: string }> };
          duration_ms: number;
        } | null;
      }>;
      next: string | null;
    };

    for (const item of data.items) {
      if (!item.track || !item.track.id) continue;
      tracks.push({
        id: item.track.id,
        name: item.track.name,
        artists: item.track.artists.map((a) => a.name),
        thumbnail: item.track.album.images[0]?.url ?? "",
        durationMs: item.track.duration_ms,
      });
    }

    url = data.next;
  }

  return tracks;
}
