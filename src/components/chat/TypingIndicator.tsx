import { motion } from 'framer-motion';
import type { ChatMember } from '@/types';

interface Props {
  typingUsers: string[];
  members: ChatMember[];
}

export default function TypingIndicator({ typingUsers, members }: Props) {
  const names = typingUsers
    .map((id) => members.find((m) => m.id === id)?.nickname || 'Someone')
    .slice(0, 2);

  const label = names.length === 1
    ? `${names[0]} is typing`
    : `${names.join(' & ')} are typing`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="flex items-center gap-2 px-6 py-2"
    >
      <div className="flex items-center gap-1 px-3 py-2 rounded-2xl rounded-bl-sm bg-[var(--color-bubble-in)] shadow-message">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="typing-dot"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <span className="text-xs text-gray-500">{label}</span>
    </motion.div>
  );
}
