import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, User, Phone, ArrowRight, RefreshCw,
  ChevronLeft, Lock, Eye, EyeOff, ShieldCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';

// ─── Password strength ─────────────────────────────────────────────────────
function getStrength(password: string) {
  const checks = [
    { label: 'At least 8 characters',       pass: password.length >= 8 },
    { label: 'Uppercase letter (A–Z)',        pass: /[A-Z]/.test(password) },
    { label: 'Lowercase letter (a–z)',        pass: /[a-z]/.test(password) },
    { label: 'Number (0–9)',                  pass: /\d/.test(password) },
    { label: 'Special character (@$!%*?&#^)', pass: /[@$!%*?&^#]/.test(password) },
  ];
  const passed = checks.filter((c) => c.pass).length;
  const score = Math.min(4, passed) as 0 | 1 | 2 | 3 | 4;
  const labels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'];
  return { score, label: labels[score], color: colors[score], checks };
}

function PasswordStrengthBar({ password }: { password: string }) {
  if (!password) return null;
  const { score, label, color, checks } = getStrength(password);
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="flex gap-1 mt-2 mb-1.5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: color }}
              initial={{ width: 0 }}
              animate={{ width: i <= score ? '100%' : '0%' }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium" style={{ color }}>{label}</span>
        {score === 4 && (
          <span className="flex items-center gap-1 text-xs text-emerald-400">
            <ShieldCheck className="w-3 h-3" /> Strong password
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 gap-0.5">
        {checks.map((c) => (
          <div key={c.label} className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors duration-200 ${c.pass ? 'bg-emerald-400' : 'bg-white/15'}`} />
            <span className={`text-xs transition-colors duration-200 ${c.pass ? 'text-gray-400' : 'text-gray-600'}`}>{c.label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Background ────────────────────────────────────────────────────────────
function IslamicPattern() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="islamic" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M30 0 L60 30 L30 60 L0 30 Z" fill="none" stroke="#10b981" strokeWidth="0.5"/>
            <circle cx="30" cy="30" r="15" fill="none" stroke="#10b981" strokeWidth="0.5"/>
            <path d="M30 5 L55 30 L30 55 L5 30 Z" fill="none" stroke="#10b981" strokeWidth="0.3"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#islamic)"/>
      </svg>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-emerald-500/5 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-emerald-400/5 blur-3xl" />
    </div>
  );
}

// ─── Logo ──────────────────────────────────────────────────────────────────
function GolpoLogo() {
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-20 h-20 mb-4">
        <div className="absolute inset-0 rounded-3xl bg-emerald-500 rotate-12 opacity-20" />
        <div className="relative w-full h-full rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-emerald-glow">
          <span className="text-white font-bold text-3xl" style={{ fontFamily: 'serif' }}>گ</span>
        </div>
      </div>
      <h1 className="font-bold tracking-tight text-4xl text-white">Golpo</h1>
      <p className="text-emerald-400/70 text-sm mt-1 tracking-widest uppercase">by Kafaah</p>
    </div>
  );
}

// ─── Password input ────────────────────────────────────────────────────────
function PasswordInput({
  value, onChange, placeholder = 'Password', showStrength = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  showStrength?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <div className="relative">
        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required
          autoComplete={showStrength ? 'new-password' : 'current-password'}
          className="input-field pl-10 pr-11"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          tabIndex={-1}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {showStrength && (
        <AnimatePresence>
          {value && <PasswordStrengthBar key="bar" password={value} />}
        </AnimatePresence>
      )}
    </div>
  );
}

// ─── Auth step (login + signup) ────────────────────────────────────────────
function AuthStep({ onOtpSent }: { onOtpSent: (email: string) => void }) {
  const [mode, setMode]         = useState<'login' | 'signup'>('login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [phone, setPhone]       = useState('');
  const [loading, setLoading]   = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    if (mode === 'signup') {
      if (!nickname.trim()) { toast.error('Nickname is required'); return; }
      const { score } = getStrength(password);
      if (score < 3) { toast.error('Please use a stronger password'); return; }
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        await authApi.signup({ email, nickname, password, phone: phone || undefined });
        onOtpSent(email);
        toast.success('OTP sent! Check your email.');
      } else {
        const { data } = await authApi.login(email, password);
        if (data.requiresVerification) {
          onOtpSent(email);
          toast('Please verify your email first', { icon: '📧' });
        } else if (data.token && data.user) {
          setAuth(data.token, data.user);
          navigate('/', { replace: true });
          toast.success('Welcome back! 🌙');
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.displayMessage || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.97 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-md"
    >
      <div className="glass rounded-3xl p-8 shadow-glass">
        <GolpoLogo />
        <div className="mt-8">
          <div className="flex rounded-xl overflow-hidden bg-white/5 p-1 mb-6">
            {(['login', 'signup'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setPassword(''); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                  mode === m ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address" required autoComplete="email"
                className="input-field pl-10"
              />
            </div>

            <AnimatePresence>
              {mode === 'signup' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text" value={nickname} onChange={(e) => setNickname(e.target.value)}
                      placeholder="Nickname" required={mode === 'signup'} autoComplete="username"
                      className="input-field pl-10"
                    />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                      placeholder="Phone (optional)" autoComplete="tel"
                      className="input-field pl-10"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <PasswordInput
              value={password}
              onChange={setPassword}
              placeholder={mode === 'signup' ? 'Create a strong password' : 'Password'}
              showStrength={mode === 'signup'}
            />

            <button type="submit" disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
            >
              {loading
                ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span><ArrowRight className="w-4 h-4" /></>
              }
            </button>
          </form>

          <p className="text-center text-xs text-gray-500 mt-6">
            🔒 End-to-end encrypted · Secure &amp; private
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── OTP verification step ─────────────────────────────────────────────────
function OtpStep({ email, onBack }: { email: string; onBack: () => void }) {
  const [otp, setOtp]             = useState(['', '', '', '', '', '']);
  const [loading, setLoading]     = useState(false);
  const [cooldown, setCooldown]   = useState(60);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    inputRefs.current[0]?.focus();
    const timer = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleChange = (i: number, val: string) => {
    if (val.length > 1) {
      const digits = val.replace(/\D/g, '').slice(0, 6).split('');
      const next = [...otp];
      digits.forEach((d, idx) => { if (idx < 6) next[idx] = d; });
      setOtp(next);
      inputRefs.current[Math.min(digits.length, 5)]?.focus();
      return;
    }
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 5) inputRefs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) inputRefs.current[i - 1]?.focus();
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== 6) return;
    setLoading(true);
    try {
      const { data } = await authApi.verifyOtp(email, code);
      setAuth(data.token, data.user);
      navigate('/', { replace: true });
      toast.success('Welcome to Golpo! 🌙');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid or expired OTP');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setResending(true);
    try {
      await authApi.resendOtp(email);
      setCooldown(60);
      toast.success('New OTP sent!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to resend');
    } finally {
      setResending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.97 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-md"
    >
      <div className="glass rounded-3xl p-8 shadow-glass">
        <button onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors text-sm"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold">Verify your email</h2>
          <p className="text-gray-400 text-sm mt-2">
            Enter the 6-digit code sent to<br />
            <span className="text-emerald-400 font-medium">{email}</span>
          </p>
        </div>

        <div className="flex gap-2.5 justify-center mb-6">
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => (inputRefs.current[i] = el)}
              type="text" inputMode="numeric" maxLength={6}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className={`w-12 h-14 text-center text-xl font-bold rounded-xl border transition-all duration-200 outline-none bg-white/5
                ${digit ? 'border-emerald-500 text-emerald-400 shadow-emerald-glow' : 'border-white/10 text-white'}
                focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20`}
            />
          ))}
        </div>

        <button
          onClick={handleVerify}
          disabled={loading || otp.join('').length !== 6}
          className="btn-primary w-full"
        >
          {loading
            ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
            : 'Verify Code'
          }
        </button>

        <div className="text-center mt-4">
          <button
            onClick={handleResend}
            disabled={cooldown > 0 || resending}
            className="text-sm text-gray-400 hover:text-emerald-400 transition-colors flex items-center gap-1.5 mx-auto disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
          </button>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">Code expires in 5 minutes</p>
      </div>
    </motion.div>
  );
}

// ─── Page root ─────────────────────────────────────────────────────────────
export default function AuthPage() {
  const [step, setStep]   = useState<'auth' | 'otp'>('auth');
  const [email, setEmail] = useState('');

  // Allow body/root to scroll on auth page
  useEffect(() => {
    document.documentElement.style.overflow = 'auto';
    document.body.style.overflow = 'auto';
    const root = document.getElementById('root');
    if (root) root.style.overflow = 'auto';

    return () => {
      // Restore when leaving auth page
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      if (root) root.style.overflow = '';
    };
  }, []);

  return (
    <div className="auth-page min-h-screen flex flex-col items-center justify-start sm:justify-center py-8 px-4 relative overflow-y-auto bg-gray-950">
      <IslamicPattern />
      <div className="relative z-10 w-full flex flex-col items-center justify-center flex-1">
        <AnimatePresence mode="wait">
          {step === 'auth' ? (
            <AuthStep key="auth" onOtpSent={(e) => { setEmail(e); setStep('otp'); }} />
          ) : (
            <OtpStep key="otp" email={email} onBack={() => setStep('auth')} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
