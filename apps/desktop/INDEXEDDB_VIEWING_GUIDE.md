# How to View IndexedDB Data (Not SQLite)

The standalone desktop app uses **IndexedDB** (not SQLite) for local storage. IndexedDB is a browser-based database that stores data locally in your browser/Electron app.

## Viewing IndexedDB Data

### Method 1: Using Browser DevTools (Recommended)

1. **Open DevTools**:
   - Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows/Linux)
   - Or right-click → "Inspect"

2. **Navigate to Application Tab**:
   - Click on the **"Application"** tab (Chrome/Edge) or **"Storage"** tab (Firefox)

3. **Find IndexedDB**:
   - In the left sidebar, expand **"IndexedDB"**
   - Look for **"dealer-software"** (this is the database name)
   - Expand it to see the object stores:
     - `clients` - All client records
     - `vehicles` - All vehicle records
     - `deals` - All deal records
     - `documents` - All document records
     - `settings` - App settings

4. **View Data**:
   - Click on any object store (e.g., `clients`)
   - You'll see all records listed
   - Click on a record to view its details in JSON format

### Method 2: Using Console Commands

You can also access IndexedDB data programmatically in the browser console:

```javascript
// Open the database
const db = await indexedDB.open('dealer-software');

// Get all clients
const tx = db.transaction('clients', 'readonly');
const store = tx.objectStore('clients');
const clients = await store.getAll();
console.log('All clients:', clients);

// Get all vehicles
const tx2 = db.transaction('vehicles', 'readonly');
const store2 = tx2.objectStore('vehicles');
const vehicles = await store2.getAll();
console.log('All vehicles:', vehicles);

// Get all deals
const tx3 = db.transaction('deals', 'readonly');
const store3 = tx3.objectStore('deals');
const deals = await store3.getAll();
console.log('All deals:', deals);
```

### Method 3: Export Data as JSON

To export all data as JSON, you can run this in the console:

```javascript
async function exportAllData() {
  const db = await indexedDB.open('dealer-software');
  
  const clients = await db.transaction('clients', 'readonly').objectStore('clients').getAll();
  const vehicles = await db.transaction('vehicles', 'readonly').objectStore('vehicles').getAll();
  const deals = await db.transaction('deals', 'readonly').objectStore('deals').getAll();
  const documents = await db.transaction('documents', 'readonly').objectStore('documents').getAll();
  
  const allData = {
    clients,
    vehicles,
    deals,
    documents,
    exportedAt: new Date().toISOString()
  };
  
  // Download as JSON file
  const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dealer-data-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  
  console.log('Data exported!', allData);
  return allData;
}

// Run the export
exportAllData();
```

## Database Location

The IndexedDB data is stored in your browser's profile directory:

- **Chrome/Edge (Windows)**: `%LOCALAPPDATA%\Google\Chrome\User Data\Default\IndexedDB\`
- **Chrome/Edge (Mac)**: `~/Library/Application Support/Google/Chrome/Default/IndexedDB/`
- **Firefox (Windows)**: `%APPDATA%\Mozilla\Firefox\Profiles\<profile>\storage\default\`
- **Firefox (Mac)**: `~/Library/Application Support/Firefox/Profiles/<profile>/storage/default/`
- **Electron App**: Similar to Chrome, in the app's user data directory

## Important Notes

- **IndexedDB is NOT SQLite**: It's a NoSQL database that stores JavaScript objects
- **Data is browser-specific**: Each browser has its own IndexedDB storage
- **Data persists**: IndexedDB data persists even after closing the app
- **Clear data**: You can clear IndexedDB data from DevTools → Application → Clear storage

## Troubleshooting

If you can't see the database:
1. Make sure the app has been run at least once (database is created on first use)
2. Refresh the DevTools Application tab
3. Check if you're looking at the correct browser/Electron instance

