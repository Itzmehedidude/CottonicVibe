# StockFlow — GitHub Pages

Professional offline-first inventory and sales web app.

## Deploy to GitHub Pages

1. Create a GitHub repository.
2. Upload **all files in this folder** to the repository root.
3. In GitHub open **Settings → Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**.
5. Select your main branch and `/ (root)`.
6. Save.
7. Open the generated GitHub Pages URL.

No backend is required.

## Data storage

Inventory and sales are stored in the browser/device using IndexedDB.

GitHub Pages only hosts the application files. It does **not** store your inventory.

The app can continue working offline after it has been opened and cached once.

## Backup

Use **Settings → Export Backup** regularly. Browser site data can be cleared by the user or browser.

## Important for multiple devices

Each device/browser has its own local database. Changes made on one phone will not automatically appear on another device.

Cloud synchronization can be added later if needed.
