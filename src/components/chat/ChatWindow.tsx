import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Phone, Video, MoreVertical, Users, Pin, Archive, UserX, Trash2 } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { useMessages } from '@/hooks/useMessages';
import { useCallStore } from '@/store/callStore';
import socketService from '@/services/socket';
import webrtcService from '@/services/webrtc';
import { usersApi } from '@/services/api';
import toast from 'react-hot-toast';
import { v4 as uuid } from 'uuid';
import { formatDistanceToNow } from 'date-fns';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';

interface Props { onBack: () => void; }

export default function ChatWindow({ onBack }: Props) {
  const { activeChat, typingUsers, onlineUsers, setActiveChat } = useChatStore();
  const { user } = useAuthStore();
  const { messages, hasMore, loadMore } = useMessages(activeChat?.id);
  const { setSession, setLocalStream, setRemoteStream } = useCallStore();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const other = !activeChat?.isGroup
    ? activeChat?.members?.find((m) => m.id !== user?.id)
    : null;
  const isOnline = other ? (onlineUsers[other.id] ?? other.isOnline) : false;
  const lastSeen = other?.lastSeen;
  const typingList = typingUsers[activeChat?.id || ''] || [];

  useEffect(() => {
    if (!activeChat) return;
    socketService.joinChat(activeChat.id);
    socketService.markSeen(activeChat.id);
    return () => { socketService.leaveChat(activeChat.id); };
  }, [activeChat?.id]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const startCall = useCallback(async (callType: 'audio' | 'video') => {
    if (!other || !activeChat) return;
    const callId = uuid();
    try {
      const stream = await webrtcService.startCall(other.id, callId, callType);
      setLocalStream(stream);
      webrtcService.onRemoteStream = (s) => setRemoteStream(s);
      setSession({ callId, callType, state: 'calling', remoteUser: other as any, isInitiator: true, startedAt: new Date() });
      socketService.startCall(other.id, callType, callId);
    } catch (err: any) {
      toast.error(`Failed to start call: ${err.message}`);
    }
  }, [other, activeChat]);

  if (!activeChat) return null;

  const statusText = () => {
    if (typingList.length > 0) return null;
    if (activeChat.isGroup) return `${activeChat.members?.length || 0} members`;
    if (isOnline) return 'Online';
    if (lastSeen) return `last seen ${formatDistanceToNow(new Date(lastSeen), { addSuffix: true })}`;
    return 'Offline';
  };

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-bg-primary)' }}>

      {/* ── Header ───────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ background: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)' }}
      >
        <button onClick={onBack}
          className="md:hidden p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Avatar */}
        <div className="relative flex-shrink-0">
          {activeChat.avatar ? (
            <img src={activeChat.avatar} alt={activeChat.name} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
              style={{
                background: activeChat.isGroup ? 'rgba(139,92,246,0.12)' : 'var(--color-emerald-bg)',
                color: activeChat.isGroup ? '#a78bfa' : 'var(--color-emerald)',
                border: `1px solid ${activeChat.isGroup ? 'rgba(139,92,246,0.2)' : 'var(--color-emerald-glow)'}`,
              }}
            >
              {activeChat.isGroup ? <Users className="w-4 h-4" /> : (activeChat.name?.[0] || '?').toUpperCase()}
            </div>
          )}
          {!activeChat.isGroup && (
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2"
              style={{
                background: isOnline ? 'var(--color-emerald)' : 'var(--color-text-muted)',
                borderColor: 'var(--color-bg-secondary)',
              }}
            />
          )}
        </div>

        {/* Name + status */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
            {activeChat.name}
          </p>
          <p className="text-xs truncate">
            {typingList.length > 0
              ? <span style={{ color: 'var(--color-emerald)' }}>typing...</span>
              : <span style={{ color: isOnline ? 'var(--color-emerald)' : 'var(--color-text-muted)' }}>
                  {statusText()}
                </span>
            }
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5">
          {!activeChat.isGroup && (
            <>
              <button onClick={() => startCall('audio')}
                className="p-2 rounded-xl transition-colors hover:bg-white/5"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <Phone className="w-5 h-5" />
              </button>
              <button onClick={() => startCall('video')}
                className="p-2 rounded-xl transition-colors hover:bg-white/5"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <Video className="w-5 h-5" />
              </button>
            </>
          )}

          <div className="relative" ref={menuRef}>
            <button onClick={() => setShowMenu((v) => !v)}
              className="p-2 rounded-xl transition-colors hover:bg-white/5"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="context-menu right-0 top-full mt-1 w-52"
                >
                  <button onClick={async () => {
                    const isPinned = user?.pinnedChats?.includes(activeChat.id);
                    isPinned ? await usersApi.unpinChat(activeChat.id) : await usersApi.pinChat(activeChat.id);
                    toast.success(isPinned ? 'Unpinned' : 'Pinned');
                    setShowMenu(false);
                  }} className="context-menu-item">
                    <Pin className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                    {user?.pinnedChats?.includes(activeChat.id) ? 'Unpin Chat' : 'Pin Chat'}
                  </button>
                  <button onClick={async () => {
                    await usersApi.archiveChat(activeChat.id);
                    setActiveChat(null); toast.success('Archived'); setShowMenu(false);
                  }} className="context-menu-item">
                    <Archive className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                    Archive Chat
                  </button>
                  {!activeChat.isGroup && (
                    <button onClick={async () => {
                      if (!other) return;
                      await usersApi.blockUser(other.id);
                      toast.success('User blocked'); setShowMenu(false);
                    }} className="context-menu-item" style={{ color: '#f87171' }}>
                      <UserX className="w-4 h-4" />
                      Block User
                    </button>
                  )}
                  <button onClick={() => { setActiveChat(null); setShowMenu(false); }}
                    className="context-menu-item" style={{ color: '#f87171' }}
                  >
                    <Trash2 className="w-4 h-4" />
                    Close Chat
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Messages ─────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        <MessageList messages={messages} chatId={activeChat.id} hasMore={hasMore} onLoadMore={loadMore} />
      </div>

      {/* ── Typing indicator ─────────────────────────────── */}
      <AnimatePresence>
        {typingList.length > 0 && (
          <TypingIndicator typingUsers={typingList} members={activeChat.members || []} />
        )}
      </AnimatePresence>

      {/* ── Input ────────────────────────────────────────── */}
      <MessageInput chatId={activeChat.id} members={activeChat.members || []} />
    </div>
  );
}
