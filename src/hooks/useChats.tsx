import { useCallback, useEffect } from 'react';
import { useChatStore } from '@/store/chatStore';
import { chatsApi } from '@/services/api';
import socketService from '@/services/socket';
import toast from 'react-hot-toast';

export function useChats() {
  const { chats, setChats, addChat, updateChat, setLoadingChats, isLoadingChats, activeChat, setActiveChat } = useChatStore();

  const loadChats = useCallback(async () => {
    setLoadingChats(true);
    try {
      const { data } = await chatsApi.getMyChats();
      setChats(data);
    } catch (err) {
      console.error('Failed to load chats:', err);
      toast.error('Failed to load conversations');
    } finally {
      setLoadingChats(false);
    }
  }, []);

  const openDm = useCallback(async (targetUserId: string) => {
    try {
      const { data } = await chatsApi.getOrCreateDm(targetUserId);
      addChat(data);
      setActiveChat(data);
      socketService.joinChat(data.id);
      return data;
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to open chat');
      return null;
    }
  }, []);

  const createGroup = useCallback(async (name: string, memberIds: string[], avatar?: File) => {
    try {
      const { data } = await chatsApi.createGroup({ name, memberIds }, avatar);
      addChat(data);
      setActiveChat(data);
      socketService.joinChat(data.id);
      toast.success(`Group "${name}" created`);
      return data;
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create group');
      return null;
    }
  }, []);

  const refreshChat = useCallback(async (chatId: string) => {
    try {
      const { data } = await chatsApi.getChatDetails(chatId);
      updateChat(chatId, data);
      if (activeChat?.id === chatId) setActiveChat(data);
    } catch { /* silent */ }
  }, [activeChat]);

  return { chats, isLoadingChats, loadChats, openDm, createGroup, refreshChat };
}
