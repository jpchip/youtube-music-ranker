import { useState } from "react";
import type { SongWithRating } from "../lib/api";

interface SongCardProps {
  song: SongWithRating;
  rank?: number;
  compact?: boolean;
}

function Placeholder({ className }: { className: string }) {
  return (
    <div className={`${className} flex items-center justify-center bg-gray-800`}>
      <svg viewBox="0 0 24 24" fill="none" className="w-1/3 h-1/3 text-gray-600" stroke="currentColor" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
      </svg>
    </div>
  );
}

export default function SongCard({ song, rank, compact }: SongCardProps) {
  const [imgError, setImgError] = useState(false);
  const artists = Array.isArray(song.artists)
    ? song.artists.join(", ")
    : song.artists;

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-800/50">
        {rank != null && (
          <span className="text-sm font-mono text-gray-500 w-8 text-right">
            #{rank}
          </span>
        )}
        {imgError || !song.thumbnail ? (
          <Placeholder className="w-10 h-10 rounded shrink-0" />
        ) : (
          <img
            src={song.thumbnail}
            alt={song.title}
            className="w-10 h-10 rounded object-cover"
            onError={() => setImgError(true)}
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{song.title}</p>
          <p className="text-xs text-gray-400 truncate">{artists}</p>
        </div>
        <span className="text-sm font-mono text-purple-400">
          {Math.round(song.rating)}
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 overflow-hidden">
      <div className="aspect-video bg-gray-900 relative">
        {imgError || !song.thumbnail ? (
          <Placeholder className="w-full h-full" />
        ) : (
          <img
            src={song.thumbnail}
            alt={song.title}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        )}
        {rank != null && (
          <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm rounded-lg px-2 py-0.5 text-xs font-bold">
            #{rank}
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-semibold truncate">{song.title}</h3>
        <p className="text-sm text-gray-400 truncate">{artists}</p>
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
          <span className="font-mono text-purple-400 text-sm">
            {Math.round(song.rating)}
          </span>
          <span>RD {Math.round(song.rd)}</span>
          <span>
            {song.wins}W {song.losses}L {song.draws}D
          </span>
        </div>
      </div>
    </div>
  );
}
