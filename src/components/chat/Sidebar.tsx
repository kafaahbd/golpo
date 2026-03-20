import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Moon, Sun, LogOut, Users, MessageSquare, Archive, X, Pin } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { chatsApi } from '@/services/api';
import { isToday, isYesterday, format } from 'date-fns';
import ChatListItem from './ChatListItem';
import NewChatModal from './NewChatModal';
import type { Chat } from '@/types';

interface Props { onChatSelect: () => void; }

function formatChatTime(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'dd/MM/yy');
}

export default function Sidebar({ onChatSelect }: Props) {
  const { chats, activeChat, setActiveChat, searchQuery, setSearchQuery, isLoadingChats, onlineUsers } = useChatStore();
  const { user, logout } = useAuthStore();
  const [tab, setTab] = useState<'chats' | 'archived'>('chats');
  const [showNewChat, setShowNewChat] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(
    () => (localStorage.getItem('golpo_theme') || 'dark') as 'dark' | 'light'
  );

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.className = next;
    localStorage.setItem('golpo_theme', next);
  };

  const filteredChats = useMemo(() => {
    let list = chats.filter((c) => {
      const isArchived = user?.archivedChats?.includes(c.id);
      return tab === 'archived' ? isArchived : !isArchived;
    });
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c) =>
        c.name?.toLowerCase().includes(q) ||
        c.lastMessage?.decryptedContent?.toLowerCase().includes(q) ||
        c.members?.some((m) => m.nickname.toLowerCase().includes(q))
      );
    }
    const pinned = user?.pinnedChats || [];
    return [...list].sort((a, b) => {
      const ap = pinned.includes(a.id) ? 1 : 0;
      const bp = pinned.includes(b.id) ? 1 : 0;
      if (bp !== ap) return bp - ap;
      const at = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bt = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return bt - at;
    });
  }, [chats, searchQuery, tab, user?.archivedChats, user?.pinnedChats]);

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-sidebar)', borderRight: '1px solid var(--color-border)' }}>

      {/* ── Header ───────────────────────────────── */}
      <div className="px-4 pt-5 pb-3 flex-shrink-0">
        {/* Top row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            {/* Avatar */}
            <div className="relative">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.nickname} className="w-9 h-9 rounded-full object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ background: 'var(--color-emerald-bg)', color: 'var(--color-emerald)', border: '1px solid var(--color-emerald-glow)' }}
                >
                  {user?.nickname?.[0]?.toUpperCase()}
                </div>
              )}
              <span className="status-indicator" style={{ background: 'var(--color-emerald)' }} />
            </div>
            <div>
              <p className="font-semibold text-sm leading-tight" style={{ color: 'var(--color-text-primary)' }}>
                {user?.nickname}
              </p>
              <p className="text-xs" style={{ color: 'var(--color-emerald)' }}>Online</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button onClick={toggleTheme}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white/5"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button onClick={() => setShowNewChat(true)}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
              style={{ background: 'var(--color-emerald-bg)', color: 'var(--color-emerald)', border: '1px solid var(--color-emerald-glow)' }}
            >
              <Plus className="w-4 h-4" />
            </button>
            <button onClick={logout}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-red-500/10"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-9 pr-8 py-2.5 text-sm"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {([['chats', MessageSquare, 'Chats'], ['archived', Archive, 'Archived']] as const).map(([t, Icon, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={tab === t
                ? { background: 'var(--color-emerald-bg)', color: 'var(--color-emerald)', border: '1px solid var(--color-emerald-glow)' }
                : { color: 'var(--color-text-muted)' }
              }
            >
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Chat List ─────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {isLoadingChats ? (
          <div className="space-y-1 px-2 mt-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
                <div className="w-11 h-11 rounded-full shimmer-line flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-28 rounded-md shimmer-line" />
                  <div className="h-3 w-44 rounded-md shimmer-line" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center px-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
              style={{ background: 'var(--color-bg-hover)' }}
            >
              <MessageSquare className="w-5 h-5" style={{ color: 'var(--color-text-muted)' }} />
            </div>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              {searchQuery ? 'No results' : tab === 'archived' ? 'No archived chats' : 'No conversations yet'}
            </p>
            {!searchQuery && tab === 'chats' && (
              <button onClick={() => setShowNewChat(true)}
                className="mt-3 text-sm font-medium transition-colors"
                style={{ color: 'var(--color-emerald)' }}
              >
                Start a conversation →
              </button>
            )}
          </div>
        ) : (
          <AnimatePresence>
            {filteredChats.map((chat, i) => (
              <motion.div key={chat.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ delay: i * 0.015, duration: 0.18 }}
              >
                <ChatListItem
                  chat={chat}
                  isActive={activeChat?.id === chat.id}
                  onlineUsers={onlineUsers}
                  isPinned={user?.pinnedChats?.includes(chat.id)}
                  onClick={() => { setActiveChat(chat); onChatSelect(); }}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <AnimatePresence>
        {showNewChat && <NewChatModal onClose={() => setShowNewChat(false)} />}
      </AnimatePresence>
    </div>
  );
}
