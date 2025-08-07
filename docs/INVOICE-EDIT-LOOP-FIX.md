# Invoice Edit Form Infinite Loop Fix

## Issue Summary

The invoice edit form was getting stuck in an infinite reload loop when editing an invoice.

## Root Cause Analysis

The infinite loop was caused by a circular dependency in the React `useEffect` hooks:

1. **Main `useEffect`** (line 231) had `handleClientChange` as a dependency
2. **`handleClientChange`** was recreated on every render because it depended on the `clients` state
3. When clients were loaded via `loadClients()`, it updated the `clients` state
4. This triggered a re-render, which recreated `handleClientChange`
5. The recreation of `handleClientChange` triggered the main `useEffect` again
6. This created an infinite loop of: load clients → update state → recreate callback → trigger effect → repeat

## Solution Implemented

### 1. Split the Main useEffect

Instead of one large `useEffect`, we split it into three focused effects:

```javascript
// Load clients on mount
useEffect(() => {
  loadClients();
}, [loadClients]);

// Load invoice when editing
useEffect(() => {
  if (isEdit && id) {
    loadInvoice();
  }
}, [isEdit, id, loadInvoice]);

// Handle preselected client
useEffect(() => {
  if (preselectedClientId && clients.length > 0) {
    // Apply client defaults inline
  }
}, [preselectedClientId, clients, form]);
```

### 2. Remove Circular Dependency in handleClientChange

Changed from:
```javascript
const handleClientChange = useCallback((clientId: string) => {
  const client = clients.find(c => c.id === clientId);
  // ...
}, [clients, form]); // clients dependency caused recreation
```

To:
```javascript
const handleClientChange = useCallback((clientId: string) => {
  setClients(currentClients => {
    const client = currentClients.find(c => c.id === clientId);
    // ... apply changes ...
    return currentClients; // Return unchanged
  });
}, [form]); // No clients dependency
```

## Key Changes

1. **Separated Concerns**: Each `useEffect` now has a single responsibility
2. **Removed Circular Dependencies**: `handleClientChange` no longer depends on `clients`
3. **Used State Updater Pattern**: Access current clients via the state setter function
4. **Inline Logic for Preselected Client**: Avoid calling `handleClientChange` in effects

## Testing

To verify the fix:
1. Navigate to `/invoices`
2. Click edit on any invoice
3. The form should load once without infinite reloading
4. All client data should populate correctly
5. Changing the client should update currency and payment terms

## Prevention

To prevent similar issues:
- Keep `useEffect` dependencies minimal
- Use the state updater pattern when accessing state in callbacks
- Split complex effects into focused, single-purpose effects
- Be careful with callbacks that depend on frequently changing state