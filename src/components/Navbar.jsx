import React, { useState } from 'react';
import { 
  Box,
  LayoutDashboard,
  PlusCircle,
  FileText,
  ShoppingBag,
  Scale,
  BarChart3,
  Users,
  Settings,
  Search,
  Sun,
  Moon,
  Bell,
  Sparkles,
  RefreshCw,
  LogOut,
  LogIn,
  RotateCcw,
  Store,
  UserCircle2,
  MapPin
} from 'lucide-react';

export default function Navbar({ 
  currentTab, 
  setCurrentTab, 
  casesCount = 0, 
  sellerRecordsCount = 0, 
  onResetData,
  currentUser,
  currentCustomer = null,
  currentSeller = null,
  onLogout,
  firebaseConnected = true,
  onFetchFirebaseData
}) {
  const isSellerMode = currentTab === 'seller';
  const isCustomerMode = currentTab === 'customer';
  const isCustomerLoggedIn = Boolean(currentCustomer || currentUser?.role === 'customer');
  const isSellerLoggedIn = Boolean(currentSeller || currentUser?.role === 'seller');
  const [searchQuery, setSearchQuery] = useState('');

  const [activeSellerSubtab, setActiveSellerSubtab] = useState('analytics');
  const [activeCustomerSubtab, setActiveCustomerSubtab] = useState('report');

  React.useEffect(() => {
    const handleSellerNav = (e) => {
      if (e.detail) {
        let t = e.detail;
        if (t === 'packing' || t === 'dispatch') t = 'new-record';
        if (t === 'claims' || t === 'disputes') t = 'cases';
        if (t === 'orders' || t === 'vault') t = 'catalog';
        if (t === 'dashboard' || t === 'stats') t = 'analytics';
        setActiveSellerSubtab(t);
      }
    };
    const handleCustomerNav = (e) => {
      if (e.detail) setActiveCustomerSubtab(e.detail);
    };
    window.addEventListener('nav-seller-subtab', handleSellerNav);
    window.addEventListener('nav-customer-subtab', handleCustomerNav);
    return () => {
      window.removeEventListener('nav-seller-subtab', handleSellerNav);
      window.removeEventListener('nav-customer-subtab', handleCustomerNav);
    };
  }, []);

  const userName = isSellerMode
    ? (currentSeller?.name || 'Apex Tech Store')
    : (currentCustomer?.name || currentUser?.name || 'Guest User');
  const userRole = isSellerMode
    ? 'Verified Seller'
    : (currentCustomer ? 'Customer' : (currentUser?.roleLabel || 'Guest'));
  const userInitials = userName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('') || (isSellerMode ? 'AP' : 'GU');

  // Navigation Items matching the active portal mode
  const navItems = isSellerMode
    ? [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
          badge: null,
          isActive: activeSellerSubtab === 'analytics',
          onClick: () => {
            setCurrentTab('seller');
            setActiveSellerSubtab('analytics');
            window.dispatchEvent(new CustomEvent('nav-seller-subtab', { detail: 'analytics' }));
          }
        },
        {
          id: 'new-record',
          label: 'New Dispatch',
          icon: PlusCircle,
          badge: null,
          isActive: activeSellerSubtab === 'new-record',
          onClick: () => {
            setCurrentTab('seller');
            setActiveSellerSubtab('new-record');
            window.dispatchEvent(new CustomEvent('nav-seller-subtab', { detail: 'new-record' }));
          }
        },
        {
          id: 'cases',
          label: 'Cases',
          icon: FileText,
          badge: casesCount > 0 ? casesCount : null,
          isActive: activeSellerSubtab === 'cases',
          onClick: () => {
            setCurrentTab('seller');
            setActiveSellerSubtab('cases');
            window.dispatchEvent(new CustomEvent('nav-seller-subtab', { detail: 'cases' }));
          }
        },
        {
          id: 'catalog',
          label: 'Packaging Vault',
          icon: ShoppingBag,
          badge: sellerRecordsCount > 0 ? sellerRecordsCount : null,
          isActive: activeSellerSubtab === 'catalog',
          onClick: () => {
            setCurrentTab('seller');
            setActiveSellerSubtab('catalog');
            window.dispatchEvent(new CustomEvent('nav-seller-subtab', { detail: 'catalog' }));
          }
        },
        {
          id: 'customer-portal-toggle',
          label: 'Customer Portal',
          icon: UserCircle2,
          badge: null,
          isActive: false,
          onClick: () => setCurrentTab('customer')
        }
      ]
    : [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
          badge: null,
          isActive: activeCustomerSubtab === 'report',
          onClick: () => {
            setCurrentTab('customer');
            setActiveCustomerSubtab('report');
            window.dispatchEvent(new CustomEvent('nav-customer-subtab', { detail: 'report' }));
          }
        },
        {
          id: 'new-claim',
          label: 'New Claim',
          icon: PlusCircle,
          badge: null,
          isActive: activeCustomerSubtab === 'report',
          onClick: () => {
            setCurrentTab('customer');
            setActiveCustomerSubtab('report');
            window.dispatchEvent(new CustomEvent('nav-customer-subtab', { detail: 'report' }));
          }
        },
        {
          id: 'cases',
          label: 'Claims & Dockets',
          icon: FileText,
          badge: casesCount > 0 ? casesCount : null,
          isActive: activeCustomerSubtab === 'disputes',
          onClick: () => {
            setCurrentTab('customer');
            setActiveCustomerSubtab('disputes');
            window.dispatchEvent(new CustomEvent('nav-customer-subtab', { detail: 'disputes' }));
          }
        },
        {
          id: 'orders',
          label: 'My Orders',
          icon: ShoppingBag,
          badge: null,
          isActive: activeCustomerSubtab === 'orders',
          onClick: () => {
            setCurrentTab('customer');
            setActiveCustomerSubtab('orders');
            window.dispatchEvent(new CustomEvent('nav-customer-subtab', { detail: 'orders' }));
          }
        },
        {
          id: 'profile',
          label: 'Delivery Profile',
          icon: MapPin,
          badge: null,
          isActive: activeCustomerSubtab === 'profile',
          onClick: () => {
            setCurrentTab('customer');
            setActiveCustomerSubtab('profile');
            window.dispatchEvent(new CustomEvent('nav-customer-subtab', { detail: 'profile' }));
          }
        }
      ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-zinc-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.03)] font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-3">
          
          {/* Left: Brand & Platform Title */}
          <div 
            className="flex items-center space-x-3 cursor-pointer shrink-0" 
            onClick={() => setCurrentTab(isSellerMode ? 'seller' : 'customer')}
          >
            <div className="w-10 h-10 rounded-2xl bg-zinc-950 flex items-center justify-center text-white shadow-md shadow-zinc-200 shrink-0">
              <Box className="w-5 h-5 text-zinc-100" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-base tracking-tight text-zinc-950 whitespace-nowrap">
                  EvidenceAssistant
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 font-medium whitespace-nowrap">
                Damaged Goods Review Platform
              </p>
            </div>
          </div>

          {/* Center: Navigation Pills (Linear/Apple Minimalist Style) */}
          <nav className="hidden lg:flex items-center space-x-1 shrink-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.isActive !== undefined ? item.isActive : (item.id === currentTab);
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.onClick) {
                      item.onClick();
                    } else {
                      setCurrentTab(item.id);
                    }
                  }}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 whitespace-nowrap ${
                    isActive
                      ? 'bg-zinc-950 text-white shadow-xs font-semibold'
                      : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-zinc-100' : 'text-zinc-400'}`} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold shrink-0 ${
                        isActive
                          ? 'bg-zinc-800 text-zinc-200'
                          : 'bg-zinc-100 text-zinc-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Controls: Search, Theme, Notifications, Profile & Firebase */}
          <div className="flex items-center space-x-2.5 shrink-0">
            
            {/* Pill Search Input */}
            <div className="hidden xl:flex items-center bg-zinc-50 hover:bg-zinc-100/80 border border-zinc-200/90 rounded-full px-3 py-1.5 w-60 text-xs text-zinc-500 transition focus-within:ring-2 focus-within:ring-zinc-900 focus-within:bg-white focus-within:border-zinc-900">
              <Search className="w-3.5 h-3.5 text-zinc-400 mr-2 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search order, customer, or case..."
                className="bg-transparent border-none outline-none w-full text-zinc-900 placeholder:text-zinc-400 text-xs"
              />
            </div>

            {/* Firebase Live Badge */}
            <button 
              type="button"
              onClick={onFetchFirebaseData}
              title="Click to fetch live data from Firebase (c12fynd)"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200/90 transition cursor-pointer whitespace-nowrap shadow-2xs"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-mono text-[10px]">c12fynd</span>
              <RefreshCw className="w-2.5 h-2.5 text-zinc-500" />
            </button>

            {/* Sun / Theme Icon */}
            <button 
              type="button"
              title="Toggle Theme"
              className="w-8 h-8 rounded-full border border-zinc-200/90 flex items-center justify-center text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 transition"
            >
              <Sun className="w-4 h-4" />
            </button>

            {/* Notification Bell */}
            <button 
              type="button"
              title="Notifications"
              className="relative w-8 h-8 rounded-full border border-zinc-200/90 flex items-center justify-center text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 transition"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-zinc-950 text-white text-[9px] font-bold flex items-center justify-center">
                0
              </span>
            </button>

            {/* User Profile Pill matching screenshot: Circular black avatar with initials KA */}
            <div 
              onClick={() => {
                if (currentTab === 'customer') {
                  setActiveCustomerSubtab('profile');
                  window.dispatchEvent(new CustomEvent('nav-customer-subtab', { detail: 'profile' }));
                } else if (currentTab === 'seller') {
                  setActiveSellerSubtab('analytics');
                  window.dispatchEvent(new CustomEvent('nav-seller-subtab', { detail: 'analytics' }));
                } else {
                  setCurrentTab('login');
                }
              }}
              className="flex items-center space-x-2 pl-1 pr-2.5 py-1 rounded-full hover:bg-zinc-100 border border-transparent hover:border-zinc-200 transition cursor-pointer"
              title="Click to view profile"
            >
              <div className="w-8 h-8 rounded-full bg-zinc-950 text-white font-bold text-xs flex items-center justify-center tracking-wider shrink-0 shadow-2xs">
                {userInitials}
              </div>
              <div className="text-left hidden sm:block">
                <span className="text-xs font-bold text-zinc-950 block leading-tight truncate max-w-[100px]">
                  {userName.toLowerCase()}
                </span>
                <span className="text-[10px] text-zinc-500 block leading-none">
                  {userRole}
                </span>
              </div>
            </div>

            {/* Logout / Switch */}
            {onLogout && (currentUser || currentCustomer || currentSeller) && (
              <button
                type="button"
                onClick={onLogout}
                title="Sign out"
                className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}

            {/* Reset */}
            <button
              onClick={onResetData}
              title="Reset data"
              className="p-1.5 text-zinc-400 hover:text-zinc-950 hover:bg-zinc-100 rounded-lg transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="lg:hidden flex items-center justify-around py-2 border-t border-zinc-200">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.isActive !== undefined ? item.isActive : (item.id === currentTab);
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.onClick) item.onClick();
                  else setCurrentTab(item.id);
                }}
                className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-medium whitespace-nowrap ${
                  isActive ? 'text-zinc-950 font-bold' : 'text-zinc-500'
                }`}
              >
                <Icon className="w-4 h-4 mb-1 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
