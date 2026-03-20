import { create } from 'zustand';
import type { Chat, Message, User } from '@/types';

interface TypingMap { [chatId: string]: string[] } // chatId -> [userIds typing]
interface OnlineMap { [userId: string]: boolean }

interface ChatStore {
  chats: Chat[];
  activeChat: Chat | null;
  messages: { [chatId: string]: Message[] };
  typingUsers: TypingMap;
  onlineUsers: OnlineMap;
  searchQuery: string;
  isLoadingChats: boolean;
  isLoadingMessages: boolean;
  hasMoreMessages: { [chatId: string]: boolean };

  setChats: (chats: Chat[]) => void;
  setActiveChat: (chat: Chat | null) => void;
  addChat: (chat: Chat) => void;
  updateChat: (chatId: string, updates: Partial<Chat>) => void;
  removeChat: (chatId: string) => void;

  setMessages: (chatId: string, messages: Message[]) => void;
  prependMessages: (chatId: string, messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  removeMessage: (messageId: string, chatId: string, forEveryone: boolean) => void;
  replaceOptimisticMessage: (tempId: string, realMessage: Message) => void;

  setTyping: (chatId: string, userId: string, isTyping: boolean) => void;
  setUserOnline: (userId: string, online: boolean) => void;
  setOnlineUsers: (userIds: string[]) => void;
  setSearchQuery: (q: string) => void;
  setLoadingChats: (v: boolean) => void;
  setLoadingMessages: (v: boolean) => void;
  setHasMore: (chatId: string, v: boolean) => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  chats: [],
  activeChat: null,
  messages: {},
  typingUsers: {},
  onlineUsers: {},
  searchQuery: '',
  isLoadingChats: false,
  isLoadingMessages: false,
  hasMoreMessages: {},

  setChats: (chats) => set({ chats }),
  setActiveChat: (activeChat) => set({ activeChat }),

  addChat: (chat) =>
    set((s) => ({
      chats: s.chats.some((c) => c.id === chat.id) ? s.chats : [chat, ...s.chats],
    })),

  updateChat: (chatId, updates) =>
    set((s) => ({
      chats: s.chats.map((c) => (c.id === chatId ? { ...c, ...updates } : c)),
      activeChat: s.activeChat?.id === chatId ? { ...s.activeChat, ...updates } : s.activeChat,
    })),

  removeChat: (chatId) =>
    set((s) => ({
      chats: s.chats.filter((c) => c.id !== chatId),
      activeChat: s.activeChat?.id === chatId ? null : s.activeChat,
    })),

  setMessages: (chatId, messages) =>
    set((s) => ({ messages: { ...s.messages, [chatId]: messages } })),

  prependMessages: (chatId, newMessages) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [chatId]: [...newMessages, ...(s.messages[chatId] || [])],
      },
    })),

  addMessage: (message) =>
    set((s) => {
      const chatId = message.chatId;
      const existing = s.messages[chatId] || [];
      // Skip if already exists
      if (existing.some((m) => m.id === message.id)) return s;
      return {
        messages: { ...s.messages, [chatId]: [...existing, message] },
        chats: s.chats.map((c) =>
          c.id === chatId ? { ...c, lastMessage: message, updatedAt: message.createdAt } : c,
        ),
      };
    }),

  updateMessage: (messageId, updates) =>
    set((s) => {
      const newMessages = { ...s.messages };
      for (const chatId in newMessages) {
        newMessages[chatId] = newMessages[chatId].map((m) =>
          m.id === messageId ? { ...m, ...updates } : m,
        );
      }
      return { messages: newMessages };
    }),

  removeMessage: (messageId, chatId, forEveryone) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [chatId]: s.messages[chatId]?.map((m) =>
          m.id === messageId
            ? forEveryone
              ? { ...m, deletedForEveryone: true, isDeleted: true, encryptedContent: '', decryptedContent: '' }
              : { ...m, isDeleted: true }
            : m,
        ) || [],
      },
    })),

  replaceOptimisticMessage: (tempId, realMessage) =>
    set((s) => {
      const chatId = realMessage.chatId;
      return {
        messages: {
          ...s.messages,
          [chatId]: (s.messages[chatId] || []).map((m) =>
            m.tempId === tempId ? realMessage : m,
          ),
        },
      };
    }),

  setTyping: (chatId, userId, isTyping) =>
    set((s) => {
      const current = s.typingUsers[chatId] || [];
      return {
        typingUsers: {
          ...s.typingUsers,
          [chatId]: isTyping
            ? [...new Set([...current, userId])]
            : current.filter((id) => id !== userId),
        },
      };
    }),

  setUserOnline: (userId, online) =>
    set((s) => ({ onlineUsers: { ...s.onlineUsers, [userId]: online } })),

  setOnlineUsers: (userIds) => {
    const map: OnlineMap = {};
    userIds.forEach((id) => (map[id] = true));
    set({ onlineUsers: map });
  },

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setLoadingChats: (isLoadingChats) => set({ isLoadingChats }),
  setLoadingMessages: (isLoadingMessages) => set({ isLoadingMessages }),
  setHasMore: (chatId, v) =>
    set((s) => ({ hasMoreMessages: { ...s.hasMoreMessages, [chatId]: v } })),
}));
