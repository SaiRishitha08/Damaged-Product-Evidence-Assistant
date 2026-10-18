import React, { useState, useMemo, useEffect } from 'react';
import { 
  Package, 
  UploadCloud, 
  AlertTriangle, 
  CheckCircle2, 
  FileDown, 
  Send, 
  Eye, 
  Sparkles, 
  Clock, 
  Truck, 
  ArrowRight,
  ShieldAlert,
  Camera,
  Image as ImageIcon,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Receipt,
  User,
  MapPin,
  ShieldCheck,
  Calendar,
  Layers,
  FileCheck,
  Store,
  Phone,
  Search,
  Check,
  UserCheck,
  RotateCcw,
  DollarSign,
  ShoppingBag,
  Trash2,
  RefreshCw,
  Plus,
  Info,
  LogIn,
  LogOut,
  Lock,
  EyeOff,
  AlertCircle,
  Box,
  BarChart3,
  FileText,
  Quote,
  Save,
  Tag,
  Edit
} from 'lucide-react';
import { generateGeminiAIEvidencePDF, generateCustomerEvidencePDF } from '../utils/pdfGenerator';
import { analyzeDamageWithGemini } from '../utils/geminiAnalyzer';
import { MARKETPLACE_SELLERS, CURRENT_SELLER } from '../data/initialData';
import { 
  findCustomerByMobile, 
  normalizePhone, 
  DEFAULT_CUSTOMER_PROFILES,
  getOrdersForCustomer,
  getCustomerMetrics
} from '../data/customerDirectory';
import OtpVerificationModal from './OtpVerificationModal';

