import React, { useState, useEffect, useRef } from 'react';
import { 
  Store, 
  PackageCheck, 
  Truck, 
  ShieldCheck, 
  AlertCircle, 
  FileDown, 
  PlusCircle, 
  Upload, 
  CheckCircle, 
  ExternalLink, 
  ChevronRight, 
  Layers, 
  Scale, 
  Barcode, 
  Search, 
  Filter, 
  Eye, 
  FileSpreadsheet, 
  AlertTriangle, 
  History, 
  ShieldAlert, 
  ArrowRight, 
  Bot, 
  Sparkles, 
  RefreshCw, 
  RefreshCcw, 
  RotateCcw,
  DollarSign,
  Phone,
  MapPin,
  UserCheck,
  User,
  LogIn,
  LogOut,
  KeyRound,
  Plus,
  BarChart3,
  TrendingUp,
  PieChart,
  Activity,
  CheckCircle2,
  X,
  Trash2,
  Boxes,
  Clock
} from 'lucide-react';
import { generateCustomerEvidencePDF, generateSellerDossierPDF, generateGeminiAIEvidencePDF } from '../utils/pdfGenerator';
import { MARKETPLACE_SELLERS, CURRENT_SELLER, DEFAULT_SELLER_STORES } from '../data/initialData';
import { analyzeDamageWithGemini } from '../utils/geminiAnalyzer';
import { findCustomerByMobile, normalizePhone, DEFAULT_CUSTOMER_PROFILES } from '../data/customerDirectory';

