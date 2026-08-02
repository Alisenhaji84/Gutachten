"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loginUser, initDb } from "@/lib/db";
import { KeyRound, Mail, ShieldAlert, ArrowRight } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    initDb();
    // Redirect if already logged in
    const currentUser = localStorage.getItem("kfz_current_user");
    if (currentUser) {
      router.push("/dashboard");
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await loginUser(email, password);
      if (user) {
        localStorage.setItem("kfz_current_user", JSON.stringify(user));
        router.push("/dashboard");
      } else {
        setError("Ungültige E-Mail-Adresse oder Passwort. Bitte versuchen Sie es erneut.");
      }
    } catch (err: any) {
      console.error("Login exception:", err);
      setError("Ein Fehler ist aufgetreten. Bitte versuchen Sie es später noch einmal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-4 bg-slate-900 text-slate-100 min-h-screen relative overflow-hidden">
      {/* Visual background details */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-sky-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Logo Container */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-slate-800 border border-slate-700/60 rounded-2xl flex items-center justify-center shadow-lg mb-4 overflow-hidden transform hover:rotate-6 transition-transform duration-300">
            <img src="/Logo.webp" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            KFZ-Gutachten Portal
          </h1>
          <p className="text-slate-400 text-sm mt-1">Ingenieurbüro & Schadenabwicklung</p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl shadow-slate-950/50">
          <h2 className="text-xl font-semibold mb-6 text-slate-100">Interner Login</h2>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-200 text-sm rounded-xl flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">
                E-Mail-Adresse
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@gutachten.de"
                  className="w-full bg-slate-950/40 border border-slate-700 focus:border-sky-500 text-slate-100 px-4 py-3 pl-11 rounded-xl outline-none transition-all placeholder:text-slate-600 focus:ring-2 focus:ring-sky-500/20"
                />
                <Mail className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-500" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">
                Passwort
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950/40 border border-slate-700 focus:border-sky-500 text-slate-100 px-4 py-3 pl-11 rounded-xl outline-none transition-all placeholder:text-slate-600 focus:ring-2 focus:ring-sky-500/20"
                />
                <KeyRound className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-500" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-slate-950 font-medium py-3 rounded-xl transition-all shadow-lg shadow-sky-500/10 hover:shadow-sky-500/20 flex items-center justify-center gap-2 mt-8 disabled:opacity-55 disabled:cursor-not-allowed group cursor-pointer"
            >
              <span>{loading ? "Anmeldung..." : "Einloggen"}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
