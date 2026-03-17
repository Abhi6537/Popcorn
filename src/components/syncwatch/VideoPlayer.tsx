import { useRef, useEffect, useCallback, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward } from 'lucide-react';
import { VideoState } from '@/hooks/useRoom';
import { Slider } from '@/components/ui/slider';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

interface VideoPlayerProps {
  videoState: VideoState;
  isHost: boolean;
  onSync: (state: Partial<VideoState>) => void;
}

let ytApiLoaded = false;
let ytApiLoadPromise: Promise<void> | null = null;

function loadYouTubeAPI(): Promise<void> {
  if (ytApiLoaded && window.YT?.Player) return Promise.resolve();
  if (ytApiLoadPromise) return ytApiLoadPromise;

  ytApiLoadPromise = new Promise<void>((resolve) => {
    if (window.YT?.Player) {
      ytApiLoaded = true;
      resolve();
      return;
    }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScript = document.getElementsByTagName('script')[0];
    firstScript.parentNode?.insertBefore(tag, firstScript);
    window.onYouTubeIframeAPIReady = () => {
      ytApiLoaded = true;
      resolve();
    };
  });
  return ytApiLoadPromise;
}

export function VideoPlayer({ videoState, isHost, onSync }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const ytPlayerRef = useRef<any>(null);
  const ytContainerRef = useRef<HTMLDivElement>(null);
  const [volume, setVolume] = useState(80);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeout = useRef<ReturnType<typeof setTimeout>>();
  const isSyncing = useRef(false);
  const ytReady = useRef(false);

  const isYouTube = videoState.type === 'youtube';
  const hasVideo = !!videoState.url;

  // ===== YouTube IFrame Player API =====
  useEffect(() => {
    if (!isYouTube || !hasVideo) return;

    const ytId = extractYouTubeId(videoState.url);
    if (!ytId) return;

    let destroyed = false;

    loadYouTubeAPI().then(() => {
      if (destroyed) return;

      // If player exists but video ID changed, load new video
      if (ytPlayerRef.current && ytReady.current) {
        const currentVideoId = ytPlayerRef.current.getVideoUrl?.()?.match(/v=([^&]+)/)?.[1];
        if (currentVideoId !== ytId) {
          ytPlayerRef.current.loadVideoById(ytId);
        }
        return;
      }

      // Destroy old player if exists
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy(); } catch {}
        ytPlayerRef.current = null;
      }

      // Need a fresh div element for YT.Player
      if (ytContainerRef.current) {
        const playerDiv = document.createElement('div');
        playerDiv.id = 'yt-player-' + Date.now();
        playerDiv.className = 'w-full h-full absolute inset-0';
        ytContainerRef.current.innerHTML = '';
        ytContainerRef.current.appendChild(playerDiv);

        ytPlayerRef.current = new window.YT.Player(playerDiv.id, {
          height: '100%',
          width: '100%',
          videoId: ytId,
          playerVars: {
            controls: 0,
            disablekb: 1,
            modestbranding: 1,
            rel: 0,
            fs: 0,
            playsinline: 1,
          },
          events: {
            onReady: () => {
              ytReady.current = true;
              if (ytPlayerRef.current) {
                const dur = ytPlayerRef.current.getDuration?.() || 0;
                setDuration(dur);
                ytPlayerRef.current.setVolume(volume);
                if (muted) ytPlayerRef.current.mute();
              }
            },
            onStateChange: (event: any) => {
              if (isSyncing.current) return;
              // Only host can broadcast state changes
              if (!isHost) return;

              const player = ytPlayerRef.current;
              if (!player) return;

              if (event.data === window.YT.PlayerState.PLAYING) {
                onSync({
                  playing: true,
                  currentTime: player.getCurrentTime(),
                });
              } else if (event.data === window.YT.PlayerState.PAUSED) {
                onSync({
                  playing: false,
                  currentTime: player.getCurrentTime(),
                });
              }
            },
          },
        });
      }
    });

    return () => {
      destroyed = true;
    };
  }, [isYouTube, hasVideo, videoState.url]);

  // Sync incoming state to YouTube player
  useEffect(() => {
    if (!isYouTube || !ytReady.current || !ytPlayerRef.current) return;
    if (videoState.updatedBy === '' || videoState.updatedBy === undefined) return;

    isSyncing.current = true;
    const player = ytPlayerRef.current;

    try {
      const currentYtTime = player.getCurrentTime?.() || 0;
      if (Math.abs(currentYtTime - videoState.currentTime) > 2) {
        player.seekTo(videoState.currentTime, true);
      }

      const ytState = player.getPlayerState?.();
      if (videoState.playing && ytState !== window.YT.PlayerState.PLAYING) {
        player.playVideo();
      } else if (!videoState.playing && ytState === window.YT.PlayerState.PLAYING) {
        player.pauseVideo();
      }
    } catch {}

    setTimeout(() => { isSyncing.current = false; }, 500);
  }, [videoState.playing, videoState.currentTime, videoState.updatedAt, isYouTube]);

  // YouTube time tracker
  useEffect(() => {
    if (!isYouTube || !ytReady.current) return;
    const interval = setInterval(() => {
      if (ytPlayerRef.current?.getCurrentTime) {
        setCurrentTime(ytPlayerRef.current.getCurrentTime());
        const dur = ytPlayerRef.current.getDuration?.() || 0;
        if (dur > 0) setDuration(dur);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [isYouTube, hasVideo]);

  // Cleanup YT player on unmount or source change
  useEffect(() => {
    return () => {
      if (!isYouTube && ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy(); } catch {}
        ytPlayerRef.current = null;
        ytReady.current = false;
      }
    };
  }, [isYouTube]);

  // ===== Direct video sync =====
  useEffect(() => {
    const video = videoRef.current;
    if (!video || isYouTube || !hasVideo) return;
    if (videoState.updatedBy === '') return;

    isSyncing.current = true;

    if (Math.abs(video.currentTime - videoState.currentTime) > 2) {
      video.currentTime = videoState.currentTime;
    }

    if (videoState.playing && video.paused) {
      video.play().catch(() => {});
    } else if (!videoState.playing && !video.paused) {
      video.pause();
    }

    setTimeout(() => { isSyncing.current = false; }, 300);
  }, [videoState.playing, videoState.currentTime, videoState.updatedAt, isYouTube, hasVideo]);

  // Only host can broadcast play/pause/seek
  const handlePlay = useCallback(() => {
    if (!isHost) return;
    if (isYouTube && ytPlayerRef.current && ytReady.current) {
      ytPlayerRef.current.playVideo();
      onSync({ playing: true, currentTime: ytPlayerRef.current.getCurrentTime() });
    } else {
      const video = videoRef.current;
      if (!video) return;
      onSync({ playing: true, currentTime: video.currentTime });
    }
  }, [onSync, isHost, isYouTube]);

  const handlePause = useCallback(() => {
    if (!isHost) return;
    if (isYouTube && ytPlayerRef.current && ytReady.current) {
      ytPlayerRef.current.pauseVideo();
      onSync({ playing: false, currentTime: ytPlayerRef.current.getCurrentTime() });
    } else {
      const video = videoRef.current;
      if (!video) return;
      onSync({ playing: false, currentTime: video.currentTime });
    }
  }, [onSync, isHost, isYouTube]);

  const handleSeek = useCallback((value: number[]) => {
    if (!isHost) return;
    const time = value[0];
    if (isYouTube && ytPlayerRef.current && ytReady.current) {
      ytPlayerRef.current.seekTo(time, true);
      onSync({ currentTime: time });
    } else {
      const video = videoRef.current;
      if (video) video.currentTime = time;
      onSync({ currentTime: time });
    }
  }, [onSync, isHost, isYouTube]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    controlsTimeout.current = setTimeout(() => setShowControls(false), 3000);
  };

  const handleVolumeChange = useCallback((v: number[]) => {
    const vol = v[0];
    setVolume(vol);
    setMuted(false);
    if (isYouTube && ytPlayerRef.current && ytReady.current) {
      ytPlayerRef.current.unMute();
      ytPlayerRef.current.setVolume(vol);
    } else if (videoRef.current) {
      videoRef.current.volume = vol / 100;
      videoRef.current.muted = false;
    }
  }, [isYouTube]);

  const handleMuteToggle = useCallback(() => {
    const newMuted = !muted;
    setMuted(newMuted);
    if (isYouTube && ytPlayerRef.current && ytReady.current) {
      if (newMuted) ytPlayerRef.current.mute();
      else ytPlayerRef.current.unMute();
    } else if (videoRef.current) {
      videoRef.current.muted = newMuted;
    }
  }, [muted, isYouTube]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video bg-black rounded-lg overflow-hidden group"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setShowControls(false)}
      onTouchStart={() => setShowControls(true)}
    >
      {!hasVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-card">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
              <Play className="w-8 h-8 text-primary" />
            </div>
            <p className="text-muted-foreground text-sm">
              {isHost ? 'Add a video URL to start watching' : 'Waiting for host to add a video...'}
            </p>
          </div>
        </div>
      )}

      {/* YouTube Player (API-controlled) */}
      {hasVideo && isYouTube && (
        <div
          ref={ytContainerRef}
          className="absolute inset-0 w-full h-full"
        />
      )}

      {/* Direct/local video */}
      {hasVideo && !isYouTube && (
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-contain"
          src={videoState.url}
          muted={muted}
          playsInline
          onTimeUpdate={() => {
            if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
          }}
          onLoadedMetadata={() => {
            if (videoRef.current) {
              setDuration(videoRef.current.duration);
              videoRef.current.volume = volume / 100;
            }
          }}
          onClick={() => {
            if (!isHost) return;
            videoRef.current?.paused ? handlePlay() : handlePause();
          }}
        />
      )}

      {/* Controls overlay — shown for both YouTube and direct */}
      {hasVideo && (
        <div
          className={`absolute bottom-0 left-0 right-0 p-2 sm:p-4 bg-gradient-to-t from-black/90 to-transparent transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Progress bar */}
          <div className="mb-2 sm:mb-3">
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={0.1}
              onValueChange={isHost ? handleSeek : undefined}
              className={isHost ? 'cursor-pointer' : 'cursor-default opacity-70'}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => handleSeek([Math.max(0, currentTime - 10)])}
                className={`text-foreground/80 hover:text-foreground transition-colors hidden sm:block ${!isHost ? 'opacity-40 cursor-not-allowed' : ''}`}
                disabled={!isHost}
              >
                <SkipBack className="w-5 h-5" />
              </button>
              <button
                onClick={videoState.playing ? handlePause : handlePlay}
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-colors ${
                  isHost ? 'bg-primary hover:bg-primary/80' : 'bg-primary/50 cursor-not-allowed'
                }`}
                disabled={!isHost}
              >
                {videoState.playing ? (
                  <Pause className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
                ) : (
                  <Play className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground ml-0.5" />
                )}
              </button>
              <button
                onClick={() => handleSeek([Math.min(duration, currentTime + 10)])}
                className={`text-foreground/80 hover:text-foreground transition-colors hidden sm:block ${!isHost ? 'opacity-40 cursor-not-allowed' : ''}`}
                disabled={!isHost}
              >
                <SkipForward className="w-5 h-5" />
              </button>

              <span className="text-[10px] sm:text-xs text-foreground/70 font-mono">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>

              {!isHost && (
                <span className="text-[9px] text-accent/80 bg-accent/10 px-1.5 py-0.5 rounded ml-1">
                  Host controls
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button onClick={handleMuteToggle} className="text-foreground/80 hover:text-foreground transition-colors">
                {muted ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>
              <div className="w-16 sm:w-20 hidden sm:block">
                <Slider value={[muted ? 0 : volume]} max={100} step={1} onValueChange={handleVolumeChange} />
              </div>
              <button onClick={toggleFullscreen} className="text-foreground/80 hover:text-foreground transition-colors">
                <Maximize className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}
