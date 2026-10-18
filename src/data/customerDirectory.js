// Customer Directory & Per-Customer Order Repository for C12 Evidence Assistant
// All dummy data and mock users removed per user request. Users start empty for manual registration.

export const DEFAULT_CUSTOMER_PROFILES = [];

/**
 * Normalizes phone numbers to standard 10-digit format
 */
export function normalizePhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
}

/**
 * Finds customer in registry by mobile number (exact or partial match)
 */
export function findCustomerByMobile(mobileInput, registry = []) {
  if (!mobileInput) return null;
  const norm = normalizePhone(mobileInput);
  if (!norm || norm.length < 5) return null;

  return registry.find((c) => {
    const cNorm = normalizePhone(c.mobile || c.phone);
    return cNorm.includes(norm) || norm.includes(cNorm);
  }) || null;
}

/**
 * Loads customer registry from localStorage or returns empty array
 */
export function loadCustomerRegistry() {
  try {
    const saved = localStorage.getItem('C12_CUSTOMER_REGISTRY');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed loading customer registry from localStorage:', err);
  }
  return [];
}

/**
 * Loads all customer orders from storage or returns empty array
 */
export function loadAllCustomerOrders(registry = []) {
  try {
    const saved = localStorage.getItem('C12_CUSTOMER_ORDERS');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed loading customer orders from localStorage:', err);
  }

  return [];
}

/**
 * Returns isolated order list for a specific customer
 */
export function getOrdersForCustomer(customerPhone, allOrders = []) {
  const norm = normalizePhone(customerPhone);
  if (!norm) return [];
  return allOrders.filter((o) => {
    const oPhone = normalizePhone(o.customerPhone || o.customer?.mobile || o.customer?.phone);
    return oPhone === norm;
  });
}

/**
 * Computes exact customer metrics (totalOrders, totalReturns, totalRefunds, activeClaims)
 */
export function getCustomerMetrics(customerPhone, allOrders = [], evidenceCases = []) {
  const norm = normalizePhone(customerPhone);
  const custOrders = allOrders.filter((o) => {
    const oPhone = normalizePhone(o.customerPhone || o.customer?.mobile || o.customer?.phone);
    return oPhone === norm;
  });

  const totalOrders = custOrders.length;
  const totalReturns = custOrders.filter((o) => o.status === 'Returned' || o.resolvedAs === 'RETURN').length;
  const totalRefunds = custOrders.filter((o) => o.status === 'Refunded' || o.resolvedAs === 'REFUND').length;
  const activeClaims = evidenceCases.filter((c) => {
    const cPhone = normalizePhone(c.customerMobile || c.customerPhone);
    return cPhone === norm;
  }).length;

  return {
    totalOrders,
    totalReturns,
    totalRefunds,
    activeClaims
  };
}

/**
 * Saves or updates customer profile linked to mobile number
 */
export function saveCustomerToRegistry(profile, currentRegistry = []) {
  if (!profile || (!profile.phone && !profile.mobile)) return currentRegistry;
  
  const norm = normalizePhone(profile.mobile || profile.phone);
  if (!norm) return currentRegistry;

  const existingIdx = currentRegistry.findIndex((c) => normalizePhone(c.mobile || c.phone) === norm);
  let updated;

  const fullProfile = {
    id: profile.id || `CUST-${Date.now().toString().slice(-4)}`,
    name: profile.name || 'Customer',
    phone: profile.phone || `+91 ${norm.slice(0, 5)} ${norm.slice(5)}`,
    mobile: norm,
    password: profile.password || 'password123',
    email: profile.email || `${norm}@customer.fynd.com`,
    address: profile.address || 'Standard Delivery Address',
    city: profile.city || 'Hyderabad',
    state: profile.state || 'Telangana',
    pincode: profile.pincode || '500001',
    membership: profile.membership || 'Registered Customer',
    trustScore: profile.trustScore || '100% (Verified Profile)',
    avatar: profile.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profile.name || 'User')}&backgroundColor=c084fc,818cf8,38bdf8`,
    initialOrders: profile.initialOrders || []
  };

  if (existingIdx >= 0) {
    updated = currentRegistry.map((c, i) => (i === existingIdx ? { ...c, ...fullProfile } : c));
  } else {
    updated = [fullProfile, ...currentRegistry];
  }

  try {
    localStorage.setItem('C12_CUSTOMER_REGISTRY', JSON.stringify(updated));
  } catch (e) {
    console.error('Failed saving customer registry:', e);
  }

  return updated;
}
