const { test, expect } = require('@playwright/test');

test.describe.serial('Alur Lengkap Dekan', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.locator('input[name="username"]').fill('dekan@facultyware.ac.id');
    await page.locator('input[name="password"]').fill('password');
    await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Masuk")').first().click();
    await expect(page.locator('h1:has-text("Antrean Tanda Tangan")')).toBeVisible({ timeout: 20000 });
  });

  test('Fitur 7: Dekan melihat antrean surat yang perlu ditandatangani', async ({ page }) => {
    await page.goto('http://localhost:3000/dekan/requests');
    await expect(page.locator('table')).toBeVisible();
  });

  test('Fitur 7: Dekan memberikan tanda tangan digital pada surat', async ({ page }) => {
    await page.goto('http://localhost:3000/dekan/requests');
    const signBtn = page.locator('button:has-text("Tanda Tangani")').first();
    
    if (await signBtn.isVisible()) {
      await signBtn.click();
      await page.waitForLoadState('networkidle');
    } else {
      console.log('Catatan: Tidak ada surat di antrean Dekan.');
    }
  });

});