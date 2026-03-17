import { useRef, useEffect } from 'react';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Phone } from 'lucide-react';
import { RemotePeer } from '@/hooks/useWebRTC';

interface VideoCallPanelProps {
  username: string;
  isInCall: boolean;
  onToggleCall: () => void;
  localStream?: MediaStream | null;
  remotePeers?: RemotePeer[];
  videoEnabled?: boolean;
  audioEnabled?: boolean;
  onToggleVideo?: () => void;
  onToggleAudio?: () => void;
}

export function VideoCallPanel({
  username,
  isInCall,
  onToggleCall,
  localStream,
  remotePeers = [],
  videoEnabled = true,
  audioEnabled = true,
  onToggleVideo,
  onToggleAudio,
}: VideoCallPanelProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  if (!isInCall) {
    return (
      <button
        onClick={onToggleCall}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success/20 text-success text-xs font-medium hover:bg-success/30 transition-colors"
      >
        <Phone className="w-3.5 h-3.5" />
        Join Call
      </button>
    );
  }

  return (
    <div className="glass-panel rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-foreground">
          In Call ({1 + remotePeers.length})
        </h3>
        <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
      </div>

      {/* Video grid */}
      <div
        className={`grid gap-2 ${
          remotePeers.length === 0
            ? 'grid-cols-1'
            : remotePeers.length <= 1
            ? 'grid-cols-2'
            : 'grid-cols-2'
        }`}
      >
        {/* Local video */}
        <div className="relative aspect-video bg-secondary rounded-lg overflow-hidden">
          {videoEnabled ? (
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover mirror"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-primary">
                {username[0]?.toUpperCase()}
              </div>
            </div>
          )}
          <span className="absolute bottom-1 left-1.5 text-[10px] text-foreground/80 bg-black/50 px-1.5 py-0.5 rounded">
            You
          </span>
        </div>

        {/* Remote peers */}
        {remotePeers.map((peer) => (
          <RemoteVideo key={peer.username} peer={peer} />
        ))}
      </div>

      {/* Call controls */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={onToggleVideo}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
            videoEnabled
              ? 'bg-secondary hover:bg-secondary/80 text-foreground'
              : 'bg-destructive/20 text-destructive'
          }`}
        >
          {videoEnabled ? (
            <Video className="w-4 h-4" />
          ) : (
            <VideoOff className="w-4 h-4" />
          )}
        </button>
        <button
          onClick={onToggleAudio}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
            audioEnabled
              ? 'bg-secondary hover:bg-secondary/80 text-foreground'
              : 'bg-destructive/20 text-destructive'
          }`}
        >
          {audioEnabled ? (
            <Mic className="w-4 h-4" />
          ) : (
            <MicOff className="w-4 h-4" />
          )}
        </button>
        <button
          onClick={onToggleCall}
          className="w-9 h-9 rounded-full bg-destructive flex items-center justify-center hover:bg-destructive/80 transition-colors"
        >
          <PhoneOff className="w-4 h-4 text-destructive-foreground" />
        </button>
      </div>
    </div>
  );
}

function RemoteVideo({ peer }: { peer: RemotePeer }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = peer.stream;
    }
  }, [peer.stream]);

  return (
    <div className="relative aspect-video bg-secondary rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
      <span className="absolute bottom-1 left-1.5 text-[10px] text-foreground/80 bg-black/50 px-1.5 py-0.5 rounded">
        {peer.username}
      </span>
    </div>
  );
}
