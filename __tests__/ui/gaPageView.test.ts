/**
 * @jest-environment jsdom
 */
import browser from 'webextension-polyfill';
import { ga4 } from '@/utils/ga4';
import { resetUserDataTrackingCache } from '@/utils/user-data-tracking';
import { getPageViewPath } from '@/ui/utils/ga-event';

const ADDRESS = '0x5853ed4f26a3fcea565b3fbc698bb19cdf6deb85';

describe('GA page_view', () => {
  const fetchMock = jest.fn();

  beforeEach(async () => {
    resetUserDataTrackingCache();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({});
    global.fetch = (fetchMock as unknown) as typeof fetch;
    await browser.storage.local.set({
      clientId: 'test-client-id',
      preference: { userDataTrackingOptOut: false },
    });
  });

  test('keeps the route path and drops the query', () => {
    expect(
      getPageViewPath(
        `#/settings/address-detail?address=${ADDRESS}&type=HD%20Key%20Tree&brandName=Ledger`
      )
    ).toBe('/settings/address-detail');
    expect(
      getPageViewPath(`#/new-user/backup-seed-phrase?address=${ADDRESS}`)
    ).toBe('/new-user/backup-seed-phrase');
    expect(getPageViewPath('#/perps/single-coin/ETH')).toBe(
      '/perps/single-coin/ETH'
    );
    expect(getPageViewPath('')).toBe('');
  });

  test('does not send the account in page_location', async () => {
    await ga4.firePageViewEvent({
      pageLocation: getPageViewPath(
        `#/settings/address-detail?address=${ADDRESS}&brandName=Ledger`
      ),
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = fetchMock.mock.calls[0][1].body as string;
    const [event] = JSON.parse(body).events;
    expect(event.name).toBe('page_view');
    expect(event.params.page_location).toBe('/settings/address-detail');
    expect(body).not.toContain(ADDRESS);
    expect(body).not.toContain('Ledger');
  });
});
