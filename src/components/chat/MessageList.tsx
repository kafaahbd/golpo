import { useEffect, useRef, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
import { AnimatePresence, motion } from 'framer-motion';
import { isToday, isYesterday, format, isSameDay } from 'date-fns';
import { useAuthStore } from '@/store/authStore';
import type { Message } from '@/types';
import MessageBubble from './MessageBubble';

interface Props {
  messages: Message[];
  chatId: string;
  hasMore: boolean;
  onLoadMore: () => void;
}

function DateHeader({ date }: { date: Date }) {
  const label = isToday(date) ? 'Today' : isYesterday(date) ? 'Yesterday' : format(date, 'MMMM d, yyyy');
  return (
    <div className="flex items-center justify-center my-4">
      <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/5 text-gray-400 border border-white/5">
        {label}
      </span>
    </div>
  );
}

export default function MessageList({ messages, chatId, hasMore, onLoadMore }: Props) {
  const { user } = useAuthStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevScrollHeight = useRef(0);
  const isFirstLoad = useRef(true);

  // Infinite scroll trigger at top
  const { ref: topRef, inView: topInView } = useInView({ threshold: 0.1 });

  useEffect(() => {
    if (topInView && hasMore) {
      prevScrollHeight.current = containerRef.current?.scrollHeight || 0;
      onLoadMore();
    }
  }, [topInView, hasMore]);

  // Maintain scroll position when prepending old messages
  useEffect(() => {
    if (prevScrollHeight.current > 0 && containerRef.current) {
      const newHeight = containerRef.current.scrollHeight;
      containerRef.current.scrollTop = newHeight - prevScrollHeight.current;
      prevScrollHeight.current = 0;
    }
  }, [messages.length]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (isFirstLoad.current) {
      bottomRef.current?.scrollIntoView();
      isFirstLoad.current = false;
      return;
    }
    const container = containerRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 200;
    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // Group messages: add date headers, group consecutive same-sender
  const rendered: React.ReactNode[] = [];
  let lastDate: Date | null = null;
  let lastSenderId: string | null = null;

  messages.forEach((msg, i) => {
    const msgDate = new Date(msg.createdAt);

    // Date header
    if (!lastDate || !isSameDay(lastDate, msgDate)) {
      rendered.push(<DateHeader key={`date-${msg.id}`} date={msgDate} />);
      lastDate = msgDate;
      lastSenderId = null;
    }

    const isSameGroup = lastSenderId === msg.senderId;
    const isNext = i + 1 < messages.length && messages[i + 1].senderId === msg.senderId;
    const isOwn = msg.senderId === user?.id;

    rendered.push(
      <MessageBubble
        key={msg.id}
        message={msg}
        isOwn={isOwn}
        isGrouped={isSameGroup}
        hasNext={isNext}
        chatId={chatId}
      />
    );

    lastSenderId = msg.senderId;
  });

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto px-4 py-2 flex flex-col"
      style={{
        backgroundImage: `
          radial-gradient(ellipse at 20% 50%, rgba(16,185,129,0.03) 0%, transparent 60%),
          radial-gradient(ellipse at 80% 20%, rgba(16,185,129,0.02) 0%, transparent 50%)
        `,
      }}
    >
      {/* Load more trigger */}
      <div ref={topRef} className="h-1" />

      {hasMore && (
        <div className="flex justify-center py-2">
          <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      )}

      {messages.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">🔒</span>
            </div>
            <p className="text-gray-500 text-sm">End-to-end encrypted</p>
            <p className="text-gray-600 text-xs mt-1">Start the conversation</p>
          </div>
        </div>
      )}

      <div className="flex-1" />

      {/* Messages */}
      {rendered}

      <div ref={bottomRef} />
    </div>
  );
}
