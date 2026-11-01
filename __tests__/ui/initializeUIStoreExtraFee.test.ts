import { initializeUIStore } from '@/ui/state/initializeUIStore';

let onPreferenceChanged: (payload: any) => void = () => undefined;
const setField = jest.fn();

jest.mock('@/i18n', () => ({ changeLanguage: jest.fn() }));
jest.mock('@/ui/utils/broadcastToUI', () => ({
  onBackgroundStoreChanged: (_: string, cb: (payload: any) => void) => {
    onPreferenceChanged = cb;
  },
}));
jest.mock('@/ui/state/preference', () => ({
  preferenceActions: { setField: (v: unknown) => setField(v) },
}));

it('syncs extra fee protection toggle to already-open windows', () => {
  initializeUIStore();
  onPreferenceChanged({
    changedKey: 'isExtraFeeProtectionEnabled',
    partials: { isExtraFeeProtectionEnabled: true },
  });
  expect(setField).toHaveBeenCalledWith({ isExtraFeeProtectionEnabled: true });
});