export default function CustomerDashboard({ 
  currentCustomer = null,
  onSwitchCustomer,
  onRegisterCustomer,
  onAddCustomerOrder,
  customerOrders = [],
  setCustomerOrders,
  sellerPackingRecords = [],
  evidenceCases = [], 
  customerRegistry = [],
  sellerRegistry = [],
  onSubmitCase, 
  onOpenDossierModal,
  currentUser,
  onLogout
}) {
  // Sub-tabs: 'report' | 'orders' | 'disputes' | 'profile'
  const [customerSubTab, setCustomerSubTab] = useState('report');

  // Registration & Add Order Modal / Drawer States
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showAddOrderModal, setShowAddOrderModal] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [pendingRegistration, setPendingRegistration] = useState(null);

  // Auth state for unauthenticated customer view: 'login' | 'signup'
  const [authMode, setAuthMode] = useState(() => customerRegistry.length > 0 ? 'login' : 'signup');
  const [loginMobile, setLoginMobile] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  // New Customer Registration Form Inputs
  const [regName, setRegName] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regEmail, setRegEmail] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regCity, setRegCity] = useState('Hyderabad');
  const [regState, setRegState] = useState('Telangana');
  const [regPincode, setRegPincode] = useState('500033');

  // Add Booked Order Form Inputs
  const [newOrderProduct, setNewOrderProduct] = useState('');
  const [newOrderNo, setNewOrderNo] = useState(() => 'ORD-' + Math.floor(10000 + Math.random() * 90000));
  const [newOrderCategory, setNewOrderCategory] = useState('Electronics');
  const [newOrderPrice, setNewOrderPrice] = useState('4999');
  const [newOrderSeller, setNewOrderSeller] = useState('');
  const [newOrderCourier, setNewOrderCourier] = useState('Blue Dart Express');
  const [newOrderAwb, setNewOrderAwb] = useState(() => 'BLUEDART-' + Math.floor(100000000 + Math.random() * 900000000));

  // Customer Orders isolated to active customer
  const activeOrders = useMemo(() => {
    if (!currentCustomer) return [];
    return getOrdersForCustomer(currentCustomer.mobile || currentCustomer.phone, customerOrders);
  }, [currentCustomer, customerOrders]);

  // Customer Metrics: totalOrders, totalReturns, totalRefunds, activeClaims
  const metrics = useMemo(() => {
    if (!currentCustomer) return { totalOrders: 0, totalReturns: 0, totalRefunds: 0, activeClaims: 0 };
    return getCustomerMetrics(currentCustomer.mobile || currentCustomer.phone, customerOrders, evidenceCases);
  }, [currentCustomer, customerOrders, evidenceCases]);

  // Delivered orders available to report damage on
  const deliveredOrders = useMemo(() => {
    return activeOrders.filter(o => o.status === 'Delivered' || !o.status);
  }, [activeOrders]);

  const initialOrder = deliveredOrders[0] || activeOrders[0] || null;

  // Selected Order for Damage Claim
  const [selectedOrderNo, setSelectedOrderNo] = useState(initialOrder?.orderNo || '');
  const [selectedOrder, setSelectedOrder] = useState(initialOrder);

  // Form State
  const [orderNo, setOrderNo] = useState(initialOrder?.orderNo || '');
  const [productName, setProductName] = useState(initialOrder?.productName || '');
  const [sellerName, setSellerName] = useState(initialOrder?.sellerName || (sellerRegistry[0]?.name || 'Marketplace Seller'));
  const [sellerId, setSellerId] = useState(initialOrder?.sellerId || (sellerRegistry[0]?.id || 'SLR-1001'));
  const [salePrice, setSalePrice] = useState(initialOrder?.price || 4999);
  const [courierPartner, setCourierPartner] = useState(initialOrder?.courier || 'Blue Dart Express');
  const [awbNumber, setAwbNumber] = useState(initialOrder?.awb || 'BLUEDART-882910471');

  // Problem Description & Damage Classification
  const [damageType, setDamageType] = useState('Outer Box Crushed & Item Broken');
  const [damageSeverity, setDamageSeverity] = useState('Severe');
  const [customerClaim, setCustomerClaim] = useState('');

  // 4-5 Damage Evidence Photos State
  const [evidenceImages, setEvidenceImages] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzingGemini, setIsAnalyzingGemini] = useState(false);
  const [geminiResult, setGeminiResult] = useState(null);
  const [submissionSuccess, setSubmissionSuccess] = useState(null);
  const [aiTab, setAiTab] = useState('summary'); // 'summary' | 'photo' | 'uncertainty' | 'suggestions'

  // Window event listener for subtab switching from top Navbar
  useEffect(() => {
    const handleNav = (e) => {
      if (e.detail) setCustomerSubTab(e.detail);
    };
    window.addEventListener('nav-customer-subtab', handleNav);
    return () => window.removeEventListener('nav-customer-subtab', handleNav);
  }, []);

  // Sync selected order when active customer changes
  useEffect(() => {
    const firstDelivered = deliveredOrders[0] || activeOrders[0] || null;
    if (firstDelivered) {
      handleSelectOrder(firstDelivered);
    } else {
      setSelectedOrderNo('');
      setSelectedOrder(null);
      setOrderNo('');
      setProductName('');
    }
    setSubmissionSuccess(null);
    setGeminiResult(null);
  }, [currentCustomer?.mobile, deliveredOrders.length]);

  // Benchmark Test Photos (Fynd C12 Dataset)
  const BENCHMARK_PHOTOS = [
    { label: 'Slot 1: Outer Packaging Crushed', path: '/assets/P01.png' },
    { label: 'Slot 2: Product Unit Fracture', path: '/assets/P04.png' },
    { label: 'Slot 3: Shipping Label & AWB Barcode', path: '/assets/P03.png' },
    { label: 'Slot 4: Close-Up Fracture Detail', path: '/assets/P05.png' },
    { label: 'Slot 5: Package Accessories & Seal', path: '/assets/P02.png' }
  ];

  // 1-Click Load 4-5 Benchmark Photos
  const handleLoadBenchmarkPhotos = () => {
    const loaded = BENCHMARK_PHOTOS.map((p, idx) => ({
      id: `img-${Date.now()}-${idx}`,
      url: p.path,
      label: p.label,
      name: `Photo_${idx + 1}.png`
    }));
    setEvidenceImages(loaded);
  };

  // Handle Order Selection from Customer Order List
  const handleSelectOrder = (order) => {
    setSelectedOrder(order);
    setSelectedOrderNo(order.orderNo);
    setOrderNo(order.orderNo);
    setProductName(order.productName || '');
    setSellerName(order.sellerName || CURRENT_SELLER.name);
    setSellerId(order.sellerId || CURRENT_SELLER.id);
    setSalePrice(order.price || 4999);
    setCourierPartner(order.courier || 'Blue Dart Express');
    setAwbNumber(order.awb || 'BLUEDART-882910471');

    // Auto-fill initial image if available and empty
    if (order.image && evidenceImages.length === 0) {
      setEvidenceImages([
        {
          id: `img-primary-${Date.now()}`,
          url: order.image,
          label: 'Primary Damage View',
          name: `${order.orderNo}_damage.png`
        }
      ]);
    }
  };

  // Handle manual Order Lookup
  const handleOrderLookup = (enteredOrderNo) => {
    setOrderNo(enteredOrderNo);
    const trimmed = (enteredOrderNo || '').trim().toLowerCase();
    const matched = activeOrders.find(
      o => o.orderNo.toLowerCase() === trimmed || (trimmed.length >= 4 && o.orderNo.toLowerCase().includes(trimmed))
    );
    if (matched) {
      handleSelectOrder(matched);
    }
  };

  // Multi-File Upload Handler (Supports 4-5 images)
  const handleMultiFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setIsUploading(true);
    const slots = [
      'Outer Packaging & Crushed Box',
      'Product Chassis & Breakage',
      'Shipping Label & Tracking AWB',
      'Macro Close-Up of Damage',
      'Package Accessories / Unboxing'
    ];

    let processedCount = 0;
    const newItems = [];

    files.slice(0, 5).forEach((file, index) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newItems.push({
          id: `img-${Date.now()}-${index}-${Math.random()}`,
          url: reader.result,
          label: slots[evidenceImages.length + index] || `Photo ${evidenceImages.length + index + 1}`,
          name: file.name
        });
        processedCount++;
        if (processedCount === Math.min(files.length, 5)) {
          setEvidenceImages(prev => [...prev, ...newItems].slice(0, 5));
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Remove photo from gallery
  const handleRemoveImage = (imgId) => {
    setEvidenceImages(prev => prev.filter(img => img.id !== imgId));
  };

  // 1-Click Report Damage from Order History Tab
  const handleReportFromOrderList = (order) => {
    handleSelectOrder(order);
    setCustomerSubTab('report');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle Customer Login Submission (Mobile & Password)
  const handleCustomerLoginSubmit = (e) => {
    e.preventDefault();
    setLoginError('');
    const cleanMobile = normalizePhone(loginMobile);
    if (!cleanMobile) {
      setLoginError('Please enter your 10-digit mobile number.');
      return;
    }
    const found = customerRegistry.find(c => normalizePhone(c.mobile || c.phone) === cleanMobile);
    if (!found) {
      setLoginError(`No account registered with mobile "${cleanMobile}". Click "Sign Up" below to register.`);
      return;
    }
    if (found.password && loginPassword && found.password !== loginPassword) {
      setLoginError('Incorrect password. Please try again.');
      return;
    }
    if (onSwitchCustomer) {
      onSwitchCustomer(found);
    }
  };

  // Handle Register Customer Form Submission
  const handleRegisterCustomerSubmit = (e) => {
    e.preventDefault();
    if (!regName.trim() || !regMobile.trim()) {
      alert('Please enter Customer Name and 10-digit Mobile Number.');
      return;
    }
    const cleanMobile = normalizePhone(regMobile);
    if (cleanMobile.length < 10) {
      alert('Please enter a valid 10-digit mobile number.');
      return;
    }

    const newCustomer = {
      name: regName.trim(),
      mobile: cleanMobile,
      phone: `+91 ${cleanMobile.slice(0, 5)} ${cleanMobile.slice(5)}`,
      password: regPassword.trim() || 'password123',
      email: regEmail.trim() || `${cleanMobile}@customer.fynd.com`,
      address: regAddress.trim() || 'Standard Delivery Address',
      city: regCity.trim() || 'Hyderabad',
      state: regState.trim() || 'Telangana',
      pincode: regPincode.trim() || '500033'
    };

    setPendingRegistration(newCustomer);
    setShowOtpModal(true);
  };

  const handleOtpVerified = () => {
    if (pendingRegistration && onRegisterCustomer) {
      onRegisterCustomer(pendingRegistration);
    }
    setShowOtpModal(false);
    setPendingRegistration(null);
    setRegName('');
    setRegMobile('');
    setRegPassword('');
    setRegEmail('');
    setRegAddress('');
    setShowRegisterModal(false);
  };

  // Handle Add Booked Order Submission
  const handleAddOrderSubmit = (e) => {
    e.preventDefault();
    if (!newOrderProduct.trim()) {
      alert('Please enter a Product Name for the booked order.');
      return;
    }

    const assignedSeller = sellerRegistry.find(s => s.name === newOrderSeller) || sellerRegistry[0];

    if (onAddCustomerOrder) {
      const added = onAddCustomerOrder({
        orderNo: newOrderNo.trim() || `ORD-${Math.floor(10000 + Math.random() * 90000)}`,
        productName: newOrderProduct.trim(),
        category: newOrderCategory,
        price: parseFloat(newOrderPrice) || 2999,
        sellerId: assignedSeller?.id || 'SLR-1001',
        sellerName: newOrderSeller || assignedSeller?.name || 'Marketplace Seller',
        courier: newOrderCourier,
        awb: newOrderAwb.trim() || `BLUEDART-${Math.floor(100000000 + Math.random() * 900000000)}`,
        customerPhone: currentCustomer?.mobile || '9876543210'
      });
      if (added) {
        handleSelectOrder(added);
      }
    }

    setNewOrderProduct('');
    setNewOrderNo('ORD-' + Math.floor(10000 + Math.random() * 90000));
    setNewOrderAwb('BLUEDART-' + Math.floor(100000000 + Math.random() * 900000000));
    setShowAddOrderModal(false);
  };

  // ========================================================
  // SUBMIT DAMAGE CASE WITH GEMINI AI ANALYSIS & PDF REPORT
  // ========================================================
  const handleSubmitWithGeminiAI = async (e) => {
    e.preventDefault();
    if (!orderNo || !productName) {
      alert('Please select or enter an Order Number and Product Name.');
      return;
    }
    if (!customerClaim.trim()) {
      alert('Please write a short description explaining the damage condition.');
      return;
    }
    if (evidenceImages.length === 0) {
      alert('Please attach at least 1-4 photographic evidence images showing the damage.');
      return;
    }

    setIsAnalyzingGemini(true);

    try {
      const imagePayloads = evidenceImages.map(img => img.url);

      // Construct dispute case payload
      const casePayload = {
        caseId: `CASE-C12-${Math.floor(1000 + Math.random() * 9000)}`,
        orderNo: orderNo.trim(),
        productName: productName.trim(),
        price: salePrice,
        sellerId: sellerId || (sellerRegistry[0]?.id || 'SLR-1001'),
        sellerName: sellerName || (sellerRegistry[0]?.name || 'Marketplace Seller'),
        customerName: currentCustomer?.name || 'Customer',
        customerPhone: currentCustomer?.phone || currentCustomer?.mobile || '9876543210',
        customerMobile: normalizePhone(currentCustomer?.mobile || currentCustomer?.phone || '9876543210'),
        customerAddress: currentCustomer?.address || 'Delivery Address',
        customerCity: currentCustomer?.city || 'Hyderabad',
        customerPincode: currentCustomer?.pincode || '500033',
        damageType,
        damageSeverity,
        customerClaim: customerClaim.trim(),
        customerEvidenceImage: imagePayloads[0] || null,
        customerEvidenceImages: imagePayloads,
        reportedAt: new Date().toLocaleString('en-US', { 
          day: 'numeric', 
          month: 'short', 
          year: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        visibleObservation: damageType.toLowerCase().includes('box') 
          ? 'Photographic evidence demonstrates compressive deformation to shipping container; impact verified.'
          : 'Visual inspection reveals physical fracture to chassis. Functional continuity requires testing.',
        unknowns: 'Transit timestamp logs, courier weighbridge record, and pre-packing state require seller cross-examination.',
        uncertaintyFlag: true,
        reviewerConfirmation: false,
        status: 'Routed to Seller',
        awbNumber: awbNumber || 'BLUEDART-882910471',
        courierPartner: courierPartner || 'Blue Dart Express'
      };

      // 1. Call Google Gemini 3.8 Flash AI with all 4-5 images & order details!
      const matchingSellerRecord = sellerPackingRecords.find(r => r.orderNo === orderNo) || null;
      const aiResponse = await analyzeDamageWithGemini(casePayload, matchingSellerRecord);
      
      const geminiReport = aiResponse.report;
      casePayload.geminiReport = geminiReport;
      setGeminiResult(geminiReport);

      const isFraud = geminiReport?.authenticityStatus === 'FRAUD' || 
                      (geminiReport?.fraudProbability || 0) > 50 || 
                      geminiReport?.recommendation === 'CONTEST';
      if (isFraud) {
        casePayload.status = 'Flagged as Suspected Fraud by AI';
        casePayload.fraudDetected = true;
      }

      // 2. Automatically generate the official Gemini AI Damage Report PDF!
      await generateGeminiAIEvidencePDF({
        orderRecord: matchingSellerRecord || casePayload,
        caseData: casePayload,
        geminiReport
      });

      // 3. Dispatch & route the completed docket to the Seller!
      onSubmitCase(casePayload);
      setSubmissionSuccess(casePayload);
      setEvidenceImages([]);
      setCustomerClaim('');

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Failed Gemini AI Analysis:', err);
      alert('Error during Gemini AI analysis: ' + err.message);
    } finally {
      setIsAnalyzingGemini(false);
    }
  };

  // If no customer is logged in / registered yet, show clean Login and Sign Up view
  if (!currentCustomer) {
    return (
      <div className="max-w-xl mx-auto py-10 px-4 animate-fade-in space-y-6">
        <div className="bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-10 shadow-sm space-y-6 text-center">
          
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center mx-auto text-indigo-600 shadow-2xs">
            <User className="w-8 h-8" />
          </div>

          <div>
            <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
              Customer Portal Authentication
            </span>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-2">
              {authMode === 'login' ? 'Customer Login' : 'Customer Sign Up'}
            </h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
              {authMode === 'login'
                ? 'Sign in with your 10-digit mobile number and password to manage orders and report damages.'
                : 'Create your customer profile with your 10-digit mobile number and password.'}
            </p>
          </div>

          {/* Login vs Sign Up Pill Toggle */}
          <div className="flex justify-center">
            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setLoginError('');
                }}
                className={`px-5 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                  authMode === 'login'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Login</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signup');
                  setLoginError('');
                }}
                className={`px-5 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                  authMode === 'signup'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Sign Up</span>
              </button>
            </div>
          </div>

          {/* ======================================================== */}
          {/* TAB 1: LOGIN (MOBILE NUMBER & PASSWORD) */}
          {/* ======================================================== */}
          {authMode === 'login' && (
            <form onSubmit={handleCustomerLoginSubmit} className="text-left space-y-4 pt-1 animate-fade-in">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  10-Digit Mobile Number *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={loginMobile}
                    onChange={(e) => {
                      setLoginMobile(e.target.value);
                      setLoginError('');
                    }}
                    placeholder="e.g. 9811230491"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-900 font-mono font-medium focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showLoginPassword ? "text" : "password"}
                    required
                    value={loginPassword}
                    onChange={(e) => {
                      setLoginPassword(e.target.value);
                      setLoginError('');
                    }}
                    placeholder="Enter your password"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {loginError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center space-x-2 mt-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Login & Open Customer Dashboard</span>
              </button>

              <div className="text-center pt-2">
                <p className="text-xs text-slate-500">
                  Don't have an account yet?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signup');
                      setLoginError('');
                    }}
                    className="text-indigo-600 font-bold hover:underline"
                  >
                    Sign Up here
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* ======================================================== */}
          {/* TAB 2: SIGN UP (CREATE PROFILE & PASSWORD) */}
          {/* ======================================================== */}
          {authMode === 'signup' && (
            <form onSubmit={handleRegisterCustomerSubmit} className="text-left space-y-3.5 pt-1 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Full Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Vivek Kumar"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    10-Digit Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={regMobile}
                    onChange={(e) => setRegMobile(e.target.value)}
                    placeholder="e.g. 9811230491"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Create Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type={showRegPassword ? "text" : "password"}
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Create your customer password"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-9 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="e.g. vivek@example.com"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Delivery Street Address
                </label>
                <input
                  type="text"
                  value={regAddress}
                  onChange={(e) => setRegAddress(e.target.value)}
                  placeholder="e.g. Flat 402, Green Meadows, Jubilee Hills"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={regCity}
                    onChange={(e) => setRegCity(e.target.value)}
                    placeholder="Hyderabad"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={regState}
                    onChange={(e) => setRegState(e.target.value)}
                    placeholder="Telangana"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Pincode
                  </label>
                  <input
                    type="text"
                    value={regPincode}
                    onChange={(e) => setRegPincode(e.target.value)}
                    placeholder="500033"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center space-x-2"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Register Profile & Open Dashboard</span>
                </button>
              </div>

              <div className="text-center pt-1">
                <p className="text-xs text-slate-500">
                  Already registered?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setLoginError('');
                    }}
                    className="text-indigo-600 font-bold hover:underline"
                  >
                    Login here
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* OTP Verification Modal during Customer Sign Up */}
          <OtpVerificationModal
            isOpen={showOtpModal}
            onClose={() => setShowOtpModal(false)}
            phoneNumber={pendingRegistration?.mobile || regMobile}
            email={pendingRegistration?.email || regEmail}
            accountName={pendingRegistration?.name || regName}
            accountType="customer"
            onVerifySuccess={handleOtpVerified}
          />

        </div>
      </div>
    );
  }

  // Dynamic progress through the 5-step dispute claim workflow
  const currentStep = submissionSuccess 
    ? 5 
    : isAnalyzingGemini 
      ? 4 
      : evidenceImages.length > 0 
        ? 3 
        : customerClaim.trim().length > 0 
          ? 2 
          : 1;

  return (
    <div className="space-y-6 pb-16 font-['Plus_Jakarta_Sans',sans-serif]">
      
      {/* ======================================================== */}
      {/* TOP: HERO GREETING & AI POWERED CARD (MATCHING SCREENSHOT) */}
      {/* ======================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight">
              Hey {currentCustomer?.name?.split(' ')[0] || 'Customer'},
            </h1>
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-zinc-100 text-zinc-700 border border-zinc-200">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>Customer Portal</span>
            </span>
          </div>
          <p className="text-sm text-zinc-500 mt-1">
            Let's review and resolve damaged product claims efficiently.
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
              <Box className="w-5 h-5 text-zinc-800" />
            </div>
            <div>
              <span className="text-2xl font-extrabold text-zinc-950 font-mono block leading-tight">{metrics.totalOrders}</span>
              <span className="text-xs font-bold text-zinc-900 block">Total Orders</span>
              <span className="text-[10px] text-zinc-500">From verified sellers</span>
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
              <span className="text-2xl font-extrabold text-zinc-950 font-mono block leading-tight">{metrics.totalReturns}</span>
              <span className="text-xs font-bold text-zinc-900 block">Total Returns</span>
              <span className="text-[10px] text-zinc-500">Physical returns verified</span>
            </div>
          </div>
          <BarChart3 className="w-4 h-4 text-zinc-300 shrink-0" />
        </div>

        {/* Card 3: Total Refunds */}
        <div className="rounded-2xl bg-white border border-zinc-200/90 p-5 shadow-xs flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-zinc-50 border border-zinc-200/90 flex items-center justify-center text-zinc-800 shrink-0">
              <ShieldCheck className="w-5 h-5 text-zinc-800" />
            </div>
            <div>
              <span className="text-2xl font-extrabold text-zinc-950 font-mono block leading-tight">{metrics.totalRefunds}</span>
              <span className="text-xs font-bold text-zinc-900 block">Total Refunds</span>
              <span className="text-[10px] text-zinc-500">100% credited to source</span>
            </div>
          </div>
          <BarChart3 className="w-4 h-4 text-zinc-300 shrink-0" />
        </div>

        {/* Card 4: Active Claims */}
        <div className="rounded-2xl bg-white border border-zinc-200/90 p-5 shadow-xs flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-zinc-50 border border-zinc-200/90 flex items-center justify-center text-zinc-800 shrink-0">
              <FileText className="w-5 h-5 text-zinc-800" />
            </div>
            <div>
              <span className="text-2xl font-extrabold text-zinc-950 font-mono block leading-tight">{metrics.activeClaims}</span>
              <span className="text-xs font-bold text-zinc-900 block">Active Claims</span>
              <span className="text-[10px] text-zinc-500">Dispute dockets</span>
            </div>
          </div>
          <BarChart3 className="w-4 h-4 text-zinc-300 shrink-0" />
        </div>

      </div>

      {/* ======================================================== */}
      {/* 5-STEP HORIZONTAL STEPPER (MATCHING SCREENSHOT) */}
      {/* ======================================================== */}
      <div className="rounded-2xl bg-white border border-zinc-200/90 px-6 py-4 shadow-xs">
        <div className="flex items-center justify-between overflow-x-auto text-xs py-1 gap-3">
          
          {/* Step 1 */}
          <div className="flex items-center space-x-2.5 shrink-0">
            <span className={`w-6 h-6 rounded-full font-bold text-[11px] flex items-center justify-center transition ${
              currentStep > 1 
                ? 'bg-emerald-600 text-white' 
                : currentStep === 1 
                  ? 'bg-zinc-950 text-white ring-2 ring-zinc-400 ring-offset-1' 
                  : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
            }`}>
              {currentStep > 1 ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '1'}
            </span>
            <div>
              <span className={`block leading-tight ${currentStep >= 1 ? 'font-bold text-zinc-950' : 'font-semibold text-zinc-500'}`}>
                Order & Product
              </span>
              <span className="text-[10px] text-zinc-500 hidden sm:block">Select order and product details</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-300 shrink-0" />

          {/* Step 2 */}
          <div className="flex items-center space-x-2.5 shrink-0">
            <span className={`w-6 h-6 rounded-full font-bold text-[11px] flex items-center justify-center transition ${
              currentStep > 2 
                ? 'bg-emerald-600 text-white' 
                : currentStep === 2 
                  ? 'bg-zinc-950 text-white ring-2 ring-zinc-400 ring-offset-1' 
                  : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
            }`}>
              {currentStep > 2 ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '2'}
            </span>
            <div>
              <span className={`block leading-tight ${currentStep >= 2 ? 'font-bold text-zinc-950' : 'font-medium text-zinc-500'}`}>
                Damage Details
              </span>
              <span className="text-[10px] text-zinc-400 hidden sm:block">Describe the issue</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-300 shrink-0" />

          {/* Step 3 */}
          <div className="flex items-center space-x-2.5 shrink-0">
            <span className={`w-6 h-6 rounded-full font-bold text-[11px] flex items-center justify-center transition ${
              currentStep > 3 
                ? 'bg-emerald-600 text-white' 
                : currentStep === 3 
                  ? 'bg-zinc-950 text-white ring-2 ring-zinc-400 ring-offset-1' 
                  : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
            }`}>
              {currentStep > 3 ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '3'}
            </span>
            <div>
              <span className={`block leading-tight ${currentStep >= 3 ? 'font-bold text-zinc-950' : 'font-medium text-zinc-500'}`}>
                Upload Evidence
              </span>
              <span className="text-[10px] text-zinc-400 hidden sm:block">Add 4-5 clear photos</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-300 shrink-0" />

          {/* Step 4 */}
          <div className="flex items-center space-x-2.5 shrink-0">
            <span className={`w-6 h-6 rounded-full font-bold text-[11px] flex items-center justify-center transition ${
              currentStep > 4 
                ? 'bg-emerald-600 text-white' 
                : currentStep === 4 
                  ? 'bg-zinc-950 text-white ring-2 ring-zinc-400 ring-offset-1' 
                  : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
            }`}>
              {currentStep > 4 ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '4'}
            </span>
            <div>
              <span className={`block leading-tight ${currentStep >= 4 ? 'font-bold text-zinc-950' : 'font-medium text-zinc-500'}`}>
                AI Analysis
              </span>
              <span className="text-[10px] text-zinc-400 hidden sm:block">Review AI insights</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-300 shrink-0" />

          {/* Step 5 */}
          <div className="flex items-center space-x-2.5 shrink-0">
            <span className={`w-6 h-6 rounded-full font-bold text-[11px] flex items-center justify-center transition ${
              currentStep === 5 
                ? 'bg-emerald-600 text-white ring-2 ring-emerald-400 ring-offset-1' 
                : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
            }`}>
              {currentStep === 5 ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '5'}
            </span>
            <div>
              <span className={`block leading-tight ${currentStep === 5 ? 'font-bold text-emerald-950' : 'font-medium text-zinc-500'}`}>
                Review & Action
              </span>
              <span className="text-[10px] text-zinc-400 hidden sm:block">Confirm and proceed</span>
            </div>
          </div>

        </div>
      </div>

      {/* ======================================================== */}
      {/* CUSTOMER SUB-NAVIGATION PILLS (LINEAR HIGH-CONTRAST) */}
      {/* ======================================================== */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setCustomerSubTab('report')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center space-x-2 ${
            customerSubTab === 'report'
              ? 'bg-zinc-950 text-white shadow-xs'
              : 'bg-white text-zinc-600 hover:text-zinc-950 border border-zinc-200/90'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Report Damaged Product</span>
        </button>

        <button
          onClick={() => setCustomerSubTab('orders')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center space-x-2 ${
            customerSubTab === 'orders'
              ? 'bg-zinc-950 text-white shadow-xs'
              : 'bg-white text-zinc-600 hover:text-zinc-950 border border-zinc-200/90'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>My Orders ({activeOrders.length})</span>
        </button>

        <button
          onClick={() => setCustomerSubTab('disputes')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center space-x-2 ${
            customerSubTab === 'disputes'
              ? 'bg-zinc-950 text-white shadow-xs'
              : 'bg-white text-zinc-600 hover:text-zinc-950 border border-zinc-200/90'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Damage Claims & PDF Reports ({metrics.activeClaims})</span>
        </button>

        <button
          onClick={() => setCustomerSubTab('profile')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center space-x-2 ${
            customerSubTab === 'profile'
              ? 'bg-zinc-950 text-white shadow-xs'
              : 'bg-white text-zinc-600 hover:text-zinc-950 border border-zinc-200/90'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Delivery Address</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* SUB-TAB 1: REPORT DAMAGED PRODUCT (MATCHING SCREENSHOT) */}
      {/* ======================================================== */}
      {customerSubTab === 'report' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* SUCCESS BANNER WITH LIVE GEMINI AI VERDICT */}
          {submissionSuccess && (
            <div className="rounded-2xl bg-zinc-950 text-white p-6 shadow-md border border-zinc-800 animate-fade-in">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 text-emerald-400">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-white">
                        Dispute Docket #{submissionSuccess.caseId} Created & Routed to Seller!
                      </h3>
                      {geminiResult?.recommendation && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                            geminiResult.recommendation === 'REPLACE'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : geminiResult.recommendation === 'REFUND'
                              ? 'bg-sky-950 text-sky-300 border border-sky-800'
                              : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}>
                            Gemini AI: {geminiResult.recommendation}
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      Google Gemini Multimodal AI cross-examined your {submissionSuccess.customerEvidenceImages?.length || 1} damage photos against seller pre-dispatch baselines.
                      The forensic report was dispatched to <strong className="text-white">{submissionSuccess.sellerName}</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                  <button
                    onClick={() => generateGeminiAIEvidencePDF({
                      caseData: submissionSuccess,
                      geminiReport: submissionSuccess.geminiReport
                    })}
                    className="flex-1 lg:flex-none flex items-center justify-center space-x-2 px-4 py-2.5 bg-white text-zinc-950 hover:bg-zinc-100 rounded-xl text-xs font-bold transition shadow-xs"
                  >
                    <FileDown className="w-4 h-4 text-zinc-950" />
                    <span>Download Gemini AI PDF Report</span>
                  </button>
                  <button
                    onClick={() => {
                      setSubmissionSuccess(null);
                      setCustomerSubTab('disputes');
                    }}
                    className="flex-1 lg:flex-none flex items-center justify-center space-x-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-700 rounded-xl text-xs font-semibold transition"
                  >
                    <span>View Claims</span>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* ======================================================== */}
            {/* LEFT COLUMN: FORM CARDS (7 COLS) */}
            {/* ======================================================== */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* CARD 1: ORDER SELECTION */}
              <div className="bg-white border border-zinc-200/90 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-900 shrink-0">
                      <Box className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-zinc-950">
                        Order Selection
                      </h3>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Choose an order from {currentCustomer?.name?.split(' ')[0] || 'kajal'}'s delivery history or add manually.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddOrderModal(true)}
                    className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Manual Order</span>
                  </button>
                </div>

                {/* Delivered Orders List or Empty Prompt */}
                {deliveredOrders.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {deliveredOrders.map((ord) => {
                      const isSelected = selectedOrderNo === ord.orderNo;
                      return (
                        <div
                          key={ord.orderNo}
                          onClick={() => handleSelectOrder(ord)}
                          className={`p-3.5 rounded-xl border cursor-pointer transition ${
                            isSelected
                              ? 'bg-zinc-50 border-zinc-950 ring-1 ring-zinc-950 shadow-xs'
                              : 'bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/60'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-11 h-11 rounded-lg bg-zinc-100 border border-zinc-200 overflow-hidden flex items-center justify-center shrink-0">
                              <img
                                src={ord.image || '/assets/P01.png'}
                                alt={ord.productName}
                                className="w-full h-full object-contain p-1"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = '/assets/P01.png';
                                }}
                              />
                            </div>
                            <div className="overflow-hidden">
                              <div className="flex items-center space-x-1.5">
                                <span className="text-xs font-mono font-bold text-zinc-950">{ord.orderNo}</span>
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-700 font-bold">
                                  {ord.status || 'Delivered'}
                                </span>
                              </div>
                              <h4 className="text-xs font-semibold text-zinc-900 truncate mt-0.5">{ord.productName}</h4>
                              <p className="text-[10px] text-zinc-500 truncate">Sold by: {ord.sellerName?.split(' ')[0]}</p>
                            </div>
                          </div>
                          <div className="mt-2 pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px]">
                            <span className="font-extrabold text-zinc-950 font-mono">₹{ord.price?.toLocaleString()}</span>
                            <span className={`text-[10px] font-bold ${isSelected ? 'text-zinc-950' : 'text-zinc-400'}`}>
                              {isSelected ? '✓ Selected' : 'Select'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 rounded-xl bg-zinc-50 border border-zinc-200 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-200/80 flex items-center justify-center text-zinc-500 mx-auto">
                      <Box className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900">
                        No delivered orders found for {currentCustomer?.name?.split(' ')[0] || 'kajal'}
                      </h4>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Add a booked order manually or have a seller dispatch an order to mobile {currentCustomer?.mobile}.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddOrderModal(true)}
                      className="px-4 py-2 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold transition inline-flex items-center space-x-1.5 shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Booked Order</span>
                    </button>
                  </div>
                )}
              </div>

              {/* CARD 2: PRODUCT & DAMAGE DETAILS */}
              <div className="bg-white border border-zinc-200/90 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center space-x-3 border-b border-zinc-100 pb-3">
                  <div className="w-9 h-9 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-900 shrink-0">
                    <Tag className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-950">
                      Product & Damage Details
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Describe what was damaged and select the category.
                    </p>
                  </div>
                </div>

                {/* Category & Severity Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                      Damage Category
                    </label>
                    <select
                      value={damageType}
                      onChange={(e) => setDamageType(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-xs text-zinc-900 font-medium focus:bg-white focus:outline-none focus:border-zinc-950 transition"
                    >
                      <option value="Outer Box Crushed & Item Broken">Outer Box Crushed & Item Broken</option>
                      <option value="Packaging Damage Only (Box Dent/Tear)">Packaging Damage Only (Box Dent/Tear)</option>
                      <option value="Product Shattered / Physical Fracture">Product Shattered / Physical Fracture</option>
                      <option value="Defective / Not Powering On (Functional)">Defective / Not Powering On (Functional)</option>
                      <option value="Liquid Spillage / Water Damage">Liquid Spillage / Water Damage</option>
                      <option value="Missing Parts / Broken Seal">Missing Parts / Broken Seal</option>
                      <option value="Wrong Item Dispatched">Wrong Item Dispatched</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                      Severity Level
                    </label>
                    <div className="grid grid-cols-3 gap-2 bg-zinc-50 p-1 rounded-xl border border-zinc-200">
                      {['Minor', 'Moderate', 'Severe'].map((sev) => {
                        const isSel = damageSeverity === sev;
                        return (
                          <button
                            type="button"
                            key={sev}
                            onClick={() => setDamageSeverity(sev)}
                            className={`py-1.5 text-xs font-bold rounded-lg transition ${
                              isSel
                                ? 'bg-zinc-950 text-white shadow-xs'
                                : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
                            }`}
                          >
                            {sev}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Short Description Textarea */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-zinc-700">
                      Short Problem Description (Your Statement) *
                    </label>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {customerClaim.length}/500
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={customerClaim}
                    onChange={(e) => setCustomerClaim(e.target.value)}
                    required
                    placeholder="E.g. Package arrived crushed at the side, device chassis has a visible crack across the casing, does not power on..."
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs text-zinc-900 placeholder-zinc-400 focus:bg-white focus:outline-none focus:border-zinc-950 transition leading-relaxed"
                  />
                </div>
              </div>

              {/* CARD 3: UPLOAD EVIDENCE PHOTOS */}
              <div className="bg-white border border-zinc-200/90 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-900 shrink-0">
                      <Camera className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-zinc-950">
                        Upload Evidence Photos
                      </h3>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Upload 4-5 clear photos showing outer box, shipping label, product, damage close-ups and any other relevant evidence.
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-zinc-100 text-zinc-800 border border-zinc-200 shrink-0">
                    {evidenceImages.length}/5 Photos
                  </span>
                </div>

                {/* Dropzone with Action Buttons on Right (Matching Screenshot) */}
                <div className="border border-zinc-200 rounded-2xl p-5 bg-zinc-50/50 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center space-x-3 text-left">
                    <div className="w-10 h-10 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-700 shrink-0">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-zinc-900 block">
                        Drag & drop images here, or click to upload
                      </span>
                      <span className="text-[10px] text-zinc-500 block mt-0.5">
                        Supports JPG, PNG, WEBP (Max 10MB each)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 w-full md:w-auto">
                    <label className="flex-1 md:flex-none cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleMultiFileUpload}
                        className="hidden"
                      />
                      <span className="w-full inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold transition shadow-2xs">
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>Upload Photos</span>
                      </span>
                    </label>

                    <button
                      type="button"
                      onClick={handleLoadBenchmarkPhotos}
                      className="flex-1 md:flex-none inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-200 rounded-xl text-xs font-semibold transition shadow-2xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Use Sample Test Images</span>
                    </button>
                  </div>
                </div>

                {/* 5-Slot Photo Gallery Preview (Matching Screenshot) */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
                  {[0, 1, 2, 3, 4].map((slotIdx) => {
                    const img = evidenceImages[slotIdx];
                    const slotTitles = ['1. Outer Box', '2. Shipping Label', '3. Product View', '4. Damage Close-up', '5. Additional View'];
                    return (
                      <div
                        key={slotIdx}
                        className={`rounded-xl border p-2 relative flex flex-col justify-between transition aspect-square ${
                          img 
                            ? 'bg-white border-zinc-300 shadow-2xs' 
                            : 'bg-zinc-50 border-zinc-200 text-zinc-400'
                        }`}
                      >
                        {img ? (
                          <>
                            <div className="w-full h-16 rounded-lg overflow-hidden bg-zinc-100 flex items-center justify-center">
                              <img
                                src={img.url}
                                alt={img.label}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div className="mt-1 flex items-center justify-between text-[10px]">
                              <span className="font-semibold text-zinc-700 truncate max-w-[80px]">
                                {slotTitles[slotIdx]}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveImage(img.id)}
                                className="p-0.5 text-zinc-400 hover:text-rose-600 rounded transition"
                                title="Remove photo"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-center p-1">
                            <Box className="w-5 h-5 text-zinc-300 mb-1" />
                            <span className="text-[10px] font-semibold text-zinc-500">
                              {slotTitles[slotIdx]}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* ======================================================== */}
            {/* RIGHT COLUMN: AI EVIDENCE ANALYSIS (MATCHING SCREENSHOT) */}
            {/* ======================================================== */}
            <div className="lg:col-span-5 space-y-4">
              <div className="sticky top-24 space-y-4">
                
                {/* AI Evidence Analysis Container */}
                <div className="rounded-2xl border border-zinc-200/90 overflow-hidden shadow-xs bg-white">
                  
                  {/* Top Dark Section */}
                  <div className="bg-[#09090b] text-white p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <Sparkles className="w-4 h-4 text-zinc-200" />
                          <h4 className="text-sm font-bold text-white">
                            AI Evidence Analysis
                          </h4>
                          <span className="px-1.5 py-0.2 rounded-full bg-zinc-800 text-zinc-300 text-[10px] font-bold tracking-wider">
                            BETA
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-1">
                          Gemini AI analyzes your photos and description to extract key information.
                        </p>
                      </div>

                      <span className="inline-flex items-center space-x-1 text-[10px] font-mono font-semibold text-zinc-300 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full shrink-0">
                        <span>⚡</span>
                        <span>{isAnalyzingGemini ? 'Analyzing...' : 'Analyzing in 3.2s'}</span>
                      </span>
                    </div>

                    {/* 3 Dark Metric Stat Cards */}
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      
                      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-2.5 text-center">
                        <div className="flex items-center justify-center space-x-1 mb-0.5">
                          <Eye className="w-3.5 h-3.5 text-zinc-300" />
                          <span className="text-lg font-extrabold text-white font-mono">
                            {evidenceImages.length}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-zinc-200 block leading-tight">
                          Visible Observations
                        </span>
                        <span className="text-[9px] text-zinc-500 block">From uploaded images</span>
                      </div>

                      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-2.5 text-center">
                        <div className="flex items-center justify-center space-x-1 mb-0.5">
                          <Quote className="w-3.5 h-3.5 text-zinc-300" />
                          <span className="text-lg font-extrabold text-white font-mono">
                            {customerClaim.trim() ? (customerClaim.split(/[.\n]+/).filter(s => s.trim().length > 0).length || 1) : 0}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-zinc-200 block leading-tight">
                          Customer Statements
                        </span>
                        <span className="text-[9px] text-zinc-500 block">From complaint text</span>
                      </div>

                      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-2.5 text-center">
                        <div className="flex items-center justify-center space-x-1 mb-0.5">
                          <HelpCircle className="w-3.5 h-3.5 text-zinc-300" />
                          <span className="text-lg font-extrabold text-white font-mono">
                            {geminiResult?.uncertaintyFlags?.length || (evidenceImages.length === 0 ? 3 : 1)}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-zinc-200 block leading-tight">
                          Unknown Details
                        </span>
                        <span className="text-[9px] text-zinc-500 block">Need more info</span>
                      </div>

                    </div>
                  </div>

                  {/* Tab Navigation under dark header */}
                  <div className="bg-zinc-50 border-b border-zinc-200 px-4 pt-2.5 flex space-x-4 text-xs font-semibold overflow-x-auto">
                    {[
                      { id: 'summary', label: 'Evidence Summary' },
                      { id: 'photo', label: 'Photo Analysis' },
                      { id: 'uncertainty', label: 'Uncertainty Flags' },
                      { id: 'suggestions', label: 'Suggestions' }
                    ].map((tab) => {
                      const isActive = aiTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setAiTab(tab.id)}
                          className={`pb-2 transition border-b-2 whitespace-nowrap ${
                            isActive
                              ? 'border-zinc-950 text-zinc-950 font-bold'
                              : 'border-transparent text-zinc-500 hover:text-zinc-900'
                          }`}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Card Body */}
                  <div className="p-5 space-y-4">
                    
                    {/* Section 1: Visible Observations */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Eye className="w-4 h-4 text-zinc-700" />
                          <h5 className="text-xs font-bold text-zinc-950">
                            Visible Observations <span className="text-zinc-400 font-normal">(from photos)</span>
                          </h5>
                        </div>
                        <button
                          type="button"
                          className="text-[11px] text-zinc-500 hover:text-zinc-950 flex items-center space-x-1 font-medium"
                        >
                          <Edit className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      </div>

                      <div className="flex items-start justify-between gap-3 bg-zinc-50/70 p-3 rounded-xl border border-zinc-100">
                        <ul className="text-xs text-zinc-600 space-y-1 list-disc list-inside flex-1">
                          <li>Outer box has visible crush damage on the top-right corner.</li>
                          <li>Shipping label is visible and intact.</li>
                          <li>Product appears to have a crack on the back panel.</li>
                          <li>Charging port area seems damaged.</li>
                          <li>No damage visible on the screen.</li>
                        </ul>
                        {evidenceImages[0] && (
                          <div className="w-16 h-16 rounded-lg overflow-hidden border border-zinc-200 bg-white shrink-0">
                            <img
                              src={evidenceImages[0].url}
                              alt="Observation thumbnail"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Section 2: Customer Statements */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Quote className="w-4 h-4 text-zinc-700" />
                          <h5 className="text-xs font-bold text-zinc-950">
                            Customer Statements <span className="text-zinc-400 font-normal">(from complaint)</span>
                          </h5>
                        </div>
                        <button
                          type="button"
                          className="text-[11px] text-zinc-500 hover:text-zinc-950 flex items-center space-x-1 font-medium"
                        >
                          <Edit className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      </div>

                      <div className="bg-zinc-50/70 p-3 rounded-xl border border-zinc-100">
                        <ul className="text-xs text-zinc-600 space-y-1 list-disc list-inside">
                          <li>{customerClaim ? customerClaim : 'The product arrived damaged.'}</li>
                          <li>There is a visible crack on the device.</li>
                          <li>The device is not powering on.</li>
                        </ul>
                      </div>
                    </div>

                    {/* Section 3: Unknown or Unverified Details */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <HelpCircle className="w-4 h-4 text-zinc-700" />
                          <h5 className="text-xs font-bold text-zinc-950">
                            Unknown or Unverified Details
                          </h5>
                        </div>
                        <button
                          type="button"
                          className="text-[11px] text-zinc-500 hover:text-zinc-950 flex items-center space-x-1 font-medium"
                        >
                          <Edit className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      </div>

                      <div className="bg-zinc-50/70 p-3 rounded-xl border border-zinc-100">
                        <ul className="text-xs text-zinc-600 space-y-1 list-disc list-inside">
                          <li>Whether the damage occurred during shipping or before dispatch.</li>
                          <li>Whether the device powers on under different conditions.</li>
                          <li>Whether all original accessories are included.</li>
                          <li>Whether the photo corresponds to the reported order.</li>
                        </ul>
                      </div>
                    </div>

                    {/* Uncertainty Flags Callout & Additional Evidence Needed */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      
                      {/* Uncertainty Flags */}
                      <div className="p-3 rounded-xl border border-zinc-200 bg-zinc-50 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1.5 text-zinc-900 font-bold text-xs">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                            <span>Uncertainty Flags</span>
                          </div>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-zinc-200 text-zinc-800">
                            2 flags
                          </span>
                        </div>
                        <div className="space-y-1.5 text-[11px]">
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-600">Packaging damage detected</span>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">Medium</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-600">Product image partially blurry</span>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-zinc-200 text-zinc-700">Low</span>
                          </div>
                        </div>
                      </div>

                      {/* Additional Evidence Needed */}
                      <div className="p-3 rounded-xl border border-zinc-200 bg-zinc-50 space-y-1.5">
                        <div className="flex items-center space-x-1.5 text-zinc-900 font-bold text-xs">
                          <Info className="w-3.5 h-3.5 text-zinc-600" />
                          <span>Additional Evidence Needed</span>
                        </div>
                        <ul className="text-[10px] text-zinc-600 space-y-0.5 list-disc list-inside">
                          <li>Add clear photo of product from all sides.</li>
                          <li>Upload close-up of damaged area.</li>
                          <li>Share photo with device powered on.</li>
                        </ul>
                      </div>

                    </div>

                  </div>

                  {/* Bottom Action Buttons (Matching Screenshot) */}
                  <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => alert(`Draft saved successfully for Order #${orderNo || 'ORD-NEW'}`)}
                      className="px-4 py-2.5 bg-white hover:bg-zinc-100 text-zinc-800 border border-zinc-200 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 shadow-2xs"
                    >
                      <Save className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Save as Draft</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSubmitWithGeminiAI}
                      disabled={isAnalyzingGemini}
                      className="px-5 py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition flex items-center space-x-2 shadow-xs disabled:opacity-50"
                    >
                      {isAnalyzingGemini ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                          <span>Analyzing with Gemini AI...</span>
                        </>
                      ) : (
                        <>
                          <span>Proceed to Review</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>

                </div>

              </div>
            </div>

          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 2: MY ORDER LIST (ISOLATED TO ACTIVE CUSTOMER) */}
      {/* ======================================================== */}
      {customerSubTab === 'orders' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-600" />
                <span>{currentCustomer?.name}'s Order History ({activeOrders.length})</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                All marketplace purchases associated with mobile number <strong className="font-mono text-slate-700">{currentCustomer?.mobile}</strong>. Click "Report Damage" on any delivered item to launch a claim.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setShowAddOrderModal(true)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Booked Order</span>
              </button>
              <button
                onClick={() => setCustomerSubTab('report')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-xs"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Raise Damage Claim</span>
              </button>
            </div>
          </div>

          {activeOrders.length === 0 ? (
            <div className="bg-white border border-slate-200/90 rounded-3xl p-12 text-center shadow-sm space-y-4 max-w-xl mx-auto">
              <Package className="w-12 h-12 text-indigo-300 mx-auto" />
              <div>
                <h4 className="text-base font-bold text-slate-900">No Orders for {currentCustomer?.name}</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Add a booked order directly or have a seller record a dispatch to mobile {currentCustomer?.mobile}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddOrderModal(true)}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition inline-flex items-center space-x-2 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Booked Order Now</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeOrders.map((ord) => {
                const isDelivered = ord.status === 'Delivered';
                const isReturned = ord.status === 'Returned';
                const isRefunded = ord.status === 'Refunded';

                return (
                  <div
                    key={ord.orderNo}
                    className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-3.5 hover:border-slate-300 transition shadow-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3.5">
                        <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                          <img
                            src={ord.image || '/assets/P01.png'}
                            alt={ord.productName}
                            className="w-full h-full object-contain p-1"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = '/assets/P01.png';
                            }}
                          />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-mono font-bold text-indigo-700">{ord.orderNo}</span>
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                              isDelivered
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : isReturned
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-sky-50 text-sky-800 border border-sky-200'
                            }`}>
                              {ord.status}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 mt-1 line-clamp-1">{ord.productName}</h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Category: {ord.category} · Price: <strong className="text-slate-800">₹{ord.price?.toLocaleString()}</strong>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Seller & Dispatch Info */}
                    <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px]">
                      <div>
                        <span className="text-slate-500 block">Sold & Fulfilled By</span>
                        <span className="font-semibold text-indigo-900 truncate block">{ord.sellerName}</span>
                        <span className="font-mono text-[10px] text-slate-500">ID: {ord.sellerId}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Courier & AWB</span>
                        <span className="font-semibold text-slate-800">{ord.courier || 'Blue Dart'}</span>
                        <span className="font-mono text-indigo-700 text-[10px] block">{ord.awb || 'BLUEDART-8829'}</span>
                      </div>
                    </div>

                    {/* Return/Refund Notice if applicable */}
                    {ord.returnReason && (
                      <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-[11px] text-amber-900 flex items-center space-x-1.5">
                        <RotateCcw className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        <span>Return Reason: {ord.returnReason}</span>
                      </div>
                    )}
                    {ord.refundReason && (
                      <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-[11px] text-emerald-900 flex items-center space-x-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span>Refund Status: {ord.refundReason}</span>
                      </div>
                    )}

                    {/* Action: 1-Click Report Damage on this order */}
                    {isDelivered && (
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-500 text-[11px]">
                          Delivered on: {ord.deliveryDate}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleReportFromOrderList(ord)}
                          className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold transition flex items-center space-x-1.5 shadow-xs"
                        >
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                          <span>Report Damaged Product</span>
                        </button>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 3: ACTIVE DISPUTES & CERTIFIED EVIDENCE DOCKETS */}
      {/* ======================================================== */}
      {customerSubTab === 'disputes' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                <span>Active Disputes & Gemini AI Decision Dockets</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Claims filed by {currentCustomer.name} with AI resolutions and downloadable official PDFs.
              </p>
            </div>
            <span className="text-xs font-mono px-3 py-1 bg-white text-indigo-700 border border-indigo-200 rounded-full font-bold shadow-xs">
              {metrics.activeClaims} Claims
            </span>
          </div>

          {metrics.activeClaims === 0 ? (
            <div className="bg-white border border-slate-200/90 rounded-3xl p-12 text-center shadow-sm space-y-3 max-w-xl mx-auto">
              <Clock className="w-12 h-12 text-indigo-300 mx-auto" />
              <h4 className="text-base font-bold text-slate-900">No Open Disputes for {currentCustomer.name}</h4>
              <p className="text-xs text-slate-500">
                When you report a damaged product, your evidence docket and downloadable Gemini AI report will appear here.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => setCustomerSubTab('report')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                  Raise Damage Claim
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {evidenceCases
                .filter(c => normalizePhone(c.customerMobile || c.customerPhone) === normalizePhone(currentCustomer.mobile))
                .map((c) => (
                  <div
                    key={c.caseId}
                    className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-3 hover:border-slate-300 transition shadow-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-mono font-bold text-indigo-700">{c.caseId}</span>
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {c.status}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 mt-1 line-clamp-1">{c.productName}</h4>
                        <p className="text-[11px] text-slate-500">Order: <strong className="font-mono text-slate-700">{c.orderNo}</strong> • Reported: {c.reportedAt}</p>
                        <p className="text-[11px] text-indigo-800 font-semibold mt-0.5">
                          Redirected to Seller: {c.sellerName}
                        </p>
                      </div>

                      {/* Photo Thumbnail */}
                      <div className="w-13 h-13 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden shrink-0">
                        <img
                          src={c.customerEvidenceImages?.[0] || c.customerEvidenceImage || '/assets/P01.png'}
                          alt="Evidence"
                          className="w-full h-full object-contain p-1"
                        />
                      </div>
                    </div>

                    {/* Gemini AI Recommendation & Fraud Detection Badge */}
                    {c.geminiReport?.recommendation && (
                      <div className="space-y-1.5">
                        <div className={`p-2.5 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-2 ${
                          c.geminiReport.recommendation === 'REPLACE'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                            : c.geminiReport.recommendation === 'REFUND'
                            ? 'bg-sky-50 border-sky-200 text-sky-900'
                            : c.geminiReport.recommendation === 'CONTEST'
                            ? 'bg-rose-50 border-rose-200 text-rose-900'
                            : 'bg-amber-50 border-amber-200 text-amber-900'
                        }`}>
                          <div className="flex items-center space-x-1.5 font-bold">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Gemini AI Verdict: {c.geminiReport.recommendation}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              (c.geminiReport.authenticityStatus === 'FRAUD' || (c.geminiReport.fraudProbability || 0) > 50)
                                ? 'bg-rose-100 text-rose-800 border-rose-300'
                                : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            }`}>
                              {(c.geminiReport.authenticityStatus === 'FRAUD' || (c.geminiReport.fraudProbability || 0) > 50)
                                ? `Fraud Risk: ${c.geminiReport.fraudProbability || 85}%`
                                : `Authentic: ${c.geminiReport.authenticityScore || 95}%`}
                            </span>
                            {(() => {
                              const isFraud = c.geminiReport.authenticityStatus === 'FRAUD' || (c.geminiReport.fraudProbability || 0) > 50 || c.geminiReport.recommendation === 'CONTEST';
                              const isReturn = c.geminiReport.recommendation === 'RETURN' || c.geminiReport.authenticityStatus === 'TAMPER_SUSPECTED';
                              const isSafe = c.geminiReport.recommendation === 'VERIFIED_PRISTINE';
                              const riskLevel = isFraud ? 'HIGH RISK' : (isReturn ? 'MODERATE RISK' : (isSafe ? 'SAFE' : 'LOW RISK'));
                              return (
                                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                                  riskLevel === 'HIGH RISK' ? 'bg-rose-100 text-rose-700 border-rose-300' :
                                  riskLevel === 'MODERATE RISK' ? 'bg-amber-100 text-amber-700 border-amber-300' :
                                  riskLevel === 'SAFE' ? 'bg-emerald-100 text-emerald-700 border-emerald-300' :
                                  'bg-blue-100 text-blue-700 border-blue-300'
                                }`}>
                                  Seller Risk: {riskLevel}
                                </span>
                              );
                            })()}
                          </div>
                        </div>

                        {c.geminiReport.crossImageComparison?.beforeVsDamaged && (
                          <div className="text-[10.5px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200">
                            <strong className="text-slate-800">Visual Cross-Check:</strong> {c.geminiReport.crossImageComparison.beforeVsDamaged}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Quoted Claim Statement */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 italic">
                      "{c.customerClaim}"
                    </div>

                    {/* Action buttons */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-500">
                        Photos: {c.customerEvidenceImages?.length || 1} attached
                      </span>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => generateGeminiAIEvidencePDF({
                            caseData: c,
                            geminiReport: c.geminiReport
                          })}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center space-x-1 shadow-xs"
                        >
                          <FileDown className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Download PDF</span>
                        </button>
                        <button
                          onClick={() => onOpenDossierModal(c)}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition flex items-center space-x-1 shadow-xs"
                        >
                          <span>View Dossier</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 4: DELIVERY ADDRESS & ACCOUNT PROFILE */}
      {/* ======================================================== */}
      {customerSubTab === 'profile' && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-600" />
                <span>{currentCustomer.name}'s Verified Delivery Profile</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Profile details linked to mobile number <strong className="font-mono text-slate-700">{currentCustomer.mobile}</strong>.
              </p>
            </div>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition self-start sm:self-auto shadow-2xs"
                title="Sign out of customer session"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out of Profile</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Customer Name</span>
              <p className="text-base font-extrabold text-slate-900">{currentCustomer?.name}</p>
              <p className="text-xs text-indigo-600 font-semibold">{currentCustomer?.membership || 'Registered Customer'}</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Linked Mobile ID</span>
              <p className="text-base font-extrabold text-indigo-900 font-mono">{currentCustomer?.mobile || currentCustomer?.phone}</p>
              <p className="text-xs text-slate-500">{currentCustomer?.email}</p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Dispute Credibility</span>
              <p className="text-base font-extrabold text-emerald-800">{currentCustomer?.trustScore || '100%'}</p>
              <p className="text-xs text-emerald-700">Verified Marketplace Buyer</p>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="p-5 rounded-2xl bg-indigo-50/40 border border-indigo-200 space-y-1.5">
            <span className="px-2.5 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[10px] font-bold">
              VERIFIED PRIMARY SHIPPING ADDRESS
            </span>
            <p className="text-sm font-bold text-slate-900 pt-1">{currentCustomer?.name}</p>
            <p className="text-xs text-slate-700 leading-relaxed">
              {currentCustomer?.address}, {currentCustomer?.city} - {currentCustomer?.pincode}, {currentCustomer?.state}
            </p>
            <p className="text-[11px] text-slate-500 font-mono pt-1">
              Contact: {currentCustomer?.phone || currentCustomer?.mobile}
            </p>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: REGISTER NEW CUSTOMER PROFILE */}
      {/* ======================================================== */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Register New Customer Profile</h3>
                  <p className="text-[11px] text-slate-500">Each customer has a dedicated dashboard linked to mobile.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRegisterModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterCustomerSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Rahul Verma"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    10-Digit Mobile *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={regMobile}
                    onChange={(e) => setRegMobile(e.target.value)}
                    placeholder="e.g. 9812345678"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="e.g. rahul@example.com"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Delivery Address
                </label>
                <input
                  type="text"
                  value={regAddress}
                  onChange={(e) => setRegAddress(e.target.value)}
                  placeholder="e.g. Flat 301, Lake City, Gachibowli"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={regCity}
                    onChange={(e) => setRegCity(e.target.value)}
                    placeholder="Hyderabad"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={regState}
                    onChange={(e) => setRegState(e.target.value)}
                    placeholder="Telangana"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Pincode
                  </label>
                  <input
                    type="text"
                    value={regPincode}
                    onChange={(e) => setRegPincode(e.target.value)}
                    placeholder="500032"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-xs text-slate-900 font-mono font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center space-x-1.5"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Register Customer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD BOOKED ORDER FOR CUSTOMER */}
      {/* ======================================================== */}
      {showAddOrderModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Add Booked Order</h3>
                  <p className="text-[11px] text-slate-500">Adding order to {currentCustomer?.name}'s account ({currentCustomer?.mobile}).</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddOrderModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddOrderSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={newOrderProduct}
                  onChange={(e) => setNewOrderProduct(e.target.value)}
                  placeholder="e.g. Sony Wireless Headphones"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Order Number
                  </label>
                  <input
                    type="text"
                    required
                    value={newOrderNo}
                    onChange={(e) => setNewOrderNo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={newOrderCategory}
                    onChange={(e) => setNewOrderCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Electronics">Electronics</option>
                    <option value="Audio">Audio & Sound</option>
                    <option value="Apparel">Apparel & Fashion</option>
                    <option value="Home & Kitchen">Home & Kitchen</option>
                    <option value="Wearables">Wearables</option>
                    <option value="Tech Accessories">Tech Accessories</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Price (₹)
                  </label>
                  <input
                    type="number"
                    value={newOrderPrice}
                    onChange={(e) => setNewOrderPrice(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Assigned Seller
                  </label>
                  {sellerRegistry.length > 0 ? (
                    <select
                      value={newOrderSeller}
                      onChange={(e) => setNewOrderSeller(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">Select Registered Seller</option>
                      {sellerRegistry.map(s => (
                        <option key={s.id} value={s.name}>{s.name} ({s.id})</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={newOrderSeller}
                      onChange={(e) => setNewOrderSeller(e.target.value)}
                      placeholder="e.g. Apex Tech Solutions"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Courier Partner
                  </label>
                  <select
                    value={newOrderCourier}
                    onChange={(e) => setNewOrderCourier(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Blue Dart Express">Blue Dart Express</option>
                    <option value="Delhivery Surface">Delhivery Surface</option>
                    <option value="XpressBees">XpressBees</option>
                    <option value="Shadowfax">Shadowfax</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tracking AWB Number
                  </label>
                  <input
                    type="text"
                    value={newOrderAwb}
                    onChange={(e) => setNewOrderAwb(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddOrderModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center space-x-1.5"
                >
                  <Package className="w-4 h-4" />
                  <span>Save Booked Order</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OTP Verification Modal for Registration */}
      <OtpVerificationModal
        isOpen={showOtpModal}
        onClose={() => setShowOtpModal(false)}
        phoneNumber={pendingRegistration?.mobile || regMobile}
        email={pendingRegistration?.email || regEmail}
        accountName={pendingRegistration?.name || regName}
        accountType="customer"
        onVerifySuccess={handleOtpVerified}
      />

    </div>
  );
}
