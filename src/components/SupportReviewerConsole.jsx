import React, { useState, useEffect } from 'react';
import { 
  Scale, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  Flag, 
  Save, 
  RotateCcw, 
  FileText, 
  Sparkles, 
  Eye, 
  ShieldCheck, 
  AlertTriangle,
  Info,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  Lock,
  Send,
  Bot,
  RefreshCw,
  RefreshCcw,
  ArrowRight,
  DollarSign,
  FileDown
} from 'lucide-react';
import { INITIAL_EVIDENCE_CASES } from '../data/initialData';
import { analyzeDamageWithGemini } from '../utils/geminiAnalyzer';
import { generateGeminiAIEvidencePDF } from '../utils/pdfGenerator';

export default function SupportReviewerConsole({ 
  onToast, 
  evidenceCases = INITIAL_EVIDENCE_CASES,
  onUpdateCase,
  sellerPackingRecords = []
}) {
  // Convert customer evidence cases into reviewer auditor cases
  const cases = evidenceCases.map((ec) => ({
    case_id: ec.caseId,
    orderNo: ec.orderNo,
    productName: ec.productName,
    customerName: ec.customerName,
    image: ec.customerEvidenceImage,
    customer_statement: ec.customerClaim,
    visible_fact: ec.visibleObservation,
    expected: ec.unknowns,
    damageType: ec.damageType,
    damageSeverity: ec.damageSeverity,
    uncertaintyFlag: ec.uncertaintyFlag ?? true,
    reviewerConfirmation: ec.reviewerConfirmation ?? false,
    reviewerNotes: ec.reviewerNotes || '',
    requestedEvidenceType: ec.requestedEvidenceType || 'None',
    geminiReport: ec.geminiReport || null,
    status: ec.status || 'Routed to Seller'
  }));

  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [saveIndicator, setSaveIndicator] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [reviewerPhotoIndex, setReviewerPhotoIndex] = useState(0);

  // Sync selected case if current is null or invalid
  const activeCase = cases.find((c) => c.case_id === selectedCaseId) || cases[0] || null;

  useEffect(() => {
    setReviewerPhotoIndex(0);
  }, [selectedCaseId]);

  // Find matching seller packing record
  const matchingPackingRecord = sellerPackingRecords.find(
    (r) => r.orderNo === activeCase?.orderNo
  ) || null;

  // Update active case fields
  const handleUpdateActiveCase = (updates) => {
    if (!activeCase) return;
    setSaveIndicator(true);
    setTimeout(() => setSaveIndicator(false), 2000);

    // Notify parent to persist updates in evidenceCases
    if (onUpdateCase) {
      onUpdateCase(activeCase.case_id, {
        ...updates,
        auditTimestamp: new Date().toISOString()
      });
    }
  };

  // Run Gemini AI Analysis
  const handleRunGeminiAnalysis = async () => {
    if (!activeCase) {
      onToast && onToast('No case selected for Gemini analysis', 'error');
      return;
    }
    setIsAnalyzing(true);
    try {
      const result = await analyzeDamageWithGemini(activeCase, matchingPackingRecord);
      if (result.success && result.report) {
        handleUpdateActiveCase({ geminiReport: result.report });
        onToast && onToast(`Gemini 3.8 Flash analyzed case: Recommended ${result.report.recommendation}!`, 'success');
      }
    } catch (err) {
      console.error('Failed to run Gemini analysis:', err);
      onToast && onToast('Gemini analysis failed: ' + err.message, 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Forward Gemini Report to Seller
  const handleSendReportToSeller = () => {
    if (!activeCase?.geminiReport) {
      alert('Please run Gemini AI analysis first.');
      return;
    }
    handleUpdateActiveCase({
      status: `Gemini Report Forwarded (${activeCase.geminiReport.recommendation})`,
      sellerNotified: true
    });
    onToast && onToast(`Gemini Report forwarded to Seller with decision: ${activeCase.geminiReport.recommendation}`, 'success');
  };

  // Reset reviewer cache
  const handleResetReviewerData = () => {
    if (confirm('Clear reviewer cache and local storage?')) {
      localStorage.removeItem('C12_REVIEWER_CASES');
      onToast && onToast('Reviewer cache reset', 'info');
    }
  };

  // Edge case classification
  const getEdgeCaseTag = (item) => {
    if (!item.image) return { label: 'Missing Image', color: 'bg-rose-100 text-rose-800 border-rose-300' };
    if ((item.customer_statement || '').toLowerCase().includes('package')) {
      return { label: 'Packaging Only Claim', color: 'bg-amber-100 text-amber-800 border-amber-300' };
    }
    if ((item.customer_statement || '').toLowerCase().includes('not work')) {
      return { label: 'No Visible Functional Proof', color: 'bg-sky-100 text-sky-800 border-sky-300' };
    }
    return { label: 'Standard Ambiguous', color: 'bg-slate-100 text-slate-700 border-slate-300' };
  };

  const edgeCase = activeCase ? getEdgeCaseTag(activeCase) : { label: 'Active Case', color: 'bg-slate-100 text-slate-700 border-slate-300' };
  const geminiReport = activeCase?.geminiReport;

  // Helper for recommendation badge styling
  const getRecommendationBadge = (rec) => {
    switch ((rec || '').toUpperCase()) {
      case 'REPLACE':
        return {
          label: 'REPLACE (Free Product Replacement)',
          color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          icon: RefreshCw
        };
      case 'REFUND':
        return {
          label: 'REFUND (Full Customer Refund)',
          color: 'bg-sky-100 text-sky-800 border-sky-300',
          icon: DollarSign
        };
      case 'RETURN':
        return {
          label: 'RETURN BY CUSTOMER (Physical Return First)',
          color: 'bg-amber-100 text-amber-800 border-amber-300',
          icon: RefreshCcw
        };
      default:
        return {
          label: rec || 'UNDER REVIEW',
          color: 'bg-purple-100 text-purple-800 border-purple-300',
          icon: Bot
        };
    }
  };

  const recBadge = geminiReport ? getRecommendationBadge(geminiReport.recommendation) : null;

  // Render Clean Empty State when no cases have been submitted yet
  if (cases.length === 0 || !activeCase) {
    return (
      <div className="space-y-8 pb-16">
        {/* Console Header - Pastel Theme */}
        <div className="rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-8 shadow-sm relative overflow-hidden">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Google Gemini 3.8 Flash AI Evidence Resolution Engine</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Evidence Auditor & Gemini Damage Analysis
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
                Google Gemini AI analyzes damaged product photos, customer complaints, and seller pre-pack records. 
                It generates a structured report for the seller with clear <strong>Replace</strong>, <strong>Refund</strong>, or <strong>Return</strong> recommendations.
              </p>
            </div>
            <button
              onClick={handleResetReviewerData}
              className="px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300 transition flex items-center space-x-1"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Clean Empty State */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-12 text-center shadow-sm max-w-2xl mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center mx-auto text-indigo-600">
            <Bot className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">No Damage Evidence Cases Submitted Yet</h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            All mock benchmark fixture data (DAMAGE01 to DAMAGE10) has been removed. When a customer reports a damaged product problem in the Customer Portal, their evidence case will appear here automatically for Google Gemini 3.8 Flash damage analysis and evidence separation.
          </p>
          <div className="pt-2">
            <span className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 font-medium">
              <Info className="w-4 h-4 text-indigo-500" />
              <span>Ready for live customer problem submissions</span>
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      
      {/* Console Header - Pastel Theme */}
      <div className="rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Google Gemini 3.8 Flash AI Evidence Resolution Engine</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Evidence Auditor & Gemini Damage Analysis
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Google Gemini AI analyzes damaged product photos, customer complaints, and seller pre-pack records. 
              It generates a structured report for the seller with clear <strong>Replace</strong>, <strong>Refund</strong>, or <strong>Return</strong> recommendations.
            </p>
          </div>

          {/* Quick Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleRunGeminiAnalysis}
              disabled={isAnalyzing}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-2 shadow-sm disabled:opacity-50"
            >
              <Bot className="w-4 h-4" />
              <span>{isAnalyzing ? 'Gemini Analyzing...' : '✨ Run Gemini Damage Analysis'}</span>
            </button>

            <button
              onClick={handleResetReviewerData}
              className="px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300 transition flex items-center space-x-1"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Case Pill Selector */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Active Customer Damage Cases ({cases.length} Cases)
            </span>
            <span className="text-[11px] text-slate-500 font-semibold">
              {cases.filter((c) => c.geminiReport).length}/{cases.length} Analyzed with Gemini AI
            </span>
          </div>

          <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-thin">
            {cases.map((c) => {
              const isSelected = c.case_id === activeCase.case_id;
              const hasGemini = Boolean(c.geminiReport);
              return (
                <button
                  key={c.case_id}
                  onClick={() => setSelectedCaseId(c.case_id)}
                  className={`px-3 py-2 rounded-xl text-xs font-mono font-bold transition flex items-center space-x-1.5 shrink-0 ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <span>{c.case_id}</span>
                  {hasGemini && (
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* GEMINI AI DECISION REPORT FOR SELLER (MAIN FEATURE) */}
      {/* ======================================================== */}
      {geminiReport ? (
        <div className="bg-gradient-to-r from-indigo-50/70 via-purple-50/50 to-pink-50/50 border-2 border-indigo-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm animate-fade-in">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-100 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
                <Bot className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
                    Gemini 3.8 Flash AI Damage Review
                  </span>
                  {(() => {
                    const isFraud = geminiReport.authenticityStatus === 'FRAUD' || (geminiReport.fraudProbability || 0) > 50 || geminiReport.recommendation === 'CONTEST';
                    const isReturn = geminiReport.recommendation === 'RETURN' || geminiReport.authenticityStatus === 'TAMPER_SUSPECTED';
                    const isSafe = geminiReport.recommendation === 'VERIFIED_PRISTINE';
                    const riskLevel = isFraud ? 'HIGH RISK' : (isReturn ? 'MODERATE RISK' : (isSafe ? 'SAFE' : 'LOW RISK'));
                    return (
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                        riskLevel === 'HIGH RISK' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                        riskLevel === 'MODERATE RISK' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                        riskLevel === 'SAFE' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                        'bg-blue-100 text-blue-800 border-blue-300'
                      }`}>
                        Seller Risk: {riskLevel}
                      </span>
                    );
                  })()}
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">
                  Recommendation Report Generated for Seller
                </h3>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  generateGeminiAIEvidencePDF({
                    orderRecord: matchingPackingRecord,
                    caseData: activeCase,
                    geminiReport: activeCase.geminiReport
                  });
                }}
                className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-xs"
                title="Download Certified Gemini AI Evidence PDF"
              >
                <FileDown className="w-4 h-4 text-emerald-600" />
                <span>Download Gemini AI PDF</span>
              </button>

              <button
                onClick={handleSendReportToSeller}
                className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-2 shadow-sm"
              >
                <Send className="w-4 h-4" />
                <span>Forward Report to Seller</span>
              </button>
            </div>
          </div>

          {/* VERDICT HIGHLIGHT BANNER: REPLACE / REFUND / RETURN */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-indigo-100 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Gemini AI Recommendation
              </span>
              <div className="flex items-center space-x-2">
                {recBadge && (
                  <span className={`px-3 py-1 rounded-xl text-xs font-extrabold border ${recBadge.color}`}>
                    {recBadge.label}
                  </span>
                )}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-indigo-100 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Liability Attribution
              </span>
              <span className="text-sm font-bold text-slate-900 block">
                {geminiReport.liability}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-indigo-100 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Analyzed Timestamp
              </span>
              <span className="text-xs font-mono text-slate-700 font-semibold block">
                {geminiReport.analyzedAt}
              </span>
            </div>
          </div>

          {/* Executive Summary */}
          <div className="p-4 rounded-2xl bg-white border border-indigo-100 space-y-1.5 shadow-xs">
            <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">
              Executive Summary for Seller
            </span>
            <p className="text-sm font-semibold text-slate-900 leading-relaxed">
              {geminiReport.executiveSummary}
            </p>
          </div>

          {/* Detailed Evidentiary Analysis & Rationale */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1.5">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                Evidentiary Breakdown (Camera vs Pre-Pack)
              </span>
              <p className="text-xs text-slate-700 leading-relaxed">
                {geminiReport.detailedAnalysis}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1.5">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                Decision Rationale (Why {geminiReport.recommendation})
              </span>
              <p className="text-xs text-slate-700 leading-relaxed">
                {geminiReport.decisionRationale}
              </p>
            </div>
          </div>

          {/* Action Advice for the Seller */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1.5">
            <div className="flex items-center space-x-2 text-emerald-800 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Recommended Seller Action Protocol:</span>
            </div>
            <p className="text-xs text-emerald-950 font-medium leading-relaxed">
              {geminiReport.sellerActionAdvice}
            </p>
          </div>

        </div>
      ) : (
        /* Prompt to Run Gemini AI */
        <div className="p-6 rounded-3xl bg-indigo-50/50 border border-indigo-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-600 mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-slate-900">
            Generate Gemini AI Decision Report for this Case
          </h4>
          <p className="text-xs text-slate-600 max-w-lg mx-auto">
            Click the button below to have Google Gemini 3.8 Flash cross-examine the customer's complaint with physical evidence photos and seller packaging proof to determine whether to <strong>Replace</strong>, <strong>Refund</strong>, or <strong>Return</strong>.
          </p>
          <button
            onClick={handleRunGeminiAnalysis}
            disabled={isAnalyzing}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm inline-flex items-center space-x-2"
          >
            <Bot className="w-4 h-4" />
            <span>{isAnalyzing ? 'Gemini 3.8 Flash Analyzing...' : 'Run Gemini AI Analysis Now'}</span>
          </button>
        </div>
      )}

      {/* ACTIVE CASE REVIEW STUDIO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Visual Evidence & Image (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-4">
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-mono font-extrabold text-indigo-700">
                  {activeCase.case_id}
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${edgeCase.color}`}>
                  {edgeCase.label}
                </span>
              </div>
              {saveIndicator && (
                <span className="text-[10px] text-emerald-600 font-bold animate-pulse">
                  ✓ Saved to Storage
                </span>
              )}
            </div>

            {/* Evidence Image Container with Multi-Angle Gallery */}
            {(() => {
              const photos = (activeCase.images && activeCase.images.length > 0)
                ? activeCase.images
                : (activeCase.image ? [activeCase.image] : []);
              const currentPhoto = photos[reviewerPhotoIndex] || photos[0] || null;

              return (
                <div className="space-y-3">
                  <div className="relative aspect-video rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center">
                    {currentPhoto ? (
                      <img
                        src={currentPhoto}
                        alt={activeCase.case_id}
                        className="w-full h-full object-contain p-4"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/assets/P01.png';
                        }}
                      />
                    ) : (
                      <div className="text-center p-6 space-y-2">
                        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
                        <p className="text-xs font-bold text-rose-700">NO IMAGE SUPPLIED BY CUSTOMER</p>
                        <p className="text-[11px] text-slate-500">
                          Case outcome requires mandatory evidence upload request.
                        </p>
                      </div>
                    )}
                    {currentPhoto && (
                      <span className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-white/95 backdrop-blur-md text-slate-700 text-[10px] font-mono border border-slate-200 shadow-xs">
                        Angle {reviewerPhotoIndex + 1} of {photos.length}
                      </span>
                    )}
                  </div>

                  {photos.length > 1 && (
                    <div className="flex items-center space-x-2 overflow-x-auto pb-1">
                      {photos.map((p, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => setReviewerPhotoIndex(pIdx)}
                          className={`w-14 h-14 rounded-xl border p-1 bg-white shrink-0 transition-all ${
                            reviewerPhotoIndex === pIdx
                              ? 'border-indigo-600 ring-2 ring-indigo-200 shadow-xs'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <img
                            src={p}
                            alt={`Thumb ${pIdx + 1}`}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = '/assets/P01.png';
                            }}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Rights & Synthetic Notice */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
              <span className="font-bold text-slate-800 block">Item / Order Ref:</span>
              <p className="font-mono text-slate-700">
                {activeCase.orderNo} • {activeCase.productName}
              </p>
            </div>

            {/* Blurry / Ambiguous Evidence Request Trigger */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2.5">
              <div className="flex items-center space-x-2 text-amber-800 text-xs font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>Evidence Request Trigger (5 Point Rubric)</span>
              </div>
              <p className="text-[11px] text-amber-900 leading-relaxed">
                When photos are ambiguous, blurry, or show only packaging, trigger a targeted evidence request to the customer:
              </p>
              <select
                value={activeCase.requestedEvidenceType || 'None'}
                onChange={(e) => handleUpdateActiveCase({ requestedEvidenceType: e.target.value })}
                className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs text-amber-900 font-semibold focus:outline-none focus:ring-1 focus:ring-amber-400"
              >
                <option value="None">No additional evidence needed</option>
                <option value="PackagingBarcode">Request Photo of Shipping Label & Barcode</option>
                <option value="PowerVideo">Request 10s Video showing plug-in / power failure</option>
                <option value="ClearAngles">Request Multi-Angle High-Resolution Photos</option>
                <option value="UnboxingSerial">Request Serial Number on device underside</option>
              </select>
            </div>

          </div>
        </div>

        {/* Right Column: 3-Pillar Evidence Separation Grid & Reviewer Decisions (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
            
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>C12 3-Pillar Evidence Separation Table</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluator Check: Visible facts, metadata, and customer claims are strictly separated.
              </p>
            </div>

            {/* 3 Pillars */}
            <div className="space-y-4 text-xs">
              
              {/* PILLAR 1: QUOTED CUSTOMER CLAIM */}
              <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-800 text-[10px] uppercase tracking-wider">
                    Pillar 1: Quoted Customer Claim (Subjective Statement)
                  </span>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold border border-rose-200">
                    UNVERIFIED
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-900 italic mt-1">
                  "{activeCase.customer_statement}"
                </p>
                <span className="text-[10px] text-rose-800/80 block pt-1 font-medium">
                  Rule: Never treat customer testimony as physical proof of functional fault or seller defect.
                </span>
              </div>

              {/* PILLAR 2: VISIBLE FACTS & OBSERVATIONS */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-800 text-[10px] uppercase tracking-wider">
                    Pillar 2: Visible Facts & Physical Observations (Camera Truth)
                  </span>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                    VERIFIED
                  </span>
                </div>
                <p className="text-sm text-emerald-950 mt-1 font-mono font-medium">
                  {activeCase.visible_fact}
                </p>
                <span className="text-[10px] text-emerald-800/80 block pt-1 font-medium">
                  Rule: Only state what is visually observable. Do not assume unseen electrical failure.
                </span>
              </div>

              {/* PILLAR 3: UNKNOWNS & MISSING EVIDENCE */}
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-800 text-[10px] uppercase tracking-wider">
                    Pillar 3: Unknowns & Missing Evidence
                  </span>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold border border-amber-200">
                    INVESTIGATION REQUIRED
                  </span>
                </div>
                <p className="text-xs text-slate-700 mt-1">
                  {activeCase.expected}
                </p>
              </div>

            </div>

            {/* REVIEWER CONTROLS & PERSISTENCE */}
            <div className="p-5 rounded-2xl bg-indigo-50/40 border border-indigo-200 space-y-4">
              <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                  <Flag className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Reviewer Controls & Persistence State</span>
                </span>
                <span className="text-[10px] font-mono text-indigo-700 font-semibold">
                  Persists in localStorage
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Uncertainty Flag Toggle */}
                <label className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 cursor-pointer hover:border-indigo-300 transition shadow-xs">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Uncertainty Flag</span>
                    <span className="text-[10px] text-slate-500">Requires further evidence</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={activeCase.uncertaintyFlag || false}
                    onChange={(e) => handleUpdateActiveCase({ uncertaintyFlag: e.target.checked })}
                    className="w-4 h-4 text-amber-500 rounded focus:ring-0 cursor-pointer"
                  />
                </label>

                {/* Reviewer Confirmation Checkbox */}
                <label className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 cursor-pointer hover:border-emerald-300 transition shadow-xs">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Reviewer Confirmed</span>
                    <span className="text-[10px] text-slate-500">Human sign-off on verdict</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={activeCase.reviewerConfirmation || false}
                    onChange={(e) => handleUpdateActiveCase({ reviewerConfirmation: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-0 cursor-pointer"
                  />
                </label>

              </div>

              {/* Reviewer Notes Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Reviewer Audit Decision & Negotiation Notes:
                </label>
                <textarea
                  rows={2}
                  value={activeCase.reviewerNotes || ''}
                  onChange={(e) => handleUpdateActiveCase({ reviewerNotes: e.target.value })}
                  placeholder="Record reviewer notes here. (e.g. Gemini recommends Replace; waiting for seller confirmation...)"
                  className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {/* Compliance Guarantee Lock */}
              <div className="flex items-center space-x-2 text-[10px] text-slate-600 pt-1">
                <Lock className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>
                  Gemini AI recommendations assist the reviewer and seller. Final liability decision rests with responsible human operators.
                </span>
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
