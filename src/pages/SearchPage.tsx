import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MessageSquare, User } from 'lucide-react';
import { usersApi, chatsApi } from '@/services/api';
import { useChatStore } from '@/store/chatStore';
import Avatar from '@/components/ui/Avatar';
import toast from 'react-hot-toast';
import type { User as UserType } from '@/types';
import { debounce } from '@/utils/helpers';

interface Props {
  onChatOpened?: () => void; // callback to switch back to chats tab
}

export default function SearchPage({ onChatOpened }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(false);
  const { addChat, setActiveChat } = useChatStore();
  const { onlineUsers } = useChatStore();

  const doSearch = useCallback(
    debounce(async (q: string) => {
      if (!q.trim()) { setResults([]); return; }
      setLoading(true);
      try {
        const { data } = await usersApi.searchUsers(q);
        setResults(Array.isArray(data) ? data : []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350),
    [],
  );

  useEffect(() => { doSearch(query); }, [query]);

  const openChat = async (userId: string) => {
    try {
      const { data } = await chatsApi.getOrCreateDm(userId);
      addChat(data);
      setActiveChat(data);
      // Switch to chats tab so ChatWindow is visible
      onChatOpened?.();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to open chat');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-primary)]">
      <div className="px-5 pt-5 pb-4 border-b border-white/5 bg-[var(--color-bg-secondary)] flex-shrink-0">
        <h2 className="text-xl font-bold text-white mb-3">Find People</h2>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input-field pl-10"
            autoFocus
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        )}

        {!loading && query && results.length === 0 && (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
              <User className="w-6 h-6 text-gray-600" />
            </div>
            <p className="text-gray-400 font-medium text-sm">No users found</p>
            <p className="text-gray-600 text-xs mt-1">Try a different name or email</p>
          </div>
        )}

        {!query && (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center mx-auto mb-3">
              <Search className="w-6 h-6 text-emerald-400/60" />
            </div>
            <p className="text-gray-500 text-sm">Search for people to chat with</p>
          </div>
        )}

        <AnimatePresence>
          {results.map((u, i) => (
            <motion.div
              key={u.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group cursor-pointer"
              onClick={() => openChat(u.id)}
            >
              <Avatar
                src={u.avatarUrl}
                name={u.nickname}
                userId={u.id}
                size="md"
                showOnline
                isOnline={onlineUsers[u.id]}
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-white truncate">{u.nickname}</p>
                <p className="text-xs text-gray-500 truncate">{u.email}</p>
              </div>
              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium transition-all">
                <MessageSquare className="w-3.5 h-3.5" />
                Message
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

