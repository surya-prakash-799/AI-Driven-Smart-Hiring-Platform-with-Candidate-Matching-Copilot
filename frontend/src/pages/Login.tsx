import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Sparkles, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getErrorMessage } from '../services/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PageLoader } from '../components/ui/Spinner';
import { cn } from '../utils/cn';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type Mode = 'login' | 'signup';

export default function Login() {
  const { user, ready, login, register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; confirmPassword?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  if (!ready) return <PageLoader />;
  if (user) return <Navigate to="/" replace />;

  const switchMode = (next: Mode) => {
    setMode(next);
    setErrors({});
    setShowPassword(false);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedEmail = email.trim();
    const trimmedName = name.trim();
    const nextErrors: typeof errors = {};

    if (mode === 'signup' && !trimmedName) nextErrors.name = 'Full name is required';
    if (!trimmedEmail) nextErrors.email = 'Email is required';
    else if (!EMAIL_RE.test(trimmedEmail)) nextErrors.email = 'Enter a valid email address';
    if (!password) nextErrors.password = 'Password is required';
    else if (password.length < 6) nextErrors.password = 'Password must be at least 6 characters';
    if (mode === 'signup' && password !== confirmPassword) nextErrors.confirmPassword = 'Passwords do not match';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      if (mode === 'signup') {
        await register(trimmedName, trimmedEmail, password);
        toast.success('Account created', 'Your account is ready. Welcome to AI-Driven Smart Hiring Platform.');
      } else {
        await login(trimmedEmail, password);
        toast.success('Welcome back', 'Signed in to AI-Driven Smart Hiring Platform.');
      }
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(mode === 'signup' ? 'Sign up failed' : 'Sign in failed', getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-white to-blue-50/60">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 font-black tracking-tight text-lg">
            AH
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900 tracking-tight">AI-Driven Smart Hiring Platform</h1>
          <p className="text-sm text-slate-500 mt-1">
            {mode === 'login' ? 'Sign in to your Candidate Matching Copilot' : 'Create your Candidate Matching Copilot account'}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
          <div className="grid grid-cols-2 gap-1 p-1 mb-6 bg-slate-100 rounded-xl" role="tablist" aria-label="Authentication mode">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              onClick={() => switchMode('login')}
              className={cn(
                'py-2 rounded-lg text-sm font-semibold transition-colors',
                mode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signup'}
              onClick={() => switchMode('signup')}
              className={cn(
                'py-2 rounded-lg text-sm font-semibold transition-colors',
                mode === 'signup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {mode === 'signup' && (
              <Input
                label="Full name"
                type="text"
                autoComplete="name"
                placeholder="e.g. Sarah Jenkins"
                value={name}
                onChange={(event) => setName(event.target.value)}
                leftIcon={<User className="w-4 h-4" />}
                error={errors.name}
              />
            )}

            <Input
              label="Email address"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              error={errors.email}
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              placeholder="At least 6 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              error={errors.password}
            />

            {mode === 'signup' && (
              <Input
                label="Confirm password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                leftIcon={<Lock className="w-4 h-4" />}
                error={errors.confirmPassword}
              />
            )}

            {mode === 'login' && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(event) => setRemember(event.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 accent-blue-600"
                  />
                  Remember me
                </label>
                <button type="button" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
                  Forgot password?
                </button>
              </div>
            )}

            <Button
              type="submit"
              size="md"
              className="w-full"
              loading={submitting}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {mode === 'signup' ? 'Create Account' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-600 leading-relaxed">
              <span className="font-bold text-slate-800">Accounts are stored in the database.</span> Create an account to
              sign in, or use the default admin —{' '}
              <span className="font-semibold text-slate-700">admin@recruit.ai</span> /{' '}
              <span className="font-semibold text-slate-700">admin123</span>.
            </p>
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-6">
          AI-Driven Smart Hiring Platform with Candidate Matching Copilot — automated resume parsing &amp; talent analytics
        </p>
      </div>
    </div>
  );
}
