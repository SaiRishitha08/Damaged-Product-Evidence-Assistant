import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import CustomerDashboard from './components/CustomerDashboard';
import SellerDashboard from './components/SellerDashboard';
import SupportReviewerConsole from './components/SupportReviewerConsole';
import LoginDashboard from './components/LoginDashboard';
import EvidenceDossierModal from './components/EvidenceDossierModal';
import { 
  SAMPLE_BOOKED_PRODUCTS, 
  INITIAL_EVIDENCE_CASES, 
  INITIAL_SELLER_PACKING_RECORDS,
  loadSellerRegistry,
  saveSellerToRegistry,
  DEFAULT_SELLER_STORES
} from './data/initialData';
import { 
  loadCustomerRegistry, 
  saveCustomerToRegistry, 
  DEFAULT_CUSTOMER_PROFILES,
  loadAllCustomerOrders,
  normalizePhone
} from './data/customerDirectory';
import { CheckCircle2, AlertCircle, X, ShieldCheck } from 'lucide-react';
import { 
  supabase,
  saveCaseToSupabase,
  savePackingRecordToSupabase,
  saveCustomerToSupabase,
  saveSellerToSupabase,
  saveOrderToSupabase,
  fetchAllSupabaseData
} from './supabase';

const DATA_VERSION = 'v7_clean_empty_manual_registration';
if (typeof window !== 'undefined') {
  if (localStorage.getItem('C12_DATA_VERSION') !== DATA_VERSION) {
    localStorage.removeItem('C12_EVIDENCE_CASES');
    localStorage.removeItem('C12_SELLER_PACKING_RECORDS');
    localStorage.removeItem('C12_REVIEWER_CASES');
    localStorage.removeItem('C12_BOOKED_PRODUCTS');
    localStorage.removeItem('C12_CUSTOMER_REGISTRY');
    localStorage.removeItem('C12_SELLER_REGISTRY');
    localStorage.removeItem('C12_CUSTOMER_ORDERS');
    localStorage.removeItem('C12_ACTIVE_CUSTOMER');
    localStorage.removeItem('C12_ACTIVE_SELLER');
    localStorage.removeItem('C12_CURRENT_USER');
    localStorage.setItem('C12_DATA_VERSION', DATA_VERSION);
  }
}

