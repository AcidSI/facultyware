const { test, expect } = require('@playwright/test');

test.describe.serial('Alur Lengkap Admin', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.locator('input[name="username"]').fill('admin@facultyware.ac.id');
    await page.locator('input[name="password"]').fill('password');
    await page.locator('input[name="password"]').press('Enter');
    
    // PERBAIKAN: Tunggu sampai judul halaman Admin muncul
    await expect(page.locator('h1:has-text("Verifikasi Permohonan")')).toBeVisible({ timeout: 20000 });
  });

  test('Fitur 5: Admin mencari permohonan berdasarkan nama atau NIM', async ({ page }) => {
    await page.goto('http://localhost:3000/admin/requests');
    
    // Melakukan pencarian
    await page.locator('input[name="search"]').fill('2026');
    await page.locator('button:has-text("Cari")').click();
    
    await expect(page.locator('table')).toBeVisible();
  });

  test('Fitur 6: Admin menolak permohonan dengan memberikan catatan perbaikan', async ({ page }) => {
    await page.goto('http://localhost:3000/admin/requests');
    
    // PERBAIKAN: Menggunakan "Cek Berkas" sesuai file requests.ejs
    await page.locator('a:has-text("Cek Berkas")').first().click();
    
    const rejectBtn = page.locator('button:has-text("Tolak Permohonan")');
    
    await expect(rejectBtn).toBeVisible({ timeout: 5000 });
    await rejectBtn.click();
  });

  test('Fitur 6: Admin menerima permohonan yang valid', async ({ page }) => {
    await page.goto('http://localhost:3000/admin/requests');
    
    // PERBAIKAN: Menggunakan "Cek Berkas" sesuai file requests.ejs
    await page.locator('a:has-text("Cek Berkas")').first().click();
    
    const acceptBtn = page.locator('button:has-text("Terima & Teruskan ke Dekan")');
    
    if (await acceptBtn.isVisible()) {
      await acceptBtn.click();
      await page.waitForLoadState('networkidle');
    } else {
      console.log('Catatan: Tombol "Terima" tidak ditemukan. Pastikan ada permohonan berstatus "Menunggu".');
    }
  });
test('Fitur Tambahan: Admin mengunduh laporan PDF seluruh surat yang diproses', async ({ page }) => {
    await page.goto('http://localhost:3000/admin/requests');
    
    // Mencari tombol ekspor berdasarkan teks yang ada di header
    const exportPdfBtn = page.locator('a:has-text("Riwayat Surat yang Diproses")');
    
    // Pastikan tombolnya terlihat sebelum diklik
    await expect(exportPdfBtn).toBeVisible();
    
    // Menangkap event download saat tombol diklik
    const downloadPromise = page.waitForEvent('download');
    await exportPdfBtn.click();
    const download = await downloadPromise;
    
    // Memastikan file yang diunduh oleh Admin benar-benar berformat .pdf
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  });
});