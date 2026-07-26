/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from "react";
import { Settings, Play, Mail, CreditCard, FileText, CheckCircle, XCircle, Search, Send, ArrowRight, Eye } from "lucide-react";
import Markdown from "react-markdown";

type Config = {
  hasGoogleMaps: boolean;
  hasGemini: boolean;
  hasStripe: boolean;
  hasEmail: boolean;
};

type Prospect = {
  id: string;
  name: string;
  address: string;
  rating: number;
  user_ratings_total: number;
  website: string | null;
  gap_score: number;
  audit_draft: string;
  audit_report?: string;
  email_draft: string;
  status: string;
};

export default function App() {
  const [config, setConfig] = useState<Config | null>(null);
  const [niche, setNiche] = useState("Roofers");
  const [city, setCity] = useState("Austin, TX");
  const [isDryRun, setIsDryRun] = useState(true);
  const [prospecting, setProspecting] = useState(false);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [showProspects, setShowProspects] = useState(false);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [viewingReportId, setViewingReportId] = useState<string | null>(null);
  const [selectedProspects, setSelectedProspects] = useState<Set<string>>(new Set());
  const [isSendingBulk, setIsSendingBulk] = useState(false);

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(setConfig)
      .catch(console.error);
    
    fetchProspects();
  }, []);

  const fetchProspects = async () => {
    try {
      const res = await fetch('/api/prospects');
      const data = await res.json();
      setProspects(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRunProspecting = async () => {
    if (!niche || !city) return alert("Enter niche and city");
    setProspecting(true);
    try {
      const res = await fetch('/api/prospects/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche, city, isDryRun })
      });
      if (res.ok) {
        await fetchProspects();
        alert("Prospecting completed!");
        setShowProspects(true);
      } else {
        const err = await res.json();
        alert("Error: " + err.error);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to run prospecting.");
    }
    setProspecting(false);
  };

  const handleSendEmail = async (prospect: Prospect) => {
    const toEmail = prompt(`Enter recipient email for ${prospect.name}:`);
    if (!toEmail) return;
    
    setSendingEmailId(prospect.id);
    try {
      const res = await fetch(`/api/prospects/${prospect.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toEmail })
      });
      if (res.ok) {
        alert("Email sent successfully!");
        fetchProspects();
      } else {
        const err = await res.json();
        alert("Error: " + err.error);
      }
    } catch (e) {
      console.error(e);
    }
    setSendingEmailId(null);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProspects(new Set(prospects.map(p => p.id)));
    } else {
      setSelectedProspects(new Set());
    }
  };

  const handleSelectProspect = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedProspects);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedProspects(newSelected);
  };

  const handleSendBulkEmails = async () => {
    if (selectedProspects.size === 0) return;
    const toEmail = prompt(`Enter recipient email for ALL ${selectedProspects.size} selected prospects:`);
    if (!toEmail) return;

    setIsSendingBulk(true);
    let successCount = 0;
    
    for (const id of selectedProspects) {
      try {
        const res = await fetch(`/api/prospects/${id}/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ toEmail })
        });
        if (res.ok) {
          successCount++;
        }
      } catch (e) {
        console.error(`Failed to send to ${id}`, e);
      }
    }
    
    alert(`Successfully sent ${successCount} out of ${selectedProspects.size} emails.`);
    setIsSendingBulk(false);
    setSelectedProspects(new Set());
    fetchProspects();
  };

  const handleCheckout = async (placeId: string) => {
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId })
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Error: " + (data.error || "Unknown error"));
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="border-b border-stone-200 pb-6 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-stone-900">Storefront Presence AI</h1>
            <p className="text-stone-500 mt-2 text-lg">AI-native local business growth agency pipeline.</p>
          </div>
          <button 
            onClick={() => setShowProspects(!showProspects)}
            className="text-stone-500 hover:text-stone-900 transition"
          >
            {showProspects ? "View Pipeline" : "View Prospects"}
          </button>
        </header>

        {!showProspects ? (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Phase 1: Setup & Pipeline */}
            <section className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Settings className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-semibold">Phase 1: Pipeline & Setup</h2>
              </div>
              <div className="space-y-4">
                <div className="bg-stone-50 p-4 rounded-lg border border-stone-100">
                  <h3 className="font-medium mb-2 text-sm text-stone-500 uppercase tracking-wider">Environment Status</h3>
                  <ul className="space-y-2 text-sm">
                    <StatusItem label="GEMINI_API_KEY" active={config?.hasGemini} />
                    <StatusItem label="GOOGLE_MAPS_API_KEY" active={config?.hasGoogleMaps} />
                    <StatusItem label="SENDER_EMAIL / PASSWORD" active={config?.hasEmail} />
                    <StatusItem label="STRIPE_SECRET_KEY" active={config?.hasStripe} />
                  </ul>
                </div>
                
                <div className="space-y-3 pt-2">
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={niche} 
                      onChange={e => setNiche(e.target.value)}
                      placeholder="Niche (e.g., Roofers)" 
                      className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
                    />
                    <input 
                      type="text" 
                      value={city} 
                      onChange={e => setCity(e.target.value)}
                      placeholder="City (e.g., Austin, TX)" 
                      className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
                    />
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <input 
                      type="checkbox" 
                      id="dryRun" 
                      checked={isDryRun} 
                      onChange={e => setIsDryRun(e.target.checked)} 
                      className="rounded border-stone-300"
                    />
                    <label htmlFor="dryRun" className="text-sm text-stone-600 cursor-pointer">Dry Run Mode (No real API calls)</label>
                  </div>
                  <button 
                    onClick={handleRunProspecting}
                    disabled={prospecting}
                    className="w-full bg-stone-900 text-white py-2.5 rounded-lg font-medium hover:bg-stone-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Search className="w-4 h-4" />
                    {prospecting ? "Searching & Analyzing..." : "Run Prospecting"}
                  </button>
                </div>
              </div>
            </section>

            {/* Other phases left simple for pipeline view */}
            <section className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                  <Mail className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-semibold">Phase 2: Outreach</h2>
              </div>
              <p className="text-stone-600 mb-4 text-sm">Review drafted emails before sending to businesses.</p>
              <button 
                onClick={() => setShowProspects(true)}
                className="w-full bg-white border border-stone-200 text-stone-700 py-2.5 rounded-lg font-medium hover:bg-stone-50 transition-colors"
              >
                Review {prospects.length} Drafts
              </button>
            </section>

            <section className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                  <CreditCard className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-semibold">Phase 3: Onboarding</h2>
              </div>
              <p className="text-stone-600 mb-4 text-sm">Manage local conversions and Stripe payments.</p>
              <button 
                onClick={() => setShowProspects(true)}
                className="w-full bg-white border border-stone-200 text-stone-700 py-2.5 rounded-lg font-medium hover:bg-stone-50 transition-colors"
              >
                View Prospects
              </button>
            </section>

            <section className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                  <FileText className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-semibold">Phase 4: Evidence</h2>
              </div>
              <p className="text-stone-600 mb-4 text-sm">Export P&L and execution logs for hackathon compliance.</p>
              <a href="/api/events" target="_blank" className="block text-center w-full bg-white border border-stone-200 text-stone-700 py-2.5 rounded-lg font-medium hover:bg-stone-50 transition-colors">
                View Logs (JSON)
              </a>
            </section>
          </div>
        ) : (
          <div className="space-y-6">
            {prospects.length === 0 ? (
              <div className="text-center py-12 text-stone-500 bg-white rounded-xl shadow-sm border border-stone-200">
                No prospects found yet. Run the pipeline first.
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-stone-200">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="selectAll"
                      checked={selectedProspects.size === prospects.length && prospects.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-stone-300 w-4 h-4 text-stone-900 focus:ring-stone-900"
                    />
                    <label htmlFor="selectAll" className="text-sm font-medium text-stone-700 cursor-pointer">
                      Select All
                    </label>
                  </div>
                  {selectedProspects.size > 0 && (
                    <button 
                      onClick={handleSendBulkEmails}
                      disabled={isSendingBulk}
                      className="px-4 py-2 bg-stone-900 text-white rounded-lg font-medium hover:bg-stone-800 transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      {isSendingBulk ? "Sending..." : `Send ${selectedProspects.size} Selected Emails`}
                    </button>
                  )}
                </div>
                {prospects.map(prospect => (
                  <div key={prospect.id} className="bg-white p-6 rounded-xl shadow-sm border border-stone-200 transition-all duration-300 hover:shadow-md hover:-translate-y-1">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="mt-1">
                        <input 
                          type="checkbox" 
                          checked={selectedProspects.has(prospect.id)}
                          onChange={(e) => handleSelectProspect(prospect.id, e.target.checked)}
                          className="rounded border-stone-300 w-4 h-4 text-stone-900 focus:ring-stone-900"
                        />
                      </div>
                      <div className="flex-1 flex justify-between items-start">
                        <div>
                          <h3 className="text-xl font-bold">{prospect.name}</h3>
                          <p className="text-stone-500 text-sm">{prospect.address}</p>
                        </div>
                        <div className="bg-red-50 text-red-700 px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1 border border-red-100">
                          Gap Score: {prospect.gap_score}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div className="space-y-2 text-sm">
                      <p><strong>Rating:</strong> {prospect.rating} ({prospect.user_ratings_total} reviews)</p>
                      <p><strong>Website:</strong> {prospect.website || 'None'}</p>
                      <div className="bg-stone-50 p-3 rounded text-stone-700 border border-stone-100 mt-2">
                        <strong className="block mb-1 text-stone-900">Audit Summary:</strong>
                        {prospect.audit_draft}
                      </div>
                    </div>
                    <div>
                      <strong className="block mb-2 text-sm">Draft Email:</strong>
                      <textarea 
                        className="w-full h-32 p-3 text-sm border border-stone-200 rounded-lg bg-stone-50"
                        defaultValue={prospect.email_draft}
                        readOnly
                      />
                    </div>
                  </div>
                  
                  {viewingReportId === prospect.id && prospect.audit_report && (
                    <div className="mb-6 p-6 bg-white border border-stone-200 rounded-xl shadow-inner max-h-96 overflow-y-auto">
                      <div className="prose prose-sm prose-stone max-w-none">
                        <Markdown>{prospect.audit_report}</Markdown>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 border-t border-stone-100 pt-4">
                    <span className="flex items-center px-3 py-1 text-sm bg-stone-100 text-stone-600 rounded-full mr-auto">
                      Status: {prospect.status}
                    </span>
                    {prospect.audit_report && (
                      <button 
                        onClick={() => setViewingReportId(viewingReportId === prospect.id ? null : prospect.id)}
                        className="px-4 py-2 bg-white border border-stone-200 text-stone-700 rounded-lg font-medium hover:bg-stone-50 transition-colors flex items-center gap-2 text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        {viewingReportId === prospect.id ? "Hide Report" : "View Audit Report"}
                      </button>
                    )}
                    <button 
                      onClick={() => handleSendEmail(prospect)}
                      disabled={sendingEmailId === prospect.id}
                      className="px-4 py-2 bg-stone-100 text-stone-700 rounded-lg font-medium hover:bg-stone-200 transition-colors flex items-center gap-2 text-sm"
                    >
                      <Send className="w-4 h-4" />
                      {sendingEmailId === prospect.id ? "Sending..." : "Send Email"}
                    </button>
                    <button 
                      onClick={() => handleCheckout(prospect.id)}
                      className="px-4 py-2 bg-stone-900 text-white rounded-lg font-medium hover:bg-stone-800 transition-colors flex items-center gap-2 text-sm"
                    >
                      <ArrowRight className="w-4 h-4" />
                      Onboard (Stripe)
                    </button>
                  </div>
                </div>
              ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusItem({ label, active }: { label: string; active?: boolean }) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-stone-600">{label}</span>
      {active ? (
        <CheckCircle className="w-4 h-4 text-emerald-500" />
      ) : (
        <XCircle className="w-4 h-4 text-red-400" />
      )}
    </li>
  );
}
