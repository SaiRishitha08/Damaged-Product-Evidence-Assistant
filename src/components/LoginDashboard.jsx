import React, { useState } from 'react';
import { 
  UserCircle2, 
  Store, 
  Scale, 
  Sparkles, 
  CheckCircle2, 
  UserPlus,
  LogIn,
  LogOut,
  User,
  Phone,
  MapPin,
  ArrowRight,
  ShieldCheck,
  Building,
  KeyRound,
  AlertCircle
} from 'lucide-react';
import { normalizePhone } from '../data/customerDirectory';
import { DEFAULT_SELLER_STORES } from '../data/initialData';

export default function LoginDashboard({ 
  customerRegistry = [], 
  sellerRegistry = [], 
  onRegisterCustomer, 
  onRegisterSeller, 
  onLogin, 
  onCancel,
  currentUser = null,
  onLogout
}) {
  const effectiveSellerRegistry = (sellerRegistry && sellerRegistry.length > 0) ? sellerRegistry : DEFAULT_SELLER_STORES;

  // Two Primary Roles: 'customer' | 'seller'
  const [activeRole, setActiveRole] = useState('customer');

  // Sub-modes for Customer and Seller: 'login' | 'signup'
  const [customerMode, setCustomerMode] = useState(() => 
    customerRegistry.length > 0 ? 'login' : 'signup'
  );
  const [sellerMode, setSellerMode] = useState('login');

  // Customer Login State
  const [custLoginMobile, setCustLoginMobile] = useState('');
  const [custLoginError, setCustLoginError] = useState('');

  // Customer Signup Form
  const [custName, setCustName] = useState('');
  const [custMobile, setCustMobile] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [custCity, setCustCity] = useState('Hyderabad');
  const [custState, setCustState] = useState('Telangana');
  const [custPincode, setCustPincode] = useState('500033');

  // Seller Login State
  const [sellerLoginId, setSellerLoginId] = useState('');
  const [sellerLoginError, setSellerLoginError] = useState('');

  // Seller Signup Form
  const [sellerName, setSellerName] = useState('');
  const [sellerId, setSellerId] = useState(() => 'SLR-' + Math.floor(1000 + Math.random() * 9000));
  const [sellerHub, setSellerHub] = useState('Bhiwandi Central Fulfillment Hub, Mumbai');
  const [sellerPhone, setSellerPhone] = useState('+91 98200 11223');
  const [sellerEmail, setSellerEmail] = useState('');
  const [sellerCategory, setSellerCategory] = useState('Electronics & Retail');

  // Customer Login by Mobile
  const handleCustomerLoginSubmit = (e) => {
    e.preventDefault();
    setCustLoginError('');
    const cleanMobile = normalizePhone(custLoginMobile);
    if (!cleanMobile) {
      setCustLoginError('Please enter your 10-digit mobile number.');
      return;
    }
    const found = customerRegistry.find(c => normalizePhone(c.mobile || c.phone) === cleanMobile);
    if (found) {
      if (onLogin) {
        onLogin({ ...found, role: 'customer', roleLabel: 'Customer / Buyer' });
      }
    } else {
      setCustLoginError(`No account registered with mobile "${cleanMobile}". Click "Sign Up as Customer" below to register.`);
    }
  };

  // Customer Signup Submit
  const handleCustomerSignupSubmit = (e) => {
    e.preventDefault();
    if (!custName.trim() || !custMobile.trim()) {
      alert('Please enter Customer Name and 10-digit Mobile Number.');
      return;
    }
    const cleanMobile = normalizePhone(custMobile);
    if (cleanMobile.length < 10) {
      alert('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (onRegisterCustomer) {
      const newCust = onRegisterCustomer({
        name: custName.trim(),
        mobile: cleanMobile,
        phone: `+91 ${cleanMobile.slice(0, 5)} ${cleanMobile.slice(5)}`,
        email: custEmail.trim() || `${cleanMobile}@customer.fynd.com`,
        address: custAddress.trim() || 'Delivery Address',
        city: custCity.trim() || 'Hyderabad',
        state: custState.trim() || 'Telangana',
        pincode: custPincode.trim() || '500033'
      });
      if (onLogin && newCust) {
        onLogin({ ...newCust, role: 'customer', roleLabel: 'Customer / Buyer' });
      }
    }
  };

  // Seller Login by ID or Selection
  const handleSellerLoginSubmit = (e) => {
    e.preventDefault();
    setSellerLoginError('');
    if (!sellerLoginId.trim()) {
      setSellerLoginError('Please select or enter your Seller Store ID.');
      return;
    }
    const query = sellerLoginId.trim().toLowerCase();
    const found = effectiveSellerRegistry.find(s => 
      s.id.toLowerCase() === query || s.name.toLowerCase().includes(query)
    );
    if (found) {
      if (onLogin) {
        onLogin({ ...found, role: 'seller', roleLabel: 'Seller / Merchant' });
      }
    } else {
      setSellerLoginError(`No seller store found matching "${sellerLoginId}". Click "Sign Up as Seller" below to register.`);
    }
  };

  // Seller Signup Submit
  const handleSellerSignupSubmit = (e) => {
    e.preventDefault();
    if (!sellerName.trim()) {
      alert('Please enter Store / Business Name.');
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
      if (onLogin && newSeller) {
        onLogin({ ...newSeller, role: 'seller', roleLabel: 'Seller / Merchant' });
      }
    }
  };

  // Auditor Quick Login
  const handleAuditorLogin = () => {
    if (onLogin) {
      onLogin({
        id: 'AUD-C12-01',
        name: 'Evidence Auditor',
        role: 'reviewer',
        roleLabel: 'Evidence Auditor (Gemini AI)',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80',
        email: 'auditor@evidence-assistant.com'
      });
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 space-y-8 animate-fade-in font-['Plus_Jakarta_Sans',sans-serif]">
      
      {/* Header Banner - Light Pastel */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>Authentication & Profile Portal</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Welcome to Evidence<span className="text-indigo-600">Assistant</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
          Sign in or create a new account as a Customer or Seller to manage orders, submit damage evidence, or process packaging proofs.
        </p>
      </div>

      {/* Active User Session Banner with Logout */}
      {currentUser && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <img
              src={currentUser.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser.name || 'User')}`}
              alt={currentUser.name}
              className="w-12 h-12 rounded-2xl object-cover border-2 border-indigo-200 shadow-2xs"
            />
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-500 font-medium">Currently signed in as:</span>
                <span className="text-sm font-extrabold text-slate-900">{currentUser.name}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {currentUser.roleLabel || currentUser.role || (currentUser.membership ? 'Customer' : 'Store')}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {currentUser.mobile ? `Mobile: ${currentUser.mobile}` : (currentUser.id ? `ID: ${currentUser.id}` : currentUser.email || '')}
              </p>
            </div>
          </div>
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition flex items-center space-x-1.5 shadow-2xs self-stretch sm:self-auto justify-center"
              title="Sign out of current account"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout Account</span>
            </button>
          )}
        </div>
      )}

      {/* Main Container Card */}
      <div className="bg-white border border-zinc-200/90 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        
        {/* ======================================================== */}
        {/* PRIMARY ROLE SWITCH: LOGIN AS CUSTOMER / LOGIN AS SELLER */}
        {/* ======================================================== */}
        <div className="grid grid-cols-2 gap-3 p-1.5 bg-zinc-100 rounded-2xl border border-zinc-200">
          <button
            type="button"
            onClick={() => setActiveRole('customer')}
            className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center space-x-2.5 ${
              activeRole === 'customer'
                ? 'bg-zinc-950 text-white shadow-xs'
                : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/60'
            }`}
          >
            <UserCircle2 className="w-5 h-5 shrink-0" />
            <span>Login as Customer</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveRole('seller')}
            className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center space-x-2.5 ${
              activeRole === 'seller'
                ? 'bg-zinc-950 text-white shadow-xs'
                : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/60'
            }`}
          >
            <Store className="w-5 h-5 shrink-0" />
            <span>Login as Seller</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* ROLE 1: CUSTOMER (LOGIN OR SIGNUP) */}
        {/* ======================================================== */}
        {activeRole === 'customer' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Sub-Switch: Login vs Sign Up */}
            <div className="flex items-center justify-center">
              <div className="inline-flex p-1 bg-zinc-100 rounded-xl border border-zinc-200">
                <button
                  type="button"
                  onClick={() => setCustomerMode('login')}
                  className={`px-5 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                    customerMode === 'login'
                      ? 'bg-zinc-950 text-white shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-950'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Login (Sign In)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerMode('signup')}
                  className={`px-5 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                    customerMode === 'signup'
                      ? 'bg-zinc-950 text-white shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-950'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Sign Up (Register)</span>
                </button>
              </div>
            </div>

            {/* CUSTOMER LOGIN SUB-VIEW */}
            {customerMode === 'login' && (
              <div className="space-y-6 animate-fade-in max-w-lg mx-auto">
                <div className="text-center space-y-1">
                  <h3 className="text-base font-bold text-zinc-950">
                    Sign In with Registered Mobile Number
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Enter the 10-digit mobile number linked to your customer delivery profile.
                  </p>
                </div>

                <form onSubmit={handleCustomerLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                      10-Digit Mobile Number *
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        value={custLoginMobile}
                        onChange={(e) => {
                          setCustLoginMobile(e.target.value);
                          setCustLoginError('');
                        }}
                        placeholder="e.g. 9811230491"
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-zinc-900 font-mono font-medium focus:bg-white focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition"
                      />
                    </div>
                  </div>

                  {custLoginError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <span>{custLoginError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3 px-4 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center space-x-2"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Sign In to Customer Dashboard</span>
                  </button>
                </form>

                {/* Quick 1-Click Select for Registered Customers */}
                {customerRegistry.length > 0 && (
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block text-center">
                      Or 1-Click Sign In as Registered Customer ({customerRegistry.length}):
                    </span>
                    <div className="grid grid-cols-1 gap-2.5">
                      {customerRegistry.map((c) => (
                        <div
                          key={c.id || c.mobile}
                          onClick={() => onLogin({ ...c, role: 'customer', roleLabel: 'Customer / Buyer' })}
                          className="p-3.5 rounded-2xl bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-300 cursor-pointer transition shadow-2xs flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-9 h-9 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xs">
                              {c.name.slice(0, 1)}
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-900">{c.name}</h4>
                              <p className="text-[11px] text-indigo-700 font-mono">Mobile: {c.mobile}</p>
                            </div>
                          </div>
                          <span className="text-[11px] font-bold text-indigo-600 flex items-center space-x-1">
                            <span>Sign In</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-center pt-2">
                  <p className="text-xs text-slate-500">
                    Don't have an account yet?{' '}
                    <button
                      type="button"
                      onClick={() => setCustomerMode('signup')}
                      className="text-indigo-600 font-bold hover:underline"
                    >
                      Sign Up as Customer
                    </button>
                  </p>
                </div>
              </div>
            )}

            {/* CUSTOMER SIGNUP SUB-VIEW */}
            {customerMode === 'signup' && (
              <form onSubmit={handleCustomerSignupSubmit} className="space-y-4 animate-fade-in max-w-lg mx-auto">
                <div className="text-center space-y-1 pb-2 border-b border-slate-100">
                  <h3 className="text-base font-bold text-slate-900">
                    Create New Customer Profile
                  </h3>
                  <p className="text-xs text-slate-500">
                    Enter your details to generate your customer dashboard and link your mobile ID.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Full Customer Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={custName}
                      onChange={(e) => setCustName(e.target.value)}
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
                      value={custMobile}
                      onChange={(e) => setCustMobile(e.target.value)}
                      placeholder="e.g. 9811230491"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    value={custEmail}
                    onChange={(e) => setCustEmail(e.target.value)}
                    placeholder="e.g. vivek.kumar@example.com"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Delivery Street Address
                  </label>
                  <input
                    type="text"
                    value={custAddress}
                    onChange={(e) => setCustAddress(e.target.value)}
                    placeholder="e.g. Flat 402, Green Meadows, Road No. 36, Jubilee Hills"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={custCity}
                      onChange={(e) => setCustCity(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      State
                    </label>
                    <input
                      type="text"
                      value={custState}
                      onChange={(e) => setCustState(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Pincode
                    </label>
                    <input
                      type="text"
                      value={custPincode}
                      onChange={(e) => setCustPincode(e.target.value)}
                      placeholder="500033"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center space-x-2 mt-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Register Customer Profile & Sign In</span>
                </button>

                <div className="text-center pt-2">
                  <p className="text-xs text-slate-500">
                    Already registered?{' '}
                    <button
                      type="button"
                      onClick={() => setCustomerMode('login')}
                      className="text-indigo-600 font-bold hover:underline"
                    >
                      Sign In here
                    </button>
                  </p>
                </div>
              </form>
            )}

          </div>
        )}

        {/* ======================================================== */}
        {/* ROLE 2: SELLER (LOGIN OR SIGNUP) */}
        {/* ======================================================== */}
        {activeRole === 'seller' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Sub-Switch: Login vs Sign Up */}
            <div className="flex items-center justify-center">
              <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setSellerMode('login')}
                  className={`px-5 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                    sellerMode === 'login'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Login (Sign In)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSellerMode('signup')}
                  className={`px-5 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                    sellerMode === 'signup'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>Sign Up (Register Store)</span>
                </button>
              </div>
            </div>

            {/* SELLER LOGIN SUB-VIEW */}
            {sellerMode === 'login' && (
              <div className="space-y-6 animate-fade-in max-w-lg mx-auto">
                <div className="text-center space-y-1">
                  <h3 className="text-base font-bold text-slate-900">
                    Sign In to Merchant Store Dashboard
                  </h3>
                  <p className="text-xs text-slate-500">
                    Select your registered store or enter your Store ID to log in.
                  </p>
                </div>

                <form onSubmit={handleSellerLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Seller Store ID or Store Name *
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        value={sellerLoginId}
                        onChange={(e) => {
                          setSellerLoginId(e.target.value);
                          setSellerLoginError('');
                        }}
                        placeholder="e.g. SLR-1001 or Apex Tech"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>
                  </div>

                  {sellerLoginError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <span>{sellerLoginError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center space-x-2"
                  >
                    <Store className="w-4 h-4" />
                    <span>Sign In to Seller Dashboard</span>
                  </button>
                </form>

                {/* Quick 1-Click Select for Registered Sellers */}
                {effectiveSellerRegistry.length > 0 && (
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block text-center">
                      Or 1-Click Sign In as Registered Merchant ({effectiveSellerRegistry.length}):
                    </span>
                    <div className="grid grid-cols-1 gap-2.5">
                      {effectiveSellerRegistry.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => onLogin({ ...s, role: 'seller', roleLabel: 'Seller / Merchant' })}
                          className="p-3.5 rounded-2xl bg-slate-50 hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-300 cursor-pointer transition shadow-2xs flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold text-xs">
                              <Store className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-900">{s.name}</h4>
                              <p className="text-[11px] text-indigo-700 font-mono font-bold">ID: {s.id}</p>
                            </div>
                          </div>
                          <span className="text-[11px] font-bold text-emerald-700 flex items-center space-x-1">
                            <span>Open Store</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-center pt-2">
                  <p className="text-xs text-slate-500">
                    New merchant store?{' '}
                    <button
                      type="button"
                      onClick={() => setSellerMode('signup')}
                      className="text-indigo-600 font-bold hover:underline"
                    >
                      Sign Up as Seller
                    </button>
                  </p>
                </div>
              </div>
            )}

            {/* SELLER SIGNUP SUB-VIEW */}
            {sellerMode === 'signup' && (
              <form onSubmit={handleSellerSignupSubmit} className="space-y-4 animate-fade-in max-w-lg mx-auto">
                <div className="text-center space-y-1 pb-2 border-b border-slate-100">
                  <h3 className="text-base font-bold text-slate-900">
                    Register New Merchant Store
                  </h3>
                  <p className="text-xs text-slate-500">
                    Register your seller store to record packing dispatches and process customer damage claims.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Store / Business Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={sellerName}
                      onChange={(e) => setSellerName(e.target.value)}
                      placeholder="e.g. Apex Tech Solutions"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Store ID (Prefix)
                    </label>
                    <input
                      type="text"
                      required
                      value={sellerId}
                      onChange={(e) => setSellerId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Fulfillment Hub / Warehouse Location
                  </label>
                  <input
                    type="text"
                    value={sellerHub}
                    onChange={(e) => setSellerHub(e.target.value)}
                    placeholder="e.g. Central Fulfillment Center #4, Mumbai"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Support Contact Phone
                    </label>
                    <input
                      type="text"
                      value={sellerPhone}
                      onChange={(e) => setSellerPhone(e.target.value)}
                      placeholder="+91 98201 44821"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Store Category
                    </label>
                    <select
                      value={sellerCategory}
                      onChange={(e) => setSellerCategory(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Electronics & Retail">Electronics & Computing</option>
                      <option value="Audio & Gadgets">Audio & Gadgets</option>
                      <option value="Fashion & Lifestyle">Fashion & Lifestyle</option>
                      <option value="Home & Kitchen">Home & Kitchen Goods</option>
                      <option value="Multi-Category Store">Multi-Category Store</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center space-x-2 mt-2"
                >
                  <Store className="w-4 h-4" />
                  <span>Register Seller Store & Open Dashboard</span>
                </button>

                <div className="text-center pt-2">
                  <p className="text-xs text-slate-500">
                    Already have a seller store?{' '}
                    <button
                      type="button"
                      onClick={() => setSellerMode('login')}
                      className="text-indigo-600 font-bold hover:underline"
                    >
                      Sign In here
                    </button>
                  </p>
                </div>
              </form>
            )}

          </div>
        )}

        {/* Auditor Quick Access Link */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Need arbitration review?</span>
          <button
            type="button"
            onClick={handleAuditorLogin}
            className="text-indigo-600 font-bold hover:underline flex items-center space-x-1"
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Sign in as Evidence Auditor</span>
          </button>
        </div>

      </div>
    </div>
  );
}
