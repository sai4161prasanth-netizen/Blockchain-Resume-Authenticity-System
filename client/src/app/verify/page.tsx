"use client";
import type React from "react";
import { useState } from "react";
import { useBlockchain } from "@/context/BlockchainContext";
import { 
  ShieldCheck, 
  Search, 
  FileSearch, 
  CheckCircle2, 
  XCircle, 
  ArrowLeft,
  Loader2,
  Calendar,
  Building2,
  UserCircle,
  AlertCircle
} from "lucide-react";
import axios from "axios";
import Link from "next/link";
import type { CertificateVerifyResponse, VerificationView } from "@/types/certificate";
import { getErrorMessage } from "@/lib/errors";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function VerifyPage() {
  const { verifyCertificateOnChain } = useBlockchain();
  const [certHash, setCertHash] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationView | null>(null);
  const [error, setError] = useState("");
  const [unverified, setUnverified] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError("");
    setUnverified(false);

    const cleanHash = certHash.trim();
    if (cleanHash.length !== 64) {
      setError("A valid SHA-256 hash must be 64 characters long. Make sure you haven't copied a truncated value.");
      setLoading(false);
      return;
    }

    try {
      // 1. Verify in Database
      const { data } = await axios.post<CertificateVerifyResponse>(`${API_URL}/api/certs/verify`, { hash: cleanHash });
      
      if (!data.valid) {
        setUnverified(true);
        return;
      }
      if (!data.certificate) throw new Error("Verification response did not include a certificate record.");
      const certificate = data.certificate;

      // 2. Cross-verify on Blockchain
      try {
        const onChainData = await verifyCertificateOnChain(cleanHash);
        const [isValid, studentName, institution, issueDate, issuedBy] = onChainData;

        if (isValid) {
          const institutionMatches = certificate.institution.trim().toLowerCase() === institution.trim().toLowerCase();
          const walletMatches = certificate.issuedBy?.walletAddress?.toLowerCase() === issuedBy.toLowerCase();
          setResult({
            ...certificate,
            onChainVerified: institutionMatches && walletMatches,
            chainMismatch: !institutionMatches || !walletMatches,
            blockchainDetails: {
              studentName,
              institution,
              issueDate: Number(issueDate) * 1000,
              issuedBy
            }
          });
        } else {
          setResult({
            ...certificate,
            onChainVerified: false
          });
        }
      } catch (bcError) {
        console.warn("Blockchain verification failed, showing DB record only.", bcError);
        setResult({
          ...certificate,
          onChainVerified: false,
          bcError: "Could not connect to blockchain for verification."
        });
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Verification failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 flex flex-col items-center">
      <div className="max-w-3xl w-full">
        <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-all mb-12">
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Home</span>
        </Link>

        <div className="text-center mb-12">
          <ShieldCheck className="w-16 h-16 text-blue-500 mx-auto mb-4" />
          <h1 className="text-4xl font-bold mb-4">Verify Credential</h1>
          <p className="text-slate-400 text-lg">Enter the certificate hash to verify its authenticity on the blockchain.</p>
        </div>

        <form onSubmit={handleVerify} className="mb-12 relative">
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              required
              className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl py-5 pl-14 pr-32 text-white text-lg focus:outline-none focus:border-blue-500 transition-all shadow-2xl"
              placeholder="Enter SHA-256 certificate hash..."
              value={certHash}
              onChange={(e) => setCertHash(e.target.value)}
            />
            <button
              type="submit"
              disabled={loading}
              className="absolute right-3 top-3 bottom-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 rounded-xl transition-all flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileSearch className="w-5 h-5" />}
              <span>Verify</span>
            </button>
          </div>
        </form>

        {unverified && (
          <div className="bg-red-500/10 border-2 border-red-500/50 text-red-400 p-10 rounded-3xl flex flex-col items-center gap-4 mb-8 animate-in fade-in zoom-in duration-300">
            <XCircle className="w-20 h-20 text-red-500 mb-2" />
            <div className="text-center">
              <h3 className="font-black text-3xl mb-2">UNVERIFIED</h3>
              <p className="text-slate-400 text-lg">This certificate hash does not exist in our secure records or blockchain.</p>
              <p className="text-slate-500 text-sm mt-4 font-mono break-all opacity-50">{certHash.trim()}</p>
            </div>
          </div>
        )}

        {error && !unverified && (
          <div className="bg-amber-500/10 border border-amber-500/50 text-amber-400 p-6 rounded-2xl flex items-start gap-4 mb-8">
            <AlertCircle className="w-6 h-6 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-lg">Verification Error</h3>
              <p className="text-slate-400">{error}</p>
            </div>
          </div>
        )}

        {result && (
          <div className={`bg-slate-900 border-2 rounded-3xl p-8 shadow-2xl overflow-hidden relative transition-all animate-in fade-in slide-in-from-bottom-4 duration-500 ${
            result.onChainVerified ? 'border-emerald-500/50 shadow-emerald-500/10' : 'border-amber-500/50 shadow-amber-500/10'
          }`}>
            <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-800">
              {result.onChainVerified ? <CheckCircle2 className="w-10 h-10 text-emerald-500" /> : <AlertCircle className="w-10 h-10 text-amber-500" />}
              <div>
                <h3 className={`font-black text-3xl ${result.onChainVerified ? "text-emerald-500" : "text-amber-500"}`}>
                  {result.onChainVerified ? "VERIFIED ON-CHAIN" : result.chainMismatch ? "CHAIN RECORD MISMATCH" : "NOT VERIFIED ON-CHAIN"}
                </h3>
                <p className="text-slate-400">
                  {result.onChainVerified ? "Hash, institution, and issuer wallet match the active blockchain record." : result.chainMismatch ? "The hash exists on-chain, but its institution or issuer wallet differs from the verified database record." : "A database record exists, but the blockchain did not confirm it."}
                </p>
              </div>
            </div>

            <div className="absolute top-0 right-0 p-8">
              {result.onChainVerified ? (
                <div className="flex items-center gap-2 text-emerald-400 font-bold bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20">
                  <CheckCircle2 className="w-5 h-5" /> Verified On-Chain
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-400 font-bold bg-amber-500/10 px-4 py-2 rounded-full border border-amber-500/20">
                  <AlertCircle className="w-5 h-5" /> {result.chainMismatch ? "Mismatch" : "Off-Chain Only"}
                </div>
              )}
            </div>

            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="w-full md:w-1/3 aspect-square bg-slate-800 rounded-2xl flex items-center justify-center p-4 border border-slate-700">
                <div className="text-center text-slate-400 p-5">
                  <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-blue-400" />
                  <p className="font-semibold">Original document kept private</p>
                  <p className="text-xs mt-2">The hash and live blockchain record are shown for verification.</p>
                </div>
              </div>

              <div className="flex-1 space-y-6">
                <div>
                  <h2 className="text-3xl font-bold mb-1">{result.title}</h2>
                  <p className="text-slate-400 font-mono text-sm break-all">{result.certHash}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="flex items-start gap-3">
                    <UserCircle className="w-5 h-5 text-blue-400 mt-1" />
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Student Name</p>
                      <p className="text-lg font-medium">{result.student?.name || result.blockchainDetails?.studentName}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Building2 className="w-5 h-5 text-emerald-400 mt-1" />
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Institution</p>
                      <p className="text-lg font-medium">{result.institution}</p>
                      {result.chainMismatch && result.blockchainDetails && <p className="text-xs text-amber-300 mt-1">On-chain institution: {result.blockchainDetails.institution}</p>}
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-purple-400 mt-1" />
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Issue Date</p>
                      <p className="text-lg font-medium">
                        {new Date(result.issueDate || result.blockchainDetails?.issueDate || 0).toLocaleDateString(undefined, {
                          year: 'numeric', month: 'long', day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-amber-400 mt-1" />
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Issued By (Wallet)</p>
                      <p className="text-sm font-mono text-slate-300">
                        {result.issuedBy?.walletAddress || result.blockchainDetails?.issuedBy || 'N/A'}
                      </p>
                      {result.chainMismatch && result.blockchainDetails && <p className="text-xs font-mono text-amber-300 mt-1 break-all">On-chain wallet: {result.blockchainDetails.issuedBy}</p>}
                    </div>
                  </div>
                </div>

                {result.blockchainTx && (
                  <div className="pt-4 mt-6 border-t border-slate-800">
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-2">Blockchain Transaction</p>
                    <p className="text-sm font-mono text-blue-400 break-all">{result.blockchainTx}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
