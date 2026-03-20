import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { useSocket } from '@/hooks/useSocket';
import { useNotifications } from '@/hooks/useNotifications';
import { useEffect } from 'react';
import ErrorBoundary from '@/components/ui/ErrorBoundary';

// Pages
import AuthPage from '@/pages/AuthPage';
import ChatLayout from '@/pages/ChatLayout';
import IncomingCallModal from '@/components/call/IncomingCallModal';
import CallScreen from '@/components/call/CallScreen';
import { useCallStore } from './store/callStore';

function SocketProvider({ children }: { children: React.ReactNode }) {
  useSocket();
  useNotifications();
  return <>{children}</>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, _hydrated } = useAuthStore();

  // Wait for Zustand to rehydrate from localStorage before deciding
  if (!_hydrated) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
            <span className="text-white font-bold text-xl" style={{ fontFamily: 'serif' }}>گ</span>
          </div>
          <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/auth/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, _hydrated } = useAuthStore();
  if (!_hydrated) return null; // avoid flash redirect
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  const { isAuthenticated, initCrypto, user } = useAuthStore();
  const { session, incomingCall } = useCallStore();

  // Apply saved theme
  useEffect(() => {
    const saved = localStorage.getItem('golpo_theme') || 'dark';
    document.documentElement.className = saved;
  }, []);

  // Init crypto after login
  useEffect(() => {
    if (isAuthenticated && user) {
      initCrypto();
    }
  }, [isAuthenticated, user?.id]);

  return (
    <ErrorBoundary>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <SocketProvider>
        {/* Global overlays */}
        {incomingCall && <IncomingCallModal />}
        {session && session.state !== 'idle' && <CallScreen />}

        <Routes>
          <Route
            path="/auth/*"
            element={
              <PublicRoute>
                <AuthPage />
              </PublicRoute>
            }
          />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <ChatLayout />
              </ProtectedRoute>
            }
          />
        </Routes>

        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#1a2332',
              color: '#f9fafb',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
      </SocketProvider>
    </BrowserRouter>
    </ErrorBoundary>
  );
}
