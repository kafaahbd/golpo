import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, X, Users, User, Check, Plus } from 'lucide-react';
import { usersApi, chatsApi } from '@/services/api';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import type { User as UserType } from '@/types';

interface Props { onClose: () => void; }

type Mode = 'dm' | 'group';

export default function NewChatModal({ onClose }: Props) {
  const [mode, setMode] = useState<Mode>('dm');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserType[]>([]);
  const [selected, setSelected] = useState<UserType[]>([]);
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const { setActiveChat, addChat } = useChatStore();

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (!query.trim()) { setResults([]); return; }
      setLoading(true);
      try {
        const { data } = await usersApi.searchUsers(query);
        setResults(data);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const toggleSelect = (u: UserType) => {
    if (mode === 'dm') {
      setSelected([u]);
    } else {
      setSelected((prev) =>
        prev.some((x) => x.id === u.id) ? prev.filter((x) => x.id !== u.id) : [...prev, u]
      );
    }
  };

  const handleCreate = async () => {
    if (!selected.length) return;
    setCreating(true);
    try {
      if (mode === 'dm') {
        const { data } = await chatsApi.getOrCreateDm(selected[0].id);
        addChat(data);
        setActiveChat(data);
      } else {
        if (!groupName.trim()) { toast.error('Group name required'); return; }
        const { data } = await chatsApi.createGroup({ name: groupName, memberIds: selected.map((u) => u.id) });
        addChat(data);
        setActiveChat(data);
      }
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create chat');
    } finally {
      setCreating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: 40, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md bg-[#111827] rounded-3xl overflow-hidden border border-white/8 shadow-glass"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/5">
          <h2 className="font-bold text-lg">New Conversation</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Mode toggle */}
          <div className="flex rounded-xl bg-white/5 p-1">
            {([['dm', User, 'Direct Message'], ['group', Users, 'Group Chat']] as const).map(([m, Icon, label]) => (
              <button
                key={m}
                onClick={() => { setMode(m); setSelected([]); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === m ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Group name */}
          {mode === 'group' && (
            <motion.input
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              type="text"
              placeholder="Group name..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="input-field"
            />
          )}

          {/* Selected badges */}
          {selected.length > 0 && mode === 'group' && (
            <div className="flex flex-wrap gap-2">
              {selected.map((u) => (
                <span key={u.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 text-xs font-medium">
                  {u.nickname}
                  <button onClick={() => toggleSelect(u)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search users..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input-field pl-10"
              autoFocus
            />
          </div>

          {/* Results */}
          <div className="max-h-60 overflow-y-auto space-y-1 -mx-1 px-1">
            {loading && (
              <div className="text-center py-4">
                <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto" />
              </div>
            )}
            {!loading && results.map((u) => {
              const isSelected = selected.some((x) => x.id === u.id);
              return (
                <button
                  key={u.id}
                  onClick={() => toggleSelect(u)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                    isSelected ? 'bg-emerald-500/10 border border-emerald-500/20' : 'hover:bg-white/5'
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-emerald-600/20 flex items-center justify-center flex-shrink-0 text-sm font-bold text-emerald-400">
                    {u.nickname[0].toUpperCase()}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-white">{u.nickname}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                </button>
              );
            })}
            {!loading && query && !results.length && (
              <p className="text-center text-gray-500 text-sm py-4">No users found</p>
            )}
            {!query && (
              <p className="text-center text-gray-600 text-sm py-4">Search for people to chat with</p>
            )}
          </div>

          {/* Action */}
          <button
            onClick={handleCreate}
            disabled={!selected.length || creating || (mode === 'group' && !groupName.trim())}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {creating ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Plus className="w-4 h-4" />
                {mode === 'dm' ? 'Open Chat' : `Create Group (${selected.length})`}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
