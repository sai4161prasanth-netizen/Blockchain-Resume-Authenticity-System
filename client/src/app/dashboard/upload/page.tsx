"use client";
import type React from "react";
import { useRef, useState } from "react";
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
import type { AiScreening, CertificateRecord } from "@/types/certificate";
import { getErrorMessage } from "@/lib/errors";

type UploadResponse = CertificateRecord;
type ScreeningResponse = { assessment: AiScreening };

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function UploadPage() {
  const { user } = useAuth();
  const { account, connectWallet, issueCertificateOnChain } = useBlockchain();
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
  const [aiConsent, setAiConsent] = useState(false);
  const [aiScreening, setAiScreening] = useState<AiScreening | null>(null);
  const [stagedCertificate, setStagedCertificate] = useState<CertificateRecord | null>(null);
  const [pendingTxHash, setPendingTxHash] = useState<string | null>(null);
  const pendingTxHashRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  const recordIssuedCertificate = async (cert: CertificateRecord, txHash: string, reviewAcknowledged = false) => {
    await axios.put(`${API_URL}/api/certs/${cert._id}/blockchain`, {
      txHash,
      reviewAcknowledged
    }, {
      headers: { Authorization: `Bearer ${user?.token}` }
    });
    pendingTxHashRef.current = null;
    setPendingTxHash(null);
    setStagedCertificate(null);
    setStatus({ type: "success", message: "Institution issuance recorded and transaction verified on-chain." });
    setTimeout(() => router.push("/dashboard"), 3000);
  };

  const issueOnChain = async (cert: CertificateRecord, reviewAcknowledged = false) => {
    setStatus({ type: "info", message: "Recording certificate hash on blockchain... Please confirm in MetaMask." });
    const txHash = await issueCertificateOnChain("Credential holder", cert.certHash, formData.institution);
    pendingTxHashRef.current = txHash;
    setPendingTxHash(txHash);
    setStatus({ type: "info", message: "Blockchain transaction confirmed. Saving the verified issuance record..." });
    await recordIssuedCertificate(cert, txHash, reviewAcknowledged);
  };

  const getIssuanceErrorMessage = (error: unknown) => {
    const message = getErrorMessage(error, "Could not issue certificate");
    const confirmedTxHash = pendingTxHashRef.current;
    return confirmedTxHash
      ? `Transaction ${confirmedTxHash} is confirmed on-chain, but the app could not finish saving it. Retry saving this transaction. ${message}`
      : message;
  };

  const continueAfterReview = async () => {
    if (!stagedCertificate) return;
    setLoading(true);
    try {
      const reviewAcknowledged = aiScreening?.status === "review_required" || aiScreening?.status === "unavailable";
      if (pendingTxHashRef.current) {
        await recordIssuedCertificate(stagedCertificate, pendingTxHashRef.current, reviewAcknowledged);
      } else {
        await issueOnChain(stagedCertificate, reviewAcknowledged);
      }
    } catch (error: unknown) {
      setStatus({ type: "error", message: getIssuanceErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pendingTxHashRef.current) {
      setStatus({ type: "error", message: "A confirmed transaction still needs to be saved. Use the retry button above before starting another issuance." });
      return;
    }
    if (!account) {
      setStatus({ type: "error", message: "Connect your institution wallet before uploading a certificate." });
      return;
    }
    if (user?.walletAddress && account.toLowerCase() !== user.walletAddress.toLowerCase()) {
      setStatus({ type: "error", message: "The connected wallet does not match the institution's approved issuing wallet." });
      return;
    }
    setLoading(true);
    setStatus({ type: "", message: "" });
    setAiScreening(null);
    setStagedCertificate(null);
    let uploadedCertificate: CertificateRecord | null = null;

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
      const response = await axios.post<UploadResponse>(`${API_URL}/api/certs/upload`, data, {
        headers: {
          Authorization: `Bearer ${user?.token}`,
          "Content-Type": "multipart/form-data"
        }
      });

      const cert = response.data;
      uploadedCertificate = cert;
      setStagedCertificate(cert);
      setStatus({ type: "success", message: "Certificate data saved to database." });

      if (aiConsent && file && !formData.isExternal) {
        try {
          setStatus({ type: "info", message: "Sending the document for preliminary AI screening..." });
          const { data: screenData } = await axios.post<ScreeningResponse>(`${API_URL}/api/ai/screen/${cert._id}`, { consent: true }, {
            headers: { Authorization: `Bearer ${user?.token}` }
          });
          setAiScreening(screenData.assessment);
          if (screenData.assessment.status === "review_required") {
            setStagedCertificate(cert);
            setStatus({ type: "warning", message: "AI screening flagged items for human review. Read the findings below before choosing whether to issue." });
            return;
          }
        } catch (screenError: unknown) {
          setAiScreening({
            status: "unavailable",
            summary: "Automated screening did not complete. Review the document manually.",
            observations: [],
            findings: [],
            limitations: [getErrorMessage(screenError, "No AI screening result is available.")]
          });
          setStagedCertificate(cert);
          setStatus({ type: "warning", message: "AI screening is unavailable. Review the document manually before choosing whether to issue." });
          return;
        }
      }

      await issueOnChain(cert);
    } catch (error: unknown) {
      console.error(error);
      if (uploadedCertificate) setStagedCertificate(uploadedCertificate);
      setStatus({ type: "error", message: getIssuanceErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-2xl mx-auto">
        <button type="button"
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
              status.type === 'warning' ? 'bg-amber-500/10 border-amber-500 text-amber-300' :
              'bg-blue-500/10 border-blue-500 text-blue-400'
            }`}>
              {status.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> :
               status.type === 'info' ? <Loader2 className="w-5 h-5 animate-spin" /> :
               <AlertCircle className="w-5 h-5" />}
              <span>{status.message}</span>
            </div>
          )}

          {aiScreening && (
            <section className={`mb-8 p-5 rounded-2xl border ${aiScreening.status === "review_required" || aiScreening.status === "unavailable" ? "border-amber-500/40 bg-amber-500/5" : "border-blue-500/30 bg-blue-500/5"}`}>
              <h2 className="font-bold mb-2">Preliminary AI document review</h2>
              <p className="text-sm text-slate-300 mb-3">{aiScreening.summary}</p>
              {aiScreening.findings?.length ? (
                <ul className="space-y-3 text-sm text-slate-300 mb-3">
                  {aiScreening.findings.map((finding) => (
                    <li key={`${finding.location}-${finding.observation}-${finding.evidence}`} className="rounded-lg border border-slate-700 p-3">
                      <p>{finding.observation}</p>
                      <p className="mt-2 text-slate-400"><span className="font-semibold">Document evidence:</span> {finding.evidence}</p>
                      <p className="mt-1 text-xs text-slate-500">Location: {finding.location} · Compared with: {finding.comparedWith}</p>
                    </li>
                  ))}
                </ul>
              ) : aiScreening.observations?.length ? (
                <ul className="list-disc pl-5 space-y-1 text-sm text-slate-300 mb-3">{aiScreening.observations.map((item: string) => <li key={item}>{item}</li>)}</ul>
              ) : null}
              {aiScreening.limitations?.length > 0 && <p className="text-xs text-slate-400">Limits: {aiScreening.limitations.join(" ")}</p>}
              <p className="text-xs text-amber-300 mt-3">This is not proof of authenticity or fraud. Confirm with the issuing institution using a trusted channel.</p>
            </section>
          )}

          {stagedCertificate && <button type="button" onClick={continueAfterReview} disabled={loading} className="mb-8 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold px-4 py-2 rounded-xl">
            {loading ? "Issuing..." : pendingTxHash ? "Retry saving confirmed transaction" : aiScreening?.status === "review_required" || aiScreening?.status === "unavailable" ? "I reviewed this; record the institution’s issuance on-chain" : "Retry on-chain issuance"}
          </button>}

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
              <label htmlFor="student-email" className="text-sm font-medium text-slate-300">Student Email Address</label>
              <input
                type="email"
                id="student-email"
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="student@example.com"
                value={formData.studentEmail}
                onChange={(e) => setFormData({ ...formData, studentEmail: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="certificate-title" className="text-sm font-medium text-slate-300">Certificate Title</label>
              <input
                type="text"
                id="certificate-title"
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
              <>
                <div className="space-y-1">
                  <label htmlFor="cert-file" className="text-sm font-medium text-slate-300">Certificate File (PDF/Image)</label>
                  <div className="relative group">
                    <input
                      type="file"
                      className="hidden"
                      id="cert-file"
                      accept="application/pdf,image/png,image/jpeg"
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
                {file && <fieldset className="mt-4 rounded-xl border border-slate-700 p-4">
                  <legend className="px-2 text-sm font-semibold text-slate-200">Optional AI screening</legend>
                  <label htmlFor="ai-screening-consent" className="flex items-start gap-3 text-sm text-slate-300">
                    <input id="ai-screening-consent" type="checkbox" checked={aiConsent} onChange={(event) => setAiConsent(event.target.checked)} className="mt-1" />
                    <span>I confirm I have permission to send this document, which may contain personal information, to OpenAI for preliminary screening. The app saves the assessment summary with this credential. AI can flag possible inconsistencies but cannot prove authenticity or fraud.</span>
                  </label>
                </fieldset>}
              </>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="external-verification-url" className="text-sm font-medium text-slate-300">Verification URL</label>
                  <input
                    type="url"
                    id="external-verification-url"
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="https://verify.salesforce.com/..."
                    value={formData.externalUrl}
                    onChange={(e) => setFormData({ ...formData, externalUrl: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="external-certificate-id" className="text-sm font-medium text-slate-300">Certificate ID</label>
                  <input
                    type="text"
                    id="external-certificate-id"
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
