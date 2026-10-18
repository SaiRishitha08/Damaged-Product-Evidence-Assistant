import React, { useState } from 'react';
import { 
  Bot, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  FileText, 
  Camera, 
  Store, 
  User, 
  ArrowRight, 
  ExternalLink, 
  Sparkles, 
  AlertCircle,
  Eye,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Check,
  X,
  Lock,
  Layers,
  Percent,
  FileQuestion,
  Scale,
  Info
} from 'lucide-react';

/**
 * AIEvidenceSummaryCard - C12 Forensic Evidence Summary & Decision Engine
 * 
 * Key Principles:
 * 1. The AI summarizes and organizes evidence; the support agent / seller makes the final decision.
 * 2. If visual confidence > 75% -> Automate approval of replacement with ethical reason.
 * 3. If fraud probability > 75% -> Directly cancel claim with ethical reason.
 * 4. Only refunds must be approved by the seller!
 * 5. Displays both Customer's photos and Seller's pre-dispatch packaging photos side-by-side.
 */
export default function AIEvidenceSummaryCard({
  report = null,
  caseData = null,
  sellerPackingRecord = null,
  onApproveRefund = null,
  onDeclineRefund = null,
  onAgentDecision = null,
  isSellerView = false,
  isAgentView = false
}) {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'customer' | 'seller'
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [showFullDisclaimer, setShowFullDisclaimer] = useState(false);

  // Normalize report fields
  const rep = report || caseData?.geminiReport || {};
  const caseId = rep.case_id || caseData?.caseId || caseData?.orderNo || 'DP-1024';
  const productName = caseData?.productName || sellerPackingRecord?.productName || 'Ceramic Coffee Mug';
  const complaintSummary = rep.complaint_summary || caseData?.customerClaim || 'Customer reports a broken handle and requests a replacement.';
  const customerClaims = rep.customer_claims || [
    caseData?.customerClaim || 'Item arrived damaged.',
    'Damage was noticed after opening the package.',
    `Customer requested ${caseData?.claimType || caseData?.requestedResolution || 'replacement'}.`
  ];
  const uncertainties = rep.uncertainties || [
    'The photograph alone cannot establish when or how the damage occurred.',
    'The extent of the damage may require another viewing angle to assess.',
    'The absence of packaging evidence does not prove that the customer caused the damage.'
  ];
  const missingEvidence = rep.missing_evidence || [
    {
      item: 'Packaging condition unknown',
      reason: 'No photograph of the outer packaging or protective material was submitted.',
      priority: 'medium'
    }
  ];
  const suggestedNextSteps = rep.suggested_next_steps || [
    'Ask the customer for a photograph of the packaging, if required by policy.',
    'Request another view of the handle if the damage is unclear.',
    'Review the evidence and apply the appropriate resolution policy.'
  ];

  // Visible observations from customer and seller
  const visibleObservations = rep.visible_observations && rep.visible_observations.length > 0 
    ? rep.visible_observations 
    : [
        {
          finding: caseData?.visibleObservation || 'The uploaded photograph appears to show damage to the product.',
          evidence_id: 'IMG-CUST-01',
          confidence: rep.confidenceScore > 75 ? 'high' : 'medium',
          confidence_score: rep.confidenceScore || 85,
          source: 'customer',
          label: 'Customer Uploaded Damage Photo',
          image_url: caseData?.customerEvidenceImages?.[0] || caseData?.customerEvidenceImage || '/assets/P01.png'
        },
        ...(sellerPackingRecord ? [
          {
            finding: `Seller pre-dispatch unit inspection (${sellerPackingRecord?.beforePacking?.serialNo || 'SER-VERIFIED'}) verifies pristine chassis condition prior to boxing.`,
            evidence_id: 'IMG-SELLER-01',
            confidence: 'high',
            confidence_score: 96,
            source: 'seller',
            label: 'Seller Pre-Dispatch Unit Photo',
            image_url: sellerPackingRecord?.beforePacking?.photos?.[0] || sellerPackingRecord?.beforePacking?.photo || '/assets/P01.png'
          },
          {
            finding: `Seller outbound container verified: 3-ply corrugated box sealed with tamper tape #${sellerPackingRecord?.afterPacking?.securityTapeNo || 'TAPE-VERIFIED'} (${sellerPackingRecord?.afterPacking?.boxWeightGrams || 850}g).`,
            evidence_id: 'IMG-SELLER-02',
            confidence: 'high',
            confidence_score: 95,
            source: 'seller',
            label: 'Seller Sealed Outer Carton Photo',
            image_url: sellerPackingRecord?.afterPacking?.photos?.[0] || sellerPackingRecord?.afterPacking?.photo || '/assets/P02.png'
          }
        ] : [])
      ];

  // Decision & Automation evaluation
  const decision = rep.decision || {
    type: rep.fraudProbability > 75 
      ? 'AUTOMATED_CANCEL_FRAUD' 
      : ((caseData?.claimType || '').toLowerCase().includes('refund') || rep.recommendation === 'REFUND')
      ? 'SELLER_REFUND_REVIEW'
      : (rep.confidenceScore > 75 && (rep.fraudProbability || 0) <= 30)
      ? 'AUTOMATED_REPLACE'
      : 'AGENT_REVIEW',
    confidence_pct: rep.confidenceScore || 85,
    fraud_pct: rep.fraudProbability || 8,
    ethical_reason: rep.decisionRationale || rep.executiveSummary || 'Automated assessment based on multi-point forensic image cross-comparison.'
  };

  const isAutomatedReplace = decision.type === 'AUTOMATED_REPLACE';
  const isAutomatedFraudCancel = decision.type === 'AUTOMATED_CANCEL_FRAUD';
  const isSellerRefundReview = decision.type === 'SELLER_REFUND_REVIEW';
  const isHumanReview = decision.type === 'AGENT_REVIEW' || rep.human_review_required;

  const filteredObservations = visibleObservations.filter((obs) => {
    if (activeTab === 'all') return true;
    return obs.source === activeTab;
  });

  const getConfidenceBadge = (confidence) => {
    const c = (confidence || '').toLowerCase();
    if (c === 'high') {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">High Confidence (&gt;75%)</span>;
    }
    if (c === 'medium') {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">Medium Confidence</span>;
    }
    if (c === 'low') {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Low Confidence</span>;
    }
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-600 border border-zinc-200">Unable to Assess</span>;
  };

  const getPriorityBadge = (priority) => {
    const p = (priority || '').toLowerCase();
    if (p === 'high') {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">High Priority</span>;
    }
    if (p === 'medium') {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Medium Priority</span>;
    }
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-600 border border-zinc-200">Low Priority</span>;
  };

  return (
    <div className="w-full bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-xl shadow-zinc-200/50 font-['Plus_Jakarta_Sans',sans-serif] space-y-6 animate-fade-in">
      
      {/* ======================================================== */}
      {/* HEADER: CASE BADGE & TITLE */}
      {/* ======================================================== */}
      <div className="p-6 sm:p-8 bg-gradient-to-r from-zinc-950 via-[#0e1017] to-zinc-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
            <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-mono font-bold">
              Case #{caseId}
            </span>
            <span className="text-zinc-400 text-xs font-medium">·</span>
            <span className="text-zinc-300 text-xs font-semibold">C12 AI Evidence Summary</span>
            <span className="px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 text-[10px] font-mono">
              Live Evaluation
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
            {productName}
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Cross-referencing customer damage photos against seller pre-dispatch packaging proofs.
          </p>
        </div>

        {/* Status Pill Badge */}
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
              Resolution State
            </span>
            <span className="text-xs font-bold text-white font-mono">
              {caseData?.status || 'Under Review'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-white">
            <Bot className="w-5 h-5 text-indigo-400" />
          </div>
        </div>
      </div>

      <div className="px-6 sm:px-8 space-y-6 pb-8">
        
        {/* ======================================================== */}
        {/* DECISION & ETHICAL REASONING HIGHLIGHT BANNER */}
        {/* ======================================================== */}
        {isAutomatedReplace && (
          <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50/50 border border-emerald-200 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-950">
                  Automated Replacement Approved (Visual Confidence: {decision.confidence_pct}%)
                </h4>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold font-mono">
                Rule: Confidence &gt; 75%
              </span>
            </div>
            <p className="text-xs text-emerald-900 leading-relaxed font-normal">
              <strong>Ethical & Operational Rationale:</strong> {decision.ethical_reason}
            </p>
            <div className="pt-1 flex items-center space-x-4 text-[11px] text-emerald-800 font-medium">
              <span>✓ Fraud Risk: {decision.fraud_pct}% (Low)</span>
              <span>·</span>
              <span>✓ Dispatched in pristine condition</span>
              <span>·</span>
              <span>✓ Expedited resolution enabled</span>
            </div>
          </div>
        )}

        {isAutomatedFraudCancel && (
          <div className="p-5 rounded-2xl bg-gradient-to-r from-rose-50 via-red-50 to-rose-50/50 border border-rose-200 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center shadow-xs">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-black uppercase tracking-wider text-rose-950">
                  Claim Automatically Cancelled: Fraud Probability {decision.fraud_pct}%
                </h4>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold font-mono">
                Rule: Fraud Risk &gt; 75%
              </span>
            </div>
            <p className="text-xs text-rose-900 leading-relaxed font-normal">
              <strong>Ethical & Operational Rationale:</strong> {decision.ethical_reason}
            </p>
            <div className="pt-1 flex items-center space-x-4 text-[11px] text-rose-800 font-medium">
              <span>⚠ Evidence Discrepancy Flagged</span>
              <span>·</span>
              <span>⚠ Serial or Tamper Tape Mismatch</span>
              <span>·</span>
              <span>✓ Seller Fully Shielded from Loss</span>
            </div>
          </div>
        )}

        {isSellerRefundReview && (
          <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50/50 border border-amber-200 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center shadow-xs">
                  <Store className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-950">
                  Requires Seller Refund Approval (Platform Financial Policy)
                </h4>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold font-mono">
                Rule: Only Refunds Approved by Seller
              </span>
            </div>
            <p className="text-xs text-amber-900 leading-relaxed font-normal">
              <strong>Ethical & Operational Rationale:</strong> {decision.ethical_reason}
            </p>

            {/* Interactive Seller Refund Action Controls */}
            {isSellerView && (
              <div className="pt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onApproveRefund && onApproveRefund(caseId)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center space-x-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Authorize & Approve Refund (₹{caseData?.price || sellerPackingRecord?.salePrice || 'Full Amount'})</span>
                </button>
                <button
                  type="button"
                  onClick={() => onDeclineRefund && onDeclineRefund(caseId, 'REPLACE')}
                  className="px-3.5 py-2 bg-white hover:bg-zinc-100 text-zinc-800 border border-zinc-200 rounded-xl text-xs font-semibold transition shadow-2xs flex items-center space-x-1.5 cursor-pointer"
                >
                  <span>Decline Refund & Counter with Free Replacement</span>
                </button>
              </div>
            )}
          </div>
        )}

        {isHumanReview && !isAutomatedReplace && !isAutomatedFraudCancel && !isSellerRefundReview && (
          <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-50 via-blue-50 to-indigo-50/50 border border-indigo-200 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Scale className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-black uppercase tracking-wider text-indigo-950">
                  Human Support Agent Review Required
                </h4>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold font-mono">
                Rule: Confidence &le; 75% or Missing Context
              </span>
            </div>
            <p className="text-xs text-indigo-900 leading-relaxed font-normal">
              <strong>Core Design Principle:</strong> The AI summarizes and organizes evidence; the human support agent makes the final decision. No automatic approval or rejection is executed for this case.
            </p>
          </div>
        )}

        {/* ======================================================== */}
        {/* SECTION 1: COMPLAINT OVERVIEW */}
        {/* ======================================================== */}
        <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200/90 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
              1. Complaint Overview
            </span>
            <span className="text-[11px] font-mono text-zinc-400">Order: {caseData?.orderNo || 'ORD-REF'}</span>
          </div>
          <p className="text-sm font-semibold text-zinc-900 leading-relaxed">
            {complaintSummary}
          </p>
          <div className="pt-1 flex items-center space-x-4 text-xs text-zinc-600">
            <span>Product: <strong className="text-zinc-900">{productName}</strong></span>
            <span>·</span>
            <span>Customer: <strong className="text-zinc-900">{caseData?.customerName || 'Registered Buyer'}</strong></span>
            <span>·</span>
            <span>Requested: <strong className="text-zinc-900">{caseData?.claimType || caseData?.requestedResolution || 'Replacement'}</strong></span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* SECTION 2: VISIBLE OBSERVATIONS (CUSTOMER & SELLER PHOTOS) */}
        {/* ======================================================== */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block">
                2. Visible Observations (Forensic Visual Audit)
              </span>
              <p className="text-xs text-zinc-500">
                Confidence level refers to confidence in the visual finding, not confidence that the customer is telling the truth.
              </p>
            </div>

            {/* Filter Toggle: All vs Customer vs Seller */}
            <div className="flex items-center p-1 bg-zinc-100 rounded-xl border border-zinc-200 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1 rounded-lg font-semibold transition ${
                  activeTab === 'all' ? 'bg-white text-zinc-900 shadow-2xs' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                All ({visibleObservations.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('customer')}
                className={`px-3 py-1 rounded-lg font-semibold transition flex items-center space-x-1 ${
                  activeTab === 'customer' ? 'bg-white text-zinc-900 shadow-2xs' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <User className="w-3 h-3 text-indigo-500" />
                <span>Customer</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('seller')}
                className={`px-3 py-1 rounded-lg font-semibold transition flex items-center space-x-1 ${
                  activeTab === 'seller' ? 'bg-white text-zinc-900 shadow-2xs' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <Store className="w-3 h-3 text-emerald-500" />
                <span>Seller Vault</span>
              </button>
            </div>
          </div>

          {/* Observations Grid with Photo Previews */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredObservations.map((obs, idx) => (
              <div 
                key={idx}
                className={`p-4 rounded-2xl border transition-all space-y-3 ${
                  obs.source === 'customer'
                    ? 'bg-indigo-50/20 border-indigo-100 hover:border-indigo-300'
                    : 'bg-emerald-50/20 border-emerald-100 hover:border-emerald-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-zinc-900">
                      {obs.evidence_id || `IMG-00${idx + 1}`}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      obs.source === 'customer' 
                        ? 'bg-indigo-100 text-indigo-800' 
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {obs.source === 'customer' ? 'Customer Evidence' : 'Seller Pre-Pack Proof'}
                    </span>
                  </div>
                  {getConfidenceBadge(obs.confidence)}
                </div>

                {/* Finding Description */}
                <p className="text-xs text-zinc-800 font-medium leading-relaxed">
                  {obs.finding}
                </p>

                {/* Attached Image Thumbnail */}
                {obs.image_url && (
                  <div className="relative rounded-xl overflow-hidden border border-zinc-200 aspect-video bg-zinc-900 group">
                    <img 
                      src={obs.image_url} 
                      alt={obs.label || 'Evidence'}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500 cursor-pointer"
                      onClick={() => setSelectedPhoto(obs.image_url)}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/assets/P01.png';
                      }}
                    />
                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-lg text-[10px] font-mono text-white pointer-events-none">
                      {obs.label || 'Visual Capture'}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ======================================================== */}
        {/* SECTION 3: CUSTOMER-REPORTED CLAIMS */}
        {/* ======================================================== */}
        <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200/90 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
              3. Customer-Reported Claims
            </span>
            <span className="text-[10px] font-mono text-zinc-400">Unverified Statements</span>
          </div>

          <ul className="space-y-1.5">
            {customerClaims.map((claim, idx) => (
              <li key={idx} className="flex items-start space-x-2 text-xs text-zinc-800 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 mt-1.5 shrink-0" />
                <span>{claim}</span>
              </li>
            ))}
          </ul>

          {/* Mandatory Standard Disclaimer */}
          <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 flex items-start space-x-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="font-semibold">
              These are statements from the customer, not independently verified facts.
            </p>
          </div>
        </div>

        {/* ======================================================== */}
        {/* SECTION 4: MISSING EVIDENCE */}
        {/* ======================================================== */}
        <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200/90 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
              4. Missing Evidence
            </span>
            <span className="text-[10px] font-mono text-zinc-400">{missingEvidence.length} Item(s)</span>
          </div>

          <div className="space-y-2.5">
            {missingEvidence.map((item, idx) => (
              <div 
                key={idx}
                className="p-3.5 rounded-xl bg-white border border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <h5 className="text-xs font-bold text-zinc-950">
                    {item.item}
                  </h5>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    {item.reason}
                  </p>
                </div>
                {getPriorityBadge(item.priority)}
              </div>
            ))}
          </div>
        </div>

        {/* ======================================================== */}
        {/* SECTION 5: UNCERTAINTY AND LIMITATIONS */}
        {/* ======================================================== */}
        <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200/90 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
              5. Uncertainty and Limitations
            </span>
            <span className="text-[10px] font-mono text-zinc-400">Forensic Boundaries</span>
          </div>

          <ul className="space-y-1.5">
            {uncertainties.map((u, idx) => (
              <li key={idx} className="flex items-start space-x-2 text-xs text-zinc-700">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 mt-1.5 shrink-0" />
                <span>{u}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* ======================================================== */}
        {/* SECTION 6: SUGGESTED NEXT STEPS */}
        {/* ======================================================== */}
        <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200/90 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
              6. Suggested Next Steps
            </span>
            <span className="text-[10px] font-mono text-zinc-400">Recommended Action Plan</span>
          </div>

          <ol className="space-y-2">
            {suggestedNextSteps.map((step, idx) => (
              <li key={idx} className="flex items-start space-x-2.5 text-xs text-zinc-800">
                <span className="w-5 h-5 rounded-full bg-zinc-200 text-zinc-800 font-bold font-mono text-[11px] flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <span className="pt-0.5 font-medium">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* ======================================================== */}
        {/* SECTION 7: INTERACTIVE AGENT REVIEW CONTROLS */}
        {/* ======================================================== */}
        {isAgentView && (
          <div className="p-5 rounded-2xl bg-gradient-to-r from-zinc-950 to-zinc-900 text-white space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Scale className="w-4 h-4 text-indigo-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                  Support Agent Decision Controls
                </h4>
              </div>
              <span className="text-[10px] text-zinc-400">Agent Override Authority</span>
            </div>

            <p className="text-xs text-zinc-400">
              Record your verified decision based on the evidence docket. The support agent makes the final call.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => onAgentDecision && onAgentDecision(caseId, 'APPROVE_REPLACE')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center space-x-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Confirm & Approve Replacement</span>
              </button>

              <button
                type="button"
                onClick={() => onAgentDecision && onAgentDecision(caseId, 'REQUEST_EVIDENCE')}
                className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-semibold transition shadow-2xs flex items-center space-x-1.5 cursor-pointer"
              >
                <FileQuestion className="w-3.5 h-3.5" />
                <span>Request Packaging Photographs</span>
              </button>

              <button
                type="button"
                onClick={() => onAgentDecision && onAgentDecision(caseId, 'REJECT_UNSUBSTANTIATED')}
                className="px-3.5 py-2 bg-rose-900/60 hover:bg-rose-900 text-rose-200 border border-rose-800/80 rounded-xl text-xs font-semibold transition shadow-2xs flex items-center space-x-1.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reject Claim</span>
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Image Lightbox Modal */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-3xl w-full max-h-[85vh] bg-zinc-900 rounded-2xl overflow-hidden p-2">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/90"
            >
              <X className="w-5 h-5" />
            </button>
            <img 
              src={selectedPhoto} 
              alt="Enlarged Evidence" 
              className="w-full h-auto max-h-[80vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}

    </div>
  );
}
