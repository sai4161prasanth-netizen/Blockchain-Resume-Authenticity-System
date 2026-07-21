"use client";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { 
  ShieldCheck, 
  FileText, 
  CheckCircle2, 
  UserCircle,
  Building2,
  Calendar,
  Share2,
  Download,
  Mail,
  Copy
} from "lucide-react";
import axios from "axios";
import { QRCodeSVG } from "qrcode.react";

export default function ResumePage() {
  const { id } = useParams();
  const [certs, setCerts] = useState([]);
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  useEffect(() => {
    fetchResume();
  }, [id]);

  const fetchResume = async () => {
    try {
      const { data } = await axios.get(`http://localhost:5000/api/certs/public/student/${id}`);
      setCerts(data.certificates);
      setStudent(data.student);
    } catch (error) {
      console.error("Failed to fetch resume", error);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleDownload = (fileUrl: string, title: string) => {
    if (!fileUrl) return;
    
    // Construct the full URL if it's a relative path
    const fullUrl = fileUrl.startsWith('http') 
      ? fileUrl 
      : `http://localhost:5000${fileUrl}`;

    // Create a temporary anchor element
    const link = document.createElement('a');
    link.href = fullUrl;
    link.setAttribute('download', `${title.replace(/\s+/g, '_')}_Certificate`);
    link.setAttribute('target', '_blank'); // Open in new tab if download attribute is ignored
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 flex justify-center">
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Info & QR */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 flex flex-col items-center text-center shadow-xl">
            <div className="w-24 h-24 bg-blue-600/20 rounded-full flex items-center justify-center mb-6">
              <UserCircle className="w-16 h-16 text-blue-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2">{student?.name || "Verified Student"}</h1>
            <p className="text-slate-400 mb-6 flex items-center gap-2"><Mail className="w-4 h-4" /> {student?.email || "student@example.com"}</p>
            
            <div className="w-full pt-6 border-t border-slate-800">
              <div className="bg-white p-4 rounded-2xl inline-block mb-4">
                <QRCodeSVG value={typeof window !== 'undefined' ? window.location.href : ''} size={150} />
              </div>
              <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-4">Scan to Verify Resume</p>
              
              <div className="flex gap-2 w-full">
                <button 
                  onClick={copyLink}
                  className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 py-2 rounded-xl text-sm transition-all"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                </button>
                <button className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all">
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-6 shadow-lg shadow-emerald-500/5">
            <div className="flex items-center gap-3 text-emerald-400 font-bold mb-2">
              <ShieldCheck className="w-5 h-5" />
              <span>Trust Badge</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              All credentials on this profile are verified on the Ethereum blockchain. 
              The authenticity of these records is cryptographically guaranteed.
            </p>
          </div>
        </div>

        {/* Right Column: Verified Credentials */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-blue-400" />
                <h2 className="text-2xl font-bold">Verified Credentials</h2>
              </div>
              <span className="bg-blue-600/20 text-blue-400 text-xs font-bold px-3 py-1 rounded-full border border-blue-600/30">
                {certs.length} CREDENTIALS
              </span>
            </div>

            <div className="space-y-6">
              {certs.length > 0 ? certs.map((cert: any) => (
                <div key={cert._id} className="group p-6 rounded-2xl bg-slate-800/30 border border-slate-800 hover:border-blue-500/50 transition-all relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 opacity-50 group-hover:opacity-100 transition-opacity" />
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-bold mb-1 group-hover:text-blue-400 transition-colors">{cert.title}</h3>
                      <div className="flex flex-wrap gap-4 text-sm text-slate-400 font-medium">
                        <span className="flex items-center gap-1.5"><Building2 className="w-4 h-4" /> {cert.institution}</span>
                        <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {new Date(cert.issueDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-800/50">
                      <div className="flex flex-col flex-1 mr-4">
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Blockchain Verification Hash</span>
                        <div className="flex items-center gap-2 group/hash">
                          <span className="text-xs font-mono text-slate-400 break-all">
                            {cert.certHash.slice(0, 32)}...
                          </span>
                          <button 
                            onClick={() => copyHash(cert.certHash)}
                            className="p-1.5 rounded-md hover:bg-slate-700 text-slate-500 hover:text-blue-400 transition-all flex items-center gap-1"
                            title="Copy Full Hash"
                          >
                            {copiedHash === cert.certHash ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                            {copiedHash === cert.certHash && <span className="text-[10px] font-bold">Copied!</span>}
                          </button>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDownload(cert.fileUrl, cert.title)}
                        className="p-2 text-slate-500 hover:text-blue-400 transition-all"
                        title="Download Certificate"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-20 bg-slate-800/20 rounded-3xl border border-dashed border-slate-800">
                  <FileText className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium">No verified credentials found on this profile.</p>
                </div>
              )}
            </div>
          </div>
          
          <footer className="text-center text-slate-600 text-sm py-4">
            <p>© 2026 Blockchain Resume Authenticity System. All rights reserved.</p>
            <p className="mt-1">Powered by Ethereum & IPFS</p>
          </footer>
        </div>
      </div>
    </div>
  );
}
