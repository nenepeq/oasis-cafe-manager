/**
 * Utilidad de Base de Datos Local (Offline) utilizando IndexedDB nativo.
 * Permite guardar ventas y gastos cuando no hay conexión a internet.
 */

const DB_NAME = 'OasisOfflineDB';
const DB_VERSION = 2;

export const openDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('pending_sales')) {
                db.createObjectStore('pending_sales', { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains('pending_expenses')) {
                db.createObjectStore('pending_expenses', { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains('pending_purchases')) {
                db.createObjectStore('pending_purchases', { keyPath: 'id', autoIncrement: true });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const savePendingSale = async (saleData) => {
    const db = await openDB();
    const tx = db.transaction('pending_sales', 'readwrite');
    const store = tx.objectStore('pending_sales');
    // Usar timestamp pasado desde App.jsx con zona horaria correcta, o fallback a UTC
    store.add({ ...saleData, timestamp: saleData.timestamp || new Date().toISOString() });
    return new Promise((resolve) => {
        tx.oncomplete = () => resolve();
    });
};

export const savePendingExpense = async (expenseData) => {
    const db = await openDB();
    const tx = db.transaction('pending_expenses', 'readwrite');
    const store = tx.objectStore('pending_expenses');
    // Usar timestamp pasado desde App.jsx con zona horaria correcta, o fallback a UTC
    store.add({ ...expenseData, timestamp: expenseData.timestamp || new Date().toISOString() });
    return new Promise((resolve) => {
        tx.oncomplete = () => resolve();
    });
};

export const savePendingPurchase = async (purchaseData) => {
    const db = await openDB();
    const tx = db.transaction('pending_purchases', 'readwrite');
    const store = tx.objectStore('pending_purchases');
    // Usar timestamp pasado desde App.jsx con zona horaria correcta, o fallback a UTC
    store.add({ ...purchaseData, timestamp: purchaseData.timestamp || new Date().toISOString() });
    return new Promise((resolve) => {
        tx.oncomplete = () => resolve();
    });
};

export const getAllPendingItems = async () => {
    const db = await openDB();
    const getStoreItems = (storeName) => {
        return new Promise((resolve) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
        });
    };

    const sales = await getStoreItems('pending_sales');
    const expenses = await getStoreItems('pending_expenses');
    const purchases = await getStoreItems('pending_purchases');

    return { sales, expenses, purchases };
};

export const clearPendingItem = async (storeName, id) => {
    const db = await openDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.delete(id);
    return new Promise((resolve) => {
        tx.oncomplete = () => resolve();
    });
};
