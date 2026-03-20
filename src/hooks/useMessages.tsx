import { useEffect, useCallback, useRef } from 'react';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { messagesApi } from '@/services/api';
import { decryptMessage } from '@/services/crypto';
import type { Message } from '@/types';

export function useMessages(chatId: string | undefined) {
  const { messages, setMessages, prependMessages, setLoadingMessages, setHasMore, hasMoreMessages } = useChatStore();
  const { keyPair } = useAuthStore();
  const loadingRef = useRef(false);

  const decrypt = useCallback(async (msgs: Message[]): Promise<Message[]> => {
    return Promise.all(
      msgs.map(async (m) => {
        try {
          // Pass privateKey (may be undefined — decryptMessage handles it)
          const decryptedContent = await decryptMessage(
            m.encryptedContent,
            keyPair?.privateKey,
          );
          return { ...m, decryptedContent };
        } catch {
          return { ...m, decryptedContent: m.encryptedContent };
        }
      }),
    );
  }, [keyPair]);

  const loadMessages = useCallback(async () => {
    if (!chatId || loadingRef.current) return;
    loadingRef.current = true;
    setLoadingMessages(true);
    try {
      const { data } = await messagesApi.getMessages(chatId);
      const decrypted = await decrypt(data);
      setMessages(chatId, decrypted);
      setHasMore(chatId, data.length >= 40);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoadingMessages(false);
      loadingRef.current = false;
    }
  }, [chatId, decrypt]);

  const loadMore = useCallback(async () => {
    if (!chatId || !hasMoreMessages[chatId] || loadingRef.current) return;
    const current = messages[chatId] || [];
    if (!current.length) return;
    const cursor = current[0].createdAt;
    loadingRef.current = true;
    try {
      const { data } = await messagesApi.getMessages(chatId, cursor);
      if (!data.length) { setHasMore(chatId, false); return; }
      const decrypted = await decrypt(data);
      prependMessages(chatId, decrypted);
      setHasMore(chatId, data.length >= 40);
    } finally {
      loadingRef.current = false;
    }
  }, [chatId, messages, hasMoreMessages, decrypt]);

  useEffect(() => {
    if (!chatId) return;
    if (!messages[chatId]) loadMessages();
  }, [chatId]);

  return {
    messages: chatId ? (messages[chatId] || []) : [],
    hasMore: chatId ? (hasMoreMessages[chatId] ?? false) : false,
    loadMore,
    reload: loadMessages,
  };
}
