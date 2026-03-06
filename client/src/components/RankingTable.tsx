import React, { useState } from "react";
import type { SongWithRating } from "../lib/api";
import YouTubePlayer from "./YouTubePlayer";
import SpotifyPlayer from "./SpotifyPlayer";

function Thumbnail({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false);
  if (error || !src) {
    return (
      <div className="w-10 h-10 rounded bg-gray-800 shrink-0 flex items-center justify-center">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} className="w-5 h-5 text-gray-600">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      </div>
    );
  }
  return (
    <img
      key={src}
      src={src}
      alt={alt}
      className="w-10 h-10 rounded object-cover shrink-0"
      onError={() => setError(true)}
    />
  );
}

function PlayerRow({
  song,
  colSpan,
}: {
  song: SongWithRating;
  colSpan: number;
}) {
  const isSpotify = song.source === "spotify" || song.video_id.startsWith("sp:");

  if (isSpotify) {
    const trackId = song.video_id.startsWith("sp:")
      ? song.video_id.slice(3)
      : song.video_id;
    return (
      <tr>
        <td colSpan={colSpan} className="px-4 pb-4 pt-1 bg-gray-900/60">
          <SpotifyPlayer trackId={trackId} />
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td colSpan={colSpan} className="px-4 pb-4 pt-1 bg-gray-900/60">
        <div className="aspect-video max-h-64 w-full">
          <YouTubePlayer videoId={song.video_id} className="w-full h-full" />
        </div>
      </td>
    </tr>
  );
}

interface RankingTableProps {
  songs: SongWithRating[];
  offset?: number;
}

export default function RankingTable({ songs, offset = 0 }: RankingTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Total visible columns (for colSpan in player row)
  // #, Song, Rating always visible; RD hidden on <sm; Record hidden on <md
  const COL_SPAN = 5;

  function toggleRow(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full table-fixed text-sm">
        <thead>
          <tr className="border-b border-gray-700 text-gray-400 text-left">
            <th className="py-3 px-2 w-12">#</th>
            <th className="py-3 px-2">Song</th>
            <th className="py-3 px-2 text-right w-20">Rating</th>
            <th className="py-3 px-2 text-right w-16 hidden sm:table-cell">RD</th>
            <th className="py-3 px-2 text-right w-24 hidden md:table-cell">Record</th>
          </tr>
        </thead>
        <tbody>
          {songs.map((song, i) => {
            const artists = Array.isArray(song.artists)
              ? song.artists.join(", ")
              : song.artists;
            const isExpanded = expandedId === song.video_id;

            return (
              <React.Fragment key={song.video_id}>
                <tr
                  onClick={() => toggleRow(song.video_id)}
                  className={`border-b ${isExpanded ? "border-gray-700" : "border-gray-800/50"} transition-colors cursor-pointer hover:bg-gray-800/40 ${isExpanded ? "bg-gray-800/40" : ""}`}
                >
                  <td className="py-2.5 px-2 font-mono text-gray-500">{offset + i + 1}</td>
                  <td className="py-2.5 px-2">
                    <div className="flex items-center gap-3">
                      <Thumbnail src={song.thumbnail} alt={song.title} />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{song.title}</p>
                        <p className="text-xs text-gray-400 truncate">{artists}</p>
                      </div>
                      <svg
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className={`w-4 h-4 shrink-0 text-gray-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      >
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-purple-400">
                    {Math.round(song.rating)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-gray-500 hidden sm:table-cell">
                    {Math.round(song.rd)}
                  </td>
                  <td className="py-2.5 px-2 text-right text-gray-400 hidden md:table-cell">
                    {song.wins}W {song.losses}L {song.draws}D
                  </td>
                </tr>
                {isExpanded && (
                  <PlayerRow song={song} colSpan={COL_SPAN} />
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
