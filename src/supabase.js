import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const SUPABASE_TABLES = {
  CASES: 'evidence_cases',
  PACKING_RECORDS: 'seller_packing_records',
  ORDERS: 'customer_orders',
  CUSTOMERS: 'customer_registry',
  SELLERS: 'seller_registry'
};

const warnedMissingConfiguration = new Set();

function warnIfNotConfigured(operation) {
  if (!supabase && !warnedMissingConfiguration.has(operation)) {
    warnedMissingConfiguration.add(operation);
    console.info(`[Supabase] ${operation} skipped: configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable cloud persistence.`);
  }
}

async function upsert(table, row, conflictColumn) {
  if (!row || !supabase) {
    warnIfNotConfigured(`Save ${table}`);
    return { success: false, configured: Boolean(supabase) };
  }

  const { error } = await supabase
    .from(table)
    .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: conflictColumn });

  if (error) {
    console.warn(`[Supabase] Failed to save ${table}:`, error.message);
    return { success: false, configured: true, error: error.message };
  }

  return { success: true, configured: true };
}

export function saveCaseToSupabase(evidenceCase) {
  return upsert(SUPABASE_TABLES.CASES, evidenceCase, 'case_id');
}

export function savePackingRecordToSupabase(record) {
  return upsert(SUPABASE_TABLES.PACKING_RECORDS, record, 'order_no');
}

export function saveCustomerToSupabase(customer) {
  const phone = customer?.phone || customer?.mobile;
  return upsert(
    SUPABASE_TABLES.CUSTOMERS,
    phone ? { ...customer, phone, mobile: customer.mobile || phone } : null,
    'phone'
  );
}

export function saveSellerToSupabase(seller) {
  return upsert(SUPABASE_TABLES.SELLERS, seller, 'id');
}

export function saveOrderToSupabase(order) {
  return upsert(SUPABASE_TABLES.ORDERS, order, 'order_no');
}

async function fetchTable(table) {
  if (!supabase) {
    warnIfNotConfigured(`Fetch ${table}`);
    return [];
  }

  const { data, error } = await supabase.from(table).select('*');
  if (error) throw new Error(`${table}: ${error.message}`);
  return data || [];
}

export async function fetchAllSupabaseData() {
  const result = {
    cases: [],
    packingRecords: [],
    customers: [],
    sellers: [],
    orders: [],
    error: null
  };

  if (!supabase) {
    warnIfNotConfigured('Fetch all data');
    return { success: false, configured: false, data: result, error: 'Supabase is not configured.' };
  }

  const [cases, packingRecords, customers, sellers, orders] = await Promise.allSettled([
    fetchTable(SUPABASE_TABLES.CASES),
    fetchTable(SUPABASE_TABLES.PACKING_RECORDS),
    fetchTable(SUPABASE_TABLES.CUSTOMERS),
    fetchTable(SUPABASE_TABLES.SELLERS),
    fetchTable(SUPABASE_TABLES.ORDERS)
  ]);

  const values = [cases, packingRecords, customers, sellers, orders];
  const [caseResult, packingResult, customerResult, sellerResult, orderResult] = values;
  result.cases = caseResult.status === 'fulfilled' ? caseResult.value : [];
  result.packingRecords = packingResult.status === 'fulfilled' ? packingResult.value : [];
  result.customers = customerResult.status === 'fulfilled' ? customerResult.value : [];
  result.sellers = sellerResult.status === 'fulfilled' ? sellerResult.value : [];
  result.orders = orderResult.status === 'fulfilled' ? orderResult.value : [];
  result.error = values.find((item) => item.status === 'rejected')?.reason?.message || null;

  return { success: !result.error, configured: true, data: result, error: result.error };
}
