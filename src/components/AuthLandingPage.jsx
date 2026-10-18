import React, { useState } from 'react';
import { 
  Box, 
  Camera, 
  FileText, 
  ShieldCheck, 
  Phone, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Store, 
  User, 
  Sparkles, 
  AlertCircle,
  KeyRound,
  Building,
  CheckCircle2,
  PackageCheck,
  ShieldAlert,
  ArrowLeft,
  LogIn
} from 'lucide-react';
import { normalizePhone } from '../data/customerDirectory';
import { DEFAULT_SELLER_STORES } from '../data/initialData';
import OtpVerificationModal from './OtpVerificationModal';

export default function AuthLandingPage({
  activeRole = 'customer', // 'customer' | 'seller'
  onRoleChange,
  customerRegistry = [],
  sellerRegistry = [],
  onLoginCustomer,
  onLoginSeller,
  onRegisterCustomer,
  onRegisterSeller
}) {
  const [currentRole, setCurrentRole] = useState(activeRole);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup'

  // Customer Login State
  const [custMobile, setCustMobile] = useState('');
  const [custPassword, setCustPassword] = useState('');
  const [showCustPassword, setShowCustPassword] = useState(false);
  const [custError, setCustError] = useState('');

  // Customer Signup State
  const [regName, setRegName] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regEmail, setRegEmail] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regCity, setRegCity] = useState('Hyderabad');
  const [regState, setRegState] = useState('Telangana');
  const [regPincode, setRegPincode] = useState('500033');
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [pendingRegData, setPendingRegData] = useState(null);

  // Seller Login State
  const [sellerLoginId, setSellerLoginId] = useState('');
  const [sellerPassword, setSellerPassword] = useState('');
  const [showSellerPassword, setShowSellerPassword] = useState(false);
  const [sellerError, setSellerError] = useState('');

  // Seller Signup State
  const [sellerName, setSellerName] = useState('');
  const [sellerId, setSellerId] = useState(() => 'SLR-' + Math.floor(1000 + Math.random() * 9000));
  const [sellerHub, setSellerHub] = useState('Bhiwandi Central Fulfillment Hub, Mumbai');
  const [sellerPhone, setSellerPhone] = useState('+91 98200 11223');
  const [sellerEmail, setSellerEmail] = useState('');
  const [sellerCategory, setSellerCategory] = useState('Electronics & Retail');

  const effectiveStores = (sellerRegistry && sellerRegistry.length > 0) ? sellerRegistry : DEFAULT_SELLER_STORES;

  // Handle Role Switch (Directly between Customer and Seller)
  const handleSwitchRole = (newRole) => {
    setCurrentRole(newRole);
    setAuthMode('login');
    setCustError('');
    setSellerError('');
    if (onRoleChange) onRoleChange(newRole);
  };

  // Customer Login Submit
  const handleCustomerLoginSubmit = (e) => {
    e.preventDefault();
    setCustError('');
    const cleanMobile = normalizePhone(custMobile);
    if (!cleanMobile || cleanMobile.length < 10) {
      setCustError('Please enter a valid 10-digit mobile number.');
      return;
    }
    const found = customerRegistry.find(c => normalizePhone(c.mobile || c.phone) === cleanMobile);
    if (found) {
      if (onLoginCustomer) {
        onLoginCustomer(found);
      }
    } else {
      // Auto-create customer profile or prompt
      if (onRegisterCustomer) {
        const autoCust = onRegisterCustomer({
          name: 'Registered Customer',
          mobile: cleanMobile,
          phone: `+91 ${cleanMobile.slice(0, 5)} ${cleanMobile.slice(5)}`,
          email: `${cleanMobile}@customer.fynd.com`,
          address: 'Delivery Address, Banjara Hills',
          city: 'Hyderabad',
          state: 'Telangana',
          pincode: '500033'
        });
        if (onLoginCustomer && autoCust) {
          onLoginCustomer(autoCust);
        }
      }
    }
  };

  // Customer Signup Initiate (Dual OTP flow)
  const handleCustomerSignupSubmit = (e) => {
    e.preventDefault();
    setCustError('');
    if (!regName.trim() || !regMobile.trim() || !regPassword.trim()) {
      setCustError('Please fill in your Name, 10-digit Mobile Number and Password.');
      return;
    }
    const cleanMobile = normalizePhone(regMobile);
    if (cleanMobile.length < 10) {
      setCustError('Please enter a valid 10-digit mobile number.');
      return;
    }

    const newCustPayload = {
      name: regName.trim(),
      mobile: cleanMobile,
      phone: `+91 ${cleanMobile.slice(0, 5)} ${cleanMobile.slice(5)}`,
      password: regPassword,
      email: regEmail.trim() || `${cleanMobile}@customer.fynd.com`,
      address: regAddress.trim() || 'Jubilee Hills Delivery Address',
      city: regCity.trim() || 'Hyderabad',
      state: regState.trim() || 'Telangana',
      pincode: regPincode.trim() || '500033'
    };

    setPendingRegData(newCustPayload);
    setShowOtpModal(true);
  };

  const handleOtpVerified = () => {
    setShowOtpModal(false);
    if (pendingRegData && onRegisterCustomer) {
      const created = onRegisterCustomer(pendingRegData);
      if (onLoginCustomer && created) {
        onLoginCustomer(created);
      }
    }
    setPendingRegData(null);
  };

  // Seller Login Submit
  const handleSellerLoginSubmit = (e) => {
    e.preventDefault();
    setSellerError('');
    if (!sellerLoginId.trim()) {
      setSellerError('Please enter your Seller Store ID or select a store.');
      return;
    }
    const query = sellerLoginId.trim().toLowerCase();
    const found = effectiveStores.find(s => s.id.toLowerCase() === query || s.name.toLowerCase().includes(query));
    if (found) {
      if (onLoginSeller) onLoginSeller(found);
    } else {
      setSellerError(`No store found matching "${sellerLoginId}". Try "SLR-1001" or register store.`);
    }
  };

  // Seller Signup Submit
  const handleSellerSignupSubmit = (e) => {
    e.preventDefault();
    setSellerError('');
    if (!sellerName.trim()) {
      setSellerError('Please enter Store / Business Name.');
      return;
    }
    const id = sellerId.trim() || `SLR-${Math.floor(1000 + Math.random() * 9000)}`;
    if (onRegisterSeller) {
      const newSeller = onRegisterSeller({
        id,
        name: sellerName.trim(),
        hub: sellerHub.trim() || 'Central Sort Facility, Mumbai',
        contactPhone: sellerPhone.trim() || '+91 98000 00000',
        contactEmail: sellerEmail.trim() || `dispatches@${sellerName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
        category: sellerCategory,
        dispatchCompliance: '100%',
        rating: 5.0
      });
      if (onLoginSeller && newSeller) {
        onLoginSeller(newSeller);
      }
    }
  };

  const isCustomer = currentRole === 'customer';

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#09090b] font-['Plus_Jakarta_Sans',sans-serif] selection:bg-indigo-500 selection:text-white">
      
      {/* ======================================================== */}
      {/* LEFT PANEL: DARK HERO BRANDING & 3D ARTWORK (MATCHING SCREENSHOT) */}
      {/* ======================================================== */}
      <div className="w-full lg:w-1/2 min-h-[600px] lg:min-h-screen relative flex flex-col justify-between p-8 sm:p-12 lg:p-16 text-white overflow-hidden bg-gradient-to-br from-[#08080c] via-[#0d0f18] to-[#120f24]">
        
        {/* Ambient Glow Orbs */}
        <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/15 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/15 blur-[120px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-purple-500/10 blur-[140px] pointer-events-none" />

        {/* Top Header: Logo + Security Pill */}
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
              <Box className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-extrabold tracking-tight block text-white leading-tight">
                Evidence<span className="text-indigo-400">Assistant</span>
              </span>
              <span className="text-[11px] text-zinc-400 font-medium block leading-none">
                Damaged Goods Review Platform
              </span>
            </div>
          </div>

          <div className="hidden sm:inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-xs font-semibold text-zinc-300 shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Secure • Reliable • Trusted</span>
          </div>
        </div>

        {/* Middle Content: Headlines & 3D Artwork */}
        <div className="relative z-10 my-auto py-8 lg:py-12 max-w-xl">
          
          {/* Main Hero Headline */}
          {isCustomer ? (
            <div className="space-y-4 animate-fade-in">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08] text-white">
                Simplify <br />
                <span className="bg-gradient-to-r from-violet-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
                  Damaged Product
                </span> <br />
                Claims
              </h1>
              <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-md font-normal">
                Manage orders, submit evidence, track resolutions and streamline your post-delivery support — all in one platform.
              </p>
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08] text-white">
                Protect <br />
                <span className="bg-gradient-to-r from-violet-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
                  Merchant Packaging
                </span> <br />
                Proofs
              </h1>
              <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-md font-normal">
                Record tamper-evident packing proofs, manage dispatch barcodes, and defend against fraudulent damage claims with Gemini AI.
              </p>
            </div>
          )}

          {/* 3 Value Proposition Bullets */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 my-8">
            {isCustomer ? (
              <>
                <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm hover:bg-white/[0.07] transition group">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-2.5">
                    <Camera className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-bold text-white mb-0.5">Submit Claims</h3>
                  <p className="text-[11px] text-zinc-400 leading-snug">Upload photos and details easily</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm hover:bg-white/[0.07] transition group">
                  <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-2.5">
                    <FileText className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-bold text-white mb-0.5">Track Status</h3>
                  <p className="text-[11px] text-zinc-400 leading-snug">Real-time updates on your claims</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm hover:bg-white/[0.07] transition group">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-2.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-bold text-white mb-0.5">Secure & Reliable</h3>
                  <p className="text-[11px] text-zinc-400 leading-snug">Your data is safe with us</p>
                </div>
              </>
            ) : (
              <>
                <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm hover:bg-white/[0.07] transition group">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-2.5">
                    <PackageCheck className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-bold text-white mb-0.5">Packaging Vault</h3>
                  <p className="text-[11px] text-zinc-400 leading-snug">Tamper-evident photo & video proofs</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm hover:bg-white/[0.07] transition group">
                  <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-2.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-bold text-white mb-0.5">Gemini AI Audit</h3>
                  <p className="text-[11px] text-zinc-400 leading-snug">Instant multi-angle damage verdict</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm hover:bg-white/[0.07] transition group">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-2.5">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-bold text-white mb-0.5">Zero Disruption</h3>
                  <p className="text-[11px] text-zinc-400 leading-snug">Protect seller rating & claim disputes</p>
                </div>
              </>
            )}
          </div>

          {/* 3D Cinematic Render Box with Holographic Overlays matching screenshot */}
          <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl shadow-indigo-950/50 bg-black/40 group">
            <img 
              src={isCustomer ? "/assets/damaged_package_hero.jpg" : "/assets/seller_vault_hero.jpg"}
              alt={isCustomer ? "Damaged Product Evidence 3D Package" : "Seller Packaging Vault"}
              className="w-full h-56 sm:h-64 lg:h-72 object-cover object-center transform group-hover:scale-102 transition duration-700 opacity-90"
            />
            
            {/* Dark gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#09090b]/80 via-transparent to-black/20 pointer-events-none" />

            {/* Floating Glass Badge 1: Media Preview (top-left) */}
            <div className="absolute top-6 left-8 sm:left-12 px-3 py-2.5 rounded-2xl bg-white/[0.08] backdrop-blur-md border border-white/20 shadow-xl pointer-events-none flex flex-col items-center">
              <Camera className="w-5 h-5 text-indigo-300 mb-1" />
              <div className="w-8 h-1 rounded-full bg-indigo-400/50" />
            </div>

            {/* Floating Glass Badge 2: Verified Checklist (top-right) */}
            <div className="absolute top-6 right-8 sm:right-16 px-3 py-2.5 rounded-2xl bg-white/[0.08] backdrop-blur-md border border-white/20 shadow-xl pointer-events-none flex flex-col items-center">
              <FileText className="w-5 h-5 text-violet-300 mb-1" />
              <div className="w-8 h-1 rounded-full bg-violet-400/50" />
            </div>

            {/* Floating Glass Badge 3: Tracking Stepper (bottom-left) */}
            <div className="absolute bottom-6 left-6 px-4 py-2 rounded-2xl bg-black/60 backdrop-blur-md border border-white/20 shadow-xl pointer-events-none flex items-center space-x-3">
              <span className="text-[11px] font-mono font-semibold text-zinc-200">Tracking</span>
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-violet-400 shadow-sm shadow-violet-400" />
                <span className="w-3 h-0.5 bg-violet-400/50" />
                <span className="w-2 h-2 rounded-full bg-violet-400 shadow-sm shadow-violet-400" />
                <span className="w-3 h-0.5 bg-violet-400/50" />
                <span className="w-2 h-2 rounded-full bg-indigo-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Stats Row */}
        <div className="relative z-10 pt-6 border-t border-white/10 flex items-center justify-between max-w-xl text-left">
          {isCustomer ? (
            <>
              <div>
                <span className="text-xl sm:text-2xl font-black text-white font-mono block">10K+</span>
                <span className="text-[11px] text-zinc-400">Claims Processed</span>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div>
                <span className="text-xl sm:text-2xl font-black text-white font-mono block">98%</span>
                <span className="text-[11px] text-zinc-400">Resolution Rate</span>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div>
                <span className="text-xl sm:text-2xl font-black text-white font-mono block">24/7</span>
                <span className="text-[11px] text-zinc-400">Support Available</span>
              </div>
            </>
          ) : (
            <>
              <div>
                <span className="text-xl sm:text-2xl font-black text-white font-mono block">50K+</span>
                <span className="text-[11px] text-zinc-400">Orders Protected</span>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div>
                <span className="text-xl sm:text-2xl font-black text-white font-mono block">99.8%</span>
                <span className="text-[11px] text-zinc-400">Tamper Compliance</span>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div>
                <span className="text-xl sm:text-2xl font-black text-white font-mono block">&lt; 3.2s</span>
                <span className="text-[11px] text-zinc-400">AI Verification Speed</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* RIGHT PANEL: CLEAN MODERN AUTH CARD (MATCHING SCREENSHOT) */}
      {/* ======================================================== */}
      <div className="w-full lg:w-1/2 min-h-screen flex flex-col justify-between p-6 sm:p-12 lg:p-16 bg-[#f4f5f8] relative">
        
        {/* Top Right "Back to Home" Link */}
        <div className="w-full flex justify-end">
          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              setCustError('');
              setSellerError('');
            }}
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-950 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </button>
        </div>

        {/* Center Auth Card */}
        <div className="my-auto max-w-md w-full mx-auto bg-white border border-zinc-200/90 rounded-3xl p-8 sm:p-10 shadow-xl shadow-zinc-200/50 space-y-6">
          
          {/* Card Header Brand Logo */}
          <div className="text-center space-y-1">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white mx-auto shadow-md shadow-indigo-600/20 mb-3">
              <Box className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-base font-extrabold text-zinc-950 tracking-tight">
              Evidence<span className="text-indigo-600">Assistant</span>
            </h2>
            <p className="text-[11px] text-zinc-500 font-medium">
              Damaged Goods Review Platform
            </p>
          </div>

          {/* Heading */}
          <div className="text-center space-y-1">
            <h3 className="text-2xl font-black text-zinc-950 tracking-tight">
              Welcome Back
            </h3>
            <p className="text-xs text-zinc-500 max-w-xs mx-auto">
              {isCustomer 
                ? (authMode === 'login' ? 'Sign in to your account to manage your claims and orders.' : 'Create your customer profile to report damage and track resolutions.')
                : (authMode === 'login' ? 'Sign in to your merchant store to manage dispatches and reviews.' : 'Register your merchant store to record tamper-proof dispatches.')}
            </p>
          </div>

          {/* ======================================================== */}
          {/* DUAL ROLE TOGGLE PILL: CUSTOMER LOGIN vs SELLER LOGIN */}
          {/* ======================================================== */}
          <div className="p-1 bg-zinc-100 rounded-2xl border border-zinc-200/90 grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => handleSwitchRole('customer')}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 ${
                isCustomer
                  ? 'bg-zinc-950 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/60'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Customer Login</span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchRole('seller')}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 ${
                !isCustomer
                  ? 'bg-zinc-950 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/60'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Seller Login</span>
            </button>
          </div>

          {/* ======================================================== */}
          {/* ROLE 1: CUSTOMER AUTH VIEW */}
          {/* ======================================================== */}
          {isCustomer && (
            <div className="space-y-4 animate-fade-in">
              {authMode === 'login' ? (
                <form onSubmit={handleCustomerLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-800 mb-2 text-left">
                      Mobile Number
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3.5 flex items-center pointer-events-none text-zinc-400">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        value={custMobile}
                        onChange={(e) => {
                          setCustMobile(e.target.value);
                          setCustError('');
                        }}
                        placeholder="Enter your 10-digit mobile number"
                        className="w-full bg-[#fbfbfe] border border-zinc-200/90 rounded-2xl pl-10 pr-12 py-3.5 text-xs text-zinc-900 font-mono font-medium placeholder:font-sans placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition"
                      />
                      <span className="absolute right-4 text-xs font-mono font-bold text-zinc-400 select-none">
                        +91
                      </span>
                    </div>

                    {/* Quick Select Demo Profile */}
                    <div className="flex items-center space-x-1.5 pt-2 text-left">
                      <span className="text-[10px] text-zinc-400 font-medium">Demo:</span>
                      <button
                        type="button"
                        onClick={() => { setCustMobile('9811230491'); setCustError(''); }}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-600 font-mono transition"
                      >
                        9811230491 (Aarav)
                      </button>
                      <button
                        type="button"
                        onClick={() => { setCustMobile('9820011223'); setCustError(''); }}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-600 font-mono transition"
                      >
                        9820011223 (Priya)
                      </button>
                    </div>
                  </div>

                  {custError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start space-x-2 text-left">
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <span>{custError}</span>
                    </div>
                  )}

                  {/* Primary CTA Button matching screenshot */}
                  <button
                    type="submit"
                    className="w-full py-3.5 px-5 bg-[#0c0d12] hover:bg-zinc-800 text-white rounded-2xl text-xs font-bold transition shadow-sm flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center space-x-2">
                      <LogIn className="w-4 h-4 text-zinc-400 group-hover:text-white transition" />
                      <span>Send OTP</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-white transition" />
                  </button>

                  {/* OR Divider */}
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-zinc-200"></div>
                    </div>
                    <div className="relative flex justify-center text-[10px] uppercase">
                      <span className="bg-white px-3 text-zinc-400 font-bold tracking-wider">OR</span>
                    </div>
                  </div>

                  {/* Continue with Google matching screenshot */}
                  <button
                    type="button"
                    onClick={() => {
                      if (customerRegistry.length > 0) {
                        onLoginCustomer(customerRegistry[0]);
                      } else {
                        setAuthMode('signup');
                      }
                    }}
                    className="w-full py-3 px-4 bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-200 rounded-xl text-xs font-semibold transition shadow-2xs flex items-center justify-center space-x-2.5"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    <span>Continue with Google</span>
                  </button>

                  <div className="text-center pt-2">
                    <p className="text-xs text-zinc-500">
                      Don't have an account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('signup');
                          setCustError('');
                        }}
                        className="text-indigo-600 font-bold hover:underline"
                      >
                        Sign Up
                      </button>
                    </p>
                  </div>
                </form>
              ) : (
                /* Customer Signup Form */
                <form onSubmit={handleCustomerSignupSubmit} className="space-y-3.5 text-left">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="Vivek Kumar"
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 font-medium focus:bg-white focus:outline-none focus:border-zinc-950"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">
                        10-Digit Mobile *
                      </label>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        value={regMobile}
                        onChange={(e) => setRegMobile(e.target.value)}
                        placeholder="9811230491"
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 font-mono font-medium focus:bg-white focus:outline-none focus:border-zinc-950"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">
                      Create Password *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                      <input
                        type={showRegPassword ? "text" : "password"}
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Set account password"
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-9 pr-9 py-2 text-xs text-zinc-900 font-medium focus:bg-white focus:outline-none focus:border-zinc-950"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600"
                      >
                        {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">
                      Delivery Address
                    </label>
                    <input
                      type="text"
                      value={regAddress}
                      onChange={(e) => setRegAddress(e.target.value)}
                      placeholder="Street address, apartment, locality"
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 font-medium focus:bg-white focus:outline-none focus:border-zinc-950"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        value={regCity}
                        onChange={(e) => setRegCity(e.target.value)}
                        placeholder="Hyderabad"
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 font-medium focus:bg-white focus:outline-none focus:border-zinc-950"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">
                        Pincode
                      </label>
                      <input
                        type="text"
                        value={regPincode}
                        onChange={(e) => setRegPincode(e.target.value)}
                        placeholder="500033"
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 font-mono font-medium focus:bg-white focus:outline-none focus:border-zinc-950"
                      />
                    </div>
                  </div>

                  {custError && (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                      {custError}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3.5 px-4 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center justify-center space-x-2"
                  >
                    <span>Verify Mobile & Register Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="text-center pt-1">
                    <p className="text-xs text-zinc-500">
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('login');
                          setCustError('');
                        }}
                        className="text-indigo-600 font-bold hover:underline"
                      >
                        Sign In
                      </button>
                    </p>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* ROLE 2: SELLER AUTH VIEW */}
          {/* ======================================================== */}
          {!isCustomer && (
            <div className="space-y-4 animate-fade-in">
              {authMode === 'login' ? (
                <form onSubmit={handleSellerLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-800 mb-2 text-left">
                      Store ID or Registered Mobile
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3.5 flex items-center pointer-events-none text-zinc-400">
                        <Store className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={sellerLoginId}
                        onChange={(e) => {
                          setSellerLoginId(e.target.value);
                          setSellerError('');
                        }}
                        placeholder="e.g. SLR-1001 or Apex Tech"
                        className="w-full bg-[#fbfbfe] border border-zinc-200/90 rounded-2xl pl-10 pr-12 py-3.5 text-xs text-zinc-900 font-mono font-medium placeholder:font-sans placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition"
                      />
                      <span className="absolute right-4 text-xs font-mono font-bold text-zinc-400 select-none">
                        SLR
                      </span>
                    </div>

                    {/* Quick Select Preset Active Stores */}
                    {effectiveStores.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-2 text-left">
                        <span className="text-[10px] text-zinc-400 font-medium">Quick Select:</span>
                        {effectiveStores.slice(0, 3).map((st) => (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => {
                              setSellerLoginId(st.id);
                              setSellerError('');
                            }}
                            className={`text-[10px] px-2 py-0.5 rounded-md font-mono transition ${
                              sellerLoginId === st.id
                                ? 'bg-zinc-950 text-white shadow-2xs'
                                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                            }`}
                          >
                            {st.id} ({st.name.split(' ')[0]})
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {sellerError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start space-x-2 text-left">
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <span>{sellerError}</span>
                    </div>
                  )}

                  {/* Primary CTA Button matching screenshot */}
                  <button
                    type="submit"
                    className="w-full py-3.5 px-5 bg-[#0c0d12] hover:bg-zinc-800 text-white rounded-2xl text-xs font-bold transition shadow-sm flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center space-x-2">
                      <LogIn className="w-4 h-4 text-zinc-400 group-hover:text-white transition" />
                      <span>Sign In to Seller Portal</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-white transition" />
                  </button>

                  {/* OR Divider */}
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-zinc-200/80"></div>
                    </div>
                    <div className="relative flex justify-center text-[11px] uppercase">
                      <span className="bg-white px-3 text-zinc-400 font-semibold tracking-wider">OR</span>
                    </div>
                  </div>

                  {/* Continue with Merchant Google Account */}
                  <button
                    type="button"
                    onClick={() => {
                      if (effectiveStores.length > 0 && onLoginSeller) {
                        onLoginSeller(effectiveStores[0]);
                      }
                    }}
                    className="w-full py-3 px-4 bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-200 rounded-2xl text-xs font-bold transition shadow-2xs flex items-center justify-center space-x-2.5"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    <span>Continue with Merchant Account</span>
                  </button>

                  <div className="text-center pt-2">
                    <p className="text-xs text-zinc-500">
                      New merchant store?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('signup');
                          setSellerError('');
                        }}
                        className="text-[#4f46e5] font-bold hover:underline"
                      >
                        Register Store
                      </button>
                    </p>
                  </div>
                </form>
              ) : (
                /* Seller Signup Form */
                <form onSubmit={handleSellerSignupSubmit} className="space-y-3.5 text-left">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">
                        Store Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={sellerName}
                        onChange={(e) => setSellerName(e.target.value)}
                        placeholder="Apex Tech Solutions"
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 font-medium focus:bg-white focus:outline-none focus:border-zinc-950"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">
                        Store ID
                      </label>
                      <input
                        type="text"
                        required
                        value={sellerId}
                        onChange={(e) => setSellerId(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 font-mono font-medium focus:bg-white focus:outline-none focus:border-zinc-950"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">
                      Fulfillment Hub
                    </label>
                    <input
                      type="text"
                      value={sellerHub}
                      onChange={(e) => setSellerHub(e.target.value)}
                      placeholder="Bhiwandi Central Fulfillment Hub, Mumbai"
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 font-medium focus:bg-white focus:outline-none focus:border-zinc-950"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">
                        Phone *
                      </label>
                      <input
                        type="tel"
                        required
                        value={sellerPhone}
                        onChange={(e) => setSellerPhone(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 font-mono font-medium focus:bg-white focus:outline-none focus:border-zinc-950"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">
                        Category
                      </label>
                      <select
                        value={sellerCategory}
                        onChange={(e) => setSellerCategory(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 font-medium focus:bg-white focus:outline-none focus:border-zinc-950"
                      >
                        <option value="Electronics & Retail">Electronics</option>
                        <option value="Fashion & Apparel">Fashion</option>
                        <option value="Home & Kitchen">Home</option>
                      </select>
                    </div>
                  </div>

                  {sellerError && (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                      {sellerError}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3.5 px-4 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center justify-center space-x-2"
                  >
                    <Store className="w-4 h-4" />
                    <span>Register Store & Open Dashboard</span>
                  </button>

                  <div className="text-center pt-1">
                    <p className="text-xs text-zinc-500">
                      Already registered?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('login');
                          setSellerError('');
                        }}
                        className="text-zinc-950 font-bold hover:underline"
                      >
                        Sign In
                      </button>
                    </p>
                  </div>
                </form>
              )}
            </div>
          )}

        </div>

        {/* Bottom Micro Footer */}
        <div className="w-full text-center text-[11px] text-zinc-400 mt-4 space-y-2">
          <div>
            <button
              type="button"
              onClick={() => onRoleChange && onRoleChange('reviewer')}
              className="inline-flex items-center space-x-1 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-full font-bold transition shadow-xs cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              <span>Open Support Reviewer Console (Human Decision Maker) &rarr;</span>
            </button>
          </div>
          <div>
            Damaged Product Evidence Assistant &bull; Fynd &times; NMIMS Hyderabad &bull; Gemini 3.8 Multimodal
          </div>
        </div>

      </div>

      {/* OTP Verification Modal during Customer Sign Up */}
      <OtpVerificationModal
        isOpen={showOtpModal}
        onClose={() => setShowOtpModal(false)}
        phoneNumber={pendingRegData?.mobile || ''}
        email={pendingRegData?.email || ''}
        accountName={pendingRegData?.name || ''}
        accountType="customer"
        onVerifySuccess={handleOtpVerified}
      />

    </div>
  );
}
