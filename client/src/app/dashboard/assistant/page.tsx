"use client";

import { type FormEvent, useEffect, useState } from "react";
import axios from "axios";
import { ArrowLeft, Loader2, Send, Sparkles, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getErrorMessage } from "@/lib/errors";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type Source = {
  id: number;
  title: string;
  institution: string;
  issueDate: string;
  certHash: string;
  blockchainTx: string;
};

type AskResponse = { answer: string; sources: Source[] };

export default function CredentialAssistantPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!authLoading && user?.role !== "student") router.replace("/dashboard");
  }, [authLoading, user, router]);

  const ask = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || !question.trim() || busy) return;
    setBusy(true);
    setError("");
    setAnswer("");
    setSources([]);
    try {
      const { data } = await axios.post<AskResponse>(`${API_URL}/api/ai/ask`, { question }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setAnswer(data.answer);
      setSources(data.sources || []);
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError, "The assistant could not answer right now."));
    } finally {
      setBusy(false);
    }
  };

  if (authLoading || !user || user.role !== "student") {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading...</div>;
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-3xl mx-auto">
        <button type="button" onClick={() => router.push("/dashboard")} className="flex items-center gap-2 text-slate-400 hover:text-white mb-10">
          <ArrowLeft className="w-5 h-5" /> Back to dashboard
        </button>
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/20 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Credential Assistant</h1>
            <p className="text-slate-400">Ask questions about your verified credentials.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 text-sm text-slate-300 mb-6">
          Answers use your verified credential records and cite them as [1], [2]. The assistant does not verify credentials or make hiring decisions.
        </div>

        <form onSubmit={ask} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <label htmlFor="question" className="block text-sm text-slate-300 mb-2">Your question</label>
          <textarea
            id="question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            maxLength={1000}
            rows={4}
            placeholder="For example: Summarize the subjects covered by my credentials."
            className="w-full resize-y bg-slate-800 border border-slate-700 rounded-xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex justify-between items-center mt-3">
            <span className="text-xs text-slate-500">Only credential title, institution, date, and verification hashes are sent for this answer.</span>
            <button type="submit" disabled={busy || !question.trim()} className="flex items-center gap-2 bg-blue-600 disabled:opacity-50 hover:bg-blue-500 px-4 py-2 rounded-xl font-semibold">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Ask
            </button>
          </div>
        </form>

        {error && <div className="mt-6 flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-300"><AlertCircle className="w-5 h-5 shrink-0" />{error}</div>}
        {answer && (
          <section className="mt-6 bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="font-bold text-lg mb-3">Answer</h2>
            <p className="whitespace-pre-wrap leading-relaxed text-slate-200">{answer}</p>
            {sources.length > 0 && <div className="mt-6 pt-5 border-t border-slate-800">
              <h3 className="text-sm font-semibold text-slate-400 mb-3">Retrieved records</h3>
              <ul className="space-y-2">
                {sources.map((source) => <li key={source.id} className="text-sm text-slate-300"><span className="text-blue-400">[{source.id}]</span> {source.title} — {source.institution} ({new Date(source.issueDate).toLocaleDateString()})</li>)}
              </ul>
            </div>}
          </section>
        )}
      </div>
    </main>
  );
}
