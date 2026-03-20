import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, Video, PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock } from 'lucide-react';
import { callsApi } from '@/services/api/calls';
import { useAuthStore } from '@/store/authStore';
import { useCall } from '@/hooks/useCall';
import { formatDistanceToNow } from 'date-fns';
import Avatar from '@/components/ui/Avatar';
import { formatCallDuration } from '@/utils/time';

interface CallRecord {
  id: string;
  type: 'audio' | 'video';
  status: 'missed' | 'accepted' | 'rejected';
  isOutgoing: boolean;
  durationSeconds?: number;
  createdAt: string;
  caller: { id: string; nickname: string; avatarUrl?: string } | null;
  receiver: { id: string; nickname: string; avatarUrl?: string } | null;
}

function CallIcon({ status, isOutgoing }: { status: string; isOutgoing: boolean }) {
  if (status === 'missed') return <PhoneMissed className="w-4 h-4 text-red-400" />;
  if (isOutgoing) return <PhoneOutgoing className="w-4 h-4 text-emerald-400" />;
  return <PhoneIncoming className="w-4 h-4 text-blue-400" />;
}

export default function CallsPage() {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  const { startCall } = useCall();

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await callsApi.getHistory(50);
        setCalls(data.data || data);
      } catch (err) {
        console.error('Failed to load call history:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const getOtherPerson = (call: CallRecord) => {
    return call.isOutgoing ? call.receiver : call.caller;
  };

  const getStatusLabel = (call: CallRecord) => {
    if (call.status === 'missed') return 'Missed';
    if (call.status === 'rejected') return 'Declined';
    if (call.durationSeconds) return formatCallDuration(call.durationSeconds);
    return 'Connected';
  };

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-primary)]">
      <div className="px-6 py-5 border-b border-white/5 bg-[var(--color-bg-secondary)] flex-shrink-0">
        <h2 className="text-xl font-bold text-white">Recent Calls</h2>
        <p className="text-sm text-gray-500 mt-0.5">Your call history</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        ) : calls.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-6">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <Phone className="w-7 h-7 text-gray-600" />
            </div>
            <p className="text-gray-400 font-medium">No calls yet</p>
            <p className="text-gray-600 text-sm mt-1">Your call history will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-white/4">
            {calls.map((call, i) => {
              const other = getOtherPerson(call);
              if (!other) return null;
              return (
                <motion.div
                  key={call.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.025 }}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-white/3 transition-colors group"
                >
                  <Avatar src={other.avatarUrl} name={other.nickname} userId={other.id} size="md" />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-sm text-white truncate">{other.nickname}</span>
                      {call.type === 'video' && <Video className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2">
                      <CallIcon status={call.status} isOutgoing={call.isOutgoing} />
                      <span className={`text-xs ${call.status === 'missed' ? 'text-red-400' : 'text-gray-500'}`}>
                        {getStatusLabel(call)}
                      </span>
                      <span className="text-gray-600 text-xs">·</span>
                      <span className="text-gray-600 text-xs">
                        {formatDistanceToNow(new Date(call.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => startCall(other as any, call.type)}
                    className="opacity-0 group-hover:opacity-100 p-2.5 rounded-xl hover:bg-emerald-500/10 text-gray-500 hover:text-emerald-400 transition-all"
                    title={`${call.type === 'video' ? 'Video' : 'Audio'} call`}
                  >
                    {call.type === 'video' ? <Video className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