export default function App() {
  const [currentTab, setCurrentTab] = useState('customer'); // 'customer' | 'seller' | 'reviewer' | 'login'

  // Customer Profiles Directory (Linked by Mobile Number, starts empty for manual registration)
  const [customerRegistry, setCustomerRegistry] = useState(() => loadCustomerRegistry());

  // Seller Stores Directory (starts empty for manual registration)
  const [sellerRegistry, setSellerRegistry] = useState(() => loadSellerRegistry());

  // Logged In User State
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('C12_CURRENT_USER');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse current user', e);
      }
    }
    return null;
  });

  // Active Customer Profile State (Separate dashboard per customer)
  const [currentCustomer, setCurrentCustomer] = useState(() => {
    const savedUser = localStorage.getItem('C12_CURRENT_USER');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        if (u.role === 'seller' || u.hub || u.id?.startsWith('SLR-')) return null;
      } catch (e) {}
    }
    const saved = localStorage.getItem('C12_ACTIVE_CUSTOMER');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.mobile || parsed.phone)) return parsed;
      } catch (e) {
        console.error('Failed to parse active customer', e);
      }
    }
    return null;
  });

  // Active Seller Profile State
  const [currentSeller, setCurrentSeller] = useState(() => {
    const savedUser = localStorage.getItem('C12_CURRENT_USER');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        if (u.role === 'customer' || u.membership || u.mobile) return null;
      } catch (e) {}
    }
    const saved = localStorage.getItem('C12_ACTIVE_SELLER');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) return parsed;
      } catch (e) {
        console.error('Failed to parse active seller', e);
      }
    }
    return DEFAULT_SELLER_STORES[0] || null;
  });

  // Centralized Customer Orders (Partitioned per customer by mobile number)
  const [customerOrders, setCustomerOrders] = useState(() => {
    return loadAllCustomerOrders(customerRegistry);
  });

  // Persisted Evidence Cases
  const [evidenceCases, setEvidenceCases] = useState(() => {
    const saved = localStorage.getItem('C12_EVIDENCE_CASES');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error('Failed to parse saved cases', e);
      }
    }
    return INITIAL_EVIDENCE_CASES;
  });

  // Persisted Seller Packing Records
  const [sellerPackingRecords, setSellerPackingRecords] = useState(() => {
    const saved = localStorage.getItem('C12_SELLER_PACKING_RECORDS');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error('Failed to parse seller records', e);
      }
    }
    return INITIAL_SELLER_PACKING_RECORDS;
  });

  const [dossierModalCase, setDossierModalCase] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Sync states to localStorage
  useEffect(() => {
    if (currentCustomer) {
      localStorage.setItem('C12_ACTIVE_CUSTOMER', JSON.stringify(currentCustomer));
    } else {
      localStorage.removeItem('C12_ACTIVE_CUSTOMER');
    }
  }, [currentCustomer]);

  useEffect(() => {
    if (currentSeller) {
      localStorage.setItem('C12_ACTIVE_SELLER', JSON.stringify(currentSeller));
    } else {
      localStorage.removeItem('C12_ACTIVE_SELLER');
    }
  }, [currentSeller]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('C12_CURRENT_USER', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('C12_CURRENT_USER');
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('C12_CUSTOMER_ORDERS', JSON.stringify(customerOrders));
  }, [customerOrders]);

  useEffect(() => {
    localStorage.setItem('C12_EVIDENCE_CASES', JSON.stringify(evidenceCases));
  }, [evidenceCases]);

  useEffect(() => {
    localStorage.setItem('C12_SELLER_PACKING_RECORDS', JSON.stringify(sellerPackingRecords));
  }, [sellerPackingRecords]);

  useEffect(() => {
    localStorage.setItem('C12_CUSTOMER_REGISTRY', JSON.stringify(customerRegistry));
  }, [customerRegistry]);

  useEffect(() => {
    localStorage.setItem('C12_SELLER_REGISTRY', JSON.stringify(sellerRegistry));
  }, [sellerRegistry]);

  // Toast Helper
  const showToast = (msg, type = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Fetch current live data from Supabase when configured.
  const handleFetchSupabaseData = async () => {
    showToast('Connecting to Supabase and fetching current live data...', 'info');
    try {
      const res = await fetchAllSupabaseData();
      if (res.success) {
        let importedCount = 0;
        if (res.data.cases?.length) {
          setEvidenceCases(prev => {
            const merged = [...prev];
            res.data.cases.forEach(rc => {
              const idx = merged.findIndex(c => c.caseId === rc.caseId);
              if (idx >= 0) merged[idx] = { ...merged[idx], ...rc };
              else merged.unshift(rc);
            });
            return merged;
          });
          importedCount += res.data.cases.length;
        }
        if (res.data.packingRecords?.length) {
          setSellerPackingRecords(prev => {
            const merged = [...prev];
            res.data.packingRecords.forEach(rr => {
              const idx = merged.findIndex(r => r.orderNo === rr.orderNo);
              if (idx >= 0) merged[idx] = { ...merged[idx], ...rr };
              else merged.unshift(rr);
            });
            return merged;
          });
          importedCount += res.data.packingRecords.length;
        }
        if (res.data.customers?.length) {
          setCustomerRegistry(prev => {
            const merged = [...prev];
            res.data.customers.forEach(rc => {
              const idx = merged.findIndex(c => (c.mobile || c.phone) === (rc.mobile || rc.phone));
              if (idx >= 0) merged[idx] = { ...merged[idx], ...rc };
              else merged.push(rc);
            });
            return merged;
          });
          importedCount += res.data.customers.length;
        }
        if (res.data.sellers?.length) {
          setSellerRegistry(prev => {
            const merged = [...prev];
            res.data.sellers.forEach(rs => {
              const idx = merged.findIndex(s => s.id === rs.id);
              if (idx >= 0) merged[idx] = { ...merged[idx], ...rs };
              else merged.push(rs);
            });
            return merged;
          });
          importedCount += res.data.sellers.length;
        }
        if (res.data.orders?.length) {
          setCustomerOrders(prev => {
            const merged = [...prev];
            res.data.orders.forEach(ro => {
              const idx = merged.findIndex(o => o.orderNo === ro.orderNo);
              if (idx >= 0) merged[idx] = { ...merged[idx], ...ro };
              else merged.unshift(ro);
            });
            return merged;
          });
          importedCount += res.data.orders.length;
        }
        if (importedCount === 0) {
          showToast('Supabase is online, but no cloud records were found.', 'info');
        } else {
          showToast(`Supabase sync complete! Fetched ${importedCount} cloud items.`, 'success');
        }
      } else {
        showToast(res.error || 'Supabase is not configured. Local storage remains active.', 'info');
      }
    } catch (e) {
      showToast('Supabase fetch error: ' + e.message, 'error');
    }
  };

  // Save or update customer profile in directory WITHOUT switching active user or tab
  const handleSaveCustomerToDirectory = (profile) => {
    if (!profile || (!profile.mobile && !profile.phone)) return null;
    const updated = saveCustomerToRegistry(profile, customerRegistry);
    setCustomerRegistry(updated);
    saveCustomerToSupabase(profile);
    const norm = normalizePhone(profile.mobile || profile.phone);
    return updated.find(c => normalizePhone(c.mobile || c.phone) === norm) || updated[0];
  };

  // Register New Customer Handler (Only for explicit customer signup/login)
  const handleRegisterCustomer = (profile) => {
    const updated = saveCustomerToRegistry(profile, customerRegistry);
    setCustomerRegistry(updated);
    saveCustomerToSupabase(profile);
    const norm = normalizePhone(profile.mobile || profile.phone);
    const newCust = updated.find(c => normalizePhone(c.mobile || c.phone) === norm) || updated[0];
    setCurrentCustomer(newCust);
    setCurrentUser({ ...newCust, role: 'customer', roleLabel: 'Customer / Buyer' });
    setCurrentSeller(null);
    localStorage.removeItem('C12_ACTIVE_SELLER');
    setCurrentTab('customer');
    showToast(`Customer "${newCust.name}" registered successfully with mobile ${newCust.mobile}!`, 'success');
    return newCust;
  };

  // Register New Seller Handler
  const handleRegisterSeller = (sellerData) => {
    const updated = saveSellerToRegistry(sellerData, sellerRegistry);
    setSellerRegistry(updated);
    saveSellerToSupabase(sellerData);
    const newSeller = updated.find(s => s.name === sellerData.name) || updated[0];
    setCurrentSeller(newSeller);
    setCurrentUser({ ...newSeller, role: 'seller', roleLabel: 'Seller / Merchant' });
    setCurrentCustomer(null);
    localStorage.removeItem('C12_ACTIVE_CUSTOMER');
    setCurrentTab('seller');
    showToast(`Seller Store "${newSeller.name}" (${newSeller.id}) registered successfully!`, 'success');
    return newSeller;
  };

  // Add Booked Order directly for active Customer
  const handleAddCustomerOrder = (orderData) => {
    const orderNo = orderData.orderNo || `ORD-${Math.floor(10000 + Math.random() * 90000)}`;
    const custPhone = normalizePhone(orderData.customerPhone || currentCustomer?.mobile || '9876543210');
    
    const newOrder = {
      orderNo,
      productName: orderData.productName,
      sku: orderData.sku || `SKU-${orderNo}`,
      category: orderData.category || 'Electronics',
      price: parseFloat(orderData.price) || 2999,
      bookingDate: orderData.bookingDate || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      deliveryDate: orderData.deliveryDate || 'Delivered Today',
      status: orderData.status || 'Delivered',
      sellerId: orderData.sellerId || (currentSeller?.id || 'SLR-1001'),
      sellerName: orderData.sellerName || (currentSeller?.name || 'Authorized Seller'),
      courier: orderData.courier || 'Blue Dart Express',
      awb: orderData.awb || `BLUEDART-${Math.floor(100000000 + Math.random() * 900000000)}`,
      image: orderData.image || '/assets/P01.png',
      customerPhone: custPhone,
      customer: {
        name: currentCustomer?.name || 'Registered Customer',
        phone: currentCustomer?.phone || custPhone,
        mobile: custPhone,
        address: currentCustomer?.address || '',
        city: currentCustomer?.city || 'Hyderabad',
        pincode: currentCustomer?.pincode || ''
      }
    };

    setCustomerOrders((prev) => [newOrder, ...prev]);
    saveOrderToSupabase(newOrder);
    showToast(`Order ${orderNo} created for customer! You can now select it to report any damage.`, 'success');
    return newOrder;
  };

  // Switch Active Customer Account
  const handleSwitchCustomer = (customerProfile) => {
    setCurrentCustomer(customerProfile);
    setCurrentUser({ ...customerProfile, role: 'customer', roleLabel: 'Customer / Buyer' });
    setCurrentSeller(null);
    localStorage.removeItem('C12_ACTIVE_SELLER');
    setCurrentTab('customer');
    showToast(`Switched to ${customerProfile.name}'s Dashboard (${customerProfile.mobile})`, 'info');
  };

  // Switch Active Seller Store
  const handleSwitchSeller = (sellerProfile) => {
    setCurrentSeller(sellerProfile);
    setCurrentUser({ ...sellerProfile, role: 'seller', roleLabel: 'Seller / Merchant' });
    setCurrentCustomer(null);
    localStorage.removeItem('C12_ACTIVE_CUSTOMER');
    setCurrentTab('seller');
    showToast(`Switched active seller store to: ${sellerProfile.name}`, 'info');
  };

  // Handle Login & Role Redirection
  const handleLogin = (user) => {
    if (user.role === 'customer') {
      const match = customerRegistry.find(c => normalizePhone(c.mobile || c.phone) === normalizePhone(user.phone || user.mobile)) || user;
      setCurrentCustomer(match);
      setCurrentSeller(null);
      localStorage.removeItem('C12_ACTIVE_SELLER');
      setCurrentUser({ ...match, role: 'customer', roleLabel: 'Customer / Buyer' });
      setCurrentTab('customer');
    } else if (user.role === 'seller') {
      const match = sellerRegistry.find(s => s.id === user.id || s.name === user.name) || user;
      setCurrentSeller(match);
      setCurrentCustomer(null);
      localStorage.removeItem('C12_ACTIVE_CUSTOMER');
      setCurrentUser({ ...match, role: 'seller', roleLabel: 'Seller / Merchant' });
      setCurrentTab('seller');
    } else if (user.role === 'reviewer') {
      setCurrentUser(user);
      setCurrentTab('reviewer');
    } else {
      setCurrentUser(user);
      setCurrentTab('customer');
    }
    showToast(`Welcome, ${user.name}! Logged in successfully.`, 'success');
  };

  // Handle Logout
  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentCustomer(null);
    setCurrentSeller(null);
    localStorage.removeItem('C12_CURRENT_USER');
    localStorage.removeItem('C12_ACTIVE_CUSTOMER');
    localStorage.removeItem('C12_ACTIVE_SELLER');
    showToast('Signed out successfully', 'info');
  };

  // Customer Submits Case -> Auto-routes to Seller & Updates Order Status
  const handleSubmitCustomerCase = (newCase) => {
    const isFraud = newCase.geminiReport?.authenticityStatus === 'FRAUD' || 
                    (newCase.geminiReport?.fraudProbability || 0) > 50 || 
                    newCase.geminiReport?.recommendation === 'CONTEST';

    const caseWithStatus = {
      ...newCase,
      status: isFraud ? 'Flagged as Suspected Fraud by AI' : (newCase.status || 'Routed to Seller'),
      fraudDetected: Boolean(isFraud)
    };

    setEvidenceCases((prev) => [caseWithStatus, ...prev]);
    saveCaseToSupabase(caseWithStatus);

    // If Gemini recommended REFUND, RETURN, or flagged FRAUD/CONTEST, update customer order status
    const rec = newCase.geminiReport?.recommendation?.toUpperCase();
    if (isFraud || rec === 'CONTEST') {
      setCustomerOrders((prev) =>
        prev.map(o => o.orderNo === newCase.orderNo ? { ...o, status: 'Claim Flagged for Fraud Review', resolvedAs: 'CONTEST' } : o)
      );
      showToast(`Warning: Case ${newCase.caseId} flagged for potential fraud (${newCase.geminiReport?.fraudProbability || 90}% Risk) and routed to seller for contestation.`, 'error');
    } else if (rec === 'REFUND') {
      setCustomerOrders((prev) =>
        prev.map(o => o.orderNo === newCase.orderNo ? { ...o, status: 'Refund Approved', resolvedAs: 'REFUND' } : o)
      );
      showToast(`Case ${newCase.caseId} verified as genuine and routed to Seller (${newCase.sellerName})!`, 'success');
    } else if (rec === 'RETURN') {
      setCustomerOrders((prev) =>
        prev.map(o => o.orderNo === newCase.orderNo ? { ...o, status: 'Return Required', resolvedAs: 'RETURN' } : o)
      );
      showToast(`Case ${newCase.caseId} generated & routed to Seller (${newCase.sellerName}) with Return recommendation!`, 'success');
    } else {
      setCustomerOrders((prev) =>
        prev.map(o => o.orderNo === newCase.orderNo ? { ...o, status: 'Replacement Approved', resolvedAs: 'REPLACE' } : o)
      );
      showToast(`Case ${newCase.caseId} verified as genuine and routed to Seller (${newCase.sellerName})!`, 'success');
    }
  };

  // Seller Adds Packing Record -> syncs customer profile & adds order to that specific customer's list WITHOUT redirecting
  const handleAddPackingRecord = (newRecord) => {
    setSellerPackingRecords((prev) => [
      newRecord,
      ...prev.filter((r) => r.orderNo !== newRecord.orderNo)
    ]);
    savePackingRecordToSupabase(newRecord);

    // Automatically link & save customer profile to registry by mobile number WITHOUT switching active user or tab
    if (newRecord.customerMobile || newRecord.customerPhone) {
      handleSaveCustomerToDirectory({
        name: newRecord.customerName || 'Customer',
        phone: newRecord.customerPhone || newRecord.customerMobile,
        mobile: newRecord.customerMobile || newRecord.customerPhone,
        address: newRecord.customerAddress || '',
        city: newRecord.customerCity || 'Hyderabad',
        pincode: newRecord.customerPincode || '',
        email: newRecord.customerEmail || ''
      });
    }

    const custNormPhone = normalizePhone(newRecord.customerMobile || newRecord.customerPhone || '9876543210');

    const newOrder = {
      orderNo: newRecord.orderNo,
      productName: newRecord.productName,
      sku: newRecord.sku,
      category: newRecord.category,
      bookingDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      deliveryDate: 'In Transit / Delivered',
      price: newRecord.salePrice || 4999,
      sellerId: newRecord.sellerId || (currentSeller?.id || 'SLR-1001'),
      sellerName: newRecord.sellerName || (currentSeller?.name || 'Verified Seller'),
      status: 'Delivered',
      image: newRecord.beforePacking?.photo || '/assets/P01.png',
      courier: newRecord.logistics?.courierPartner || 'Blue Dart Express',
      awb: newRecord.logistics?.awbNumber || 'BLUEDART-882910471',
      customerPhone: custNormPhone,
      customer: {
        name: newRecord.customerName || 'Customer',
        phone: newRecord.customerPhone || custNormPhone,
        mobile: custNormPhone,
        address: newRecord.customerAddress || '',
        city: newRecord.customerCity || 'Hyderabad',
        pincode: newRecord.customerPincode || ''
      }
    };

    setCustomerOrders((prev) => [newOrder, ...prev.filter(p => p.orderNo !== newRecord.orderNo)]);
    saveOrderToSupabase(newOrder);
    showToast(`Order ${newRecord.orderNo} packaging saved & added to customer's order list!`, 'success');
  };

  // Seller Updates Packing Record (including Gemini Report)
  const handleUpdatePackingRecord = (orderNo, updates) => {
    setSellerPackingRecords((prev) =>
      prev.map((r) => {
        if (r.orderNo === orderNo) {
          const updated = { ...r, ...updates };
          savePackingRecordToSupabase(updated);
          return updated;
        }
        return r;
      })
    );
  };

  // Seller or Reviewer Updates Case (including Gemini Report)
  const handleUpdateCase = (caseId, updates) => {
    setEvidenceCases((prev) =>
      prev.map((c) => {
        if (c.caseId === caseId) {
          const updated = { ...c, ...updates };
          saveCaseToSupabase(updated);
          return updated;
        }
        return c;
      })
    );
  };

  // Seller Updates Case Status
  const handleUpdateCaseStatus = (caseId, newStatus) => {
    setEvidenceCases((prev) =>
      prev.map((c) => {
        if (c.caseId === caseId) {
          const updated = { ...c, status: newStatus };
          saveCaseToSupabase(updated);
          return updated;
        }
        return c;
      })
    );
    showToast(`Case ${caseId} status updated to: ${newStatus}`, 'info');
  };

  // Reset all state to clean empty
  const handleResetData = () => {
    if (confirm('Clear all customer profiles, seller stores, orders, and evidence cases? Everything will be completely empty for manual registration.')) {
      localStorage.removeItem('C12_EVIDENCE_CASES');
      localStorage.removeItem('C12_SELLER_PACKING_RECORDS');
      localStorage.removeItem('C12_REVIEWER_CASES');
      localStorage.removeItem('C12_BOOKED_PRODUCTS');
      localStorage.removeItem('C12_CUSTOMER_REGISTRY');
      localStorage.removeItem('C12_SELLER_REGISTRY');
      localStorage.removeItem('C12_CUSTOMER_ORDERS');
      localStorage.removeItem('C12_ACTIVE_CUSTOMER');
      localStorage.removeItem('C12_ACTIVE_SELLER');
      localStorage.removeItem('C12_CURRENT_USER');
      localStorage.setItem('C12_DATA_VERSION', DATA_VERSION);

      setEvidenceCases([]);
      setSellerPackingRecords([]);
      setCustomerRegistry([]);
      setSellerRegistry([]);
      setCustomerOrders([]);
      setCurrentCustomer(null);
      setCurrentSeller(null);
      setCurrentUser(null);
      showToast('All dummy data cleared! Ready for manual registration of sellers and customers.', 'info');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      
      {/* Top Banner & Navigation */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        casesCount={evidenceCases.length}
        sellerRecordsCount={sellerPackingRecords.length}
        onResetData={handleResetData}
        currentUser={
          currentTab === 'customer'
            ? (currentCustomer ? { ...currentCustomer, roleLabel: 'Customer' } : null)
            : currentTab === 'seller'
            ? (currentSeller ? { ...currentSeller, roleLabel: 'Seller' } : null)
            : (currentUser || currentCustomer || currentSeller)
        }
        currentCustomer={currentCustomer}
        currentSeller={currentSeller}
        onLogout={handleLogout}
        supabaseConfigured={Boolean(supabase)}
        onFetchSupabaseData={handleFetchSupabaseData}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12">
        {currentTab === 'customer' && (
          <CustomerDashboard
            currentCustomer={currentCustomer}
            onSwitchCustomer={handleSwitchCustomer}
            onRegisterCustomer={handleRegisterCustomer}
            onAddCustomerOrder={handleAddCustomerOrder}
            customerOrders={customerOrders}
            setCustomerOrders={setCustomerOrders}
            sellerPackingRecords={sellerPackingRecords}
            evidenceCases={evidenceCases}
            customerRegistry={customerRegistry}
            sellerRegistry={sellerRegistry}
            onSubmitCase={handleSubmitCustomerCase}
            onOpenDossierModal={(c) => setDossierModalCase(c)}
            currentUser={currentUser}
            onLogout={handleLogout}
          />
        )}

        {currentTab === 'seller' && (
          <SellerDashboard
            activeSeller={currentSeller || sellerRegistry[0] || DEFAULT_SELLER_STORES[0]}
            sellerRegistry={sellerRegistry.length > 0 ? sellerRegistry : DEFAULT_SELLER_STORES}
            onSwitchSeller={handleSwitchSeller}
            onRegisterSeller={handleRegisterSeller}
            sellerPackingRecords={sellerPackingRecords}
            evidenceCases={evidenceCases}
            customerRegistry={customerRegistry}
            onUpdateCustomerRegistry={handleSaveCustomerToDirectory}
            onAddPackingRecord={handleAddPackingRecord}
            onUpdatePackingRecord={handleUpdatePackingRecord}
            onUpdateCaseStatus={handleUpdateCaseStatus}
            onUpdateCase={handleUpdateCase}
            onOpenDossierModal={(c) => setDossierModalCase(c)}
            onLogout={handleLogout}
          />
        )}

        {currentTab === 'reviewer' && (
          <SupportReviewerConsole 
            onToast={showToast} 
            evidenceCases={evidenceCases}
            sellerPackingRecords={sellerPackingRecords}
            onUpdateCase={handleUpdateCase}
          />
        )}

        {currentTab === 'login' && (
          <LoginDashboard
            customerRegistry={customerRegistry}
            sellerRegistry={sellerRegistry}
            onRegisterCustomer={handleRegisterCustomer}
            onRegisterSeller={handleRegisterSeller}
            onLogin={handleLogin}
            onCancel={() => setCurrentTab('customer')}
            currentUser={currentUser || currentCustomer || currentSeller}
            onLogout={handleLogout}
          />
        )}
      </main>

      {/* Interactive PDF / Case Dossier Modal */}
      <EvidenceDossierModal
        caseData={dossierModalCase}
        isOpen={Boolean(dossierModalCase)}
        onClose={() => setDossierModalCase(null)}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-3 bg-white border border-slate-200/90 text-slate-800 px-5 py-3.5 rounded-2xl shadow-xl shadow-slate-200/80 animate-bounce-short">
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-indigo-500 shrink-0" />
          )}
          <span className="text-xs font-semibold">{toastMessage.msg}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-slate-700 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white/80 backdrop-blur-md py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold text-slate-700">
              Damaged Product Evidence Assistant (C12)
            </span>
            <span>· Fynd × NMIMS Hyderabad Simulation</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Powered by Google Gemini 3.8 Flash Multimodal AI & certified camera truth separation.
          </p>
        </div>
      </footer>

    </div>
  );
}
