import { motion } from 'framer-motion';
import { Lock, Zap, Globe } from 'lucide-react';

export default function WelcomeScreen() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-8 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#10b981" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10"
      >
        {/* Logo */}
        <div className="relative mx-auto mb-8 w-24 h-24">
          <div className="absolute inset-0 rounded-3xl bg-emerald-500/20 rotate-12" />
          <div className="absolute inset-0 rounded-3xl bg-emerald-500/10 -rotate-6" />
          <div className="relative w-full h-full rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-emerald-glow-lg">
            <span className="text-white font-bold text-4xl" style={{ fontFamily: 'serif' }}>گ</span>
          </div>
        </div>

        <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
          Welcome to <span className="text-emerald-400">Golpo</span>
        </h1>
        <p className="text-gray-400 text-base mb-2">by Kafaah</p>
        <p className="text-gray-500 text-sm max-w-sm mb-12">
          Select a conversation from the sidebar or start a new one to begin chatting
        </p>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-3">
          {[
            { icon: Lock, text: 'End-to-end encrypted', color: 'text-emerald-400' },
            { icon: Zap, text: 'Real-time messaging', color: 'text-yellow-400' },
            { icon: Globe, text: 'Private & secure', color: 'text-blue-400' },
          ].map(({ icon: Icon, text, color }) => (
            <div
              key={text}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/4 border border-white/6 text-sm text-gray-400"
            >
              <Icon className={`w-3.5 h-3.5 ${color}`} />
              {text}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
