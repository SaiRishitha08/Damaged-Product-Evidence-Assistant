import React, { useState } from 'react';
import { 
  X, 
  FileDown, 
  Printer, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Truck, 
  Package, 
  Clock, 
  ExternalLink 
} from 'lucide-react';
import { generateCustomerEvidencePDF } from '../utils/pdfGenerator';

export default function EvidenceDossierModal({ caseData, isOpen, onClose }) {
  const [selectedPhotoIdx, setSelectedPhotoIdx] = useState(0);
  if (!isOpen || !caseData) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fade-in font-['Plus_Jakarta_Sans',sans-serif]">
      <div 
        className="relative w-full max-w-4xl bg-white border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Top Bar - Linear Monochrome Styling */}
        <div className="flex items-center justify-between px-6 py-4 bg-zinc-50 border-b border-zinc-200">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-950 text-white flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xs font-mono font-bold text-zinc-950 block">
                {caseData.caseId}
              </span>
              <h3 className="text-sm font-bold text-zinc-950">
                Official Damaged Product Evidence Case Dossier
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => generateCustomerEvidencePDF(caseData)}
              className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 shadow-xs"
            >
              <FileDown className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
            <button
              onClick={() => window.print()}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition"
              title="Print Dossier"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
          
          {/* Header Banner */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Dispute Status
              </span>
              <div className="flex items-center space-x-2 mt-0.5">
                <span className="text-sm font-extrabold text-slate-900">{caseData.status}</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                  {caseData.damageSeverity} Severity
                </span>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-[10px] font-semibold text-slate-500 block">Reported Timestamp</span>
              <span className="font-mono text-slate-800 font-medium">{caseData.reportedAt}</span>
            </div>
          </div>

          {/* 2-Column Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <h4 className="font-bold text-indigo-700 uppercase text-[10px] tracking-wider">
                Product & Order Specification
              </h4>
              <p className="text-sm font-bold text-slate-900">{caseData.productName}</p>
              <div className="space-y-1 text-slate-600 text-[11px] pt-1 border-t border-slate-200">
                <p>Order Number: <strong className="text-slate-900 font-mono">{caseData.orderNo}</strong></p>
                <p>Assigned Seller: <strong className="text-slate-900">{caseData.sellerName}</strong> ({caseData.sellerId})</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <h4 className="font-bold text-emerald-700 uppercase text-[10px] tracking-wider">
                Customer & Transit Reference
              </h4>
              <p className="text-sm font-bold text-slate-900">{caseData.customerName}</p>
              <div className="space-y-1 text-slate-600 text-[11px] pt-1 border-t border-slate-200">
                <p>Contact Phone: <strong className="text-slate-900">{caseData.customerPhone}</strong></p>
                <p>Logistics Partner: <strong className="text-slate-900">{caseData.courierPartner || 'Blue Dart Express'}</strong></p>
                <p>AWB Consignment: <strong className="text-slate-900 font-mono">{caseData.awbNumber || 'BLUEDART-882910471'}</strong></p>
              </div>
            </div>
          </div>

          {/* Quoted Customer Problem Statement - Pastel Rose */}
          <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200/80 space-y-2">
            <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">
              Quoted Customer Stated Problem (Verbatim Testimony)
            </span>
            <p className="text-sm text-slate-800 italic leading-relaxed">
              &ldquo;{caseData.customerClaim}&rdquo;
            </p>
            <div className="text-[10px] text-rose-700 font-medium">
              Damage Category: <strong>{caseData.damageType}</strong>
            </div>
          </div>

          {/* Photographic Evidence Display with Multi-Angle Docket */}
          {(() => {
            const photos = (caseData.customerEvidenceImages && caseData.customerEvidenceImages.length > 0)
              ? caseData.customerEvidenceImages
              : (caseData.customerEvidenceImage ? [caseData.customerEvidenceImage] : ['/assets/P01.png']);
            const currentImg = photos[selectedPhotoIdx] || photos[0];
            const slotLabels = [
              '1. Outer Packaging / Box Crush',
              '2. Product Unit Fracture',
              '3. Shipping Label & AWB Barcode',
              '4. Macro Close-Up Damage',
              '5. Package Accessories / Unboxing'
            ];

            return (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <span>Attached Physical Evidence Photographic Docket</span>
                    <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
                      {photos.length} Photos
                    </span>
                  </h4>
                  {photos.length > 1 && (
                    <span className="text-[11px] text-slate-500 font-medium">
                      Viewing angle {selectedPhotoIdx + 1} of {photos.length}
                    </span>
                  )}
                </div>

                <div className="aspect-video max-h-72 rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center p-3 relative">
                  <img
                    src={currentImg}
                    alt="Case Evidence"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/assets/P01.png';
                    }}
                  />
                  <div className="absolute bottom-2 left-2 px-2.5 py-1 bg-white/90 backdrop-blur-sm rounded-lg border border-slate-200 text-[10px] font-bold text-slate-700 shadow-xs">
                    {slotLabels[selectedPhotoIdx] || `Photo ${selectedPhotoIdx + 1}`}
                  </div>
                </div>

                {photos.length > 1 && (
                  <div className="grid grid-cols-5 gap-2 pt-1">
                    {photos.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedPhotoIdx(idx)}
                        className={`aspect-square rounded-xl p-1 border transition-all ${
                          selectedPhotoIdx === idx
                            ? 'border-indigo-600 ring-2 ring-indigo-200 bg-indigo-50/50'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <img
                          src={p}
                          alt={`Angle ${idx + 1}`}
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

          {/* C12 Objective Observations & Unknowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                Visible Facts & Verified Observations
              </span>
              <p className="text-[11px] text-emerald-950 font-medium">
                {caseData.visibleObservation || 'Photographic evidence matches reported damage category.'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1">
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                Unknowns & Investigation Scope
              </span>
              <p className="text-[11px] text-amber-950">
                {caseData.unknowns || 'Awaiting seller before/after packing verification and courier weight manifest.'}
              </p>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[10px] text-slate-500 font-mono">
            Certified Evidence Docket • Resolution Engine
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition shadow-xs"
          >
            Close Dossier
          </button>
        </div>

      </div>
    </div>
  );
}
