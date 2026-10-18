// Initial Data for Customer & Seller Portals + C12 Evidence Engine

export const DEFAULT_SELLER_STORES = [
  {
    id: 'SLR-1001',
    name: 'Apex Tech & Retail Solutions',
    marketplacePartner: 'Fynd Marketplace Direct',
    hub: 'Bhiwandi Central Fulfillment Hub, Mumbai',
    rating: 5.0,
    dispatchCompliance: '100%',
    contactEmail: 'dispatches@apextech.com',
    contactPhone: '+91 98200 11223',
    category: 'Electronics & Retail'
  },
  {
    id: 'SLR-1002',
    name: 'Nexora Global Logistics',
    marketplacePartner: 'Fynd Direct',
    hub: 'Pataudi Logistics Hub, Delhi NCR',
    rating: 4.9,
    dispatchCompliance: '99.4%',
    contactEmail: 'orders@nexora.com',
    contactPhone: '+91 98111 22334',
    category: 'Consumer Electronics'
  }
];

export const CURRENT_SELLER = DEFAULT_SELLER_STORES[0];
export const MARKETPLACE_SELLERS = DEFAULT_SELLER_STORES;

export const SAMPLE_BOOKED_PRODUCTS = [];
export const INITIAL_SELLER_PACKING_RECORDS = [];
export const INITIAL_EVIDENCE_CASES = [];
export const C12_FIXTURE_CASES = [];

/**
 * Loads seller registry from localStorage or returns default seller stores
 */
export function loadSellerRegistry() {
  try {
    const saved = localStorage.getItem('C12_SELLER_REGISTRY');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed loading seller registry from localStorage:', err);
  }
  return DEFAULT_SELLER_STORES;
}

/**
 * Saves or updates seller store in registry
 */
export function saveSellerToRegistry(seller, currentSellers = []) {
  if (!seller || !seller.name) return currentSellers;
  const sellerId = seller.id || `SLR-${Math.floor(1000 + Math.random() * 9000)}`;
  const fullSeller = {
    id: sellerId,
    name: seller.name,
    marketplacePartner: seller.marketplacePartner || 'Fynd Marketplace Direct',
    hub: seller.hub || 'Central Fulfillment Center, Mumbai',
    rating: seller.rating || 5.0,
    dispatchCompliance: seller.dispatchCompliance || '100%',
    contactEmail: seller.contactEmail || `contact@${seller.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
    contactPhone: seller.contactPhone || '+91 98000 00000',
    category: seller.category || 'Multi-Category Retail'
  };

  const existingIdx = currentSellers.findIndex(s => s.id === sellerId);
  let updated;
  if (existingIdx >= 0) {
    updated = currentSellers.map((s, idx) => idx === existingIdx ? { ...s, ...fullSeller } : s);
  } else {
    updated = [fullSeller, ...currentSellers];
  }

  try {
    localStorage.setItem('C12_SELLER_REGISTRY', JSON.stringify(updated));
  } catch (e) {
    console.error('Failed saving seller registry:', e);
  }
  return updated;
}