export default function SellerDashboard({ 
  activeSeller = null,
  sellerRegistry = [],
  onSwitchSeller,
  onRegisterSeller,
  sellerPackingRecords = [], 
  evidenceCases = [], 
  customerRegistry = [],
  onUpdateCustomerRegistry,
  onAddPackingRecord,
  onUpdatePackingRecord,
  onUpdateCaseStatus,
  onUpdateCase,
  onOpenDossierModal,
  onLogout
}) {
  const effectiveSeller = activeSeller || (sellerRegistry && sellerRegistry.length > 0 ? sellerRegistry[0] : null) || CURRENT_SELLER || DEFAULT_SELLER_STORES[0] || {
    id: 'SLR-1001',
    name: 'Apex Tech & Retail Solutions',
    marketplacePartner: 'Fynd Marketplace Direct',
    hub: 'Bhiwandi Central Fulfillment Hub, Mumbai',
    dispatchCompliance: '100%',
    rating: 5.0,
    category: 'Electronics & Retail'
  };

  const displayStores = (sellerRegistry && sellerRegistry.length > 0)
    ? (sellerRegistry.some(s => s.id === effectiveSeller?.id) ? sellerRegistry : [effectiveSeller, ...sellerRegistry])
    : DEFAULT_SELLER_STORES;

  const [activeSubTab, setActiveSubTab] = useState('analytics'); // 'analytics' | 'cases' | 'new-record' | 'catalog'
  const [activeSellerFilter, setActiveSellerFilter] = useState('all');
  const [claimsFilter, setClaimsFilter] = useState('all'); // 'all' | 'fraud' | 'genuine' | 'pending'
  const [selectedCaseForReview, setSelectedCaseForReview] = useState(evidenceCases[0] || null);
  const [isAnalyzingGemini, setIsAnalyzingGemini] = useState(false);
  const [analyzingOrderNo, setAnalyzingOrderNo] = useState(null);
  const [lastSavedRecord, setLastSavedRecord] = useState(null);
  const [isAutoGeneratingPDF, setIsAutoGeneratingPDF] = useState(false);
  const [isSavingRecord, setIsSavingRecord] = useState(false);
  const isSavingRef = useRef(false);
  const [activeCustomerPhotoIdx, setActiveCustomerPhotoIdx] = useState(0);
  const [activeReviewBeforeIdx, setActiveReviewBeforeIdx] = useState(0);
  const [activeReviewAfterIdx, setActiveReviewAfterIdx] = useState(0);

  // Window event listener for subtab switching from top Navbar
  useEffect(() => {
    const handleNav = (e) => {
      if (!e.detail) return;
      let target = e.detail;
      if (target === 'packing' || target === 'dispatch') target = 'new-record';
      if (target === 'claims' || target === 'disputes') target = 'cases';
      if (target === 'orders' || target === 'vault') target = 'catalog';
      if (target === 'dashboard' || target === 'stats') target = 'analytics';
      setActiveSubTab(target);
    };
    window.addEventListener('nav-seller-subtab', handleNav);
    return () => window.removeEventListener('nav-seller-subtab', handleNav);
  }, []);

  // Seller Auth Mode for unauthenticated screen: 'login' | 'signup'
  const [sellerAuthMode, setSellerAuthMode] = useState(() => sellerRegistry.length > 0 ? 'login' : 'signup');
  const [sellerLoginId, setSellerLoginId] = useState('');
  const [sellerLoginError, setSellerLoginError] = useState('');

  // Seller Registration Modal State
  const [showRegisterSellerModal, setShowRegisterSellerModal] = useState(false);
  const [regStoreName, setRegStoreName] = useState('');
  const [regSellerId, setRegSellerId] = useState(() => 'SLR-' + Math.floor(1000 + Math.random() * 9000));
  const [regHub, setRegHub] = useState('Bhiwandi Central Fulfillment Hub, Mumbai');
  const [regPhone, setRegPhone] = useState('+91 98200 11223');
  const [regEmail, setRegEmail] = useState('');
  const [regCategory, setRegCategory] = useState('Electronics & Retail');

  const handleSellerLoginSubmit = (e) => {
    e.preventDefault();
    setSellerLoginError('');
    if (!sellerLoginId.trim()) {
      setSellerLoginError('Please enter your Seller Store ID.');
      return;
    }
    const query = sellerLoginId.trim().toLowerCase();
    const found = sellerRegistry.find(s => s.id.toLowerCase() === query || s.name.toLowerCase().includes(query));
    if (found) {
      if (onSwitchSeller) onSwitchSeller(found);
    } else {
      setSellerLoginError(`No store found matching "${sellerLoginId}". Click "Sign Up" below to register.`);
    }
  };

  const handleRegisterSellerSubmit = (e) => {
    e.preventDefault();
    if (!regStoreName.trim()) {
      alert('Please enter a Store / Business Name.');
      return;
    }
    const id = regSellerId.trim() || `SLR-${Math.floor(1000 + Math.random() * 9000)}`;
    if (onRegisterSeller) {
      onRegisterSeller({
        id,
        name: regStoreName.trim(),
        hub: regHub.trim() || 'Central Sort Facility, Mumbai',
        contactPhone: regPhone.trim() || '+91 98000 00000',
        contactEmail: regEmail.trim() || `dispatches@${regStoreName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
        category: regCategory || 'Multi-Category Retail',
        dispatchCompliance: '100%',
        rating: 5.0
      });
    }
    setRegStoreName('');
    setRegSellerId('SLR-' + Math.floor(1000 + Math.random() * 9000));
    setShowRegisterSellerModal(false);
  };

  // Sync selected case when evidenceCases change
  useEffect(() => {
    if (!selectedCaseForReview && evidenceCases.length > 0) {
      setSelectedCaseForReview(evidenceCases[0]);
    } else if (selectedCaseForReview && !evidenceCases.some(c => c.caseId === selectedCaseForReview.caseId)) {
      setSelectedCaseForReview(evidenceCases[0] || null);
    }
    setActiveCustomerPhotoIdx(0);
    setActiveReviewBeforeIdx(0);
    setActiveReviewAfterIdx(0);
  }, [evidenceCases, selectedCaseForReview?.caseId]);

  // Generate Gemini AI Evidence PDF with all details and images
  const handleGenerateGeminiPDFForRecord = async (record) => {
    if (!record) return false;
    setAnalyzingOrderNo(record.orderNo);
    try {
      const matchingCase = evidenceCases.find((c) => c.orderNo === record.orderNo) || null;
      
      // Call Google Gemini 3.8 Flash taking ALL details and images!
      const res = await analyzeDamageWithGemini(matchingCase || record, record);
      const report = res.success ? res.report : (record.geminiReport || null);

      if (res.success && res.report) {
        record.geminiReport = res.report;
        if (onUpdatePackingRecord) {
          onUpdatePackingRecord(record.orderNo, { geminiReport: res.report });
        }
        if (matchingCase && onUpdateCase) {
          onUpdateCase(matchingCase.caseId, { geminiReport: res.report });
        }
        setLastSavedRecord(prev => (prev?.orderNo === record.orderNo ? { ...prev, geminiReport: res.report } : prev));
      }

      await generateGeminiAIEvidencePDF({
        orderRecord: record,
        caseData: matchingCase,
        geminiReport: report
      });
      return true;
    } catch (err) {
      console.error('Failed to generate Gemini AI PDF for record:', err);
      alert('Error generating Gemini AI PDF: ' + err.message);
      return false;
    } finally {
      setAnalyzingOrderNo(null);
    }
  };

  // Form State for Recording New Product Packing & Logistics Evidence
  const [formOrderNo, setFormOrderNo] = useState('ORD-' + Math.floor(10000 + Math.random() * 90000));
  const [formProductName, setFormProductName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formCategory, setFormCategory] = useState('Electronics');
  const [formSalePrice, setFormSalePrice] = useState('');

  // Customer Profile State (Linked by Mobile Number)
  const [formCustomerMobile, setFormCustomerMobile] = useState('');
  const [formCustomerName, setFormCustomerName] = useState('');
  const [formCustomerAddress, setFormCustomerAddress] = useState('');
  const [formCustomerCity, setFormCustomerCity] = useState('');
  const [formCustomerPincode, setFormCustomerPincode] = useState('');
  const [formCustomerEmail, setFormCustomerEmail] = useState('');
  const [matchedCustomer, setMatchedCustomer] = useState(null);

  // Auto-fill customer details when mobile number is entered or changed
  const handleCustomerMobileChange = (mobileInput) => {
    setFormCustomerMobile(mobileInput);
    const matched = findCustomerByMobile(mobileInput, customerRegistry);
    if (matched) {
      setMatchedCustomer(matched);
      setFormCustomerName(matched.name || '');
      setFormCustomerAddress(matched.address || '');
      setFormCustomerCity(matched.city ? `${matched.city}${matched.state ? ', ' + matched.state : ''}` : '');
      setFormCustomerPincode(matched.pincode || '');
      setFormCustomerEmail(matched.email || '');
    } else {
      setMatchedCustomer(null);
    }
  };

  // 1-Click Select preset customer profile
  const handleSelectPresetCustomer = (cust) => {
    const mob = cust.mobile || cust.phone;
    setFormCustomerMobile(mob);
    setMatchedCustomer(cust);
    setFormCustomerName(cust.name || '');
    setFormCustomerAddress(cust.address || '');
    setFormCustomerCity(cust.city ? `${cust.city}${cust.state ? ', ' + cust.state : ''}` : '');
    setFormCustomerPincode(cust.pincode || '');
    setFormCustomerEmail(cust.email || '');
  };

  // Before Packing Multiple Photos State
  const [beforePhotos, setBeforePhotos] = useState(['/assets/P01.png']);
  const [activeBeforePreviewIdx, setActiveBeforePreviewIdx] = useState(0);
  const [beforeQcInspector, setBeforeQcInspector] = useState('QC-INSP-88 (Ramesh K.)');
  const [beforeSerialNo, setBeforeSerialNo] = useState('SN-' + Math.floor(100000 + Math.random() * 900000));
  const [beforeChecklist, setBeforeChecklist] = useState({
    physicalDamageFree: true,
    sealIntact: true,
    accessoriesVerified: true,
    powerTestPassed: true
  });
  const [beforeNotes, setBeforeNotes] = useState('Product unit pristine. Factory seal intact, power test passed, zero cosmetic blemishes.');

  // After Packing Multiple Photos State
  const [afterPhotos, setAfterPhotos] = useState(['/assets/P04.png']);
  const [activeAfterPreviewIdx, setActiveAfterPreviewIdx] = useState(0);
  const [afterPackagingType, setAfterPackagingType] = useState('3-Ply Corrugated Box + Bubble Wrap Layers');
  const [afterSecurityTapeNo, setAfterSecurityTapeNo] = useState('TAPE-APEX-' + Math.floor(10000 + Math.random() * 90000));
  const [afterBoxWeightGrams, setAfterBoxWeightGrams] = useState(850);
  const [afterFragileSticker, setAfterFragileSticker] = useState(true);

  // Logistics State
  const [logisticsCourier, setLogisticsCourier] = useState('Blue Dart Express');
  const [logisticsAwb, setLogisticsAwb] = useState('BLUEDART-' + Math.floor(100000000 + Math.random() * 900000000));
  const [logisticsHub, setLogisticsHub] = useState('Bhiwandi Central Sort Facility, Bay 12');
  const [logisticsPickupAgent, setLogisticsPickupAgent] = useState('BD-EXEC-409 (Sunil M.)');
  
  const [recordSavedSuccess, setRecordSavedSuccess] = useState(false);

  // Preset fixture photo options
  const fixturePhotos = [
    { label: 'P01: Electronics / Audio', path: '/assets/P01.png' },
    { label: 'P02: Apparel Item', path: '/assets/P02.png' },
    { label: 'P03: Packaged Box (Red)', path: '/assets/P03.png' },
    { label: 'P04: Sealed Outer Box (Blue)', path: '/assets/P04.png' },
    { label: 'P05: Glassware Item', path: '/assets/P05.png' },
    { label: 'P06: Ceramic Item', path: '/assets/P06.png' }
  ];

  // Handle Before Photos Multiple Upload
  const handleBeforePhotosUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          setBeforePhotos((prev) => [...prev, reader.result]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveBeforePhoto = (index) => {
    setBeforePhotos((prev) => {
      const updated = prev.filter((_, idx) => idx !== index);
      return updated.length > 0 ? updated : ['/assets/P01.png'];
    });
    setActiveBeforePreviewIdx(0);
  };

  const handleAddPresetBeforePhoto = (path) => {
    setBeforePhotos((prev) => (prev.includes(path) ? prev : [...prev, path]));
  };

  // Handle After Photos Multiple Upload
  const handleAfterPhotosUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          setAfterPhotos((prev) => [...prev, reader.result]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveAfterPhoto = (index) => {
    setAfterPhotos((prev) => {
      const updated = prev.filter((_, idx) => idx !== index);
      return updated.length > 0 ? updated : ['/assets/P04.png'];
    });
    setActiveAfterPreviewIdx(0);
  };

  const handleAddPresetAfterPhoto = (path) => {
    setAfterPhotos((prev) => (prev.includes(path) ? prev : [...prev, path]));
  };

  // Reset all form inputs to clean default state
  const resetFormFields = () => {
    setFormOrderNo('ORD-' + Math.floor(10000 + Math.random() * 90000));
    setFormProductName('');
    setFormSku('');
    setFormCategory('Electronics');
    setFormSalePrice('');
    setFormCustomerMobile('');
    setFormCustomerName('');
    setFormCustomerAddress('');
    setFormCustomerCity('');
    setFormCustomerPincode('');
    setFormCustomerEmail('');
    setMatchedCustomer(null);
    setBeforePhotos(['/assets/P01.png']);
    setActiveBeforePreviewIdx(0);
    setBeforeSerialNo('SN-' + Math.floor(100000 + Math.random() * 900000));
    setBeforeQcInspector('QC-INSP-88 (Ramesh K.)');
    setBeforeNotes('Product unit pristine. Factory seal intact, power test passed, zero cosmetic blemishes.');
    setBeforeChecklist({
      physicalDamageFree: true,
      sealIntact: true,
      accessoriesVerified: true,
      powerTestPassed: true
    });
    setAfterPhotos(['/assets/P04.png']);
    setActiveAfterPreviewIdx(0);
    setAfterPackagingType('3-Ply Corrugated Box + Bubble Wrap Layers');
    setAfterSecurityTapeNo('TAPE-APEX-' + Math.floor(10000 + Math.random() * 90000));
    setAfterBoxWeightGrams(850);
    setAfterFragileSticker(true);
    setLogisticsCourier('Blue Dart Express');
    setLogisticsAwb('BLUEDART-' + Math.floor(100000000 + Math.random() * 900000000));
    setLogisticsHub('Bhiwandi Central Sort Facility, Bay 12');
    setLogisticsPickupAgent('BD-EXEC-409 (Sunil M.)');
  };

  // Handle Save Packing & Logistics Record
  const handleSavePackingRecord = async (e) => {
    e.preventDefault();
    // Guard against rapid duplicate clicks immediately
    if (isSavingRef.current || isSavingRecord || isAutoGeneratingPDF) {
      console.warn('Submission already in progress; duplicate click ignored.');
      return;
    }

    if (!formOrderNo || !formProductName) {
      alert('Please fill in Order No and Product Name.');
      return;
    }

    // Lock immediately to prevent double submissions
    isSavingRef.current = true;
    setIsSavingRecord(true);
    setIsAutoGeneratingPDF(true);

    try {
      // 1. Snapshot all form values into the immutable new record
      const newRecord = {
        id: `PACK-${formOrderNo}`,
        orderNo: formOrderNo,
        productName: formProductName,
        sku: formSku || `SKU-${formOrderNo}`,
        category: formCategory,
        customerName: formCustomerName || 'Customer',
        customerPhone: formCustomerMobile || '+91 98112 30491',
        customerMobile: formCustomerMobile,
        customerAddress: formCustomerAddress || 'Delivery Address',
        customerCity: formCustomerCity || 'Hyderabad',
        customerPincode: formCustomerPincode || '500033',
        customerEmail: formCustomerEmail,
        sellerId: effectiveSeller?.id || 'SLR-1001',
        sellerName: effectiveSeller?.name || 'Verified Seller',
        salePrice: parseFloat(formSalePrice) || 2999,
        beforePacking: {
          photo: beforePhotos[0] || '/assets/P01.png',
          photos: [...beforePhotos],
          timestamp: new Date().toLocaleString(),
          qcInspectorId: beforeQcInspector,
          serialNo: beforeSerialNo,
          checklist: { ...beforeChecklist },
          inspectorNotes: beforeNotes
        },
        afterPacking: {
          photo: afterPhotos[0] || '/assets/P04.png',
          photos: [...afterPhotos],
          timestamp: new Date().toLocaleString(),
          packagingType: afterPackagingType,
          securityTapeNo: afterSecurityTapeNo,
          boxWeightGrams: parseInt(afterBoxWeightGrams, 10) || 500,
          fragileStickerApplied: afterFragileSticker,
          conditionStatus: 'Sealed & verified with security tape'
        },
        logistics: {
          courierPartner: logisticsCourier,
          awbNumber: logisticsAwb,
          dispatchDate: new Date().toLocaleString(),
          originHub: logisticsHub,
          pickupExecutiveId: logisticsPickupAgent,
          handoverSignatureStatus: 'Digitally Signed Manifest',
          status: 'Dispatched to Transit'
        }
      };

      // 2. Add to seller records (deduplicated) & sync customer profile
      onAddPackingRecord(newRecord);

      if (formCustomerMobile && onUpdateCustomerRegistry) {
        onUpdateCustomerRegistry({
          name: formCustomerName || 'Customer',
          phone: formCustomerMobile,
          mobile: formCustomerMobile,
          address: formCustomerAddress || '',
          city: formCustomerCity || 'Hyderabad',
          pincode: formCustomerPincode || '500033',
          email: formCustomerEmail || ''
        });
      }

      setLastSavedRecord(newRecord);
      setRecordSavedSuccess(true);

      // 3. Clear ALL entered details immediately so form is clean
      resetFormFields();

      // 4. Generate and download certified Gemini AI Evidence PDF
      await handleGenerateGeminiPDFForRecord(newRecord);
    } catch (err) {
      console.error('Save packaging record & PDF generation failed:', err);
    } finally {
      setIsAutoGeneratingPDF(false);
      setIsSavingRecord(false);
      isSavingRef.current = false;
    }
  };

  // Find matching packing record for a given case
  const getMatchingPackingRecord = (orderNo) => {
    return sellerPackingRecords.find((r) => r.orderNo === orderNo) || null;
  };

  return (
    <div className="space-y-6 pb-16 font-['Plus_Jakarta_Sans',sans-serif]">
      
      {/* ======================================================== */}
      {/* TOP: HERO GREETING & AI POWERED CARD (MATCHING SCREENSHOT) */}
      {/* ======================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight">
              Hey {effectiveSeller?.name?.split(' ')[0] || 'Merchant'},
            </h1>
            <div className="relative inline-block">
              <select
                value={effectiveSeller?.id}
                onChange={(e) => {
                  const s = displayStores.find(ms => ms.id === e.target.value);
                  if (s && onSwitchSeller) {
                    onSwitchSeller(s);
                    setActiveSellerFilter(s.id);
                  }
                }}
                className="bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-800 text-[11px] font-semibold rounded-full px-2.5 py-0.5 outline-none cursor-pointer transition"
                title="Switch seller store"
              >
                {displayStores.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.id})
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => setShowRegisterSellerModal(true)}
              className="text-[10px] font-bold text-zinc-700 hover:text-zinc-950 px-2.5 py-0.5 rounded-full bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 flex items-center space-x-1 transition"
            >
              <Plus className="w-3 h-3" />
              <span>+ Register Store</span>
            </button>
          </div>
          <p className="text-sm text-zinc-500 mt-1">
            Monitor packing integrity, inspect customer damage claims & verify Gemini AI decisions.
          </p>
        </div>

        {/* AI Powered Dark Card */}
        <div className="rounded-2xl bg-zinc-950 border border-zinc-800 text-white px-5 py-3 shadow-md flex items-center space-x-3.5 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-200 shrink-0">
            <Sparkles className="w-4 h-4 text-zinc-200" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-bold tracking-wide text-zinc-100">AI Powered</span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Faster review. Fairer decisions.
            </p>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4 SLEEK STATS CARDS (MATCHING SCREENSHOT) */}
      {/* ======================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Orders */}
        <div className="rounded-2xl bg-white border border-zinc-200/90 p-5 shadow-xs flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-zinc-50 border border-zinc-200/90 flex items-center justify-center text-zinc-800 shrink-0">
              <Boxes className="w-5 h-5 text-zinc-800" />
            </div>
            <div>
              <span className="text-2xl font-extrabold text-zinc-950 font-mono block leading-tight">{sellerPackingRecords.length}</span>
              <span className="text-xs font-bold text-zinc-900 block">Total Dispatched</span>
              <span className="text-[10px] text-zinc-500">From fulfillment center</span>
            </div>
          </div>
          <BarChart3 className="w-4 h-4 text-zinc-300 shrink-0" />
        </div>

        {/* Card 2: Total Returns */}
        <div className="rounded-2xl bg-white border border-zinc-200/90 p-5 shadow-xs flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-zinc-50 border border-zinc-200/90 flex items-center justify-center text-zinc-800 shrink-0">
              <RotateCcw className="w-5 h-5 text-zinc-800" />
            </div>
            <div>
              <span className="text-2xl font-extrabold text-zinc-950 font-mono block leading-tight">
                {evidenceCases.filter(c => !effectiveSeller?.id || c.sellerId === effectiveSeller?.id || c.sellerName === effectiveSeller?.name).length}
              </span>
              <span className="text-xs font-bold text-zinc-900 block">Total Claims</span>
              <span className="text-[10px] text-zinc-500">Customer dispute dockets</span>
            </div>
          </div>
          <BarChart3 className="w-4 h-4 text-zinc-300 shrink-0" />
        </div>

        {/* Card 3: Packaging Proofs */}
        <div className="rounded-2xl bg-white border border-zinc-200/90 p-5 shadow-xs flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-zinc-50 border border-zinc-200/90 flex items-center justify-center text-zinc-800 shrink-0">
              <ShieldCheck className="w-5 h-5 text-zinc-800" />
            </div>
            <div>
              <span className="text-2xl font-extrabold text-zinc-950 font-mono block leading-tight">
                {sellerPackingRecords.filter(r => r.beforePacking?.photo || r.afterPacking?.photo).length}
              </span>
              <span className="text-xs font-bold text-zinc-900 block">Packing Proofs</span>
              <span className="text-[10px] text-zinc-500">Tamper-evident baselines</span>
            </div>
          </div>
          <BarChart3 className="w-4 h-4 text-zinc-300 shrink-0" />
        </div>

        {/* Card 4: Suspected Fraud */}
        <div className="rounded-2xl bg-white border border-zinc-200/90 p-5 shadow-xs flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-zinc-50 border border-zinc-200/90 flex items-center justify-center text-zinc-800 shrink-0">
              <ShieldAlert className="w-5 h-5 text-zinc-800" />
            </div>
            <div>
              <span className="text-2xl font-extrabold text-zinc-950 font-mono block leading-tight">
                {evidenceCases.filter(c => c.fraudDetected || c.geminiReport?.authenticityStatus === 'FRAUD').length}
              </span>
              <span className="text-xs font-bold text-zinc-900 block">Fraud Flagged</span>
              <span className="text-[10px] text-zinc-500">AI discrepancy shield</span>
            </div>
          </div>
          <BarChart3 className="w-4 h-4 text-zinc-300 shrink-0" />
        </div>

      </div>

      {/* ======================================================== */}
      {/* SELLER SUB-NAVIGATION PILLS (LINEAR HIGH-CONTRAST) */}
      {/* ======================================================== */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveSubTab('analytics')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center space-x-2 ${
            activeSubTab === 'analytics'
              ? 'bg-zinc-950 text-white shadow-xs'
              : 'bg-white text-zinc-600 hover:text-zinc-950 border border-zinc-200/90'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Sales & Returns Graphs</span>
        </button>

        <button
          onClick={() => setActiveSubTab('cases')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center space-x-2 ${
            activeSubTab === 'cases'
              ? 'bg-zinc-950 text-white shadow-xs'
              : 'bg-white text-zinc-600 hover:text-zinc-950 border border-zinc-200/90'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Redirected Claims & AI Decisions ({evidenceCases.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('new-record')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center space-x-2 ${
            activeSubTab === 'new-record'
              ? 'bg-zinc-950 text-white shadow-xs'
              : 'bg-white text-zinc-600 hover:text-zinc-950 border border-zinc-200/90'
          }`}
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Enter Product Packing Proofs</span>
        </button>

        <button
          onClick={() => setActiveSubTab('catalog')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center space-x-2 ${
            activeSubTab === 'catalog'
              ? 'bg-zinc-950 text-white shadow-xs'
              : 'bg-white text-zinc-600 hover:text-zinc-950 border border-zinc-200/90'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Stored Packaging Vault ({sellerPackingRecords.length})</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* SUB-TAB 0: ANALYTICS & VISUAL GRAPHS (SALES, RETURNS, DEFECTS) */}
      {/* ======================================================== */}
      {activeSubTab === 'analytics' && (() => {
        const filteredRecords = (activeSellerFilter === 'all' || !activeSellerFilter)
          ? (effectiveSeller?.id ? sellerPackingRecords.filter(r => !r.sellerId || r.sellerId === effectiveSeller.id) : sellerPackingRecords)
          : sellerPackingRecords.filter(r => r.sellerId === activeSellerFilter);

        const filteredCases = (activeSellerFilter === 'all' || !activeSellerFilter)
          ? (effectiveSeller?.id ? evidenceCases.filter(c => !c.sellerId || c.sellerId === effectiveSeller.id || c.sellerName === effectiveSeller?.name) : evidenceCases)
          : evidenceCases.filter(c => c.sellerId === activeSellerFilter);

        const totalSales = filteredRecords.reduce((sum, r) => sum + (Number(r.salePrice) || 0), 0);
        const totalDispatches = filteredRecords.length;
        const avgOrderValue = totalDispatches > 0 ? Math.round(totalSales / totalDispatches) : 0;

        // Returns
        const returnCases = filteredCases.filter(c => 
          (c.status || '').toLowerCase().includes('return') ||
          (c.status || '').toLowerCase().includes('refund') ||
          c.geminiReport?.recommendation === 'RETURN' ||
          c.geminiReport?.recommendation === 'REFUND'
        );
        const totalReturns = returnCases.length;
        const returnRate = totalDispatches > 0 ? ((totalReturns / totalDispatches) * 100).toFixed(1) : '0.0';

        // Defected / Damaged Items
        const totalDamaged = filteredCases.length;
        const defectRate = totalDispatches > 0 ? ((totalDamaged / totalDispatches) * 100).toFixed(1) : '0.0';

        const severeDamaged = filteredCases.filter(c => 
          (c.damageSeverity || '').toLowerCase().includes('severe') || 
          (c.damageSeverity || '').toLowerCase().includes('critical') ||
          (c.damageType || '').toLowerCase().includes('shattered') ||
          (c.damageType || '').toLowerCase().includes('crush')
        ).length;

        const moderateDamaged = filteredCases.filter(c => 
          (c.damageSeverity || '').toLowerCase().includes('moderate') ||
          (c.damageSeverity || '').toLowerCase().includes('med')
        ).length;

        const minorDamaged = Math.max(0, totalDamaged - severeDamaged - moderateDamaged);

        // Gemini AI Recommendations
        const recReplace = filteredCases.filter(c => c.geminiReport?.recommendation === 'REPLACE').length;
        const recRefund = filteredCases.filter(c => c.geminiReport?.recommendation === 'REFUND').length;
        const recReturn = filteredCases.filter(c => c.geminiReport?.recommendation === 'RETURN').length;
        // Fraud vs Genuine Claims Analytics
        const fraudCases = filteredCases.filter(c => 
          c.geminiReport?.authenticityStatus === 'FRAUD' || 
          (c.geminiReport?.fraudProbability || 0) > 50 || 
          c.geminiReport?.recommendation === 'CONTEST' ||
          (c.status || '').toLowerCase().includes('fraud') ||
          c.fraudDetected
        );
        const totalFraudClaims = fraudCases.length;
        const totalFraudRevenueProtected = fraudCases.reduce((sum, c) => sum + (Number(c.price) || 2999), 0);
        const fraudRiskRate = totalDamaged > 0 ? Math.round((totalFraudClaims / totalDamaged) * 100) : 0;

        const genuineCases = filteredCases.filter(c => 
          c.geminiReport?.authenticityStatus === 'ORIGINAL' && (c.geminiReport?.fraudProbability || 0) <= 50
        );
        const totalGenuineClaims = genuineCases.length;
        const recContest = filteredCases.filter(c => c.geminiReport?.recommendation === 'CONTEST').length;
        const totalAIReports = filteredCases.filter(c => c.geminiReport).length;

        // Sales Category Breakdown
        const categories = ['Electronics', 'Audio', 'Kitchen & Dining', 'Apparel', 'Computers'];
        const categoryData = categories.map(cat => {
          const recs = filteredRecords.filter(r => (r.category || '').toLowerCase() === cat.toLowerCase());
          const catSales = recs.reduce((s, r) => s + (Number(r.salePrice) || 0), 0);
          return {
            category: cat,
            sales: catSales,
            count: recs.length
          };
        });
        const maxCatSales = Math.max(...categoryData.map(c => c.sales), 1);

        return (
          <div className="space-y-6 animate-fade-in">
            {/* Header with quick filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-600" />
                  <span>Seller Visual Graphs: Sales, Returns & Damage Analytics</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Visual performance breakdown for <strong className="text-slate-800">{effectiveSeller?.name}</strong> across dispatches, returns rate, transit damages, and Gemini AI settlement verdicts.
                </p>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <span className="text-xs text-slate-500 font-semibold">Store:</span>
                <select
                  value={activeSellerFilter}
                  onChange={(e) => setActiveSellerFilter(e.target.value)}
                  className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-indigo-500 shadow-xs"
                >
                  <option value="all">Active Store ({effectiveSeller?.name})</option>
                  {displayStores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name.split(' ')[0]} ({s.id})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 5 Primary Metric Stat Cards (including Fraud Detection) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              
              {/* Card 1: Total Sales */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Sales</span>
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-black text-slate-900 tracking-tight font-mono">
                    ₹{totalSales.toLocaleString('en-IN')}
                  </span>
                  <div className="flex items-center space-x-2 mt-1 text-xs">
                    <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      {totalDispatches} Dispatches
                    </span>
                    <span className="text-slate-400">· Avg ₹{avgOrderValue.toLocaleString('en-IN')}</span>
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Gross Value Shipped</span>
                  <span className="text-slate-700 font-semibold">100% Verified</span>
                </div>
              </div>

              {/* Card 2: Total Returns */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Returns</span>
                  <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600">
                    <RefreshCcw className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-black text-slate-900 tracking-tight font-mono">
                    {totalReturns} <span className="text-sm font-semibold text-slate-500">Units</span>
                  </span>
                  <div className="flex items-center space-x-2 mt-1 text-xs">
                    <span className="text-sky-700 font-bold bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                      {returnRate}% Return Rate
                    </span>
                    <span className="text-slate-400">· {totalDispatches - totalReturns} Kept</span>
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Reverse Transit Ratio</span>
                  <span className="text-emerald-600 font-semibold">Low Disruption</span>
                </div>
              </div>

              {/* Card 3: Total Defected / Damaged Items */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Defected / Damaged</span>
                  <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-black text-rose-700 tracking-tight font-mono">
                    {totalDamaged} <span className="text-sm font-semibold text-slate-500">Claims</span>
                  </span>
                  <div className="flex items-center space-x-2 mt-1 text-xs">
                    <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                      {defectRate}% Defect Rate
                    </span>
                    <span className="text-slate-400">· {severeDamaged} Severe</span>
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Pre-Dispatch Proof</span>
                  <span className="text-indigo-600 font-semibold">Protected</span>
                </div>
              </div>

              {/* Card 4: Fraud Claims Detected & Protected */}
              <div className="bg-white border-2 border-rose-200/90 rounded-2xl p-5 shadow-xs relative overflow-hidden bg-gradient-to-br from-white to-rose-50/40">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-rose-700">Fraud Detected</span>
                  <div className="w-9 h-9 rounded-xl bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-700">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-black text-rose-700 tracking-tight font-mono">
                    {totalFraudClaims} <span className="text-sm font-semibold text-rose-500">Claims</span>
                  </span>
                  <div className="flex items-center space-x-2 mt-1 text-xs">
                    <span className="text-rose-800 font-extrabold bg-rose-100 px-2 py-0.5 rounded-md border border-rose-300">
                      {fraudRiskRate}% Risk Rate
                    </span>
                    <span className="text-slate-500">· ₹{totalFraudRevenueProtected.toLocaleString('en-IN')} Saved</span>
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-rose-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Item Swaps & Mismatches</span>
                  <span className="text-rose-700 font-bold">{totalFraudClaims > 0 ? 'Contested' : 'Zero Fraud'}</span>
                </div>
              </div>

              {/* Card 5: Gemini AI Verdicts */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Gemini AI Verdicts</span>
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                    <Bot className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-black text-indigo-900 tracking-tight font-mono">
                    {totalAIReports} <span className="text-sm font-semibold text-slate-500">Audited</span>
                  </span>
                  <div className="flex items-center space-x-2 mt-1 text-xs">
                    <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-[10px]">
                      Repl: {recReplace}
                    </span>
                    <span className="text-sky-700 font-bold bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200 text-[10px]">
                      Ref: {recRefund}
                    </span>
                    <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-[10px]">
                      Ret: {recReturn}
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Gemini 3.8 Flash</span>
                  <span className="text-indigo-600 font-semibold">1-Click PDF Ready</span>
                </div>
              </div>

            </div>

            {/* Visual Graphs Row 1: Sales By Category & Returns Disposition Flow */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Graph 1: Sales Bar Graph (7 cols) */}
              <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                      <span>Total Sales & Revenue by Product Category</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Monetary dispatch value (₹) recorded with tamper-evident packing proofs
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                    ₹{totalSales.toLocaleString('en-IN')} Total
                  </span>
                </div>

                {/* SVG & HTML Visual Bar Chart */}
                <div className="pt-2">
                  <div className="h-56 flex items-end justify-between gap-4 sm:gap-6 px-2 sm:px-4 pb-2 border-b border-slate-200">
                    {categoryData.map((cd, idx) => {
                      const heightPercent = maxCatSales > 0 && cd.sales > 0 
                        ? Math.max(14, Math.round((cd.sales / maxCatSales) * 100))
                        : (totalSales === 0 ? [65, 45, 80, 50, 70][idx] : 10);

                      return (
                        <div key={cd.category} className="flex-1 flex flex-col items-center h-full justify-end group">
                          {/* Top Value Tag */}
                          <div className="mb-2 opacity-90 group-hover:opacity-100 transition-all text-center">
                            <span className="text-[10px] font-mono font-bold text-slate-700 block">
                              ₹{(cd.sales || (totalSales === 0 ? [18500, 8900, 24000, 12000, 19500][idx] : 0)).toLocaleString('en-IN')}
                            </span>
                            <span className="text-[9px] text-slate-400">
                              {cd.count || (totalSales === 0 ? [2, 1, 3, 2, 2][idx] : 0)} orders
                            </span>
                          </div>

                          {/* Gradient Bar with Animated Height */}
                          <div 
                            style={{ height: `${heightPercent}%` }}
                            className="w-full max-w-[48px] rounded-t-xl bg-gradient-to-t from-indigo-600 via-indigo-500 to-violet-400 group-hover:from-indigo-700 group-hover:to-violet-500 transition-all duration-300 shadow-xs relative"
                          >
                            <div className="absolute inset-x-0 top-0 h-1.5 bg-white/30 rounded-t-xl" />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Horizontal Category Labels */}
                  <div className="flex items-center justify-between gap-2 px-2 sm:px-4 pt-3">
                    {categoryData.map((cd) => (
                      <span key={cd.category} className="flex-1 text-center text-[10px] font-bold text-slate-600 truncate">
                        {cd.category.split(' ')[0]}
                      </span>
                    ))}
                  </div>

                  {totalSales === 0 && (
                    <div className="mt-3 p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-200 text-[11px] text-indigo-900 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Projection Preview shown above. Record packing proofs to see live merchant data.</span>
                      </span>
                      <button
                        onClick={() => setActiveSubTab('new-record')}
                        className="text-xs font-bold text-indigo-700 hover:underline shrink-0"
                      >
                        + Record Packaging Proof
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Graph 2: Returns & Shipments Disposition Flow (5 cols) */}
              <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-sm space-y-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                      <RefreshCcw className="w-4 h-4 text-sky-600" />
                      <span>Total Returns & Shipments Flow</span>
                    </h4>
                    <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-xl border border-sky-200">
                      {returnRate}% Rate
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Comparative distribution of deliveries vs reverse logistics
                  </p>
                </div>

                {/* Progress bar visual comparison */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">Shipment Fulfillment Success</span>
                    <span className="font-extrabold text-emerald-700">
                      {totalDispatches > 0 ? (100 - parseFloat(returnRate)).toFixed(1) : '96.8'}% Clean Delivery
                    </span>
                  </div>

                  <div className="h-4 rounded-full bg-slate-100 overflow-hidden flex border border-slate-200 p-0.5">
                    <div 
                      style={{ width: `${totalDispatches > 0 ? Math.max(10, 100 - parseFloat(returnRate)) : 96.8}%` }}
                      className="bg-emerald-500 rounded-full h-full transition-all"
                      title="Successful Clean Deliveries"
                    />
                    <div 
                      style={{ width: `${totalDispatches > 0 ? Math.max(5, parseFloat(returnRate)) : 3.2}%` }}
                      className="bg-sky-400 rounded-full h-full transition-all"
                      title="Customer Return Claims"
                    />
                  </div>

                  {/* Flow breakdown pill tiles */}
                  <div className="grid grid-cols-2 gap-2.5 pt-2">
                    <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200">
                      <span className="text-[10px] uppercase font-bold text-emerald-800 block">Clean Deliveries</span>
                      <span className="text-lg font-extrabold text-emerald-900 font-mono">
                        {Math.max(0, totalDispatches - totalReturns) || (totalDispatches === 0 ? 28 : 0)}
                      </span>
                      <span className="text-[10px] text-emerald-700 block mt-0.5">Zero customer disputes</span>
                    </div>

                    <div className="p-3 rounded-2xl bg-sky-50/60 border border-sky-200">
                      <span className="text-[10px] uppercase font-bold text-sky-800 block">Returns & Claims</span>
                      <span className="text-lg font-extrabold text-sky-900 font-mono">
                        {totalReturns || (totalDispatches === 0 ? 1 : 0)}
                      </span>
                      <span className="text-[10px] text-sky-700 block mt-0.5">Routed to merchant review</span>
                    </div>

                    <div className="p-3 rounded-2xl bg-indigo-50/60 border border-indigo-200">
                      <span className="text-[10px] uppercase font-bold text-indigo-800 block">Replacements</span>
                      <span className="text-lg font-extrabold text-indigo-900 font-mono">
                        {recReplace || (totalDispatches === 0 ? 1 : 0)}
                      </span>
                      <span className="text-[10px] text-indigo-700 block mt-0.5">Gemini recommended</span>
                    </div>

                    <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200">
                      <span className="text-[10px] uppercase font-bold text-amber-800 block">Transit Insurance</span>
                      <span className="text-lg font-extrabold text-amber-900 font-mono">
                        {filteredCases.filter(c => (c.status || '').includes('Courier')).length || 0}
                      </span>
                      <span className="text-[10px] text-amber-700 block mt-0.5">Courier liability claims</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 text-[11px] text-slate-500 border-t border-slate-100 flex items-center justify-between">
                  <span>Courier Partner SLA: <strong className="text-slate-700">99.4% On-Time</strong></span>
                  <span className="text-emerald-700 font-bold">Standard Compliant</span>
                </div>
              </div>

            </div>

            {/* Visual Graphs Row 2: Defected Items Severity Breakdown & Gemini AI Decisions */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Graph 3: Defected / Damaged Items Breakdown (6 cols) */}
              <div className="lg:col-span-6 bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>Total Defected / Damaged Items Breakdown</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Severity breakdown and damage root-cause analysis
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-xl border border-rose-200">
                    {totalDamaged} Total Defect Claims
                  </span>
                </div>

                {/* Horizontal Progress Breakdown Bars */}
                <div className="space-y-4 pt-1">
                  
                  {/* Category 1: Severe Transit Impact */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                        <span>Critical Fracture / Unit Crushed in Transit</span>
                      </span>
                      <span className="font-mono font-bold text-rose-700">
                        {severeDamaged} claims ({totalDamaged > 0 ? Math.round((severeDamaged / totalDamaged) * 100) : 50}%)
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                      <div 
                        style={{ width: `${totalDamaged > 0 ? Math.round((severeDamaged / totalDamaged) * 100) : 50}%` }}
                        className="h-full bg-gradient-to-r from-rose-500 to-red-500 rounded-full"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400">Outer box impact with high shock force in courier hub</span>
                  </div>

                  {/* Category 2: Moderate Packaging Crush */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        <span>Packaging Crushed / Tamper Seal Breach</span>
                      </span>
                      <span className="font-mono font-bold text-amber-700">
                        {moderateDamaged} claims ({totalDamaged > 0 ? Math.round((moderateDamaged / totalDamaged) * 100) : 35}%)
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                      <div 
                        style={{ width: `${totalDamaged > 0 ? Math.round((moderateDamaged / totalDamaged) * 100) : 35}%` }}
                        className="h-full bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400">Carton de-shaping during sorting / stack compression</span>
                  </div>

                  {/* Category 3: Minor Cosmetic Scratches */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                        <span>Minor Cosmetic Scratches / Surface Blemish</span>
                      </span>
                      <span className="font-mono font-bold text-sky-700">
                        {minorDamaged} claims ({totalDamaged > 0 ? Math.round((minorDamaged / totalDamaged) * 100) : 15}%)
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                      <div 
                        style={{ width: `${totalDamaged > 0 ? Math.round((minorDamaged / totalDamaged) * 100) : 15}%` }}
                        className="h-full bg-gradient-to-r from-sky-500 to-blue-500 rounded-full"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400">Pre-pack verification photos exonerate merchant</span>
                  </div>

                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                  <span>Merchant Protection Rate:</span>
                  <strong className="text-emerald-700 font-extrabold">100% Pre-Dispatch Camera Backed</strong>
                </div>
              </div>

              {/* Graph 4: Gemini AI Damage Assessment Verdict Breakdown (6 cols) */}
              <div className="lg:col-span-6 bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                      <Bot className="w-4 h-4 text-indigo-600" />
                      <span>Gemini AI Assessment Recommendation Distribution</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Objective AI decisions on damaged goods: Replace vs Refund vs Return
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-xl border border-indigo-200">
                    Gemini 3.8 Flash
                  </span>
                </div>

                {/* 3 Decision Pillars: Replace vs Refund vs Return */}
                <div className="grid grid-cols-3 gap-3">
                  
                  {/* Pillar 1: REPLACE */}
                  <div className="p-3.5 rounded-2xl bg-emerald-50/70 border-2 border-emerald-200 text-center space-y-1">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                      REPLACE
                    </span>
                    <span className="text-2xl font-black text-emerald-900 font-mono block">
                      {recReplace || (filteredCases.length === 0 ? 1 : 0)}
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-700 block">
                      Unit Swapped
                    </span>
                    <p className="text-[9px] text-slate-500 leading-tight pt-1">
                      Courier crush damage with replacement stock available
                    </p>
                  </div>

                  {/* Pillar 2: REFUND */}
                  <div className="p-3.5 rounded-2xl bg-sky-50/70 border-2 border-sky-200 text-center space-y-1">
                    <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider block">
                      REFUND
                    </span>
                    <span className="text-2xl font-black text-sky-900 font-mono block">
                      {recRefund || (filteredCases.length === 0 ? 0 : 0)}
                    </span>
                    <span className="text-[10px] font-semibold text-sky-700 block">
                      Monetary Credit
                    </span>
                    <p className="text-[9px] text-slate-500 leading-tight pt-1">
                      Irreparable item or customer eligible for money back
                    </p>
                  </div>

                  {/* Pillar 3: RETURN */}
                  <div className="p-3.5 rounded-2xl bg-amber-50/70 border-2 border-amber-200 text-center space-y-1">
                    <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                      RETURN
                    </span>
                    <span className="text-2xl font-black text-amber-900 font-mono block">
                      {recReturn || (filteredCases.length === 0 ? 0 : 0)}
                    </span>
                    <span className="text-[10px] font-semibold text-amber-700 block">
                      Physical Return
                    </span>
                    <p className="text-[9px] text-slate-500 leading-tight pt-1">
                      Reverse pickup required before merchant payout
                    </p>
                  </div>

                </div>

                {/* Gemini AI PDF Assessment Generation Action */}
                <div className="pt-2">
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border border-indigo-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center space-x-2.5">
                      <Sparkles className="w-5 h-5 text-indigo-600 shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-indigo-950 block">
                          Certified Gemini AI Damage Dossier PDF
                        </span>
                        <span className="text-[11px] text-slate-600">
                          Generates 2-page cryptographic PDF with photo comparisons, courier tracking & verdict
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveSubTab('cases')}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-xs shrink-0"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Review Damage Claims</span>
                    </button>
                  </div>
                </div>

              </div>

            </div>

          </div>
        );
      })()}

      {/* ======================================================== */}
      {/* SUB-TAB 1: REDIRECTED CUSTOMER DAMAGE CLAIMS */}
      {/* ======================================================== */}
      {activeSubTab === 'cases' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <span>Customer Damage Claims Redirected to Marketplace Stores</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Each case includes customer-uploaded photo evidence, quoted problem description, and downloadable Evidence Case PDF.
              </p>
            </div>
            
            {/* Store filter */}
            <div className="flex items-center space-x-2 shrink-0">
              <span className="text-xs text-slate-500 font-semibold">Filter Store:</span>
              <select
                value={activeSellerFilter}
                onChange={(e) => setActiveSellerFilter(e.target.value)}
                className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-indigo-500 shadow-xs"
              >
                <option value="all">All Stores ({evidenceCases.length} claims)</option>
                {displayStores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name.split(' ')[0]} ({evidenceCases.filter(c => c.sellerId === s.id).length})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Fraud & Claims Filter Tabs */}
          {evidenceCases.length > 0 && (() => {
            const storeCases = activeSellerFilter === 'all' 
              ? evidenceCases 
              : evidenceCases.filter(c => !c.sellerId || c.sellerId === activeSellerFilter);

            const fraudCount = storeCases.filter(c => 
              c.geminiReport?.authenticityStatus === 'FRAUD' || 
              (c.geminiReport?.fraudProbability || 0) > 50 || 
              c.geminiReport?.recommendation === 'CONTEST' ||
              c.fraudDetected ||
              (c.status || '').toLowerCase().includes('fraud')
            ).length;

            const genuineCount = storeCases.filter(c => 
              c.geminiReport?.authenticityStatus === 'ORIGINAL' && (c.geminiReport?.fraudProbability || 0) <= 50
            ).length;

            const pendingCount = storeCases.filter(c => !c.geminiReport).length;

            return (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setClaimsFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                    claimsFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>All Claims ({storeCases.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setClaimsFilter('fraud')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                    claimsFilter === 'fraud'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Suspected Fraud ({fraudCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setClaimsFilter('genuine')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                    claimsFilter === 'genuine'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Genuine Damage ({genuineCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setClaimsFilter('pending')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                    claimsFilter === 'pending'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Pending AI ({pendingCount})</span>
                </button>
              </div>
            );
          })()}

          {evidenceCases.length === 0 ? (
            <div className="bg-white border border-slate-200/90 rounded-3xl p-12 text-center shadow-sm space-y-4 max-w-2xl mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">No Customer Damage Claims Yet</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                All mock claims have been cleared. When customers report damage issues on their booked orders in the Customer Portal, their claims will be redirected here in real-time along with official case PDFs and photo evidence.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => setActiveSubTab('new-record')}
                  className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition shadow-sm inline-flex items-center space-x-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Enter Product Packing & Logistics Proof</span>
                </button>
              </div>
            </div>
          ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: List of redirected customer cases (4 cols) */}
            <div className="lg:col-span-4 space-y-3">
              {(activeSellerFilter === 'all' 
                ? evidenceCases 
                : evidenceCases.filter(c => !c.sellerId || c.sellerId === activeSellerFilter)
              ).filter(c => {
                if (claimsFilter === 'fraud') {
                  return c.geminiReport?.authenticityStatus === 'FRAUD' || 
                         (c.geminiReport?.fraudProbability || 0) > 50 || 
                         c.geminiReport?.recommendation === 'CONTEST' || 
                         c.fraudDetected || 
                         (c.status || '').toLowerCase().includes('fraud');
                }
                if (claimsFilter === 'genuine') {
                  return c.geminiReport?.authenticityStatus === 'ORIGINAL' && (c.geminiReport?.fraudProbability || 0) <= 50;
                }
                if (claimsFilter === 'pending') {
                  return !c.geminiReport;
                }
                return true;
              }).map((c) => {
                const isSelected = selectedCaseForReview?.caseId === c.caseId;
                const isFraud = c.geminiReport?.authenticityStatus === 'FRAUD' || 
                                (c.geminiReport?.fraudProbability || 0) > 50 || 
                                c.geminiReport?.recommendation === 'CONTEST' || 
                                c.fraudDetected ||
                                (c.status || '').toLowerCase().includes('fraud');
                const isGenuine = c.geminiReport?.authenticityStatus === 'ORIGINAL' && (c.geminiReport?.fraudProbability || 0) <= 50;

                return (
                  <div
                    key={c.caseId}
                    onClick={() => setSelectedCaseForReview(c)}
                    className={`p-4 rounded-2xl border cursor-pointer transition ${
                      isSelected
                        ? (isFraud
                            ? 'bg-rose-50/80 border-rose-400 ring-2 ring-rose-200 shadow-sm'
                            : 'bg-gradient-to-r from-indigo-50/90 to-purple-50/50 border-indigo-400 ring-2 ring-indigo-200 shadow-sm')
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-mono font-bold text-indigo-700">{c.caseId}</span>
                      {isFraud ? (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 flex items-center space-x-1 shrink-0">
                          <ShieldAlert className="w-3 h-3 text-rose-600" />
                          <span>FRAUD ({c.geminiReport?.fraudProbability || 92}%)</span>
                        </span>
                      ) : isGenuine ? (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center space-x-1 shrink-0">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          <span>GENUINE</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {c.damageSeverity}
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 mt-1.5 line-clamp-1">{c.productName}</h4>
                    <div className="text-[11px] text-slate-600 mt-0.5 space-y-0.5">
                      <p>
                        Order: <strong className="font-mono text-slate-800">{c.orderNo}</strong> • Customer: <strong className="text-slate-800">{c.customerName}</strong>
                      </p>
                      <p className="text-[10px] text-indigo-700 font-medium">
                        Redirected to: <strong className="text-indigo-900">{c.sellerName || 'Apex Tech'}</strong> ({c.sellerId || 'SLR-7729'})
                      </p>
                      {c.customerAddress && (
                        <p className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{c.customerAddress}, {c.customerCity} - {c.customerPincode}</span>
                        </p>
                      )}
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">{c.reportedAt}</span>
                      <span className={`font-bold px-2 py-0.5 rounded-full border ${
                        isFraud 
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {c.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Column: 3-Way Evidence Cross-Examination Matrix (8 cols) */}
            {selectedCaseForReview && (
              <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
                
                {/* Header for Selected Case */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-mono font-extrabold text-indigo-700">
                        {selectedCaseForReview.caseId}
                      </span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold">
                        {selectedCaseForReview.status}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mt-1">
                      {selectedCaseForReview.productName}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Order Ref: <strong className="text-slate-700">{selectedCaseForReview.orderNo}</strong> • Customer: <strong className="text-slate-700">{selectedCaseForReview.customerName}</strong> ({selectedCaseForReview.customerPhone})
                    </p>
                    {selectedCaseForReview.customerAddress && (
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span>Delivery Address: <strong className="text-slate-700">{selectedCaseForReview.customerAddress}, {selectedCaseForReview.customerCity} - {selectedCaseForReview.customerPincode}</strong></span>
                      </p>
                    )}
                  </div>

                  {/* PDF Download Button */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        const proof = getMatchingPackingRecord(selectedCaseForReview.orderNo);
                        handleGenerateGeminiPDFForRecord(proof || selectedCaseForReview);
                      }}
                      disabled={analyzingOrderNo === selectedCaseForReview.orderNo}
                      className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-xs disabled:opacity-60"
                      title="Download Certified Gemini AI Case PDF with Photos"
                    >
                      {analyzingOrderNo === selectedCaseForReview.orderNo ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-amber-300" />
                      )}
                      <span>
                        {analyzingOrderNo === selectedCaseForReview.orderNo ? 'Generating PDF...' : 'Download Gemini AI PDF'}
                      </span>
                    </button>
                    
                    <button
                      onClick={() => onOpenDossierModal(selectedCaseForReview)}
                      className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 shadow-xs"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View Dossier</span>
                    </button>
                  </div>
                </div>

                {/* Quoted Customer Problem Statement - Pastel Rose */}
                <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">
                      Customer Problem Claim (Verbatim Statement)
                    </span>
                    <span className="text-[10px] font-mono text-rose-800 bg-rose-100 px-2 py-0.5 rounded font-bold">
                      Category: {selectedCaseForReview.damageType}
                    </span>
                  </div>
                  <p className="text-xs text-slate-800 italic leading-relaxed">
                    "{selectedCaseForReview.customerClaim}"
                  </p>
                </div>

                {/* THE 3-WAY SIDE-BY-SIDE EVIDENCE MATRIX */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>3-Way Evidence Comparison Matrix</span>
                  </h4>

                  {(() => {
                    const packingProof = getMatchingPackingRecord(selectedCaseForReview.orderNo);
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        
                        {/* 1. Seller Before Packing - Pastel Mint */}
                        {(() => {
                          const beforeList = Array.isArray(packingProof?.beforePacking?.photos) && packingProof.beforePacking.photos.length > 0
                            ? packingProof.beforePacking.photos
                            : (packingProof?.beforePacking?.photo ? [packingProof.beforePacking.photo] : ['/assets/P01.png']);
                          const currentBefore = beforeList[activeReviewBeforeIdx] || beforeList[0];

                          return (
                            <div className="rounded-2xl bg-emerald-50/50 border border-emerald-200 p-3 space-y-2">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-bold text-emerald-800">1. Seller Pre-Packing</span>
                                <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                                  Angle {activeReviewBeforeIdx + 1} of {beforeList.length}
                                </span>
                              </div>
                              <div 
                                className="aspect-square rounded-xl bg-white border border-emerald-200 overflow-hidden cursor-pointer"
                                onClick={() => {
                                  if (beforeList.length > 1) {
                                    setActiveReviewBeforeIdx((prev) => (prev + 1) % beforeList.length);
                                  }
                                }}
                                title={beforeList.length > 1 ? "Click to toggle next angle" : "Pre-dispatch unit photo"}
                              >
                                <img
                                  src={currentBefore}
                                  alt="Before Packing"
                                  className="w-full h-full object-contain p-2"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = '/assets/P01.png';
                                  }}
                                />
                              </div>
                              <div className="text-[10px] space-y-0.5 text-slate-600">
                                <p className="text-emerald-900 font-bold">Condition: Pristine</p>
                                <p>Serial: {packingProof?.beforePacking?.serialNo || 'SN-VERIFIED-OK'}</p>
                                <p>QC: {packingProof?.beforePacking?.qcInspectorId || 'QC-INSP-88'}</p>
                                {beforeList.length > 1 && (
                                  <p className="text-emerald-700 font-semibold text-[9px] pt-0.5">
                                    Click photo to cycle {beforeList.length} angles
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        {/* 2. Seller After Packing & Tamper Seal - Pastel Sky */}
                        {(() => {
                          const afterList = Array.isArray(packingProof?.afterPacking?.photos) && packingProof.afterPacking.photos.length > 0
                            ? packingProof.afterPacking.photos
                            : (packingProof?.afterPacking?.photo ? [packingProof.afterPacking.photo] : ['/assets/P04.png']);
                          const currentAfter = afterList[activeReviewAfterIdx] || afterList[0];

                          return (
                            <div className="rounded-2xl bg-sky-50/50 border border-sky-200 p-3 space-y-2">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-bold text-sky-800">2. Seller Dispatched Box</span>
                                <span className="text-[10px] font-mono font-bold bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded">
                                  Step {activeReviewAfterIdx + 1} of {afterList.length}
                                </span>
                              </div>
                              <div 
                                className="aspect-square rounded-xl bg-white border border-sky-200 overflow-hidden cursor-pointer"
                                onClick={() => {
                                  if (afterList.length > 1) {
                                    setActiveReviewAfterIdx((prev) => (prev + 1) % afterList.length);
                                  }
                                }}
                                title={afterList.length > 1 ? "Click to toggle next packing step" : "Dispatched box photo"}
                              >
                                <img
                                  src={currentAfter}
                                  alt="After Packing"
                                  className="w-full h-full object-contain p-2"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = '/assets/P04.png';
                                  }}
                                />
                              </div>
                              <div className="text-[10px] space-y-0.5 text-slate-600">
                                <p className="text-sky-900 font-bold">Gross Weight: {packingProof?.afterPacking?.boxWeightGrams || 980}g</p>
                                <p>Tape #: {packingProof?.afterPacking?.securityTapeNo || 'TAPE-APEX-88219'}</p>
                                <p>Courier: {selectedCaseForReview.courierPartner || 'Blue Dart'}</p>
                                {afterList.length > 1 && (
                                  <p className="text-sky-700 font-semibold text-[9px] pt-0.5">
                                    Click photo to cycle {afterList.length} steps
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        {/* 3. Customer Received Condition - Pastel Rose */}
                        {(() => {
                          const customerPhotos = (selectedCaseForReview.customerEvidenceImages && selectedCaseForReview.customerEvidenceImages.length > 0)
                            ? selectedCaseForReview.customerEvidenceImages
                            : (selectedCaseForReview.customerEvidenceImage ? [selectedCaseForReview.customerEvidenceImage] : ['/assets/P01.png']);
                          const currentPhoto = customerPhotos[activeCustomerPhotoIdx] || customerPhotos[0];

                          return (
                            <div className="rounded-2xl bg-rose-50/50 border border-rose-200 p-3 space-y-2">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-bold text-rose-800">3. Customer Received</span>
                                <span className="text-[10px] font-mono font-bold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded">
                                  Angle {activeCustomerPhotoIdx + 1} of {customerPhotos.length}
                                </span>
                              </div>
                              <div className="aspect-square rounded-xl bg-white border border-rose-200 overflow-hidden relative">
                                <img
                                  src={currentPhoto}
                                  alt="Customer Evidence"
                                  className="w-full h-full object-contain p-2"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = '/assets/P01.png';
                                  }}
                                />
                              </div>
                              <div className="text-[10px] space-y-0.5 text-slate-600">
                                <p className="text-rose-900 font-bold truncate">Reported: {selectedCaseForReview.damageType}</p>
                                <p>AWB: {selectedCaseForReview.awbNumber || 'BLUEDART-882910471'}</p>
                                <p className="text-amber-800 font-semibold">{customerPhotos.length} Photos Cross-Examined</p>
                              </div>
                            </div>
                          );
                        })()}

                      </div>
                    );
                  })()}

                  {/* Dedicated Multi-Angle Photographic Gallery (4-5 Images) submitted by Customer */}
                  {(() => {
                    const photos = (selectedCaseForReview.customerEvidenceImages && selectedCaseForReview.customerEvidenceImages.length > 0)
                      ? selectedCaseForReview.customerEvidenceImages
                      : (selectedCaseForReview.customerEvidenceImage ? [selectedCaseForReview.customerEvidenceImage] : []);
                    if (photos.length <= 1) return null;

                    const photoSlotLabels = [
                      '1. Outer Packaging / Box Crush',
                      '2. Product Unit Fracture',
                      '3. Shipping Label & AWB Barcode',
                      '4. Macro Close-Up Damage',
                      '5. Accessories / Unboxing'
                    ];

                    return (
                      <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                              Customer Photo Gallery ({photos.length} Multi-Angle Photos)
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                              Analyzed by Gemini
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 font-medium">
                            Click thumbnail to preview in 3-Way matrix
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                          {photos.map((imgUrl, pIdx) => {
                            const isCurrent = activeCustomerPhotoIdx === pIdx;
                            return (
                              <button
                                key={pIdx}
                                type="button"
                                onClick={() => setActiveCustomerPhotoIdx(pIdx)}
                                className={`group rounded-xl p-1.5 border text-left transition-all ${
                                  isCurrent
                                    ? 'bg-white border-indigo-500 ring-2 ring-indigo-200 shadow-sm'
                                    : 'bg-white/80 border-slate-200 hover:border-slate-300 hover:bg-white'
                                }`}
                              >
                                <div className="aspect-square rounded-lg bg-slate-100 overflow-hidden mb-1.5">
                                  <img
                                    src={imgUrl}
                                    alt={`Angle ${pIdx + 1}`}
                                    className="w-full h-full object-contain p-1"
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.src = '/assets/P01.png';
                                    }}
                                  />
                                </div>
                                <span className="text-[10px] font-bold block text-slate-700 truncate">
                                  {photoSlotLabels[pIdx] || `Photo ${pIdx + 1}`}
                                </span>
                                <span className={`text-[9px] font-semibold block ${isCurrent ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}>
                                  {isCurrent ? '● Active View' : 'Click to View'}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* ======================================================== */}
                {/* GEMINI AI DECISION & DAMAGE REPORT FOR SELLER */}
                {/* ======================================================== */}
                {selectedCaseForReview.geminiReport ? (
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-50/90 via-purple-50/70 to-pink-50/70 border-2 border-indigo-200 space-y-4 shadow-xs">
                    
                    {/* Header: Model & Recommendation */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100 pb-3">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                          <Bot className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                              Gemini Forensic Vision Damage & Fraud Review
                            </span>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-300">
                              {selectedCaseForReview.geminiReport.model || 'Gemini Vision'}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500">
                            Seller Risk: <strong className={
                              (selectedCaseForReview.geminiReport.authenticityStatus === 'FRAUD' || (selectedCaseForReview.geminiReport.fraudProbability || 0) > 50 || selectedCaseForReview.geminiReport.recommendation === 'CONTEST')
                                ? 'text-rose-700 font-extrabold'
                                : (selectedCaseForReview.geminiReport.authenticityStatus === 'TAMPER_SUSPECTED' || selectedCaseForReview.geminiReport.recommendation === 'RETURN')
                                ? 'text-amber-700 font-extrabold'
                                : (selectedCaseForReview.geminiReport.recommendation === 'VERIFIED_PRISTINE' ? 'text-emerald-700 font-extrabold' : 'text-teal-700 font-extrabold')
                            }>
                              {(selectedCaseForReview.geminiReport.authenticityStatus === 'FRAUD' || (selectedCaseForReview.geminiReport.fraudProbability || 0) > 50 || selectedCaseForReview.geminiReport.recommendation === 'CONTEST')
                                ? 'HIGH RISK'
                                : (selectedCaseForReview.geminiReport.authenticityStatus === 'TAMPER_SUSPECTED' || selectedCaseForReview.geminiReport.recommendation === 'RETURN')
                                ? 'MODERATE RISK'
                                : (selectedCaseForReview.geminiReport.recommendation === 'VERIFIED_PRISTINE' ? 'SAFE' : 'LOW RISK')}
                            </strong> · Liability: <strong className="text-slate-800">{selectedCaseForReview.geminiReport.liability}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Prominent Recommendation Badge */}
                      <div>
                        {selectedCaseForReview.geminiReport.recommendation === 'REPLACE' && (
                          <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 border-2 border-emerald-300 font-extrabold text-xs shadow-xs">
                            <RefreshCw className="w-4 h-4 text-emerald-600" />
                            <span>RECOMMENDED: REPLACE PRODUCT</span>
                          </span>
                        )}
                        {selectedCaseForReview.geminiReport.recommendation === 'REFUND' && (
                          <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-sky-100 text-sky-800 border-2 border-sky-300 font-extrabold text-xs shadow-xs">
                            <DollarSign className="w-4 h-4 text-sky-600" />
                            <span>RECOMMENDED: ISSUE REFUND</span>
                          </span>
                        )}
                        {selectedCaseForReview.geminiReport.recommendation === 'RETURN' && (
                          <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-100 text-amber-800 border-2 border-amber-300 font-extrabold text-xs shadow-xs">
                            <RefreshCcw className="w-4 h-4 text-amber-600" />
                            <span>RECOMMENDED: RETURN BY CUSTOMER</span>
                          </span>
                        )}
                        {selectedCaseForReview.geminiReport.recommendation === 'CONTEST' && (
                          <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-100 text-rose-800 border-2 border-rose-300 font-extrabold text-xs shadow-xs">
                            <AlertCircle className="w-4 h-4 text-rose-600" />
                            <span>RECOMMENDED: CONTEST FRAUDULENT CLAIM</span>
                          </span>
                        )}
                        {selectedCaseForReview.geminiReport.recommendation === 'VERIFIED_PRISTINE' && (
                          <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 border-2 border-emerald-300 font-extrabold text-xs shadow-xs">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            <span>VERIFIED PRISTINE PACKAGING</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* FORENSIC VERDICT: FRAUD VS ORIGINAL BANNER */}
                    {(() => {
                      const rep = selectedCaseForReview.geminiReport;
                      const isFraud = rep.authenticityStatus === 'FRAUD' || (rep.fraudProbability || 0) > 50;
                      const isTamper = rep.authenticityStatus === 'TAMPER_SUSPECTED';

                      return (
                        <div className={`p-4 rounded-xl border-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                          isFraud
                            ? 'bg-rose-50 border-rose-300 text-rose-950'
                            : isTamper
                            ? 'bg-amber-50 border-amber-300 text-amber-950'
                            : 'bg-emerald-50 border-emerald-300 text-emerald-950'
                        }`}>
                          <div className="flex items-center space-x-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              isFraud ? 'bg-rose-200 text-rose-700' : isTamper ? 'bg-amber-200 text-amber-700' : 'bg-emerald-200 text-emerald-700'
                            }`}>
                              {isFraud ? <ShieldAlert className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                            </div>
                            <div>
                              <span className="text-[10px] font-extrabold uppercase tracking-wider block opacity-75">
                                Forensic Authenticity Verdict:
                              </span>
                              <span className="text-xs sm:text-sm font-extrabold tracking-tight">
                                {rep.verdictLabel || (isFraud ? 'SUSPECTED FRAUD / ANOMALOUS CLAIM' : 'ORIGINAL / GENUINE TRANSIT DAMAGE VERIFIED')}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 shrink-0">
                            <div className="bg-white/80 px-3 py-1.5 rounded-lg border border-slate-200 text-center">
                              <span className="text-[9px] font-bold text-slate-500 uppercase block">Fraud Risk</span>
                              <span className={`text-xs font-black ${isFraud ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {rep.fraudProbability !== undefined ? rep.fraudProbability : (isFraud ? 92 : 4)}%
                              </span>
                            </div>
                            <div className="bg-white/80 px-3 py-1.5 rounded-lg border border-slate-200 text-center">
                              <span className="text-[9px] font-bold text-slate-500 uppercase block">Authenticity</span>
                              <span className={`text-xs font-black ${isFraud ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {rep.authenticityScore !== undefined ? rep.authenticityScore : (isFraud ? 8 : 96)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* 4-POINT FORENSIC INTEGRITY MATRIX */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">Serial Verification</span>
                        <span className={`text-[11px] font-extrabold ${
                          (selectedCaseForReview.geminiReport.serialNumberVerification || '').includes('MISMATCH')
                            ? 'text-rose-600'
                            : 'text-emerald-700'
                        }`}>
                          {selectedCaseForReview.geminiReport.serialNumberVerification || 'MATCHED'}
                        </span>
                      </div>

                      <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">Tamper Tape</span>
                        <span className={`text-[11px] font-extrabold ${
                          (selectedCaseForReview.geminiReport.tamperSealIntegrity || '').includes('BREACHED')
                            ? 'text-rose-600'
                            : 'text-emerald-700'
                        }`}>
                          {selectedCaseForReview.geminiReport.tamperSealIntegrity || 'INTACT & VERIFIED'}
                        </span>
                      </div>

                      <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">Box Correlation</span>
                        <span className="text-[11px] font-extrabold text-slate-800 line-clamp-1">
                          {selectedCaseForReview.geminiReport.boxCrushCorrelation || 'Aligned with crush'}
                        </span>
                      </div>

                      <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">Assigned Liability</span>
                        <span className="text-[11px] font-extrabold text-indigo-700 line-clamp-1">
                          {selectedCaseForReview.geminiReport.liability}
                        </span>
                      </div>
                    </div>

                    {/* CROSS-IMAGE COMPARATIVE EVIDENCE BREAKDOWN */}
                    {selectedCaseForReview.geminiReport.crossImageComparison && (
                      <div className="space-y-2 bg-white p-3.5 rounded-xl border border-indigo-100">
                        <span className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-wider block">
                          Cross-Image Comparative Evidence (Camera Truth):
                        </span>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-[11px]">
                          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                            <span className="font-bold text-slate-900 block mb-0.5">1. Pre-Pack vs Customer Unit:</span>
                            <p className="text-slate-600 leading-relaxed">
                              {selectedCaseForReview.geminiReport.crossImageComparison.beforeVsDamaged}
                            </p>
                          </div>

                          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                            <span className="font-bold text-slate-900 block mb-0.5">2. Dispatched Box vs Received:</span>
                            <p className="text-slate-600 leading-relaxed">
                              {selectedCaseForReview.geminiReport.crossImageComparison.afterVsReceivedBox}
                            </p>
                          </div>

                          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                            <span className="font-bold text-slate-900 block mb-0.5">3. Impact Vector Analysis:</span>
                            <p className="text-slate-600 leading-relaxed">
                              {selectedCaseForReview.geminiReport.crossImageComparison.damageVectorAnalysis}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Detected Fraud / Authenticity Indicators */}
                    {Array.isArray(selectedCaseForReview.geminiReport.fraudIndicators) && selectedCaseForReview.geminiReport.fraudIndicators.length > 0 && (
                      <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">
                          Forensic Indicators Detected by Gemini Vision:
                        </span>
                        <ul className="space-y-1 text-[11px] text-slate-700">
                          {selectedCaseForReview.geminiReport.fraudIndicators.map((ind, idx) => (
                            <li key={idx} className="flex items-start space-x-1.5">
                              <span className="text-indigo-500 font-bold">•</span>
                              <span>{ind}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Executive Summary for Seller */}
                    <div className="bg-white p-3.5 rounded-xl border border-indigo-100 text-xs text-slate-800 space-y-1">
                      <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">
                        Summary for Seller Decision:
                      </span>
                      <p className="font-semibold text-slate-900 leading-relaxed">
                        {selectedCaseForReview.geminiReport.executiveSummary}
                      </p>
                    </div>

                    {/* Evidentiary Details & Advice */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="bg-white p-3 rounded-xl border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                          Evidence Analysis
                        </span>
                        <p className="text-slate-700 text-[11px] leading-relaxed">
                          {selectedCaseForReview.geminiReport.detailedAnalysis}
                        </p>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                          Decision Rationale
                        </span>
                        <p className="text-slate-700 text-[11px] leading-relaxed">
                          {selectedCaseForReview.geminiReport.decisionRationale}
                        </p>
                      </div>
                    </div>

                    {/* Action Advice Box */}
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase block mb-0.5">
                        Actionable Steps for Seller:
                      </span>
                      <p className="text-emerald-950 font-medium text-[11px]">
                        {selectedCaseForReview.geminiReport.sellerActionAdvice}
                      </p>
                    </div>

                    {/* 1-Click Button to Accept Gemini's specific verdict */}
                    <div className="pt-1 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          const rec = selectedCaseForReview.geminiReport.recommendation;
                          const actionText = rec === 'REPLACE' 
                            ? 'Replacement Approved (Per Gemini AI Report)' 
                            : rec === 'REFUND' 
                            ? 'Refund Approved (Per Gemini AI Report)' 
                            : rec === 'CONTEST'
                            ? 'Claim Contested as Fraudulent (Per Gemini AI Report)'
                            : 'Return Requested from Customer (Per Gemini AI Report)';
                          onUpdateCaseStatus(selectedCaseForReview.caseId, actionText);
                          alert(`Seller decision confirmed: ${actionText}`);
                        }}
                        className={`w-full py-2.5 px-4 rounded-xl text-xs font-extrabold shadow-sm flex items-center justify-center space-x-2 transition ${
                          selectedCaseForReview.geminiReport.recommendation === 'CONTEST'
                            ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white'
                            : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white'
                        }`}
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Accept Gemini Recommendation: Execute {selectedCaseForReview.geminiReport.recommendation}</span>
                      </button>
                    </div>

                  </div>
                ) : (
                  /* Prompt to Trigger Gemini Analysis for Seller */
                  <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">
                          AI Damage Review Not Generated Yet
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Let Google Gemini 3.8 Flash analyze customer damage and recommend Replace, Refund, or Return.
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isAnalyzingGemini}
                      onClick={async () => {
                        setIsAnalyzingGemini(true);
                        try {
                          const proof = getMatchingPackingRecord(selectedCaseForReview.orderNo);
                          const res = await analyzeDamageWithGemini(selectedCaseForReview, proof);
                          if (res.success && res.report) {
                            if (onUpdateCase) {
                              onUpdateCase(selectedCaseForReview.caseId, { geminiReport: res.report });
                            }
                            setSelectedCaseForReview((prev) => ({ ...prev, geminiReport: res.report }));
                          }
                        } catch (e) {
                          alert('Error running Gemini: ' + e.message);
                        } finally {
                          setIsAnalyzingGemini(false);
                        }
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm shrink-0 disabled:opacity-50"
                    >
                      <Bot className="w-4 h-4" />
                      <span>{isAnalyzingGemini ? 'Gemini Analyzing...' : 'Run Gemini AI Review'}</span>
                    </button>
                  </div>
                )}

                {/* Seller Action Decision Center */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Seller Decision & Resolution Center:
                  </span>
                  
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      onClick={() => {
                        onUpdateCaseStatus(selectedCaseForReview.caseId, 'Replacement Approved by Seller');
                        alert('Seller approved free replacement for customer. Return pickup and dispatch triggered.');
                      }}
                      className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-xs"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Approve Replacement</span>
                    </button>

                    <button
                      onClick={() => {
                        onUpdateCaseStatus(selectedCaseForReview.caseId, 'Refund Approved by Seller');
                        alert('Seller approved monetary refund. Bank disbursement initiated.');
                      }}
                      className="px-3.5 py-2 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-xs"
                    >
                      <DollarSign className="w-3.5 h-3.5 text-sky-600" />
                      <span>Approve Refund</span>
                    </button>

                    <button
                      onClick={() => {
                        onUpdateCaseStatus(selectedCaseForReview.caseId, 'Physical Return Requested from Customer');
                        alert('Seller requested physical return of product. Reverse pickup scheduled with courier.');
                      }}
                      className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-xs"
                    >
                      <RefreshCcw className="w-3.5 h-3.5 text-amber-600" />
                      <span>Request Customer Return</span>
                    </button>

                    <button
                      onClick={() => {
                        onUpdateCaseStatus(selectedCaseForReview.caseId, 'Courier Transit Claim Filed');
                        alert(`Escalated to ${selectedCaseForReview.courierPartner || 'Logistics Partner'} with AWB ${selectedCaseForReview.awbNumber}. Insurance claim initiated.`);
                      }}
                      className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 shadow-xs"
                    >
                      <Truck className="w-3.5 h-3.5 text-slate-500" />
                      <span>File Courier Claim</span>
                    </button>

                    <button
                      onClick={() => {
                        onUpdateCaseStatus(selectedCaseForReview.caseId, 'Contested with Pre-Dispatch Proof');
                        alert('Dispute contested. Pre-dispatch photos submitted to marketplace reviewer.');
                      }}
                      className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition shadow-xs"
                    >
                      <span>Contest Claim</span>
                    </button>

                    <button
                      onClick={() => {
                        const proof = getMatchingPackingRecord(selectedCaseForReview.orderNo);
                        handleGenerateGeminiPDFForRecord(proof || selectedCaseForReview);
                      }}
                      disabled={analyzingOrderNo === selectedCaseForReview.orderNo}
                      className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 disabled:opacity-60"
                    >
                      {analyzingOrderNo === selectedCaseForReview.orderNo ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      )}
                      <span>Export Gemini AI PDF</span>
                    </button>
                  </div>
                </div>

              </div>
            )}
          </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 2: RECORD PRODUCT PACKING & LOGISTICS EVIDENCE */}
      {/* ======================================================== */}
      {activeSubTab === 'new-record' && (
        <form onSubmit={handleSavePackingRecord} className="space-y-8">
          
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="border-b border-slate-100 pb-4">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Seller Dispatch Evidence Recording Studio</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                Enter Product Details, Before Packing, After Packing & Logistics
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Store complete pre-shipment chain-of-custody evidence to protect your business against false damage claims and enable fast courier insurance claims.
              </p>
            </div>

            {/* Success message banner with Gemini AI status */}
            {recordSavedSuccess && (
              <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border-2 border-emerald-300 shadow-sm space-y-3 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                      {isAutoGeneratingPDF ? (
                        <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
                      ) : (
                        <CheckCircle className="w-6 h-6 text-emerald-600" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <span>Order #{lastSavedRecord?.orderNo || 'Recorded'} Saved</span>
                        {lastSavedRecord?.productName && (
                          <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                            {lastSavedRecord.productName}
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {isAutoGeneratingPDF
                          ? '✨ Google Gemini 3.8 Flash is analyzing all details & photos to generate certified PDF...'
                          : '✅ Gemini AI analyzed photos & details and generated certified PDF! Check your downloads.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {lastSavedRecord && (
                      <button
                        type="button"
                        disabled={isAutoGeneratingPDF}
                        onClick={() => handleGenerateGeminiPDFForRecord(lastSavedRecord)}
                        className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm disabled:opacity-60"
                      >
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>{isAutoGeneratingPDF ? 'Generating PDF...' : 'Download Gemini PDF Again'}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setActiveSubTab('catalog')}
                      className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition flex items-center space-x-1 shadow-xs"
                    >
                      <span>View in Vault</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {lastSavedRecord?.geminiReport && (
                  <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between text-xs text-slate-700">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-indigo-700">Gemini Verdict:</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[11px] border border-emerald-300">
                        {lastSavedRecord.geminiReport.recommendation} (Seller Risk: SAFE)
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 hidden sm:inline">
                      Embedded 2 photos (Before & After Packing) in certified 2-page PDF
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* SECTION A: PRODUCT & ORDER DETAILS */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                <Barcode className="w-4 h-4" />
                <span>Section A1: Product & Order Specification</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Seller Store *</label>
                  <select
                    value={effectiveSeller?.id}
                    onChange={(e) => {
                      const s = displayStores.find(ms => ms.id === e.target.value);
                      if (s && onSwitchSeller) onSwitchSeller(s);
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-xs text-slate-900 font-bold focus:bg-white focus:border-indigo-500"
                  >
                    {displayStores.map((s) => (
                      <option key={s.id} value={s.id}>{s.name.split(' ')[0]} ({s.id})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Order Number *</label>
                  <input
                    type="text"
                    value={formOrderNo}
                    onChange={(e) => setFormOrderNo(e.target.value)}
                    required
                    placeholder="e.g. ORD-98425"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Product Name *</label>
                  <input
                    type="text"
                    value={formProductName}
                    onChange={(e) => setFormProductName(e.target.value)}
                    required
                    placeholder="e.g. iPhone 15 Pro Max / Bose QC45"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Sale Price (₹) *</label>
                  <input
                    type="number"
                    value={formSalePrice}
                    onChange={(e) => setFormSalePrice(e.target.value)}
                    placeholder="e.g. 24990"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:bg-white focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">SKU / Item ID</label>
                  <input
                    type="text"
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    placeholder="e.g. SKU-TECH-001"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-indigo-500"
                  >
                    <option value="Electronics">Electronics / Smartphones / Audio</option>
                    <option value="Audio">Headphones & Soundbars</option>
                    <option value="Kitchen & Dining">Kitchen & Dining</option>
                    <option value="Apparel">Apparel & Fashion</option>
                    <option value="Computers">Computers & Accessories</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SECTION A2: CUSTOMER PROFILE (LINKED BY MOBILE NUMBER) */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4" />
                  <span>Section A2: Customer Profile (Auto-Filled via Mobile Number)</span>
                </h4>
                <span className="text-[11px] text-slate-500">
                  Enter mobile number to auto-populate customer address, pincode & name
                </span>
              </div>

              {/* Quick Select Preset Customer Chips */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/90 space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  1-Click Sample Customer Profiles Directory:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {customerRegistry.slice(0, 5).map((cust) => {
                    const isSelected = matchedCustomer?.mobile === cust.mobile || formCustomerMobile === cust.mobile;
                    return (
                      <button
                        key={cust.id || cust.mobile}
                        type="button"
                        onClick={() => handleSelectPresetCustomer(cust)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 border ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        <Phone className="w-3 h-3 text-indigo-400" />
                        <span>{cust.name}</span>
                        <span className="font-mono text-[11px] opacity-80">({cust.mobile})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Customer Mobile Number Input & Lookup */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Customer Mobile Number *</span>
                  {matchedCustomer ? (
                    <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Profile Linked: {matchedCustomer.name}</span>
                    </span>
                  ) : formCustomerMobile.length >= 5 ? (
                    <span className="text-[11px] text-amber-700 font-medium">
                      New Customer: details will be saved to this mobile
                    </span>
                  ) : null}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4 text-indigo-600" />
                  </div>
                  <input
                    type="text"
                    value={formCustomerMobile}
                    onChange={(e) => handleCustomerMobileChange(e.target.value)}
                    required
                    placeholder="Enter 10-digit mobile (e.g. 9811230491 or click preset above)"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 font-mono font-bold focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              {/* Auto-filled Notification Banner */}
              {matchedCustomer && (
                <div className="p-3.5 rounded-xl bg-emerald-50/90 border border-emerald-200 text-xs text-emerald-900 flex items-start space-x-2.5 animate-fade-in">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold block">
                      ✓ Profile Auto-Populated for {matchedCustomer.name} ({matchedCustomer.membership || 'Verified Customer'})
                    </span>
                    <p className="text-[11px] text-emerald-800">
                      Address: {matchedCustomer.address}, {matchedCustomer.city} - {matchedCustomer.pincode}
                    </p>
                  </div>
                </div>
              )}

              {/* Customer Fields: Name, Address, City, Pincode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>Customer Name *</span>
                  </label>
                  <input
                    type="text"
                    value={formCustomerName}
                    onChange={(e) => setFormCustomerName(e.target.value)}
                    required
                    placeholder="e.g. Vivek Kumar"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span>Delivery Address *</span>
                  </label>
                  <input
                    type="text"
                    value={formCustomerAddress}
                    onChange={(e) => setFormCustomerAddress(e.target.value)}
                    required
                    placeholder="e.g. Flat 402, Green Meadows, Jubilee Hills"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Postal Pincode *</label>
                  <input
                    type="text"
                    value={formCustomerPincode}
                    onChange={(e) => setFormCustomerPincode(e.target.value)}
                    required
                    placeholder="e.g. 500033"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:bg-white focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">City & State</label>
                  <input
                    type="text"
                    value={formCustomerCity}
                    onChange={(e) => setFormCustomerCity(e.target.value)}
                    placeholder="e.g. Hyderabad, Telangana"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Customer Email (Optional)</label>
                  <input
                    type="email"
                    value={formCustomerEmail}
                    onChange={(e) => setFormCustomerEmail(e.target.value)}
                    placeholder="e.g. vivek.kumar@example.com"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* SECTION B: BEFORE PACKING EVIDENCE (MULTIPLE PHOTOS) - Pastel Mint */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" />
                  <span>Section B: Before Packing Verification ({beforePhotos.length} Photos: Pristine Unit & Serial Proof)</span>
                </h4>
                <span className="text-[11px] text-slate-500 font-medium">
                  Add multiple angles: unboxing, serial plate, ports, accessories, power test
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Before Packing Photo Selector & Upload */}
                <div className="md:col-span-5 space-y-3">
                  {/* Active Main Preview */}
                  <div className="aspect-video rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center relative shadow-xs">
                    <img
                      src={beforePhotos[activeBeforePreviewIdx] || beforePhotos[0] || '/assets/P01.png'}
                      alt="Before Packing Preview"
                      className="w-full h-full object-contain p-2"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/assets/P01.png';
                      }}
                    />
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-mono border border-emerald-300 font-bold">
                      BEFORE PACKING · ANGLE {activeBeforePreviewIdx + 1} OF {beforePhotos.length}
                    </span>
                  </div>

                  {/* Multi-Photo Thumbnail Strip with Remove button */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Recorded Unit Photos Gallery ({beforePhotos.length}):
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                      {beforePhotos.map((img, idx) => {
                        const isActive = activeBeforePreviewIdx === idx;
                        return (
                          <div 
                            key={idx}
                            className={`group relative rounded-xl border p-1 bg-white transition-all cursor-pointer ${
                              isActive 
                                ? 'border-emerald-500 ring-2 ring-emerald-200 shadow-2xs' 
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                            onClick={() => setActiveBeforePreviewIdx(idx)}
                          >
                            <div className="aspect-square rounded-lg bg-slate-50 overflow-hidden">
                              <img
                                src={img}
                                alt={`Angle ${idx + 1}`}
                                className="w-full h-full object-contain p-1"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = '/assets/P01.png';
                                }}
                              />
                            </div>
                            <span className="text-[9px] font-bold text-slate-700 block truncate text-center mt-1">
                              Angle {idx + 1}
                            </span>
                            {beforePhotos.length > 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveBeforePhoto(idx);
                                }}
                                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center text-[10px] shadow-xs"
                                title="Remove this photo"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Multi-photo file upload button */}
                  <div className="flex items-center space-x-2">
                    <label className="flex-1 cursor-pointer py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold text-center transition flex items-center justify-center space-x-1.5 shadow-xs">
                      <Upload className="w-3.5 h-3.5 text-slate-500" />
                      <span>+ Upload Multiple Unit Photos</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleBeforePhotosUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Benchmark preset photo buttons */}
                  <div className="text-[10px] text-slate-500">
                    <span className="block font-semibold text-slate-700 mb-1">+ Add Benchmark Presets:</span>
                    <div className="grid grid-cols-4 gap-1">
                      {fixturePhotos.slice(0, 4).map((fp) => (
                        <button
                          key={fp.path}
                          type="button"
                          onClick={() => handleAddPresetBeforePhoto(fp.path)}
                          className="px-1.5 py-1 text-[9px] rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 truncate font-semibold"
                          title={`Add ${fp.label}`}
                        >
                          + {fp.label.split(':')[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Before Packing Form Fields */}
                <div className="md:col-span-7 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">QC Inspector ID *</label>
                      <input
                        type="text"
                        value={beforeQcInspector}
                        onChange={(e) => setBeforeQcInspector(e.target.value)}
                        required
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Serial / IMEI Number</label>
                      <input
                        type="text"
                        value={beforeSerialNo}
                        onChange={(e) => setBeforeSerialNo(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:bg-white focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Checklist */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">
                      Pre-Pack Physical & Functional Checklist
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <label className="flex items-center space-x-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100">
                        <input
                          type="checkbox"
                          checked={beforeChecklist.physicalDamageFree}
                          onChange={(e) => setBeforeChecklist({ ...beforeChecklist, physicalDamageFree: e.target.checked })}
                          className="rounded text-indigo-600 focus:ring-0"
                        />
                        <span className="text-slate-700 font-medium">Physical Damage Free</span>
                      </label>
                      <label className="flex items-center space-x-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100">
                        <input
                          type="checkbox"
                          checked={beforeChecklist.sealIntact}
                          onChange={(e) => setBeforeChecklist({ ...beforeChecklist, sealIntact: e.target.checked })}
                          className="rounded text-indigo-600 focus:ring-0"
                        />
                        <span className="text-slate-700 font-medium">Factory Seal Intact</span>
                      </label>
                      <label className="flex items-center space-x-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100">
                        <input
                          type="checkbox"
                          checked={beforeChecklist.accessoriesVerified}
                          onChange={(e) => setBeforeChecklist({ ...beforeChecklist, accessoriesVerified: e.target.checked })}
                          className="rounded text-indigo-600 focus:ring-0"
                        />
                        <span className="text-slate-700 font-medium">Accessories In Box</span>
                      </label>
                      <label className="flex items-center space-x-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100">
                        <input
                          type="checkbox"
                          checked={beforeChecklist.powerTestPassed}
                          onChange={(e) => setBeforeChecklist({ ...beforeChecklist, powerTestPassed: e.target.checked })}
                          className="rounded text-indigo-600 focus:ring-0"
                        />
                        <span className="text-slate-700 font-medium">Power On Test Passed</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Inspector QC Notes</label>
                    <input
                      type="text"
                      value={beforeNotes}
                      onChange={(e) => setBeforeNotes(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-indigo-500"
                    />
                  </div>
                </div>

              </div>
            </div>

            {/* SECTION C: AFTER PACKING EVIDENCE (MULTIPLE PHOTOS) - Pastel Sky */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-sky-700 flex items-center gap-1.5">
                  <PackageCheck className="w-4 h-4" />
                  <span>Section C: After Packing & Sealed Box Verification ({afterPhotos.length} Photos: Step-by-Step Packing)</span>
                </h4>
                <span className="text-[11px] text-slate-500 font-medium">
                  Add multiple steps: bubble wrap, carton insertion, security tape, shipping label
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* After Packing Photo Selector & Upload */}
                <div className="md:col-span-5 space-y-3">
                  {/* Active Main Preview */}
                  <div className="aspect-video rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center relative shadow-xs">
                    <img
                      src={afterPhotos[activeAfterPreviewIdx] || afterPhotos[0] || '/assets/P04.png'}
                      alt="After Packing Preview"
                      className="w-full h-full object-contain p-2"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/assets/P04.png';
                      }}
                    />
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-sky-100 text-sky-800 text-[10px] font-mono border border-sky-300 font-bold">
                      AFTER PACKING · STEP {activeAfterPreviewIdx + 1} OF {afterPhotos.length}
                    </span>
                  </div>

                  {/* Multi-Photo Thumbnail Strip with Remove button */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Packaging Steps Gallery ({afterPhotos.length}):
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                      {afterPhotos.map((img, idx) => {
                        const isActive = activeAfterPreviewIdx === idx;
                        return (
                          <div 
                            key={idx}
                            className={`group relative rounded-xl border p-1 bg-white transition-all cursor-pointer ${
                              isActive 
                                ? 'border-sky-500 ring-2 ring-sky-200 shadow-2xs' 
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                            onClick={() => setActiveAfterPreviewIdx(idx)}
                          >
                            <div className="aspect-square rounded-lg bg-slate-50 overflow-hidden">
                              <img
                                src={img}
                                alt={`Step ${idx + 1}`}
                                className="w-full h-full object-contain p-1"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = '/assets/P04.png';
                                }}
                              />
                            </div>
                            <span className="text-[9px] font-bold text-slate-700 block truncate text-center mt-1">
                              Step {idx + 1}
                            </span>
                            {afterPhotos.length > 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveAfterPhoto(idx);
                                }}
                                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center text-[10px] shadow-xs"
                                title="Remove this photo"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Multi-photo file upload button */}
                  <div className="flex items-center space-x-2">
                    <label className="flex-1 cursor-pointer py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold text-center transition flex items-center justify-center space-x-1.5 shadow-xs">
                      <Upload className="w-3.5 h-3.5 text-slate-500" />
                      <span>+ Upload Multiple Packed Photos</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleAfterPhotosUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Benchmark preset photo buttons */}
                  <div className="text-[10px] text-slate-500">
                    <span className="block font-semibold text-slate-700 mb-1">+ Add Packaging Presets:</span>
                    <div className="grid grid-cols-3 gap-1">
                      {fixturePhotos.slice(2, 5).map((fp) => (
                        <button
                          key={fp.path}
                          type="button"
                          onClick={() => handleAddPresetAfterPhoto(fp.path)}
                          className="px-1.5 py-1 text-[9px] rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 truncate font-semibold"
                          title={`Add ${fp.label}`}
                        >
                          + {fp.label.split(':')[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* After Packing Inputs */}
                <div className="md:col-span-7 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Packaging Protection Type</label>
                      <input
                        type="text"
                        value={afterPackagingType}
                        onChange={(e) => setAfterPackagingType(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Tamper Security Tape #</label>
                      <input
                        type="text"
                        value={afterSecurityTapeNo}
                        onChange={(e) => setAfterSecurityTapeNo(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:bg-white focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Gross Box Weight (Grams) *</label>
                      <input
                        type="number"
                        value={afterBoxWeightGrams}
                        onChange={(e) => setAfterBoxWeightGrams(e.target.value)}
                        required
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:bg-white focus:border-indigo-500"
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">Matched with courier weighbridge scan</span>
                    </div>

                    <div className="flex items-center pt-5">
                      <label className="flex items-center space-x-2 cursor-pointer bg-slate-50 p-3 rounded-xl border border-slate-200 w-full hover:bg-slate-100">
                        <input
                          type="checkbox"
                          checked={afterFragileSticker}
                          onChange={(e) => setAfterFragileSticker(e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-0"
                        />
                        <span className="text-xs text-slate-800 font-bold">Fragile Sticker Applied</span>
                      </label>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* SECTION D: LOGISTICS & DISPATCH DETAILS - Pastel Amber */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                <Truck className="w-4 h-4" />
                <span>Section D: Logistics, Tracking & Courier Handover</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Courier Partner *</label>
                  <select
                    value={logisticsCourier}
                    onChange={(e) => setLogisticsCourier(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-indigo-500"
                  >
                    <option value="Blue Dart Express">Blue Dart Express</option>
                    <option value="Delhivery Surface">Delhivery Surface</option>
                    <option value="Ekart Logistics">Ekart Logistics</option>
                    <option value="DTDC Express Air">DTDC Express Air</option>
                    <option value="Shadowfax Logistics">Shadowfax Logistics</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Tracking / AWB Number *</label>
                  <input
                    type="text"
                    value={logisticsAwb}
                    onChange={(e) => setLogisticsAwb(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Origin Dispatch Hub</label>
                  <input
                    type="text"
                    value={logisticsHub}
                    onChange={(e) => setLogisticsHub(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Pickup Executive ID</label>
                  <input
                    type="text"
                    value={logisticsPickupAgent}
                    onChange={(e) => setLogisticsPickupAgent(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button & Clear Option */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={resetFormFields}
                disabled={isSavingRecord || isAutoGeneratingPDF}
                className="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear Form
              </button>

              <button
                type="submit"
                disabled={isSavingRecord || isAutoGeneratingPDF}
                className={`py-3 px-8 text-white rounded-xl text-sm font-bold shadow-md flex items-center space-x-2 transition ${
                  isSavingRecord || isAutoGeneratingPDF
                    ? 'bg-slate-400 cursor-not-allowed opacity-80 shadow-none pointer-events-none'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-200 cursor-pointer'
                }`}
              >
                {isSavingRecord || isAutoGeneratingPDF ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving & Generating PDF...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Save Packaging & Logistics Record</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </form>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 3: STORED PACKAGING & LOGISTICS CATALOG VAULT */}
      {/* ======================================================== */}
      {activeSubTab === 'catalog' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-indigo-600" />
                <span>Stored Product Packaging & Logistics Records</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                All pre-dispatch photographic and tracking records stored securely in the seller vault.
              </p>
            </div>
            <button
              onClick={() => setActiveSubTab('new-record')}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Record New</span>
            </button>
          </div>

          {sellerPackingRecords.length === 0 ? (
            <div className="bg-white border border-slate-200/90 rounded-3xl p-12 text-center shadow-sm space-y-4 max-w-2xl mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center mx-auto text-indigo-600">
                <PackageCheck className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Packaging Vault is Empty</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                No pre-dispatch packing records stored yet. Enter product details, upload before & after packing photos, and record courier tracking information to protect against false damage claims.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => setActiveSubTab('new-record')}
                  className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition shadow-sm inline-flex items-center space-x-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Enter First Packing Record</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sellerPackingRecords.map((r) => (
                <div
                  key={r.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 hover:border-slate-300 transition shadow-xs"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono font-bold text-emerald-700">{r.orderNo}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                          {r.sku}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mt-1 line-clamp-1">{r.productName}</h4>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        <strong className="text-slate-800">{r.customerName}</strong> ({r.customerPhone || r.customerMobile || '+91 98XXX XXXXX'}) • ₹{r.salePrice?.toLocaleString()}
                      </p>
                      {r.customerAddress && (
                        <p className="text-[10px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-indigo-500 shrink-0" />
                          <span>{r.customerAddress}, {r.customerCity} - {r.customerPincode}</span>
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleGenerateGeminiPDFForRecord(r)}
                      disabled={analyzingOrderNo === r.orderNo}
                      className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-xl transition border border-indigo-200"
                      title="Download Certified Gemini AI Evidence PDF"
                    >
                      {analyzingOrderNo === r.orderNo ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                      ) : (
                        <FileDown className="w-4 h-4 text-emerald-600" />
                      )}
                    </button>
                  </div>

                  {/* Before & After Photo Thumbnails */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-emerald-50/50 p-2.5 border border-emerald-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] font-bold text-emerald-800">BEFORE PACKING</span>
                        <span className="text-[9px] font-mono font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                          {r.beforePacking?.photos?.length || 1} Photo{(r.beforePacking?.photos?.length || 1) > 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="aspect-video rounded-lg bg-white overflow-hidden border border-emerald-100">
                        <img
                          src={r.beforePacking?.photo || (r.beforePacking?.photos && r.beforePacking.photos[0]) || '/assets/P01.png'}
                          alt="Before"
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/assets/P01.png';
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-600 mt-1 truncate">QC: {r.beforePacking?.qcInspectorId}</p>
                    </div>

                    <div className="rounded-xl bg-sky-50/50 p-2.5 border border-sky-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] font-bold text-sky-800">AFTER PACKING</span>
                        <span className="text-[9px] font-mono font-bold bg-sky-100 text-sky-800 px-1.5 py-0.2 rounded">
                          {r.afterPacking?.photos?.length || 1} Step{(r.afterPacking?.photos?.length || 1) > 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="aspect-video rounded-lg bg-white overflow-hidden border border-sky-100">
                        <img
                          src={r.afterPacking?.photo || (r.afterPacking?.photos && r.afterPacking.photos[0]) || '/assets/P04.png'}
                          alt="After"
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/assets/P04.png';
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-600 mt-1 truncate">Weight: {r.afterPacking?.boxWeightGrams}g</p>
                    </div>
                  </div>

                  {/* Logistics Bar */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                    <div className="flex items-center space-x-1.5">
                      <Truck className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{r.logistics?.courierPartner}</span>
                    </div>
                    <span className="font-mono text-slate-800 font-bold">{r.logistics?.awbNumber}</span>
                  </div>

                  {/* Gemini AI Audit Verdict (if available) */}
                  {r.geminiReport && (
                    <div className="p-3 rounded-xl bg-indigo-50/80 border border-indigo-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-indigo-700 flex items-center gap-1">
                          <Bot className="w-3.5 h-3.5" />
                          <span>Gemini 3.8 Flash AI Verdict</span>
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                          {r.geminiReport.recommendation} · Risk: SAFE
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-700 line-clamp-2">
                        {r.geminiReport.executiveSummary || r.geminiReport.decisionRationale}
                      </p>
                    </div>
                  )}

                  {/* Prominent Action Button: Generate Gemini AI PDF with Photos */}
                  <button
                    type="button"
                    onClick={() => handleGenerateGeminiPDFForRecord(r)}
                    disabled={analyzingOrderNo === r.orderNo}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 shadow-sm disabled:opacity-60"
                  >
                    {analyzingOrderNo === r.orderNo ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>Gemini AI is analyzing photos & generating PDF...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>✨ Generate Gemini AI PDF with Photos</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: REGISTER NEW SELLER STORE */}
      {/* ======================================================== */}
      {showRegisterSellerModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Register New Seller Store</h3>
                  <p className="text-[11px] text-slate-500">Add a new merchant store to record dispatches and handle claims.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRegisterSellerModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterSellerSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Store / Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={regStoreName}
                    onChange={(e) => setRegStoreName(e.target.value)}
                    placeholder="e.g. Apex Tech Solutions"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Seller ID
                  </label>
                  <input
                    type="text"
                    required
                    value={regSellerId}
                    onChange={(e) => setRegSellerId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Fulfillment Hub Location
                </label>
                <input
                  type="text"
                  value={regHub}
                  onChange={(e) => setRegHub(e.target.value)}
                  placeholder="e.g. Bhiwandi Central Facility, Mumbai"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="+91 98200 11223"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Store Category
                  </label>
                  <select
                    value={regCategory}
                    onChange={(e) => setRegCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Electronics & Retail">Electronics & Computing</option>
                    <option value="Audio & Gadgets">Audio & Gadgets</option>
                    <option value="Fashion & Lifestyle">Fashion & Lifestyle</option>
                    <option value="Home & Kitchen">Home & Kitchen</option>
                    <option value="Multi-Category Store">Multi-Category Store</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterSellerModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center space-x-1.5"
                >
                  <Store className="w-4 h-4" />
                  <span>Register Store</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
