import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { registerUser } from "../lib/api";
import { buttonPrimary, inputClass, Notice, PageHeading } from "../components/ui/Feedback";

function AuthCard({ children }: { children: ReactNode }) {
  return <main className="mx-auto flex min-h-[calc(100vh-140px)] w-full max-w-6xl items-center justify-center px-5 py-12"><div className="w-full max-w-lg rounded-2xl border border-[#164B54] bg-gradient-to-br from-[#172A30] via-[#191D25] to-[#171A22] p-6 shadow-[0_0_24px_rgba(0,229,245,0.08)] sm:p-9">{children}</div></main>;
}

export function LoginPage() {
  const { login, user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const from = (location.state as { from?: string } | null)?.from || "/";
  const registrationNotice = (location.state as { notice?: string } | null)?.notice;
  useEffect(() => {
    const stateEmail = (location.state as { email?: string } | null)?.email;
    if (stateEmail) setEmail(stateEmail);
  }, [location.state]);

  if (!loading && user) return <Navigate to={from} replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not sign in.");
    } finally { setBusy(false); }
  }

  return <AuthCard>
    <PageHeading eyebrow="NEXUS ARENA ACCOUNT" title="Welcome back" description="Sign in to manage your gaming sessions and wallet." />
    {registrationNotice && <div className="mb-5"><Notice kind="success">{registrationNotice}</Notice></div>}
    {error && <div className="mb-5"><Notice>{error}</Notice></div>}
    <form className="space-y-5" onSubmit={submit}>
      <label className="block text-sm font-semibold text-[#C5D0D8]">Email address<input autoComplete="email" type="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className={`${inputClass} mt-2`} /></label>
      <label className="block text-sm font-semibold text-[#C5D0D8]">Password<input autoComplete="current-password" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} className={`${inputClass} mt-2`} /></label>
      <button className={`${buttonPrimary} w-full`} disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
    </form>
    <p className="mt-6 text-center text-sm text-[#A5B4BC]">New to the lounge? <Link className="font-semibold text-[#4DDCE9] hover:underline" to="/register">Create an account</Link></p>
  </AuthCard>;
}

export function RegistrationPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (!loading && user) return <Navigate to="/profile" replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (form.password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (form.password !== form.confirmPassword) { setError("The passwords do not match."); return; }
    setBusy(true);
    try {
      const { user: created } = await registerUser({ name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), password: form.password });
      navigate("/login", { replace: true, state: { email: created.email, notice: "Your NEXUS ARENA account is ready. Sign in to continue." } });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not create your account.");
    } finally { setBusy(false); }
  }

  return <AuthCard>
    <PageHeading eyebrow="JOIN THE LOUNGE" title="Create your account" description="Your account includes a personal NEXUS ARENA wallet." />
    {error && <div className="mb-5"><Notice>{error}</Notice></div>}
    <form className="space-y-4" onSubmit={submit}>
      <label className="block text-sm font-semibold text-[#C5D0D8]">Full name<input autoComplete="name" required minLength={2} maxLength={80} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={`${inputClass} mt-2`} /></label>
      <label className="block text-sm font-semibold text-[#C5D0D8]">Email address<input autoComplete="email" type="email" required maxLength={254} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className={`${inputClass} mt-2`} /></label>
      <label className="block text-sm font-semibold text-[#C5D0D8]">Phone<input autoComplete="tel" type="tel" required minLength={7} maxLength={20} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className={`${inputClass} mt-2`} /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-[#C5D0D8]">Password<input autoComplete="new-password" type="password" required minLength={8} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className={`${inputClass} mt-2`} /></label>
        <label className="block text-sm font-semibold text-[#C5D0D8]">Confirm password<input autoComplete="new-password" type="password" required minLength={8} value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} className={`${inputClass} mt-2`} /></label>
      </div>
      <p className="text-xs text-[#84919D]">Public registration creates a user account. Administrator access is managed by lounge staff.</p>
      <button className={`${buttonPrimary} w-full`} disabled={busy}>{busy ? "Creating account…" : "Create account"}</button>
    </form>
    <p className="mt-6 text-center text-sm text-[#A5B4BC]">Already registered? <Link className="font-semibold text-[#4DDCE9] hover:underline" to="/login">Sign in</Link></p>
  </AuthCard>;
}
