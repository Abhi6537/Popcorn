import { useState, useEffect, useRef, useCallback } from 'react';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export interface RemotePeer {
  username: string;
  stream: MediaStream;
}

interface UseWebRTCOptions {
  roomId: string;
  username: string;
  isInCall: boolean;
  channelRef: React.MutableRefObject<any | null>;
}

export function useWebRTC({ roomId, username, isInCall, channelRef }: UseWebRTCOptions) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remotePeers, setRemotePeers] = useState<RemotePeer[]>([]);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);

  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const isInCallRef = useRef(isInCall);

  // Keep ref in sync
  useEffect(() => {
    isInCallRef.current = isInCall;
  }, [isInCall]);

  const sendSignal = useCallback((event: string, payload: any) => {
    const channel = channelRef.current;
    if (!channel) {
      console.warn('[WebRTC] No channel available for sending', event);
      return;
    }
    console.log('[WebRTC] Sending signal:', event, payload.from || payload.username);
    channel.send({ type: 'broadcast', event, payload });
  }, [channelRef]);

  const closePeerConnection = useCallback((remoteUsername: string) => {
    const pc = peerConnections.current.get(remoteUsername);
    if (pc) {
      try { pc.close(); } catch {}
      peerConnections.current.delete(remoteUsername);
    }
    setRemotePeers((prev) => prev.filter((p) => p.username !== remoteUsername));
  }, []);

  const createPeerConnection = useCallback(
    (remoteUsername: string, stream: MediaStream) => {
      closePeerConnection(remoteUsername);

      console.log('[WebRTC] Creating peer connection for:', remoteUsername);
      const pc = new RTCPeerConnection(ICE_SERVERS);

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      pc.ontrack = (event) => {
        console.log('[WebRTC] Got remote track from:', remoteUsername);
        const remoteStream = event.streams[0];
        if (remoteStream) {
          setRemotePeers((prev) => {
            const filtered = prev.filter((p) => p.username !== remoteUsername);
            return [...filtered, { username: remoteUsername, stream: remoteStream }];
          });
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal('rtc-ice', {
            from: username,
            to: remoteUsername,
            candidate: event.candidate.toJSON(),
          });
        }
      };

      pc.onconnectionstatechange = () => {
        console.log('[WebRTC] Connection state with', remoteUsername, ':', pc.connectionState);
        if (
          pc.connectionState === 'disconnected' ||
          pc.connectionState === 'failed' ||
          pc.connectionState === 'closed'
        ) {
          closePeerConnection(remoteUsername);
        }
      };

      peerConnections.current.set(remoteUsername, pc);
      return pc;
    },
    [username, sendSignal, closePeerConnection]
  );

  // Start/stop local stream
  useEffect(() => {
    if (!isInCall || !roomId) {
      // Leaving the call — clean up
      if (localStreamRef.current) {
        sendSignal('rtc-leave', { username });
      }
      peerConnections.current.forEach((pc) => {
        try { pc.close(); } catch {}
      });
      peerConnections.current.clear();
      setRemotePeers([]);
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
        setLocalStream(null);
      }
      return;
    }

    let mounted = true;

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        setLocalStream(stream);
        console.log('[WebRTC] Local stream acquired');

        // Announce we joined the call
        setTimeout(() => {
          if (!mounted) return;
          sendSignal('rtc-join', { username });
          console.log('[WebRTC] Sent rtc-join');
        }, 500);

        // Retry announcement
        setTimeout(() => {
          if (!mounted) return;
          sendSignal('rtc-join', { username });
          console.log('[WebRTC] Sent rtc-join (retry)');
        }, 2500);
      } catch (err) {
        console.error('[WebRTC] Failed to get media:', err);
      }
    };

    start();

    return () => {
      mounted = false;
    };
  }, [isInCall, roomId, username, sendSignal]);

  // Listen for WebRTC signaling events on the room channel
  // We use a polling approach since we can't add .on() after subscribe
  useEffect(() => {
    if (!roomId || !channelRef.current) return;

    const channel = channelRef.current;

    // Create a message listener using channel's internal event system
    const handleBroadcast = (event: string, callback: (data: any) => void) => {
      channel.on('broadcast', { event }, ({ payload }: any) => {
        callback(payload);
      });
    };

    handleBroadcast('rtc-join', async (data: any) => {
      if (data.username === username || !localStreamRef.current || !isInCallRef.current) return;
      console.log('[WebRTC] Received rtc-join from:', data.username);

      try {
        const pc = createPeerConnection(data.username, localStreamRef.current!);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        sendSignal('rtc-offer', {
          from: username,
          to: data.username,
          sdp: pc.localDescription!.sdp,
          type: pc.localDescription!.type,
        });
        console.log('[WebRTC] Sent offer to:', data.username);
      } catch (err) {
        console.error('[WebRTC] Error creating offer:', err);
      }
    });

    handleBroadcast('rtc-offer', async (data: any) => {
      if (data.to !== username || !localStreamRef.current || !isInCallRef.current) return;
      console.log('[WebRTC] Received offer from:', data.from);

      try {
        const pc = createPeerConnection(data.from, localStreamRef.current);
        await pc.setRemoteDescription(
          new RTCSessionDescription({ type: data.type, sdp: data.sdp })
        );
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        sendSignal('rtc-answer', {
          from: username,
          to: data.from,
          sdp: pc.localDescription!.sdp,
          type: pc.localDescription!.type,
        });
        console.log('[WebRTC] Sent answer to:', data.from);
      } catch (err) {
        console.error('[WebRTC] Error handling offer:', err);
      }
    });

    handleBroadcast('rtc-answer', async (data: any) => {
      if (data.to !== username) return;
      console.log('[WebRTC] Received answer from:', data.from);

      const pc = peerConnections.current.get(data.from);
      if (pc && pc.signalingState !== 'stable') {
        try {
          await pc.setRemoteDescription(
            new RTCSessionDescription({ type: data.type, sdp: data.sdp })
          );
        } catch (err) {
          console.error('[WebRTC] Error handling answer:', err);
        }
      }
    });

    handleBroadcast('rtc-ice', async (data: any) => {
      if (data.to !== username) return;

      const pc = peerConnections.current.get(data.from);
      if (pc && pc.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (err) {
          console.error('[WebRTC] Error adding ICE:', err);
        }
      }
    });

    handleBroadcast('rtc-leave', (data: any) => {
      if (data.username === username) return;
      console.log('[WebRTC] User left call:', data.username);
      closePeerConnection(data.username);
    });

    // Note: we intentionally don't return a cleanup that removes these listeners
    // because Supabase channels don't support removing individual listeners.
    // The channel cleanup in useRoom handles full unsubscribe.
  }, [roomId, channelRef.current, username, createPeerConnection, sendSignal, closePeerConnection]);

  const toggleVideo = useCallback(() => {
    localStreamRef.current?.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setVideoEnabled((v) => !v);
  }, []);

  const toggleAudio = useCallback(() => {
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setAudioEnabled((a) => !a);
  }, []);

  return {
    localStream,
    remotePeers,
    videoEnabled,
    audioEnabled,
    toggleVideo,
    toggleAudio,
  };
}
