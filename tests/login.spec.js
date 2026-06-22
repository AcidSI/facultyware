const { test, expect } = require('@playwright/test');

test.describe('Pengujian Fitur Login', () => {

  test('berhasil login sebagai Mahasiswa', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.locator('input[name="username"]').fill('nurha@student.ac.id');
    await page.locator('input[name="password"]').fill('password');
    // Klik eksplisit (Mencari tombol submit, atau tombol bertuliskan Login/Masuk)
    await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Masuk")').first().click();
    
    await expect(page.locator('text=Logout').first()).toBeVisible({ timeout: 20000 });
  });

  test('berhasil login sebagai Admin', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.locator('input[name="username"]').fill('admin@facultyware.ac.id');
    await page.locator('input[name="password"]').fill('password');
    await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Masuk")').first().click();

    await expect(page.locator('h1:has-text("Verifikasi Permohonan")')).toBeVisible({ timeout: 20000 });
  });

  test('berhasil login sebagai Dekan', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.locator('input[name="username"]').fill('dekan@facultyware.ac.id');
    await page.locator('input[name="password"]').fill('password');
    await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Masuk")').first().click();

    await expect(page.locator('h1:has-text("Antrean Tanda Tangan")')).toBeVisible({ timeout: 20000 });
  });

});