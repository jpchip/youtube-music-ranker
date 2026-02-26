import YouTube from "react-youtube";

interface YouTubePlayerProps {
  videoId: string;
  className?: string;
}

export default function YouTubePlayer({ videoId, className }: YouTubePlayerProps) {
  return (
    <div className={className}>
      <YouTube
        videoId={videoId}
        opts={{
          width: "100%",
          height: "100%",
          playerVars: {
            autoplay: 0,
            modestbranding: 1,
            rel: 0,
          },
        }}
        iframeClassName="w-full aspect-video rounded-lg"
      />
    </div>
  );
}
