# Initial data and seller registry

This document describes [`initialData.js`](./initialData.js), the initial-data and seller-registry module used by the customer and seller portals.

## Purpose

The module provides:

- Default seller records for the application.
- Empty initial arrays for product, packing-record, and evidence-case data.
- Helpers for loading and saving the seller registry in browser `localStorage`.

It is a JavaScript data/helper module, **not** a database schema or migration. It does not create a database, define field constraints, or validate seller fields against a formal type.

## Exports

### `DEFAULT_SELLER_STORES`

An array containing the two built-in seller records:

| Field | Example | Description |
|---|---|---|
| `id` | `SLR-1001` | Seller identifier. |
| `name` | `Apex Tech & Retail Solutions` | Seller or store name. |
| `marketplacePartner` | `Fynd Marketplace Direct` | Marketplace relationship or channel. |
| `hub` | `Bhiwandi Central Fulfillment Hub, Mumbai` | Fulfillment or logistics hub. |
| `rating` | `5.0` | Numeric seller rating. |
| `dispatchCompliance` | `100%` | Dispatch-compliance value, stored as a string. |
| `contactEmail` | `dispatches@apextech.com` | Seller contact email. |
| `contactPhone` | `+91 98200 11223` | Seller contact phone. |
| `category` | `Electronics & Retail` | Seller's business/product category. |

The two records currently defined are:

- `SLR-1001`: Apex Tech & Retail Solutions.
- `SLR-1002`: Nexora Global Logistics.

These are default/example records in application source. They are not loaded from a database by this module.

### `CURRENT_SELLER`

References the first entry in `DEFAULT_SELLER_STORES`. It is currently the Apex Tech & Retail Solutions record.

### `MARKETPLACE_SELLERS`

References the same array as `DEFAULT_SELLER_STORES`; it is not a separate copy. Mutating one array can therefore affect the other export at runtime.

### Empty initial-data exports

These exports are empty arrays:

- `SAMPLE_BOOKED_PRODUCTS`
- `INITIAL_SELLER_PACKING_RECORDS`
- `INITIAL_EVIDENCE_CASES`
- `C12_FIXTURE_CASES`

They provide initial values/placeholders for other parts of the application. This module does not populate them or fetch their records.

## Browser storage

The seller registry is stored under this `localStorage` key:

```text
C12_SELLER_REGISTRY
```

This is browser-local storage for the application's origin, not a file beside this module. The module expects to run in a browser where the global `localStorage` API is available.

### `loadSellerRegistry()`

Loads and parses `C12_SELLER_REGISTRY`.

1. Reads the key from `localStorage`.
2. Parses the stored JSON.
3. Returns the parsed value only if it is an array with at least one entry.
4. If the key is missing, the value is invalid JSON, or the parsed array is empty, returns `DEFAULT_SELLER_STORES`.
5. If reading or parsing throws, logs a warning and returns `DEFAULT_SELLER_STORES`.

The function checks that the stored value is a non-empty array, but does not validate the shape or fields of the array's entries.

### `saveSellerToRegistry(seller, currentSellers = [])`

Creates or updates a seller in the supplied registry, writes the result to `C12_SELLER_REGISTRY`, and returns the updated array.

#### Input behavior

- `seller` must be present and have a truthy `name`. Otherwise, the function returns `currentSellers` without writing to storage.
- If `seller.id` is truthy, it is used as the ID. Otherwise, an ID in the `SLR-1000`–`SLR-9999` range is generated. The generated ID is random and is not guaranteed unique.
- Optional values are filled with defaults:

| Field | Default when the supplied value is falsy |
|---|---|
| `marketplacePartner` | `Fynd Marketplace Direct` |
| `hub` | `Central Fulfillment Center, Mumbai` |
| `rating` | `5.0` |
| `dispatchCompliance` | `100%` |
| `contactEmail` | `contact@<normalized-name>.com` |
| `contactPhone` | `+91 98000 00000` |
| `category` | `Multi-Category Retail` |

The generated email lowercases the seller name and removes characters other than ASCII letters and digits for the email-name portion.

Because defaults use JavaScript's `||` operator, values such as `rating: 0` are treated as missing and replaced with the default.

#### Update behavior

- If `currentSellers` contains an entry with the same `id`, that entry is replaced with a shallow merge of the old entry and the normalized seller fields.
- If there is no matching ID, the new seller is prepended to the array.
- The function does not mutate the `currentSellers` array in place.

#### Storage/error behavior

The updated array is serialized as JSON and saved to `localStorage`. If the write fails, the function logs an error and still returns the updated in-memory array. A storage failure therefore does not discard the returned update, but it means that update may not persist after a reload.

## Usage examples

Load the current registry:

```js
import { loadSellerRegistry } from './initialData';

const sellers = loadSellerRegistry();
```

Add a seller to the current registry:

```js
import { loadSellerRegistry, saveSellerToRegistry } from './initialData';

const currentSellers = loadSellerRegistry();
const updatedSellers = saveSellerToRegistry(
  {
    id: 'SLR-2001',
    name: 'Example Electronics',
    category: 'Electronics'
  },
  currentSellers
);
```

The added seller receives defaults for fields not supplied, is put at the beginning of the returned array, and is saved to browser storage.

## Data flow and limitations

- Seller records loaded by `loadSellerRegistry()` come from browser storage when a non-empty array is present; otherwise the source defaults are returned.
- `saveSellerToRegistry()` accepts the current list as an argument. It does not load the existing list itself; callers should pass the list they want to update.
- This module's seller-registry persistence is separate from any cloud/database synchronization performed elsewhere in the application.
- There is no validation for duplicate IDs, email/phone formats, rating ranges, required seller fields beyond `name`, or stored registry entry shapes.
- Browser storage may be unavailable or full. Reads and writes are guarded and logged, but the module does not provide a cloud or disk-file fallback.
