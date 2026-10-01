// IndexedDB stores media without the small quota of localStorage.
window.PortfolioStorage = (() => {
  const database = new Promise((resolve, reject) => {
    if (!window.indexedDB) return reject(new Error('Browser storage is unavailable.'));
    const request = indexedDB.open('portfolio-nest', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('drafts');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Close other Portfolio Nest tabs and try again.'));
  });
  async function read() {
    const db = await database;
    return new Promise((resolve, reject) => {
      const request = db.transaction('drafts').objectStore('drafts').get('current');
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }
  async function write(data) {
    const db = await database;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('drafts', 'readwrite');
      transaction.objectStore('drafts').put(data, 'current');
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error('Draft was not saved.'));
    });
  }
  return { read, write };
})();
