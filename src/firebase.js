import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  onSnapshot, 
  updateDoc, 
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

// User's Firebase Configuration
export const firebaseConfig = {
  apiKey: "AIzaSyAZpnt_CKu-E1nPBrw0Qv71NnU5-9TDFv8",
  authDomain: "c12fynd.firebaseapp.com",
  projectId: "c12fynd",
  storageBucket: "c12fynd.firebasestorage.app",
  messagingSenderId: "868717592168",
  appId: "1:868717592168:web:195d148ae1499a644485dd",
  measurementId: "G-PD6SFD999H"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

// Safe Analytics Initialization (Web browser only)
export let analytics = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
      console.log('[Firebase] Analytics initialized for c12fynd');
    }
  }).catch(() => {});
}

// Firestore Collection Names
export const COLLECTIONS = {
  CASES: 'evidence_cases',
  PACKING_RECORDS: 'seller_packing_records',
  ORDERS: 'customer_orders',
  CUSTOMERS: 'customer_registry',
  SELLERS: 'seller_registry'
};

/**
 * Upload Base64 Data URL to Firebase Storage and get public download URL.
 * Falls back to returning the original data URL if storage upload fails or is offline.
 */
export async function uploadEvidencePhoto(base64DataUrl, path) {
  if (!base64DataUrl || typeof base64DataUrl !== 'string' || !base64DataUrl.startsWith('data:')) {
    return base64DataUrl;
  }
  try {
    const storageRef = ref(storage, path);
    await uploadString(storageRef, base64DataUrl, 'data_url');
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.warn(`[Firebase Storage] Upload failed for ${path}, using local data URL:`, error);
    return base64DataUrl;
  }
}

function sanitizeForFirestore(data) {
  if (!data) return data;
  try {
    return JSON.parse(JSON.stringify(data));
  } catch (e) {
    return data;
  }
}

/**
 * Save or update an Evidence Case in Firestore
 */
export async function saveCaseToFirestore(evidenceCase) {
  if (!evidenceCase || !evidenceCase.caseId) return;
  try {
    const caseRef = doc(db, COLLECTIONS.CASES, evidenceCase.caseId);
    const sanitized = sanitizeForFirestore(evidenceCase);
    await setDoc(caseRef, {
      ...sanitized,
      updatedAt: serverTimestamp()
    }, { merge: true });
    console.log(`[Firebase] Saved case ${evidenceCase.caseId} to Firestore.`);
  } catch (err) {
    console.warn(`[Firebase] Failed to save case to Firestore (offline fallback active):`, err);
  }
}

/**
 * Save or update a Seller Packing Record in Firestore
 */
export async function savePackingRecordToFirestore(record) {
  if (!record || !record.orderNo) return;
  try {
    const recordRef = doc(db, COLLECTIONS.PACKING_RECORDS, record.orderNo);
    const sanitized = sanitizeForFirestore(record);
    await setDoc(recordRef, {
      ...sanitized,
      updatedAt: serverTimestamp()
    }, { merge: true });
    console.log(`[Firebase] Saved packing record for order ${record.orderNo} to Firestore.`);
  } catch (err) {
    console.warn(`[Firebase] Failed to save packing record to Firestore:`, err);
  }
}

/**
 * Save customer profile to Firestore
 */
export async function saveCustomerToFirestore(customer) {
  const phone = customer?.phone || customer?.mobile;
  if (!phone) return;
  try {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const custRef = doc(db, COLLECTIONS.CUSTOMERS, cleanPhone);
    const sanitized = sanitizeForFirestore(customer);
    await setDoc(custRef, {
      ...sanitized,
      updatedAt: serverTimestamp()
    }, { merge: true });
    console.log(`[Firebase] Saved customer profile (${cleanPhone}) to Firestore.`);
  } catch (err) {
    console.warn(`[Firebase] Failed to save customer to Firestore:`, err);
  }
}

/**
 * Save seller profile to Firestore
 */
export async function saveSellerToFirestore(seller) {
  if (!seller || !seller.id) return;
  try {
    const sellerRef = doc(db, COLLECTIONS.SELLERS, seller.id);
    const sanitized = sanitizeForFirestore(seller);
    await setDoc(sellerRef, {
      ...sanitized,
      updatedAt: serverTimestamp()
    }, { merge: true });
    console.log(`[Firebase] Saved seller profile (${seller.id}) to Firestore.`);
  } catch (err) {
    console.warn(`[Firebase] Failed to save seller to Firestore:`, err);
  }
}

/**
 * Save an order to Firestore
 */
export async function saveOrderToFirestore(order) {
  if (!order || !order.orderNo) return;
  try {
    const orderRef = doc(db, COLLECTIONS.ORDERS, order.orderNo);
    const sanitized = sanitizeForFirestore(order);
    await setDoc(orderRef, {
      ...sanitized,
      updatedAt: serverTimestamp()
    }, { merge: true });
    console.log(`[Firebase] Saved order ${order.orderNo} to Firestore.`);
  } catch (err) {
    console.warn(`[Firebase] Failed to save order to Firestore:`, err);
  }
}

/**
 * Fetch all documents from a Firestore collection
 */
export async function fetchCollectionFromFirestore(collectionName) {
  try {
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);
    const docs = [];
    snapshot.forEach((d) => docs.push(d.data()));
    return docs;
  } catch (err) {
    console.warn(`[Firebase] Failed to fetch collection ${collectionName}:`, err);
    return [];
  }
}

/**
 * Fetch all live data across all collections from Firebase
 */
export async function fetchAllFirebaseData() {
  const result = {
    cases: [],
    packingRecords: [],
    customers: [],
    sellers: [],
    orders: [],
    error: null
  };

  try {
    const [casesSnap, packingSnap, custSnap, sellerSnap, orderSnap] = await Promise.allSettled([
      getDocs(collection(db, COLLECTIONS.CASES)),
      getDocs(collection(db, COLLECTIONS.PACKING_RECORDS)),
      getDocs(collection(db, COLLECTIONS.CUSTOMERS)),
      getDocs(collection(db, COLLECTIONS.SELLERS)),
      getDocs(collection(db, COLLECTIONS.ORDERS))
    ]);

    if (casesSnap.status === 'fulfilled') {
      casesSnap.value.forEach((d) => result.cases.push(d.data()));
    } else {
      result.error = casesSnap.reason?.message || 'Permission denied';
    }

    if (packingSnap.status === 'fulfilled') {
      packingSnap.value.forEach((d) => result.packingRecords.push(d.data()));
    }

    if (custSnap.status === 'fulfilled') {
      custSnap.value.forEach((d) => result.customers.push(d.data()));
    }

    if (sellerSnap.status === 'fulfilled') {
      sellerSnap.value.forEach((d) => result.sellers.push(d.data()));
    }

    if (orderSnap.status === 'fulfilled') {
      orderSnap.value.forEach((d) => result.orders.push(d.data()));
    }

    return {
      success: !result.error,
      data: result,
      error: result.error
    };
  } catch (err) {
    return {
      success: false,
      data: result,
      error: err.message
    };
  }
}
