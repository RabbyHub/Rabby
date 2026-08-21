describe('WebExtension API test doubles', () => {
  it('provides the MV3 manifest and isolated promise-based storage', async () => {
    const browser = (globalThis as any).browser;
    expect(browser.runtime.getManifest().manifest_version).toBe(3);

    await browser.storage.local.set({ sample: 'value' });
    await expect(browser.storage.local.get('sample')).resolves.toEqual({
      sample: 'value',
    });

    await browser.storage.local.clear();
    await expect(browser.storage.local.get(null)).resolves.toEqual({});
    await expect(browser.storage.local.get('missing')).resolves.toEqual({});
    await expect(browser.storage.local.get(['missing'])).resolves.toEqual({});
  });
});
