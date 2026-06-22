const { test, expect } = require('@playwright/test');

test.describe('Pengujian API Admin (JSON)', () => {

  // Contoh perbaikan untuk admin.spec.js atau file lainnya
test.beforeEach(async ({ page }) => {
  await page.goto('http://localhost:3000/login');
  await page.locator('input[name="username"]').fill('admin@facultyware.ac.id');
  await page.locator('input[name="password"]').fill('password');
  
  // Klik tombol dan tunggu navigasi selesai
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }), // Memastikan semua aset dimuat
    page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Masuk")').click()
  ]);

  // JURUS TERAKHIR: Menunggu elemen spesifik muncul dengan status 'visible'
  const title = page.locator('h1:has-text("Verifikasi Permohonan")');
  await title.waitFor({ state: 'visible', timeout: 30000 }); // Tunggu hingga 30 detik
});

  test('Fitur API Admin: Mengambil JSON data permohonan menggunakan parameter format=json', async ({ page }) => {
    const response = await page.request.get('http://localhost:3000/admin/requests?format=json');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');
    
    const jsonBody = await response.json();
    expect(jsonBody).toBeDefined();
  });

});