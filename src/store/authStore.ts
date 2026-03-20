import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '@/types';
import { initUserCrypto } from '@/services/crypto';
import { usersApi } from '@/services/api';
import socketService from '@/services/socket';

interface AuthStore {
  user: User | null;
  token: string | null;
  keyPair: CryptoKeyPair | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  _hydrated: boolean;

  setAuth: (token: string, user: User) => void;
  logout: () => void;
  initCrypto: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      keyPair: null,
      isAuthenticated: false,
      isInitializing: false,
      _hydrated: false,

      setHydrated: () => set({ _hydrated: true }),

      setAuth: (token, user) => {
        // Write to BOTH places so axios interceptor always finds it
        localStorage.setItem('golpo_token', token);
        set({ token, user, isAuthenticated: true });
      },

      logout: () => {
        localStorage.removeItem('golpo_token');
        socketService.disconnect();
        set({ user: null, token: null, keyPair: null, isAuthenticated: false });
      },

      initCrypto: async () => {
        const { user } = get();
        if (!user) return;
        set({ isInitializing: true });
        try {
          const { publicKeyB64, keyPair } = await initUserCrypto(user.id);
          set({ keyPair });
          if (user.publicKey !== publicKeyB64) {
            await usersApi.updatePublicKey(publicKeyB64);
            set({ user: { ...user, publicKey: publicKeyB64 } });
          }
        } catch (err) {
          console.error('Crypto init failed:', err);
        } finally {
          set({ isInitializing: false });
        }
      },

      updateUser: (updates) => {
        const { user } = get();
        if (!user) return;
        set({ user: { ...user, ...updates } });
      },
    }),
    {
      name: 'golpo_auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      // After hydration from localStorage, also sync token to the key axios reads
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          localStorage.setItem('golpo_token', state.token);
        }
        state?.setHydrated();
      },
    },
  ),
);
