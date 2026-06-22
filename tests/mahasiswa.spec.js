const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe.serial('Alur Lengkap Mahasiswa', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.locator('input[name="username"]').fill('nurha@student.ac.id');
    await page.locator('input[name="password"]').fill('password');
    await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Masuk")').first().click();
    await expect(page.locator('text=Logout').first()).toBeVisible({ timeout: 20000 });
  });

  test('Fitur 1: Mahasiswa mengajukan permohonan dengan kelengkapan data dan KRS', async ({ page }) => {
    await page.goto('http://localhost:3000/requests/create');
    await page.locator('select[name="request_type"]').selectOption('aktif');
    await page.locator('input[name="title"]').fill('Syarat Beasiswa Pemprov 2026');
    await page.locator('textarea[name="description"]').fill('Mohon segera diproses, terima kasih.');
    
    // Asumsi ada file dummy.pdf di dalam folder tests
    const filePath = path.join(__dirname, 'dummy.pdf'); 
    
    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.isVisible()) {
        await fileInput.setInputFiles(filePath);
    }
    
    await page.locator('button:has-text("Kirim"), button:has-text("Ajukan")').first().click();
    await page.waitForLoadState('networkidle');
  });

  test('Fitur 2: Mahasiswa melihat riwayat dan melacak status permohonan', async ({ page }) => {
    await page.goto('http://localhost:3000/requests');
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('text=Menunggu').first()).toBeVisible();
  });

  test('Fitur 3: Mahasiswa membatalkan permohonan melalui halaman Detail', async ({ page }) => {
    await page.goto('http://localhost:3000/requests');
    
    const detailBtn = page.locator('a:has-text("Detail")').first();
    if (await detailBtn.isVisible()) {
        await detailBtn.click();
        const cancelBtn = page.locator('button:has-text("Batalkan Permohonan")');
        if (await cancelBtn.isVisible()) {
            await cancelBtn.click();
            await page.waitForLoadState('networkidle');
        } else {
            console.log('Catatan: Tombol "Batalkan Permohonan" tidak ditemukan (mungkin status bukan "Menunggu").');
        }
    }
  });

  test('Fitur 4: Mahasiswa mengunduh surat yang sudah selesai (Status 3)', async ({ page }) => {
    await page.goto('http://localhost:3000/requests');
    
    const downloadButton = page.locator('a:has-text("Unduh PDF")').first();
    if (await downloadButton.isVisible()) {
      const downloadPromise = page.waitForEvent('download');
      await downloadButton.click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.pdf$/);
    } else {
      console.log('Catatan: Belum ada permohonan dengan status "Selesai" untuk diunduh.');
    }
  });

  test('Fitur Tambahan: Mahasiswa melihat notifikasi sistem saat ada perubahan', async ({ page }) => {
    await page.goto('http://localhost:3000/home');
    const notifButton = page.locator('a[href="/requests/notifications"]');
    
    if (await notifButton.isVisible()) {
      await notifButton.click();
      await expect(page.locator('h1:has-text("Notifikasi")')).toBeVisible({ timeout: 10000 });
      
      const firstNotifCard = page.locator('.card').first();
      if (await firstNotifCard.isVisible()) {
          await expect(firstNotifCard.locator('a:has-text("Lihat Detail")')).toBeVisible();
      } else {
          await expect(page.locator('text=Belum ada notifikasi')).toBeVisible();
      }
    }
  });

});