"use client";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBlockchain } from "@/context/BlockchainContext";
import { useRouter } from "next/navigation";
import {
  PlusCircle,
  Search,
  FileText,
  ShieldCheck,
  LogOut,
  Wallet,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
  Sparkles,
  Download
} from "lucide-react";
import axios from "axios";
import type { CertificateRecord } from "@/types/certificate";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const BLOCK_EXPLORER_URL = process.env.NEXT_PUBLIC_BLOCK_EXPLORER_URL || "";

export default function Dashboard() {
  const { user, logout, loading } = useAuth();
  const { account, connectWallet } = useBlockchain();
  const [certs, setCerts] = useState<CertificateRecord[]>([]);
  const router = useRouter();

  const fetchCerts = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await axios.get<CertificateRecord[]>(`${API_URL}/api/certs/my`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setCerts(data);
    } catch (error) {
      console.error("Failed to fetch certificates", error);
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
    if (user) {
      void fetchCerts();
    }
  }, [user, loading, router, fetchCerts]);

  const downloadCertificate = async (cert: CertificateRecord) => {
    try {
      const { data } = await axios.get(`${API_URL}/api/certs/${cert._id}/file`, {
        headers: { Authorization: `Bearer ${user?.token}` },
        responseType: 'blob'
      });
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `certificate-${cert._id}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      window.alert('Could not download this private certificate file.');
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-slate-900 border-r border-slate-800 p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-10 px-2">
          <ShieldCheck className="w-8 h-8 text-blue-500" />
          <span className="text-lg font-bold">CertiChain</span>
        </div>

        <nav className="flex-1 space-y-2">
          <button type="button" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-600/10 text-blue-400 font-semibold transition-all">
            <FileText className="w-5 h-5" />
            <span>Dashboard</span>
          </button>

          {user?.role === 'institution' && (
            <button type="button"
              onClick={() => router.push('/dashboard/upload')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Issue Certificate</span>
            </button>
          )}

          {user?.role === 'student' && (
            <button type="button"
              onClick={() => router.push('/dashboard/assistant')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
            >
              <Sparkles className="w-5 h-5" />
              <span>Credential Assistant</span>
            </button>
          )}

          <button type="button"
            onClick={() => router.push('/verify')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
          >
            <Search className="w-5 h-5" />
            <span>Verify Certificate</span>
          </button>
        </nav>

        <button type="button"
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all mt-auto"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold">Welcome back, {user?.name}</h1>
            <p className="text-slate-400">Manage your {user?.role} credentials securely.</p>
          </div>

          <div className="flex items-center gap-4">
            <button type="button"
              onClick={connectWallet}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all ${
                account
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              <Wallet className="w-5 h-5" />
              <span>{account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Connect Wallet'}</span>
            </button>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-400 text-sm font-medium">Total Certificates</span>
              <FileText className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-2xl font-bold">{certs.length}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-400 text-sm font-medium">Verified On-Chain</span>
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold">{certs.filter((certificate) => certificate.status === 'verified').length}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-400 text-sm font-medium">Pending Approval</span>
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div className="text-2xl font-bold">{certs.filter((certificate) => certificate.status === 'pending').length}</div>
          </div>
        </div>

        {/* Certificates Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-6 border-b border-slate-800 flex justify-between items-center">
            <h3 className="text-xl font-semibold">Your Certificates</h3>
            {user?.role === 'student' && (
              <button type="button"
                onClick={() => router.push(`/resume/${user?._id}`)}
                className="text-sm text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
              >
                View Public Resume <ExternalLink className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                  <th className="px-6 py-4">Title</th>
                  <th className="px-6 py-4">Institution</th>
                  <th className="px-6 py-4">Issue Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">On-Chain Tx</th>
                  <th className="px-6 py-4">Private File</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {certs.length > 0 ? certs.map((cert) => (
                  <tr key={cert._id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 font-medium">{cert.title}</td>
                    <td className="px-6 py-4 text-slate-400">{cert.institution}</td>
                    <td className="px-6 py-4 text-slate-400">{new Date(cert.issueDate).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      {cert.status === 'verified' ? (
                        <span className="flex items-center gap-1 text-emerald-400 text-sm">
                          <CheckCircle2 className="w-4 h-4" /> Verified
                        </span>
                      ) : cert.status === 'pending' ? (
                        <span className="flex items-center gap-1 text-amber-400 text-sm">
                          <Clock className="w-4 h-4" /> Pending
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-400 text-sm">
                          <XCircle className="w-4 h-4" /> Revoked
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {cert.blockchainTx && BLOCK_EXPLORER_URL ? (
                        <a
                          href={`${BLOCK_EXPLORER_URL.replace(/\/$/, '')}/tx/${cert.blockchainTx}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 text-xs font-mono flex items-center gap-1"
                        >
                          {cert.blockchainTx.slice(0, 8)}...{cert.blockchainTx.slice(-6)}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : cert.blockchainTx ? (
                        <span title={cert.blockchainTx} className="text-slate-400 text-xs font-mono">{cert.blockchainTx.slice(0, 8)}...{cert.blockchainTx.slice(-6)}</span>
                      ) : (
                        <span className="text-slate-600 text-xs italic">Not on-chain</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {!cert.isExternal && <button type="button" onClick={() => downloadCertificate(cert)} title="Download private certificate" className="text-slate-400 hover:text-blue-400">
                        <Download className="w-4 h-4" />
                      </button>}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                      No certificates found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
