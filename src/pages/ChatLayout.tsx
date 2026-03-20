import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Search, Phone, Settings as SettingsIcon,
} from 'lucide-react';
import Sidebar from '@/components/chat/Sidebar';
import ChatWindow from '@/components/chat/ChatWindow';
import WelcomeScreen from '@/components/chat/WelcomeScreen';
import SearchPage from '@/pages/SearchPage';
import CallsPage from '@/pages/CallsPage';
import SettingsPanel from '@/components/ui/SettingsPanel';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { chatsApi } from '@/services/api';

type NavTab = 'chats' | 'search' | 'calls' | 'settings';

const NAV_ITEMS: { id: NavTab; icon: React.FC<any>; label: string }[] = [
  { id: 'chats',    icon: MessageSquare, label: 'Chats' },
  { id: 'search',   icon: Search,        label: 'Search' },
  { id: 'calls',    icon: Phone,         label: 'Calls' },
  { id: 'settings', icon: SettingsIcon,  label: 'Settings' },
];

export default function ChatLayout() {
  const { setChats, setLoadingChats, activeChat } = useChatStore();
  const { _hydrated, isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<NavTab>('chats');
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    // Only load chats once auth is hydrated and user is authenticated
    if (!_hydrated || !isAuthenticated) return;

    const load = async () => {
      setLoadingChats(true);
      try {
        const { data } = await chatsApi.getMyChats();
        // Interceptor already unwrapped — data IS the array
        setChats(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load chats:', err);
      } finally {
        setLoadingChats(false);
      }
    };
    load();
  }, [_hydrated, isAuthenticated]);

  useEffect(() => {
    if (activeChat) setMobileChatOpen(true);
    else setMobileChatOpen(false);
  }, [activeChat]);

  const handleTabClick = (tab: NavTab) => {
    if (tab === 'settings') { setShowSettings(true); return; }
    setActiveTab(tab);
    setMobileChatOpen(false);
  };

  const renderLeftPanel = () => {
    if (activeTab === 'search') return (
      <SearchPage onChatOpened={() => setActiveTab('chats')} />
    );
    if (activeTab === 'calls')  return <CallsPage />;
    return <Sidebar onChatSelect={() => setMobileChatOpen(true)} />;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg-primary)]">

      {/* ── Vertical nav rail (desktop) ─────────────────────────────────── */}
      <nav className="hidden md:flex flex-col items-center gap-1 py-5 px-2 w-16 flex-shrink-0 bg-[var(--color-bg-secondary)] border-r border-white/5">
        {/* Logo */}
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center mb-4 shadow-emerald-glow flex-shrink-0">
          <span className="text-white font-bold text-base" style={{ fontFamily: 'serif' }}>گ</span>
        </div>

        {NAV_ITEMS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => handleTabClick(id)}
            title={label}
            className={`
              relative w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200
              ${(id !== 'settings' && activeTab === id)
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                : 'text-gray-500 hover:text-gray-200 hover:bg-white/6'}
            `}
          >
            <Icon className="w-5 h-5" />
            {id !== 'settings' && activeTab === id && (
              <span className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-emerald-400 rounded-l-full -mr-2" />
            )}
          </button>
        ))}
      </nav>

      {/* ── Left panel ──────────────────────────────────────────────────── */}
      <div className={`
        flex-shrink-0 w-full md:w-80 lg:w-96 h-full border-r border-white/5
        ${mobileChatOpen ? 'hidden md:flex' : 'flex'} flex-col
      `}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="w-full h-full flex flex-col"
          >
            {renderLeftPanel()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Main chat area ───────────────────────────────────────────────── */}
      <div className={`flex-1 h-full ${!mobileChatOpen ? 'hidden md:flex' : 'flex'} flex-col`}>
        <AnimatePresence mode="wait">
          {activeChat ? (
            <motion.div
              key={activeChat.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="w-full h-full"
            >
              <ChatWindow onBack={() => { setMobileChatOpen(false); }} />
            </motion.div>
          ) : (
            <WelcomeScreen key="welcome" />
          )}
        </AnimatePresence>
      </div>

      {/* ── Mobile bottom nav ────────────────────────────────────────────── */}
      {!mobileChatOpen && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around px-2 pb-safe pt-2 bg-[var(--color-bg-secondary)] border-t border-white/5">
          {NAV_ITEMS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => handleTabClick(id)}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
                id !== 'settings' && activeTab === id
                  ? 'text-emerald-400'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          ))}
        </nav>
      )}

      {/* ── Settings overlay ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
      </AnimatePresence>
    </div>
  );
}
