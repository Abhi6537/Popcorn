import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { nanoid } from 'nanoid';

export interface ChatMessage {
  id: string;
  username: string;
  text: string;
  timestamp: number;
  type: 'message' | 'reaction' | 'system';
}

export interface Participant {
  username: string;
  joinedAt: number;
  isHost: boolean;
  isMuted?: boolean;
}

export interface VideoState {
  url: string;
  type: 'youtube' | 'direct' | 'local';
  playing: boolean;
  currentTime: number;
  updatedAt: number;
  updatedBy: string;
}

const MAX_PARTICIPANTS = 5;

interface UseRoomOptions {
  roomId: string;
  username: string;
  isHost: boolean;
}

export function useRoom({ roomId, username, isHost }: UseRoomOptions) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [videoState, setVideoState] = useState<VideoState>({
    url: '',
    type: 'direct',
    playing: false,
    currentTime: 0,
    updatedAt: Date.now(),
    updatedBy: '',
  });
  const [kicked, setKicked] = useState(false);
  const [roomFull, setRoomFull] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const videoStateRef = useRef<VideoState>(videoState);

  // Keep ref in sync so presence callbacks always have latest state
  useEffect(() => {
    videoStateRef.current = videoState;
  }, [videoState]);

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase.channel(`room:${roomId}`, {
      config: { presence: { key: username } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: Participant[] = Object.entries(state).map(([key, value]) => ({
          username: key,
          joinedAt: (value as any)[0]?.joinedAt || Date.now(),
          isHost: (value as any)[0]?.isHost || false,
          isMuted: (value as any)[0]?.isMuted || false,
        }));
        setParticipants(users);
        // Check if room is full (only matters for users not yet tracked)
        const isSelfInRoom = users.some((u) => u.username === username);
        if (!isSelfInRoom && users.length >= MAX_PARTICIPANTS) {
          setRoomFull(true);
        }
      })
      .on('presence', { event: 'join' }, () => {
        // When a new user joins, host re-broadcasts current video state
        if (isHost && videoStateRef.current.url) {
          setTimeout(() => {
            channel.send({
              type: 'broadcast',
              event: 'video-sync',
              payload: videoStateRef.current,
            });
          }, 500);
        }
      })
      .on('broadcast', { event: 'chat' }, ({ payload }) => {
        setMessages((prev) => [...prev, payload as ChatMessage]);
      })
      .on('broadcast', { event: 'video-sync' }, ({ payload }) => {
        setVideoState(payload as VideoState);
      })
      .on('broadcast', { event: 'request-sync' }, () => {
        // Someone is requesting the current video state — host responds
        if (isHost && videoStateRef.current.url) {
          channel.send({
            type: 'broadcast',
            event: 'video-sync',
            payload: videoStateRef.current,
          });
        }
      })
      .on('broadcast', { event: 'reaction' }, ({ payload }) => {
        setMessages((prev) => [...prev, payload as ChatMessage]);
      })
      .on('broadcast', { event: 'kick-user' }, ({ payload }) => {
        if ((payload as any).username === username) {
          setKicked(true);
        }
      })
      .on('broadcast', { event: 'mute-user' }, ({ payload }) => {
        if ((payload as any).username === username) {
          const sysMsg: ChatMessage = {
            id: nanoid(),
            username: 'System',
            text: 'You have been muted by the host.',
            timestamp: Date.now(),
            type: 'system',
          };
          setMessages((prev) => [...prev, sysMsg]);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            username,
            joinedAt: Date.now(),
            isHost,
            isMuted: false,
          });
          // New joiners request current video state from the host
          if (!isHost) {
            setTimeout(() => {
              channel.send({
                type: 'broadcast',
                event: 'request-sync',
                payload: { username },
              });
            }, 800);
          }
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [roomId, username, isHost]);

  const sendMessage = useCallback((text: string) => {
    const msg: ChatMessage = {
      id: nanoid(),
      username,
      text,
      timestamp: Date.now(),
      type: 'message',
    };
    setMessages((prev) => [...prev, msg]);
    channelRef.current?.send({
      type: 'broadcast',
      event: 'chat',
      payload: msg,
    });
  }, [username]);

  const sendReaction = useCallback((emoji: string) => {
    const msg: ChatMessage = {
      id: nanoid(),
      username,
      text: emoji,
      timestamp: Date.now(),
      type: 'reaction',
    };
    setMessages((prev) => [...prev, msg]);
    channelRef.current?.send({
      type: 'broadcast',
      event: 'reaction',
      payload: msg,
    });
  }, [username]);

  const syncVideo = useCallback((state: Partial<VideoState>) => {
    const newState = {
      ...videoState,
      ...state,
      updatedAt: Date.now(),
      updatedBy: username,
    };
    setVideoState(newState);
    channelRef.current?.send({
      type: 'broadcast',
      event: 'video-sync',
      payload: newState,
    });
  }, [videoState, username]);

  const muteUser = useCallback((targetUsername: string) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'mute-user',
      payload: { username: targetUsername },
    });
    const sysMsg: ChatMessage = {
      id: nanoid(),
      username: 'System',
      text: `${targetUsername} was muted by host.`,
      timestamp: Date.now(),
      type: 'system',
    };
    setMessages((prev) => [...prev, sysMsg]);
  }, []);

  const removeUser = useCallback((targetUsername: string) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'kick-user',
      payload: { username: targetUsername },
    });
    const sysMsg: ChatMessage = {
      id: nanoid(),
      username: 'System',
      text: `${targetUsername} was removed by host.`,
      timestamp: Date.now(),
      type: 'system',
    };
    setMessages((prev) => [...prev, sysMsg]);
  }, []);

  return {
    participants,
    messages,
    videoState,
    sendMessage,
    sendReaction,
    syncVideo,
    setVideoState,
    muteUser,
    removeUser,
    kicked,
    roomFull,
    channelRef,
  };
}
