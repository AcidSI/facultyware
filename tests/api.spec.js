const { test, expect } = require('@playwright/test');

test.describe('Pengujian API Mahasiswa (JSON)', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.locator('input[name="username"]').fill('nurha@student.ac.id');
    await page.locator('input[name="password"]').fill('password');
    await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Masuk")').first().click();
    await expect(page.locator('text=Logout').first()).toBeVisible({ timeout: 20000 });
  });

  test('Fitur API 1: Memastikan endpoint List mengembalikan JSON yang valid', async ({ page }) => {
    const response = await page.request.get('http://localhost:3000/api/requests');
    expect(response.status()).toBe(200);
    
    const jsonBody = await response.json();
    expect(jsonBody.status).toBe('success');
    expect(jsonBody.meta).toBeDefined();
    expect(Array.isArray(jsonBody.data)).toBeTruthy();
  });

  test('Fitur API 2: Memastikan endpoint Detail mengembalikan data sesuai ID', async ({ page }) => {
    const listResponse = await page.request.get('http://localhost:3000/api/requests');
    const listJson = await listResponse.json();
    
    if (listJson.data && listJson.data.length > 0) {
      const targetId = listJson.data[0].id; 
      const detailResponse = await page.request.get(`http://localhost:3000/api/requests/${targetId}`);
      expect(detailResponse.status()).toBe(200);
      
      const detailJson = await detailResponse.json();
      expect(detailJson.status).toBe('success');
      expect(detailJson.data.id).toBe(targetId);
    }
  });

});