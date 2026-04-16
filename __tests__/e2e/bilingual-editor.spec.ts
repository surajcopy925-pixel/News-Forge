import { test, expect } from '@playwright/test';

test.describe('Bilingual Script Editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/editor-hub');
    await page.click('[data-testid="copy-editor-tab"]');
  });

  test('renders Kannada text correctly', async ({ page }) => {
    const editor = page.locator('[data-testid="polished-script-editor"]');

    await editor.fill('ಬೆಂಗಳೂರಿನಲ್ಲಿ ಇಂದು ಭಾರೀ ಮಳೆ ಸುರಿಯಿತು');

    // Verify the text is present and rendered
    await expect(editor).toHaveValue('ಬೆಂಗಳೂರಿನಲ್ಲಿ ಇಂದು ಭಾರೀ ಮಳೆ ಸುರಿಯಿತು');

    // Check font is applied (Noto Sans Kannada)
    const fontFamily = await editor.evaluate(
      (el) => window.getComputedStyle(el).fontFamily
    );
    expect(fontFamily).toContain('Noto Sans Kannada');
  });

  test('handles mixed Kannada-English content', async ({ page }) => {
    const editor = page.locator('[data-testid="polished-script-editor"]');

    const mixedContent =
      'ಪ್ರಧಾನಿ Modi ಅವರು Washington DC ಗೆ ಭೇಟಿ ನೀಡಿದ್ದಾರೆ';
    await editor.fill(mixedContent);

    await expect(editor).toHaveValue(mixedContent);
  });
});
