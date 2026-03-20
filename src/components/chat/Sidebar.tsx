import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Settings, Pin, Archive, Moon, Sun,
  LogOut, Users, Phone as PhoneIcon, X, MessageSquare
} from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { chatsApi } from '@/services/api';
import { formatDistanceToNow } from 'date-fns';
import ChatListItem from './ChatListItem';
import NewChatModal from './NewChatModal';
import type { Chat } from '@/types';

interface SidebarProps { onChatSelect: () => void; }

type TabType = 'chats' | 'archived';

export default function Sidebar({ onChatSelect }: SidebarProps) {
  const { chats, activeChat, setActiveChat, searchQuery, setSearchQuery, isLoadingChats, onlineUsers } = useChatStore();
  const { user, logout } = useAuthStore();
  const [tab, setTab] = useState<TabType>('chats');
  const [showNewChat, setShowNewChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    (localStorage.getItem('golpo_theme') || 'dark') as 'dark' | 'light'
  );

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.className = next;
    localStorage.setItem('golpo_theme', next);
  };

  const selectChat = async (chat: Chat) => {
    setActiveChat(chat);
    onChatSelect();
  };

  // Filter + sort chats
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

    // Pinned chats first
    const pinned = user?.pinnedChats || [];
    return [...list].sort((a, b) => {
      const aPinned = pinned.includes(a.id) ? 1 : 0;
      const bPinned = pinned.includes(b.id) ? 1 : 0;
      if (bPinned !== aPinned) return bPinned - aPinned;
      const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [chats, searchQuery, tab, user?.archivedChats, user?.pinnedChats]);

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-secondary)]">
      {/* ─── Header ──────────────────────────────────── */}
      <div className="px-4 pt-5 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.nickname} className="w-10 h-10 avatar" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-emerald-600/30 border border-emerald-500/30 flex items-center justify-center">
                  <span className="text-emerald-400 font-bold text-sm">
                    {user?.nickname?.[0]?.toUpperCase()}
                  </span>
                </div>
              )}
              <span className="status-indicator bg-emerald-400" />
            </div>
            <div>
              <p className="font-semibold text-sm text-white leading-tight">{user?.nickname}</p>
              <p className="text-xs text-emerald-400/70">Online</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button onClick={toggleTheme} className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setShowNewChat(true)}
              className="p-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={logout}
              className="p-2 rounded-xl hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-9 pr-4 py-2.5 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-3">
          {([['chats', MessageSquare, 'Chats'], ['archived', Archive, 'Archived']] as const).map(([t, Icon, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                tab === t
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Chat List ────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {isLoadingChats ? (
          <div className="space-y-2 px-2 mt-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
                <div className="w-12 h-12 rounded-full shimmer-line flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 rounded shimmer-line" />
                  <div className="h-3 w-48 rounded shimmer-line" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center px-4">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
              <MessageSquare className="w-6 h-6 text-gray-600" />
            </div>
            <p className="text-gray-500 text-sm">
              {searchQuery ? 'No results found' : tab === 'archived' ? 'No archived chats' : 'No conversations yet'}
            </p>
            {!searchQuery && tab === 'chats' && (
              <button
                onClick={() => setShowNewChat(true)}
                className="mt-3 text-emerald-400 text-sm hover:text-emerald-300 transition-colors"
              >
                Start a new chat →
              </button>
            )}
          </div>
        ) : (
          <AnimatePresence>
            {filteredChats.map((chat, i) => (
              <motion.div
                key={chat.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: i * 0.02, duration: 0.2 }}
              >
                <ChatListItem
                  chat={chat}
                  isActive={activeChat?.id === chat.id}
                  onlineUsers={onlineUsers}
                  isPinned={user?.pinnedChats?.includes(chat.id)}
                  onClick={() => selectChat(chat)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* New Chat Modal */}
      <AnimatePresence>
        {showNewChat && <NewChatModal onClose={() => setShowNewChat(false)} />}
      </AnimatePresence>
    </div>
  );
}
