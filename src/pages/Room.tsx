import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useRoom } from '@/hooks/useRoom';
import { useWebRTC } from '@/hooks/useWebRTC';
import { VideoPlayer } from '@/components/syncwatch/VideoPlayer';
import { ChatPanel } from '@/components/syncwatch/ChatPanel';
import { ParticipantsList } from '@/components/syncwatch/ParticipantsList';
import { VideoSourceInput } from '@/components/syncwatch/VideoSourceInput';
import { VideoCallPanel } from '@/components/syncwatch/VideoCallPanel';
import { HostControlPanel } from '@/components/syncwatch/HostControlPanel';
import { ArrowLeft, Play, MessageSquare, Users, Video } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

export default function Room() {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const hasUser = !!searchParams.get('user');
  const username = searchParams.get('user') || 'Guest';
  const isHost = searchParams.get('host') === '1';

  const [isInCall, setIsInCall] = useState(false);
  const [mobileTab, setMobileTab] = useState<'video' | 'chat' | 'people'>('video');

  useEffect(() => {
    if (!hasUser && roomId) {
      navigate(`/?join=${roomId}`, { replace: true });
    }
  }, [hasUser, roomId, navigate]);

  const {
    participants,
    messages,
    videoState,
    sendMessage,
    sendReaction,
    syncVideo,
    muteUser,
    removeUser,
    kicked,
    roomFull,
    channelRef,
  } = useRoom({
    roomId: hasUser ? (roomId || '') : '',
    username,
    isHost,
  });

  const {
    localStream,
    remotePeers,
    videoEnabled,
    audioEnabled,
    toggleVideo,
    toggleAudio,
  } = useWebRTC({
    roomId: hasUser ? (roomId || '') : '',
    username,
    isInCall,
    channelRef,
  });

  useEffect(() => {
    if (kicked) {
      navigate('/?kicked=1');
    }
  }, [kicked, navigate]);

  useEffect(() => {
    if (roomFull) {
      navigate('/?full=1');
    }
  }, [roomFull, navigate]);

  if (!roomId) return null;

  // Mobile layout
  if (isMobile) {
    return (
      <div className="h-dvh flex flex-col bg-background">
        {/* Compact header */}
        <header className="room-layout-header flex items-center justify-between px-3 py-2 border-b border-border/50 glass-panel shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 flex items-center justify-center">
                <img src="/logo.png" alt="Popcorn Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-xs font-semibold text-foreground">Popcorn</h1>
                <p className="text-[9px] text-muted-foreground font-mono">{roomId}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <VideoCallPanel
              username={username}
              isInCall={isInCall}
              onToggleCall={() => setIsInCall(!isInCall)}
              localStream={localStream}
              remotePeers={remotePeers}
              videoEnabled={videoEnabled}
              audioEnabled={audioEnabled}
              onToggleVideo={toggleVideo}
              onToggleAudio={toggleAudio}
            />
            <span className="text-[10px] text-muted-foreground">{participants.length}</span>
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          </div>
        </header>

        {/* Content based on tab */}
        <div className="room-content-wrapper flex-1 min-h-0 overflow-hidden">
          {mobileTab === 'video' && (
            <div className="room-scroll-container flex flex-col h-full p-2 gap-2 overflow-y-auto">
              <VideoPlayer videoState={videoState} isHost={isHost} onSync={syncVideo} />
              <VideoSourceInput onSync={syncVideo} isHost={isHost} />
              <HostControlPanel
                participants={participants}
                isHost={isHost}
                currentUsername={username}
                onMuteUser={muteUser}
                onRemoveUser={removeUser}
              />
              {isInCall && (
                <VideoCallPanel
                  username={username}
                  isInCall={isInCall}
                  onToggleCall={() => setIsInCall(false)}
                  localStream={localStream}
                  remotePeers={remotePeers}
                  videoEnabled={videoEnabled}
                  audioEnabled={audioEnabled}
                  onToggleVideo={toggleVideo}
                  onToggleAudio={toggleAudio}
                />
              )}
            </div>
          )}
          {mobileTab === 'chat' && (
            <div className="h-full p-2">
              <ChatPanel
                messages={messages}
                onSendMessage={sendMessage}
                onSendReaction={sendReaction}
                username={username}
              />
            </div>
          )}
          {mobileTab === 'people' && (
            <div className="h-full p-2 space-y-2 overflow-y-auto">
              <ParticipantsList participants={participants} roomId={roomId} />
              <HostControlPanel
                participants={participants}
                isHost={isHost}
                currentUsername={username}
                onMuteUser={muteUser}
                onRemoveUser={removeUser}
              />
            </div>
          )}
        </div>

        {/* Bottom tab bar */}
        <nav className="room-layout-nav flex items-center border-t border-border/50 glass-panel shrink-0">
          {[
            { id: 'video' as const, icon: Video, label: 'Watch' },
            { id: 'chat' as const, icon: MessageSquare, label: 'Chat' },
            { id: 'people' as const, icon: Users, label: 'People' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMobileTab(tab.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${
                mobileTab === tab.id ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-[10px] font-medium">{tab.label}</span>
              {tab.id === 'chat' && messages.length > 0 && mobileTab !== 'chat' && (
                <div className="absolute top-1.5 right-1/3 w-1.5 h-1.5 rounded-full bg-accent" />
              )}
            </button>
          ))}
        </nav>
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="h-dvh flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border/50 glass-panel shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 flex items-center justify-center">
             <img src="/logo.png" alt="Popcorn Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-foreground">Popcorn</h1>
              <p className="text-[11px] text-muted-foreground font-mono">Room: {roomId}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <VideoCallPanel
            username={username}
            isInCall={isInCall}
            onToggleCall={() => setIsInCall(!isInCall)}
            localStream={localStream}
            remotePeers={remotePeers}
            videoEnabled={videoEnabled}
            audioEnabled={audioEnabled}
            onToggleVideo={toggleVideo}
            onToggleAudio={toggleAudio}
          />
          <span className="text-xs text-muted-foreground">{participants.length} watching</span>
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex gap-3 p-3 min-h-0 overflow-hidden">
        {/* Left: Video + controls */}
        <div className="flex-1 min-w-0 overflow-y-auto pr-2">
          <div className="flex flex-col gap-3 pb-4 min-h-min">
            <VideoPlayer videoState={videoState} isHost={isHost} onSync={syncVideo} />
            <div className="flex gap-3">
              <div className="flex-1">
                <VideoSourceInput onSync={syncVideo} isHost={isHost} />
              </div>
              <div className="w-64">
                <ParticipantsList participants={participants} roomId={roomId} />
              </div>
            </div>
            <HostControlPanel
              participants={participants}
              isHost={isHost}
              currentUsername={username}
              onMuteUser={muteUser}
              onRemoveUser={removeUser}
            />
            {isInCall && (
              <VideoCallPanel
                username={username}
                isInCall={isInCall}
                onToggleCall={() => setIsInCall(false)}
                localStream={localStream}
                remotePeers={remotePeers}
                videoEnabled={videoEnabled}
                audioEnabled={audioEnabled}
                onToggleVideo={toggleVideo}
                onToggleAudio={toggleAudio}
              />
            )}
          </div>
        </div>

        {/* Right: Chat sidebar */}
        <div className="w-80 min-h-0">
          <ChatPanel
            messages={messages}
            onSendMessage={sendMessage}
            onSendReaction={sendReaction}
            username={username}
          />
        </div>
      </div>
    </div>
  );
}
