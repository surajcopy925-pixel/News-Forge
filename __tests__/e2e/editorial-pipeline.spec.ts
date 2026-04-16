import { test, expect } from '@playwright/test';

test.describe('Complete Editorial Pipeline', () => {
  test.beforeEach(async ({ page }) => {
    // Seed fresh data via API
    try {
      await fetch('http://localhost:3000/api/test/reset', { method: 'POST' });
    } catch (e) {
      console.warn('API Reset failed - check if server is running');
    }
    await page.goto('/');
  });

  test('Step 1: Create story in Input tab', async ({ page }) => {
    await page.click('text=Input');
    await expect(page).toHaveURL(/\/input/);

    // Fill story form
    await page.fill('[data-testid="story-title"]', 'Election Results 2026');
    await page.fill('[data-testid="story-slug"]', 'election-results-2026');
    await page.selectOption('[data-testid="story-format"]', 'PKG');
    await page.fill(
      '[data-testid="raw-script"]',
      'The election commission announced results today...'
    );

    await page.click('[data-testid="create-story-btn"]');

    // Verify story appears in list
    await expect(page.locator('[data-testid="story-list"]'))
      .toContainText('Election Results 2026');
  });

  test('Step 2: Add editorial notes in Output tab', async ({ page }) => {
    // Navigate to Output
    await page.click('text=Output');
    await expect(page).toHaveURL(/\/output/);

    // Select a story (exists from seed)
    await page.click('text=ಪರೀಕ್ಷಾ ಕಥೆ');

    // Add editorial notes
    await page.fill(
      '[data-testid="editorial-notes"]',
      'Need B-roll of parliament.'
    );
    await page.click('[data-testid="save-notes-btn"]');

    // Verify saved
    await expect(page.locator('[data-testid="editorial-notes"]'))
      .toHaveValue(/B-roll of parliament/);
  });
});
