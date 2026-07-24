"use client";

import { useRouter } from "next/navigation";
import { Car, ShieldCheck, ArrowRight, Wrench, ShieldAlert } from "lucide-react";

export default function Home() {
  const router = useRouter();

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-900 text-slate-100 min-h-screen relative overflow-hidden">
      {/* Background details */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-sky-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-2xl text-center space-y-8 z-10">
        {/* Logo */}
        <div className="inline-flex w-20 h-20 bg-sky-500 rounded-3xl items-center justify-center text-slate-950 shadow-xl shadow-sky-500/10 mb-2 transform hover:rotate-6 transition-transform">
          <Car className="w-11 h-11 stroke-[2]" />
        </div>

        {/* Title */}
        <div className="space-y-3">
          <span className="text-xs uppercase font-extrabold tracking-widest text-sky-400 bg-sky-950/60 px-4 py-1.5 rounded-full border border-sky-800/30">
            KFZ-Gutachter & Ingenieurbüro
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent font-serif leading-tight">
            Digitales Schadenportal
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-lg mx-auto leading-relaxed">
            Willkommen im digitalen Kunden- und Schadensabwicklungsportal. Verwalten Sie Gutachten,
            Unfallmeldungen und Dokumente einfach und sicher.
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => router.push("/admin")}
            className="w-full sm:w-auto bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold px-8 py-3.5 rounded-xl shadow-lg shadow-sky-500/10 hover:shadow-sky-500/20 transition-all flex items-center justify-center gap-2 group cursor-pointer"
          >
            <span>Mitarbeiter Portal Login</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Features list */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-12 border-t border-slate-800/60 max-w-xl mx-auto">
          <div className="flex flex-col items-center text-center p-4">
            <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-sky-400 mb-3 border border-slate-700/40">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-sm text-slate-200">Sicher & Schnell</h3>
            <p className="text-xs text-slate-500 mt-1">Verschlüsselte Datenübermittlung und einfache Handhabung.</p>
          </div>

          <div className="flex flex-col items-center text-center p-4">
            <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-sky-400 mb-3 border border-slate-700/40">
              <Wrench className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-sm text-slate-200">Experten-Service</h3>
            <p className="text-xs text-slate-500 mt-1">Ihr Unfallgutachten erstellt von geprüften Kfz-Sachverständigen.</p>
          </div>

          <div className="flex flex-col items-center text-center p-4">
            <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-sky-400 mb-3 border border-slate-700/40">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-sm text-slate-200">Direkte Abwicklung</h3>
            <p className="text-xs text-slate-500 mt-1">Direkte Schnittstellen zu Versicherern und Rechtsanwälten.</p>
          </div>
        </div>

      </div>
    </main>
  );
}
