import { test, expect } from '@playwright/test';

test.describe('Clip Lifecycle Management', () => {
  test('full clip lifecycle: PENDING → AVAILABLE → IN_PROGRESS → COMPLETED',
    async ({ page }) => {
      // 1. Create story with clip via Input
      await page.goto('/input');
      await page.fill('[data-testid="story-title"]', 'Clip Lifecycle Test');
      await page.fill('[data-testid="story-slug"]', 'clip-lifecycle');
      await page.selectOption('[data-testid="story-format"]', 'PKG');
      await page.fill('[data-testid="raw-script"]', 'Script text');
      await page.click('[data-testid="create-story-btn"]');

      // 2. Output marks as AVAILABLE
      await page.goto('/output');
      await page.click('text=Clip Lifecycle Test');
      await page.click('[data-testid="mark-available-btn"]');

      // 3. Editor claims clip
      await page.goto('/editor-hub');
      await page.click('[data-testid="video-editor-tab"]');

      const claimBtn = page.locator('[data-testid="claim-btn"]').first();
      await claimBtn.click();
      
      // 4. Editor completes
      const completeBtn = page.locator('[data-testid="complete-btn"]').first();
      await completeBtn.click();
    }
  );
});
