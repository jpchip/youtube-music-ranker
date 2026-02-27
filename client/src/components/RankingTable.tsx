import { useState } from "react";
import type { SongWithRating } from "../lib/api";

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

interface RankingTableProps {
  songs: SongWithRating[];
  offset?: number;
}

export default function RankingTable({ songs, offset = 0 }: RankingTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
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
            return (
              <tr
                key={song.video_id}
                className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
              >
                <td className="py-2.5 px-2 font-mono text-gray-500">{offset + i + 1}</td>
                <td className="py-2.5 px-2">
                  <div className="flex items-center gap-3">
                    <Thumbnail src={song.thumbnail} alt={song.title} />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{song.title}</p>
                      <p className="text-xs text-gray-400 truncate">{artists}</p>
                    </div>
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
