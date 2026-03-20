import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  X, Camera, User, Phone, Mail, Bell, Lock, LogOut,
  Shield, Trash2, Moon, Sun, Eye, EyeOff, ShieldCheck,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { usersApi, authApi } from '@/services/api';
import { initFirebaseMessaging } from '@/services/firebase';
import toast from 'react-hot-toast';
import Avatar from './Avatar';
import Button from './Button';
import Input from './Input';

interface Props { onClose: () => void; }

export default function SettingsPanel({ onClose }: Props) {
  const { user, updateUser, logout } = useAuthStore();
  const [tab, setTab] = useState<'profile' | 'notifications' | 'privacy' | 'account'>('profile');
  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(false);

  // Change password state
  const [showChangePw, setShowChangePw] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  const [theme, setTheme] = useState<'dark' | 'light'>(
    () => (localStorage.getItem('golpo_theme') || 'dark') as 'dark' | 'light'
  );
  const avatarInput = useRef<HTMLInputElement>(null);

  const handleChangePassword = async () => {
    if (!currentPw || !newPw) return;
    if (newPw.length < 8) { toast.error('New password must be at least 8 characters'); return; }
    if (!/(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&^#])/.test(newPw)) {
      toast.error('New password needs uppercase, lowercase, number & special character');
      return;
    }
    setChangingPw(true);
    try {
      await authApi.changePassword(currentPw, newPw);
      toast.success('Password changed successfully');
      setShowChangePw(false);
      setCurrentPw('');
      setNewPw('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPw(false);
    }
  };

  const saveProfile = async () => {
    if (!nickname.trim()) return;
    setSaving(true);
    try {
      const { data } = await usersApi.updateProfile({ nickname, phone: phone || undefined });
      updateUser(data);
      setEditing(false);
      toast.success('Profile updated');
    } catch { toast.error('Failed to update'); }
    finally { setSaving(false); }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
    setUploadingAvatar(true);
    try {
      const { data } = await usersApi.updateAvatar(file);
      updateUser({ avatarUrl: data.avatarUrl });
      toast.success('Avatar updated');
    } catch { toast.error('Upload failed'); }
    finally { setUploadingAvatar(false); }
  };

  const enableNotifications = async () => {
    const token = await initFirebaseMessaging();
    if (token) { setNotifEnabled(true); toast.success('Notifications enabled'); }
    else toast.error('Could not enable notifications');
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.className = next;
    localStorage.setItem('golpo_theme', next);
  };

  const TABS = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'account', label: 'Account', icon: Lock },
  ] as const;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: 32, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-xl bg-[#111827] rounded-3xl overflow-hidden border border-white/8 shadow-glass"
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/5">
          <h2 className="font-bold text-lg">Settings</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex overflow-hidden" style={{ height: 'calc(90vh - 80px)' }}>
          {/* Sidebar tabs */}
          <div className="w-44 flex-shrink-0 border-r border-white/5 py-3 px-2 space-y-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                  tab === id
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
            <div className="pt-2 mt-2 border-t border-white/5">
              <button
                onClick={logout}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {tab === 'profile' && (
              <div className="space-y-6">
                {/* Avatar */}
                <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                    <Avatar src={user?.avatarUrl} name={user?.nickname} userId={user?.id} size="xl" />
                    <button
                      onClick={() => avatarInput.current?.click()}
                      disabled={uploadingAvatar}
                      className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center border-2 border-[#111827] transition-colors"
                    >
                      {uploadingAvatar ? (
                        <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Camera className="w-4 h-4 text-white" />
                      )}
                    </button>
                    <input ref={avatarInput} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-white">{user?.nickname}</p>
                    <p className="text-sm text-gray-500">{user?.email}</p>
                  </div>
                </div>

                {/* Info */}
                {editing ? (
                  <div className="space-y-4">
                    <Input
                      label="Nickname"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      leftIcon={<User className="w-4 h-4" />}
                      maxLength={80}
                    />
                    <Input
                      label="Phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      leftIcon={<Phone className="w-4 h-4" />}
                      placeholder="Optional"
                    />
                    <div className="flex gap-2">
                      <Button variant="secondary" fullWidth onClick={() => setEditing(false)}>Cancel</Button>
                      <Button fullWidth loading={saving} onClick={saveProfile}>Save Changes</Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[
                      { icon: User, label: 'Nickname', value: user?.nickname },
                      { icon: Mail, label: 'Email', value: user?.email },
                      { icon: Phone, label: 'Phone', value: user?.phone || 'Not set' },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="flex items-center gap-3 p-3 rounded-xl bg-white/4 border border-white/6">
                        <Icon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500">{label}</p>
                          <p className="text-sm text-white truncate">{value}</p>
                        </div>
                      </div>
                    ))}
                    <Button variant="outline" fullWidth onClick={() => setEditing(true)}>
                      Edit Profile
                    </Button>
                  </div>
                )}
              </div>
            )}

            {tab === 'notifications' && (
              <div className="space-y-4">
                <h3 className="font-semibold text-white">Push Notifications</h3>
                <div className="p-4 rounded-2xl bg-white/4 border border-white/6 space-y-3">
                  <p className="text-sm text-gray-400">
                    Enable push notifications to get alerts for new messages and calls even when the app is in the background.
                  </p>
                  {notifEnabled ? (
                    <div className="flex items-center gap-2 text-emerald-400 text-sm">
                      <div className="w-2 h-2 rounded-full bg-emerald-400" />
                      Notifications enabled
                    </div>
                  ) : (
                    <Button onClick={enableNotifications} icon={<Bell className="w-4 h-4" />}>
                      Enable Notifications
                    </Button>
                  )}
                </div>

                <h3 className="font-semibold text-white pt-2">Appearance</h3>
                <div className="p-4 rounded-2xl bg-white/4 border border-white/6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {theme === 'dark' ? <Moon className="w-5 h-5 text-gray-400" /> : <Sun className="w-5 h-5 text-yellow-400" />}
                      <div>
                        <p className="text-sm font-medium text-white">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</p>
                        <p className="text-xs text-gray-500">Click to toggle</p>
                      </div>
                    </div>
                    <button
                      onClick={toggleTheme}
                      className={`relative w-11 h-6 rounded-full transition-colors ${theme === 'dark' ? 'bg-emerald-600' : 'bg-gray-600'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${theme === 'dark' ? 'translate-x-1' : 'translate-x-6'}`} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {tab === 'privacy' && (
              <div className="space-y-4">
                <h3 className="font-semibold text-white">Security</h3>
                <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/15 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Shield className="w-4 h-4" />
                    <span className="text-sm font-medium">End-to-End Encrypted</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Your messages are secured with RSA-OAEP + AES-GCM encryption. Your private key never leaves your device.
                  </p>
                </div>
                <div className="space-y-2">
                  {['Read Receipts', 'Online Status', 'Typing Indicators'].map((setting) => (
                    <div key={setting} className="flex items-center justify-between p-3 rounded-xl bg-white/4 border border-white/6">
                      <span className="text-sm text-white">{setting}</span>
                      <div className="w-10 h-5 rounded-full bg-emerald-600 relative">
                        <div className="absolute right-0.5 top-0.5 w-4 h-4 rounded-full bg-white" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'account' && (
              <div className="space-y-4">
                <h3 className="font-semibold text-white">Account</h3>
                <div className="p-3 rounded-xl bg-white/4 border border-white/6">
                  <p className="text-xs text-gray-500 mb-1">Account ID</p>
                  <p className="text-xs font-mono text-gray-400 break-all">{user?.id}</p>
                </div>

                {/* Change Password */}
                <div className="p-4 rounded-xl bg-white/4 border border-white/6 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-white">Password</span>
                    </div>
                    <button
                      onClick={() => setShowChangePw((v) => !v)}
                      className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      {showChangePw ? 'Cancel' : 'Change'}
                    </button>
                  </div>

                  {showChangePw && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="space-y-3 overflow-hidden pt-1"
                    >
                      {/* Current password */}
                      <div className="relative">
                        <input
                          type={showCurrentPw ? 'text' : 'password'}
                          value={currentPw}
                          onChange={(e) => setCurrentPw(e.target.value)}
                          placeholder="Current password"
                          className="input-field pr-10 text-sm"
                          autoComplete="current-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPw((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                        >
                          {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* New password */}
                      <div className="relative">
                        <input
                          type={showNewPw ? 'text' : 'password'}
                          value={newPw}
                          onChange={(e) => setNewPw(e.target.value)}
                          placeholder="New password"
                          className="input-field pr-10 text-sm"
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPw((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                        >
                          {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Mini strength bar */}
                      {newPw && (
                        <div className="flex gap-1">
                          {[1,2,3,4].map((i) => {
                            const score = [
                              newPw.length >= 8,
                              /[A-Z]/.test(newPw),
                              /\d/.test(newPw),
                              /[@$!%*?&^#]/.test(newPw),
                            ].filter(Boolean).length;
                            const colors = ['#ef4444','#f97316','#22c55e','#10b981'];
                            return (
                              <div key={i} className="flex-1 h-1 rounded-full overflow-hidden bg-white/10">
                                <div
                                  className="h-full rounded-full transition-all duration-300"
                                  style={{
                                    width: i <= score ? '100%' : '0%',
                                    background: colors[Math.min(score-1, 3)],
                                  }}
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <Button
                        fullWidth
                        loading={changingPw}
                        onClick={handleChangePassword}
                        icon={<ShieldCheck className="w-4 h-4" />}
                      >
                        Update Password
                      </Button>
                    </motion.div>
                  )}
                </div>

                <div className="pt-2 border-t border-white/5 space-y-3">
                  <Button variant="danger" fullWidth icon={<LogOut className="w-4 h-4" />} onClick={logout}>
                    Sign Out
                  </Button>
                  <Button variant="danger" fullWidth icon={<Trash2 className="w-4 h-4" />} onClick={() => toast.error('Contact support to delete your account')}>
                    Delete Account
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
