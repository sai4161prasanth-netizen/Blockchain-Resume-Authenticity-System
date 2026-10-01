import Link from "next/link";
import { ShieldCheck, GraduationCap, Building2 } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="max-w-4xl w-full text-center space-y-8">
        <div className="flex justify-center">
          <ShieldCheck className="w-20 h-20 text-blue-500 animate-pulse" />
        </div>
        
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
          Blockchain Resume Authenticity
        </h1>
        
        <p className="text-xl text-slate-400 max-w-2xl mx-auto">
          A decentralized platform for secure verification of academic and professional credentials. 
          Prevent fraud and build trust with blockchain technology.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
          <Link href="/login?role=student" className="group p-6 rounded-2xl bg-slate-800/50 border border-slate-700 hover:border-blue-500 transition-all">
            <GraduationCap className="w-10 h-10 mb-4 text-blue-400 group-hover:scale-110 transition-transform" />
            <h3 className="text-xl font-semibold mb-2">For Students</h3>
            <p className="text-slate-400 text-sm">Upload certificates and share your verified resume.</p>
          </Link>

          <Link href="/login?role=institution" className="group p-6 rounded-2xl bg-slate-800/50 border border-slate-700 hover:border-emerald-500 transition-all">
            <Building2 className="w-10 h-10 mb-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            <h3 className="text-xl font-semibold mb-2">For Institutions</h3>
            <p className="text-slate-400 text-sm">Issue and verify authentic certificates on-chain.</p>
          </Link>

          <Link href="/verify" className="group p-6 rounded-2xl bg-slate-800/50 border border-slate-700 hover:border-purple-500 transition-all">
            <ShieldCheck className="w-10 h-10 mb-4 text-purple-400 group-hover:scale-110 transition-transform" />
            <h3 className="text-xl font-semibold mb-2">For Employers</h3>
            <p className="text-slate-400 text-sm">Instantly verify candidate credentials with ease.</p>
          </Link>
        </div>

        <div className="pt-8">
          <Link href="/login" className="px-8 py-3 rounded-full bg-blue-600 hover:bg-blue-500 font-medium transition-colors">
            Get Started
          </Link>
        </div>
      </div>
    </main>
  );
}
