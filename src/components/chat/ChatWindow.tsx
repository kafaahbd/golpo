import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Phone, Video, MoreVertical, Users,
  Info, Search, Archive, Pin, Trash2, UserX
} from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { useMessages } from '@/hooks/useMessages';
import { useCallStore } from '@/store/callStore';
import socketService from '@/services/socket';
import webrtcService from '@/services/webrtc';
import { usersApi } from '@/services/api';
import toast from 'react-hot-toast';
import { v4 as uuid } from 'uuid';

import MessageList from './MessageList';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';

interface Props { onBack: () => void; }

export default function ChatWindow({ onBack }: Props) {
  const { activeChat, typingUsers, onlineUsers, setActiveChat } = useChatStore();
  const { user, keyPair } = useAuthStore();
  const { messages, hasMore, loadMore } = useMessages(activeChat?.id);
  const { setSession, setLocalStream, setRemoteStream } = useCallStore();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Other user info (DM)
  const otherMember = !activeChat?.isGroup
    ? activeChat?.members?.find((m) => m.id !== user?.id)
    : null;
  const isOnline = otherMember ? onlineUsers[otherMember.id] ?? otherMember.isOnline : false;
  const typingList = typingUsers[activeChat?.id || ''] || [];

  // Join socket room
  useEffect(() => {
    if (!activeChat) return;
    socketService.joinChat(activeChat.id);
    socketService.markSeen(activeChat.id);
    return () => { socketService.leaveChat(activeChat.id); };
  }, [activeChat?.id]);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ─── Start Call ────────────────────────────────────────────────────────────
  const startCall = useCallback(async (callType: 'audio' | 'video') => {
    if (!otherMember || !activeChat) return;
    const callId = uuid();

    try {
      const stream = await webrtcService.startCall(otherMember.id, callId, callType);
      setLocalStream(stream);

      webrtcService.onRemoteStream = (remoteStream) => setRemoteStream(remoteStream);

      setSession({
        callId,
        callType,
        state: 'calling',
        remoteUser: otherMember as any,
        isInitiator: true,
        startedAt: new Date(),
      });

      socketService.startCall(otherMember.id, callType, callId);
    } catch (err: any) {
      toast.error(`Failed to start call: ${err.message}`);
    }
  }, [otherMember, activeChat]);

  const handlePin = async () => {
    if (!activeChat) return;
    const isPinned = user?.pinnedChats?.includes(activeChat.id);
    if (isPinned) { await usersApi.unpinChat(activeChat.id); toast.success('Unpinned'); }
    else { await usersApi.pinChat(activeChat.id); toast.success('Pinned'); }
    setShowMenu(false);
  };

  const handleArchive = async () => {
    if (!activeChat) return;
    await usersApi.archiveChat(activeChat.id);
    setActiveChat(null);
    toast.success('Chat archived');
    setShowMenu(false);
  };

  if (!activeChat) return null;

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-primary)]">
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-[var(--color-bg-secondary)] flex-shrink-0">
        {/* Back (mobile) */}
        <button onClick={onBack} className="md:hidden p-1.5 rounded-lg hover:bg-white/5 text-gray-400">
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Avatar */}
        <div className="relative flex-shrink-0">
          {activeChat.avatar ? (
            <img src={activeChat.avatar} alt={activeChat.name} className="w-10 h-10 avatar" />
          ) : (
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
              activeChat.isGroup
                ? 'bg-purple-600/20 text-purple-400 border border-purple-500/20'
                : 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/20'
            }`}>
              {activeChat.isGroup ? <Users className="w-5 h-5" /> : (activeChat.name?.[0] || '?').toUpperCase()}
            </div>
          )}
          {!activeChat.isGroup && (
            <span className={`status-indicator ${isOnline ? 'bg-emerald-400' : 'bg-gray-600'}`} />
          )}
        </div>

        {/* Name + status */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-white truncate">{activeChat.name}</p>
          <p className="text-xs truncate">
            {typingList.length > 0 ? (
              <span className="text-emerald-400">typing...</span>
            ) : activeChat.isGroup ? (
              <span className="text-gray-500">{activeChat.members?.length} members</span>
            ) : (
              <span className={isOnline ? 'text-emerald-400' : 'text-gray-500'}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            )}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {!activeChat.isGroup && (
            <>
              <button
                onClick={() => startCall('audio')}
                className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-emerald-400 transition-colors"
                title="Audio call"
              >
                <Phone className="w-5 h-5" />
              </button>
              <button
                onClick={() => startCall('video')}
                className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-emerald-400 transition-colors"
                title="Video call"
              >
                <Video className="w-5 h-5" />
              </button>
            </>
          )}

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: -8 }}
                  className="context-menu right-0 top-full mt-1 w-48"
                >
                  <button onClick={handlePin} className="context-menu-item text-gray-300">
                    <Pin className="w-4 h-4 text-gray-400" />
                    {user?.pinnedChats?.includes(activeChat.id) ? 'Unpin Chat' : 'Pin Chat'}
                  </button>
                  <button onClick={handleArchive} className="context-menu-item text-gray-300">
                    <Archive className="w-4 h-4 text-gray-400" />
                    Archive Chat
                  </button>
                  {!activeChat.isGroup && (
                    <button
                      onClick={async () => {
                        if (!otherMember) return;
                        await usersApi.blockUser(otherMember.id);
                        toast.success('User blocked');
                        setShowMenu(false);
                      }}
                      className="context-menu-item text-red-400"
                    >
                      <UserX className="w-4 h-4" />
                      Block User
                    </button>
                  )}
                  <button
                    onClick={() => { setActiveChat(null); setShowMenu(false); }}
                    className="context-menu-item text-red-400"
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

      {/* ─── Messages ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        <MessageList
          messages={messages}
          chatId={activeChat.id}
          hasMore={hasMore}
          onLoadMore={loadMore}
        />
      </div>

      {/* ─── Typing Indicator ────────────────────────────────────────────── */}
      <AnimatePresence>
        {typingList.length > 0 && (
          <TypingIndicator
            typingUsers={typingList}
            members={activeChat.members || []}
          />
        )}
      </AnimatePresence>

      {/* ─── Message Input ───────────────────────────────────────────────── */}
      <MessageInput
        chatId={activeChat.id}
        members={activeChat.members || []}
      />
    </div>
  );
}
