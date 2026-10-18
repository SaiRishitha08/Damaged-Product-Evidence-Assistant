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

export const INITIAL_SELLER_PACKING_RECORDS = [
  {
    orderNo: 'ORD-1024',
    productName: 'Ceramic coffee mug',
    sku: 'MUG-CERAMIC-1024',
    category: 'Home & Kitchen',
    customerName: 'Aarav Sharma',
    customerPhone: '9811230491',
    customerMobile: '9811230491',
    sellerId: 'SLR-1001',
    sellerName: 'Apex Tech & Retail Solutions',
    salePrice: 799,
    beforePacking: {
      serialNo: 'MUG-CERAMIC-1024',
      qcInspectorId: 'QC-INSPECTOR-88',
      inspectorNotes: 'Pristine ceramic mug, handle verified intact and free from hairline cracks or structural flaws.',
      photo: '/assets/P01.png',
      photos: ['/assets/P01.png']
    },
    afterPacking: {
      packagingType: '3-Ply Corrugated Box + Internal Bubble Cushioning',
      securityTapeNo: 'TAPE-1024',
      boxWeightGrams: 450,
      fragileStickerApplied: true,
      photo: '/assets/P02.png',
      photos: ['/assets/P02.png']
    },
    logistics: {
      courierPartner: 'Blue Dart Express',
      awbNumber: 'BLUEDART-882910471',
      dispatchHub: 'Bhiwandi Central Fulfillment Hub, Mumbai'
    }
  }
];

export const INITIAL_EVIDENCE_CASES = [
  {
    caseId: 'DP-1024',
    orderNo: 'ORD-1024',
    productName: 'Ceramic coffee mug',
    customerName: 'Aarav Sharma',
    customerPhone: '9811230491',
    customerMobile: '9811230491',
    sellerId: 'SLR-1001',
    sellerName: 'Apex Tech & Retail Solutions',
    price: 799,
    reportedAt: '18 Oct 2026, 09:30 AM',
    customerClaim: 'My mug arrived with a broken handle. I found the damage when I opened the package. I want a replacement.',
    damageType: 'Broken Handle / Ceramic Fracture',
    damageSeverity: 'Medium',
    claimType: 'Replacement',
    customerEvidenceImage: '/assets/P01.png',
    customerEvidenceImages: ['/assets/P01.png'],
    status: 'Automated Replacement Approved',
    fraudDetected: false,
    automatedDecision: true,
    visibleObservation: 'The uploaded photograph appears to show damage to the mug handle. The handle area is the main area of concern.',
    unknowns: 'Packaging condition is unknown. No photograph of the outer packaging or protective material was submitted.',
    courierPartner: 'Blue Dart Express',
    awbNumber: 'BLUEDART-882910471',
    geminiReport: {
      case_id: 'DP-1024',
      complaint_summary: 'The customer reports that a ceramic mug arrived with a broken handle and requests a replacement.',
      visible_observations: [
        {
          finding: 'The uploaded photograph appears to show acute physical fracture to the mug handle. The handle area is the primary area of concern.',
          evidence_id: 'IMG-CUST-01',
          confidence: 'high',
          confidence_score: 88,
          source: 'customer',
          label: 'Customer Uploaded Damage Photo',
          image_url: '/assets/P01.png'
        },
        {
          finding: 'Seller pre-dispatch unit verification (MUG-CERAMIC-1024) verifies ceramic mug was pristine with handle fully intact prior to boxing.',
          evidence_id: 'IMG-SELLER-01',
          confidence: 'high',
          confidence_score: 98,
          source: 'seller',
          label: 'Seller Pre-Dispatch Unit Photo',
          image_url: '/assets/P01.png'
        },
        {
          finding: 'Seller outbound packaging verified: 3-ply corrugated box sealed with security tape #TAPE-1024 (450g gross weight).',
          evidence_id: 'IMG-SELLER-02',
          confidence: 'high',
          confidence_score: 95,
          source: 'seller',
          label: 'Seller Sealed Outer Carton Photo',
          image_url: '/assets/P02.png'
        }
      ],
      customer_claims: [
        'The mug arrived damaged.',
        'The damage was noticed after opening the package.',
        'The customer requests a replacement.'
      ],
      claims_disclaimer: 'These are statements from the customer, not independently verified facts.',
      missing_evidence: [
        {
          item: 'Packaging condition is unknown',
          reason: 'No photograph of the outer packaging or protective material was submitted.',
          priority: 'medium'
        }
      ],
      uncertainties: [
        'The photograph alone cannot establish when or how the damage occurred.',
        'The extent of the damage may require another angle to assess.',
        'The absence of packaging evidence does not prove that the customer caused the damage.'
      ],
      suggested_next_steps: [
        'Trigger automated warehouse dispatch for replacement unit under Platform Transit Protection Policy.',
        'Ask the customer for a photograph of the packaging, if required by policy.',
        'Request another view of the handle if the damage is unclear.',
        'Have a support agent review the evidence and apply the replacement policy.'
      ],
      overall_evidence_status: 'automated_replace_approved',
      human_review_required: false,
      decision: {
        type: 'AUTOMATED_REPLACE',
        status: 'APPROVED_REPLACEMENT',
        confidence_pct: 88,
        fraud_pct: 6,
        ethical_reason: 'Automated replacement approved ethically: Pre-dispatch photograph verifies the ceramic mug was packed with handle intact, and customer evidence visibly confirms genuine courier transit fracture with high visual confidence (88% > 75%). Automated approval provides immediate customer restitution without administrative delay while preserving merchant transit insurance rights.',
        seller_approval_required: false,
        badge_label: 'Automated Replacement Approved (Confidence > 75%)',
        badge_color: 'emerald'
      },
      authenticityStatus: 'ORIGINAL',
      recommendation: 'REPLACE',
      confidenceScore: 88,
      fraudProbability: 6,
      authenticityScore: 94,
      liability: 'Courier Transit Mishandling',
      executiveSummary: 'Customer reports that a ceramic mug arrived with a broken handle and requests a replacement.',
      detailedAnalysis: 'Visual cross-comparison confirms dispatched product matches received unit baseline. Factual handle fracture confirmed.',
      decisionRationale: 'Confidence score (88%) exceeds the 75% automation threshold. Genuine transit fracture identified without merchant defect.',
      sellerActionAdvice: 'Authorize automated replacement unit dispatch and submit AWB claim to Blue Dart Express.',
      customerInstructions: 'Your replacement request has been automatically approved. A replacement mug is being prepared for dispatch.'
    }
  }
];

export const SAMPLE_BOOKED_PRODUCTS = [
  {
    orderNo: 'ORD-1024',
    productName: 'Ceramic coffee mug',
    sku: 'MUG-CERAMIC-1024',
    category: 'Home & Kitchen',
    bookingDate: '17 Oct 2026',
    deliveryDate: 'Delivered yesterday',
    price: 799,
    sellerId: 'SLR-1001',
    sellerName: 'Apex Tech & Retail Solutions',
    status: 'Replacement Approved (Automated AI)',
    image: '/assets/P01.png',
    courier: 'Blue Dart Express',
    awb: 'BLUEDART-882910471',
    customerPhone: '9811230491',
    customer: {
      name: 'Aarav Sharma',
      phone: '9811230491',
      mobile: '9811230491',
      address: 'Plot 42, Jubilee Hills Road No 36',
      city: 'Hyderabad',
      pincode: '500033'
    }
  }
];

export const C12_FIXTURE_CASES = INITIAL_EVIDENCE_CASES;

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
