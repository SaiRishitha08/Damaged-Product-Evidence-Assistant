import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import CustomerDashboard from './components/CustomerDashboard';
import SellerDashboard from './components/SellerDashboard';
import SupportReviewerConsole from './components/SupportReviewerConsole';
import LoginDashboard from './components/LoginDashboard';
import AuthLandingPage from './components/AuthLandingPage';
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
  db, 
  COLLECTIONS,
  saveCaseToFirestore,
  savePackingRecordToFirestore,
  saveCustomerToFirestore,
  saveSellerToFirestore,
  saveOrderToFirestore,
  fetchAllFirebaseData
} from './firebase';
import { collection, onSnapshot } from 'firebase/firestore';

const DATA_VERSION = 'v8_c12_ai_evidence_summary_dp1024';
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
    return null;
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

  // Real-time Firebase Firestore synchronization
  const [firebaseConnected, setFirebaseConnected] = useState(true);

  useEffect(() => {
    let unsubs = [];
    try {
      // 1. Evidence cases real-time listener
      const unsubCases = onSnapshot(collection(db, COLLECTIONS.CASES), (snap) => {
        setFirebaseConnected(true);
        if (!snap.empty) {
          const remoteCases = [];
          snap.forEach(d => remoteCases.push(d.data()));
          setEvidenceCases(prev => {
            const merged = [...prev];
            remoteCases.forEach(rc => {
              const idx = merged.findIndex(c => c.caseId === rc.caseId);
              if (idx >= 0) merged[idx] = { ...merged[idx], ...rc };
              else merged.unshift(rc);
            });
            return merged;
          });
        }
      }, (err) => {
        console.warn('[Firebase] Cases sync notice:', err.message);
      });
      unsubs.push(unsubCases);

      // 2. Seller packing records real-time listener
      const unsubPacking = onSnapshot(collection(db, COLLECTIONS.PACKING_RECORDS), (snap) => {
        setFirebaseConnected(true);
        if (!snap.empty) {
          const remoteRecords = [];
          snap.forEach(d => remoteRecords.push(d.data()));
          setSellerPackingRecords(prev => {
            const merged = [...prev];
            remoteRecords.forEach(rr => {
              const idx = merged.findIndex(r => r.orderNo === rr.orderNo);
              if (idx >= 0) merged[idx] = { ...merged[idx], ...rr };
              else merged.unshift(rr);
            });
            return merged;
          });
        }
      }, (err) => {
        console.warn('[Firebase] Packing records sync notice:', err.message);
      });
      unsubs.push(unsubPacking);

      // 3. Customer registry real-time listener
      const unsubCustomers = onSnapshot(collection(db, COLLECTIONS.CUSTOMERS), (snap) => {
        setFirebaseConnected(true);
        if (!snap.empty) {
          const remoteCusts = [];
          snap.forEach(d => remoteCusts.push(d.data()));
          setCustomerRegistry(prev => {
            const merged = [...prev];
            remoteCusts.forEach(rc => {
              const idx = merged.findIndex(c => (c.mobile || c.phone) === (rc.mobile || rc.phone));
              if (idx >= 0) merged[idx] = { ...merged[idx], ...rc };
              else merged.push(rc);
            });
            return merged;
          });
        }
      }, (err) => {
        console.warn('[Firebase] Customers sync notice:', err.message);
      });
      unsubs.push(unsubCustomers);

      // 4. Seller registry real-time listener
      const unsubSellers = onSnapshot(collection(db, COLLECTIONS.SELLERS), (snap) => {
        setFirebaseConnected(true);
        if (!snap.empty) {
          const remoteSellers = [];
          snap.forEach(d => remoteSellers.push(d.data()));
          setSellerRegistry(prev => {
            const merged = [...prev];
            remoteSellers.forEach(rs => {
              const idx = merged.findIndex(s => s.id === rs.id);
              if (idx >= 0) merged[idx] = { ...merged[idx], ...rs };
              else merged.push(rs);
            });
            return merged;
          });
        }
      }, (err) => {
        console.warn('[Firebase] Sellers sync notice:', err.message);
      });
      unsubs.push(unsubSellers);

      // 5. Customer orders real-time listener
      const unsubOrders = onSnapshot(collection(db, COLLECTIONS.ORDERS), (snap) => {
        setFirebaseConnected(true);
        if (!snap.empty) {
          const remoteOrders = [];
          snap.forEach(d => remoteOrders.push(d.data()));
          setCustomerOrders(prev => {
            const merged = [...prev];
            remoteOrders.forEach(ro => {
              const idx = merged.findIndex(o => o.orderNo === ro.orderNo);
              if (idx >= 0) merged[idx] = { ...merged[idx], ...ro };
              else merged.unshift(ro);
            });
            return merged;
          });
        }
      }, (err) => {
        console.warn('[Firebase] Orders sync notice:', err.message);
      });
      unsubs.push(unsubOrders);

    } catch (e) {
      console.warn('[Firebase] Listeners init error:', e);
    }

    return () => {
      unsubs.forEach(unsub => unsub && unsub());
    };
  }, []);

  // Toast Helper
  const showToast = (msg, type = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Fetch current live data from Firebase Firestore
  const handleFetchFirebaseData = async () => {
    showToast('Connecting to Firebase and fetching current live data...', 'info');
    try {
      const res = await fetchAllFirebaseData();
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
          showToast('Connected to c12fynd! Cloud database is online. Syncing active records to Firestore...', 'info');
          for (const c of evidenceCases) {
            await saveCaseToFirestore(c);
          }
          for (const r of sellerPackingRecords) {
            await savePackingRecordToFirestore(r);
          }
          for (const cust of customerRegistry) {
            await saveCustomerToFirestore(cust);
          }
          for (const sel of sellerRegistry) {
            await saveSellerToFirestore(sel);
          }
          for (const ord of customerOrders) {
            await saveOrderToFirestore(ord);
          }
          showToast('Firebase c12fynd live! Successfully synchronized active records to Firestore.', 'success');
        } else {
          showToast(`Firebase Sync Complete! Fetched ${importedCount} cloud items from c12fynd.`, 'success');
        }
      } else {
        showToast(`Firebase connected to c12fynd! Cloud status: ${res.error || 'Connected'}`, 'info');
      }
    } catch (e) {
      showToast('Firebase fetch error: ' + e.message, 'error');
    }
  };

  // Save or update customer profile in directory WITHOUT switching active user or tab
  const handleSaveCustomerToDirectory = (profile) => {
    if (!profile || (!profile.mobile && !profile.phone)) return null;
    const updated = saveCustomerToRegistry(profile, customerRegistry);
    setCustomerRegistry(updated);
    saveCustomerToFirestore(profile);
    const norm = normalizePhone(profile.mobile || profile.phone);
    return updated.find(c => normalizePhone(c.mobile || c.phone) === norm) || updated[0];
  };

  // Register New Customer Handler (Only for explicit customer signup/login)
  const handleRegisterCustomer = (profile) => {
    const updated = saveCustomerToRegistry(profile, customerRegistry);
    setCustomerRegistry(updated);
    saveCustomerToFirestore(profile);
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
    saveSellerToFirestore(sellerData);
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
    saveOrderToFirestore(newOrder);
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

  // Seller Approves Refund
  const handleApproveRefund = (caseId) => {
    setEvidenceCases((prev) =>
      prev.map(c => c.caseId === caseId ? { ...c, status: 'Refund Approved by Seller', sellerRefundAuthorized: true } : c)
    );
    const targetCase = evidenceCases.find(c => c.caseId === caseId);
    if (targetCase) {
      setCustomerOrders((prev) =>
        prev.map(o => o.orderNo === targetCase.orderNo ? { ...o, status: 'Refund Approved (by Seller)', resolvedAs: 'REFUND' } : o)
      );
    }
    showToast(`Refund authorized & approved by Seller for Case ${caseId}!`, 'success');
  };

  // Seller Declines Refund / Offers Replacement
  const handleDeclineRefund = (caseId, counterOffer = 'REPLACE') => {
    setEvidenceCases((prev) =>
      prev.map(c => c.caseId === caseId ? { ...c, status: 'Seller Offered Free Replacement', sellerCounterOffer: counterOffer } : c)
    );
    const targetCase = evidenceCases.find(c => c.caseId === caseId);
    if (targetCase) {
      setCustomerOrders((prev) =>
        prev.map(o => o.orderNo === targetCase.orderNo ? { ...o, status: 'Seller Counter-Offer (Replacement)', resolvedAs: 'REPLACE' } : o)
      );
    }
    showToast(`Seller declined direct refund and offered free replacement for Case ${caseId}.`, 'info');
  };

  // Customer Submits Case -> Evaluates Automation Rules & Routes appropriately
  const handleSubmitCustomerCase = (newCase) => {
    const decision = newCase.geminiReport?.decision;
    const fraudProb = Number(newCase.geminiReport?.fraudProbability || 0);
    const confScore = Number(newCase.geminiReport?.confidenceScore || 0);

    const isFraud = decision?.type === 'AUTOMATED_CANCEL_FRAUD' || fraudProb > 75;
    const isRefund = decision?.type === 'SELLER_REFUND_REVIEW' || (newCase.claimType || '').toLowerCase().includes('refund');
    const isAutoReplace = (decision?.type === 'AUTOMATED_REPLACE' || (confScore > 75 && fraudProb <= 30)) && !isRefund && !isFraud;

    let initialStatus = 'Under Review: Support Agent Decision Required';
    let orderStatus = 'Claim Under Review';

    if (isFraud) {
      // RULE 2: Fraud > 75% -> Directly cancel claim!
      initialStatus = 'Claim Cancelled: Fraud Discrepancy Detected';
      orderStatus = 'Claim Cancelled (Suspected Fraud)';
      showToast(`Notice: Claim ${newCase.caseId} automatically cancelled due to fraud probability > 75%.`, 'error');
    } else if (isRefund) {
      // RULE 3: ONLY refunds should approve by seller!
      initialStatus = 'Pending Seller Refund Approval';
      orderStatus = 'Awaiting Seller Refund Approval';
      showToast(`Refund Request: Case ${newCase.caseId} requires merchant approval and has been routed to Seller.`, 'info');
    } else if (isAutoReplace) {
      // RULE 1: Confidence > 75% -> Automate approval of replace!
      initialStatus = 'Automated Replacement Approved';
      orderStatus = 'Replacement Approved (Automated AI)';
      showToast(`Success: Claim ${newCase.caseId} automatically approved for Replacement (Confidence > 75%)!`, 'success');
    } else {
      // RULE 4: Support Agent Decision Required
      showToast(`Case ${newCase.caseId} logged for human support review.`, 'info');
    }

    const caseWithStatus = {
      ...newCase,
      status: initialStatus,
      fraudDetected: Boolean(isFraud),
      automatedDecision: isFraud || isAutoReplace
    };

    setEvidenceCases((prev) => [caseWithStatus, ...prev.filter(c => c.caseId !== newCase.caseId)]);
    saveCaseToFirestore(caseWithStatus);

    setCustomerOrders((prev) =>
      prev.map(o => o.orderNo === newCase.orderNo ? { 
        ...o, 
        status: orderStatus, 
        resolvedAs: isAutoReplace ? 'REPLACE' : (isRefund ? 'REFUND' : (isFraud ? 'CONTEST' : 'UNDER_REVIEW'))
      } : o)
    );
  };

  // Seller Adds Packing Record -> syncs customer profile & adds order to that specific customer's list WITHOUT redirecting
  const handleAddPackingRecord = (newRecord) => {
    setSellerPackingRecords((prev) => [
      newRecord,
      ...prev.filter((r) => r.orderNo !== newRecord.orderNo)
    ]);
    savePackingRecordToFirestore(newRecord);

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
    saveOrderToFirestore(newOrder);
    showToast(`Order ${newRecord.orderNo} packaging saved & added to customer's order list!`, 'success');
  };

  // Seller Updates Packing Record (including Gemini Report)
  const handleUpdatePackingRecord = (orderNo, updates) => {
    setSellerPackingRecords((prev) =>
      prev.map((r) => {
        if (r.orderNo === orderNo) {
          const updated = { ...r, ...updates };
          savePackingRecordToFirestore(updated);
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
          saveCaseToFirestore(updated);
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
          saveCaseToFirestore(updated);
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

  const isCustomerLoggedIn = Boolean(currentCustomer);
  const isSellerLoggedIn = Boolean(currentSeller);
  const isAuthPage = (!isCustomerLoggedIn && currentTab === 'customer') || (!isSellerLoggedIn && currentTab === 'seller') || currentTab === 'login';

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {isAuthPage ? (
        <AuthLandingPage
          activeRole={currentTab === 'seller' ? 'seller' : 'customer'}
          onRoleChange={(role) => setCurrentTab(role)}
          customerRegistry={customerRegistry}
          sellerRegistry={sellerRegistry}
          onLoginCustomer={handleSwitchCustomer}
          onLoginSeller={handleSwitchSeller}
          onRegisterCustomer={handleRegisterCustomer}
          onRegisterSeller={handleRegisterSeller}
        />
      ) : (
        <>
          {/* Top Banner & Navigation */}
          <Navbar
            currentTab={currentTab}
            setCurrentTab={setCurrentTab}
            casesCount={
              currentTab === 'customer'
                ? (currentCustomer ? evidenceCases.filter(c => normalizePhone(c.customerMobile || c.customerPhone) === normalizePhone(currentCustomer.mobile || currentCustomer.phone)).length : 0)
                : evidenceCases.length
            }
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
            firebaseConnected={firebaseConnected}
            onFetchFirebaseData={handleFetchFirebaseData}
          />

          {/* Main Content Area */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12">
            {currentTab === 'customer' && (
              <CustomerDashboard
                currentCustomer={currentCustomer}
                onSwitchCustomer={handleSwitchCustomer}
                onRegisterCustomer={handleRegisterCustomer}
                onAddCustomerOrder={handleAddCustomerOrder}
                onSwitchToSeller={() => setCurrentTab('seller')}
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
                activeSeller={currentSeller}
                sellerRegistry={sellerRegistry.length > 0 ? sellerRegistry : DEFAULT_SELLER_STORES}
                onSwitchSeller={handleSwitchSeller}
                onRegisterSeller={handleRegisterSeller}
                onLogin={handleLogin}
                onSwitchToCustomer={() => setCurrentTab('customer')}
                sellerPackingRecords={sellerPackingRecords}
                evidenceCases={evidenceCases}
                customerRegistry={customerRegistry}
                onUpdateCustomerRegistry={handleSaveCustomerToDirectory}
                onAddPackingRecord={handleAddPackingRecord}
                onUpdatePackingRecord={handleUpdatePackingRecord}
                onUpdateCaseStatus={handleUpdateCaseStatus}
                onUpdateCase={handleUpdateCase}
                onOpenDossierModal={(c) => setDossierModalCase(c)}
                onApproveRefund={handleApproveRefund}
                onDeclineRefund={handleDeclineRefund}
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
          </main>
        </>
      )}

      {/* Interactive PDF / Case Dossier Modal */}
      <EvidenceDossierModal
        caseData={dossierModalCase}
        isOpen={Boolean(dossierModalCase)}
        onClose={() => setDossierModalCase(null)}
        onApproveRefund={handleApproveRefund}
        onDeclineRefund={handleDeclineRefund}
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

      {/* Footer - only shown inside authenticated portal */}
      {!isAuthPage && (
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
      )}

    </div>
  );
}
