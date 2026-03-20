import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Users, UserMinus, UserPlus, Crown, LogOut, Camera, Edit2, Check } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';
import { chatsApi } from '@/services/api';
import toast from 'react-hot-toast';
import Avatar from './Avatar';
import Button from './Button';
import type { Chat, ChatMember } from '@/types';

interface Props {
  chat: Chat;
  onClose: () => void;
}

export default function GroupInfoPanel({ chat, onClose }: Props) {
  const { user } = useAuthStore();
  const { updateChat, setActiveChat } = useChatStore();
  const [editingName, setEditingName] = useState(false);
  const [groupName, setGroupName] = useState(chat.groupName || chat.name || '');
  const [saving, setSaving] = useState(false);

  const isAdmin = chat.members?.some((m) => m.id === user?.id && m.role === 'admin');

  const saveName = async () => {
    if (!groupName.trim()) return;
    setSaving(true);
    try {
      await chatsApi.updateGroup(chat.id, { name: groupName });
      updateChat(chat.id, { name: groupName });
      setEditingName(false);
      toast.success('Group name updated');
    } catch { toast.error('Failed to update'); }
    finally { setSaving(false); }
  };

  const removeMember = async (memberId: string) => {
    try {
      await chatsApi.removeMember(chat.id, memberId);
      updateChat(chat.id, {
        members: chat.members?.filter((m) => m.id !== memberId),
      });
      toast.success('Member removed');
    } catch { toast.error('Failed to remove member'); }
  };

  const leaveGroup = async () => {
    try {
      await chatsApi.leaveGroup(chat.id);
      setActiveChat(null);
      onClose();
      toast.success('Left the group');
    } catch { toast.error('Failed to leave group'); }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: 24, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 16, opacity: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md bg-[#111827] rounded-3xl overflow-hidden border border-white/8 shadow-glass max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/5 flex-shrink-0">
          <h2 className="font-bold text-lg">Group Info</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Group avatar + name */}
          <div className="flex flex-col items-center gap-3 p-6 border-b border-white/5">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-purple-600/20 border-2 border-purple-500/30 flex items-center justify-center">
                {chat.avatar ? (
                  <img src={chat.avatar} alt={chat.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <Users className="w-9 h-9 text-purple-400" />
                )}
              </div>
              {isAdmin && (
                <button className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center border-2 border-[#111827]">
                  <Camera className="w-3.5 h-3.5 text-white" />
                </button>
              )}
            </div>

            {editingName ? (
              <div className="flex items-center gap-2 w-full max-w-xs">
                <input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm text-center outline-none focus:border-emerald-500/50"
                  autoFocus
                  maxLength={80}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
                />
                <button onClick={saveName} disabled={saving} className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500">
                  <Check className="w-4 h-4 text-white" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-white">{chat.name}</h3>
                {isAdmin && (
                  <button onClick={() => setEditingName(true)} className="p-1 rounded-lg hover:bg-white/5 text-gray-500">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
            <p className="text-sm text-gray-500">{chat.members?.length || 0} members</p>
          </div>

          {/* Members list */}
          <div className="p-4 space-y-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 mb-2">
              Members
            </p>
            {chat.members?.map((member) => (
              <div key={member.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/4 group">
                <Avatar src={member.avatarUrl} name={member.nickname} userId={member.id} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-white truncate">
                      {member.nickname}
                      {member.id === user?.id && <span className="text-gray-500"> (you)</span>}
                    </span>
                    {member.role === 'admin' && (
                      <Crown className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                    )}
                  </div>
                  <span className="text-xs text-gray-500">{member.email}</span>
                </div>
                {isAdmin && member.id !== user?.id && (
                  <button
                    onClick={() => removeMember(member.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-all"
                  >
                    <UserMinus className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-white/5 flex-shrink-0">
          <Button
            variant="danger"
            fullWidth
            icon={<LogOut className="w-4 h-4" />}
            onClick={leaveGroup}
          >
            Leave Group
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
