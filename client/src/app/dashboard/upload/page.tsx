"use client";
import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBlockchain } from "@/context/BlockchainContext";
import { useRouter } from "next/navigation";
import { 
  PlusCircle, 
  ArrowLeft, 
  FileUp, 
  CheckCircle2, 
  Loader2, 
  AlertCircle 
} from "lucide-react";
import axios from "axios";

export default function UploadPage() {
  const { user } = useAuth();
  const { account, issueCertificateOnChain, isReady } = useBlockchain();
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    studentEmail: "",
    title: "",
    institution: user?.name || "",
    isExternal: false,
    externalUrl: "",
    externalId: ""
  });
  
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: "", message: "" });

    try {
      const data = new FormData();
      data.append("studentEmail", formData.studentEmail);
      data.append("title", formData.title);
      data.append("institution", formData.institution);
      data.append("isExternal", formData.isExternal.toString());
      if (file) data.append("certificateFile", file);
      if (formData.isExternal) {
        data.append("externalUrl", formData.externalUrl);
        data.append("externalId", formData.externalId);
      }

      // 1. Upload to Backend
      const response = await axios.post("http://localhost:5000/api/certs/upload", data, {
        headers: { 
          Authorization: `Bearer ${user?.token}`,
          "Content-Type": "multipart/form-data"
        }
      });

      const cert = response.data;
      setStatus({ type: "success", message: "Certificate data saved to database." });

      // 2. Hash and Store on Blockchain
      if (account) {
        setStatus({ type: "info", message: "Recording certificate hash on blockchain... Please confirm in MetaMask." });
        try {
          const txHash = await issueCertificateOnChain(
            formData.studentEmail, 
            cert.certHash, 
            formData.institution
          );

          // 3. Update Backend with Tx Hash
          await axios.put(`http://localhost:5000/api/certs/${cert._id}/blockchain`, {
            txHash: txHash
          }, {
            headers: { Authorization: `Bearer ${user?.token}` }
          });

          setStatus({ type: "success", message: "Successfully issued and recorded on-chain!" });
        } catch (bcError: any) {
          console.error("Blockchain error:", bcError);
          setStatus({ type: "error", message: `Blockchain error: ${bcError.message}. Data saved off-chain.` });
          return; // Stop redirection so user can see the error
        }
      } else {
        setStatus({ type: "warning", message: "Saved to database, but wallet not connected for blockchain record. Please connect wallet and retry." });
        return; // Stop redirection
      }
      
      setTimeout(() => router.push("/dashboard"), 3000);
    } catch (error: any) {
      console.error(error);
      setStatus({ type: "error", message: error.message || "Failed to issue certificate" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-2xl mx-auto">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-all mb-8"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Dashboard</span>
        </button>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center">
              <PlusCircle className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Issue New Certificate</h1>
              <p className="text-slate-400">Add a verified credential to a student's profile.</p>
            </div>
          </div>

          {status.message && (
            <div className={`p-4 rounded-xl mb-8 flex items-center gap-3 border ${
              status.type === 'success' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' :
              status.type === 'error' ? 'bg-red-500/10 border-red-500 text-red-500' :
              'bg-blue-500/10 border-blue-500 text-blue-400'
            }`}>
              {status.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : 
               status.type === 'error' ? <AlertCircle className="w-5 h-5" /> : 
               <Loader2 className="w-5 h-5 animate-spin" />}
              <span>{status.message}</span>
            </div>
          )}

          {!account && (
            <div className="bg-amber-500/10 border border-amber-500/50 text-amber-400 p-4 rounded-xl mb-6 flex items-center gap-3">
              <AlertCircle className="w-5 h-5" />
              <div className="flex-1 text-sm">
                <p className="font-bold">Wallet Not Connected</p>
                <p>You must connect your MetaMask wallet to record certificates on the blockchain.</p>
              </div>
              <button 
                type="button"
                onClick={connectWallet}
                className="bg-amber-500 hover:bg-amber-400 text-slate-900 px-4 py-1.5 rounded-lg text-xs font-bold transition-colors"
              >
                Connect Now
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-300">Student Email Address</label>
              <input
                type="email"
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="student@example.com"
                value={formData.studentEmail}
                onChange={(e) => setFormData({ ...formData, studentEmail: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-300">Certificate Title</label>
              <input
                type="text"
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="B.Tech Computer Science"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-3 mb-4">
              <input
                type="checkbox"
                id="isExternal"
                className="w-5 h-5 rounded bg-slate-800 border-slate-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
                checked={formData.isExternal}
                onChange={(e) => setFormData({ ...formData, isExternal: e.target.checked })}
              />
              <label htmlFor="isExternal" className="text-sm font-medium text-slate-300 select-none cursor-pointer">
                External Credential (e.g. Salesforce, Coursera)
              </label>
            </div>

            {!formData.isExternal ? (
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-300">Certificate File (PDF/Image)</label>
                <div className="relative group">
                  <input
                    type="file"
                    className="hidden"
                    id="cert-file"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                  <label 
                    htmlFor="cert-file"
                    className="w-full flex flex-col items-center justify-center gap-3 py-10 border-2 border-dashed border-slate-700 rounded-2xl group-hover:border-blue-500 transition-all cursor-pointer bg-slate-800/50"
                  >
                    <FileUp className="w-8 h-8 text-slate-500 group-hover:text-blue-500" />
                    <span className="text-slate-400 font-medium">
                      {file ? file.name : "Click to upload certificate file"}
                    </span>
                  </label>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-300">Verification URL</label>
                  <input
                    type="url"
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="https://verify.salesforce.com/..."
                    value={formData.externalUrl}
                    onChange={(e) => setFormData({ ...formData, externalUrl: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-300">Certificate ID</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="CERT-123-ABC"
                    value={formData.externalId}
                    onChange={(e) => setFormData({ ...formData, externalId: e.target.value })}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Issue & Verify Certificate</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
