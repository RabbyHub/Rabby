import {
  disableExtraFeeProtection,
  enableExtraFeeProtection,
} from '@/background/controller/walletUtils/extraFeeProtection';

const setPreferencePartials = jest.fn();

jest.mock('background/service', () => ({
  preferenceService: {
    setPreferencePartials: (v: unknown) => setPreferencePartials(v),
  },
}));

beforeEach(() => {
  setPreferencePartials.mockReset();
});

it('turns protection off without password', () => {
  disableExtraFeeProtection();
  expect(setPreferencePartials).toHaveBeenCalledWith({
    isExtraFeeProtectionEnabled: false,
  });
});

it('turns protection on without password', () => {
  enableExtraFeeProtection();
  expect(setPreferencePartials).toHaveBeenCalledWith({
    isExtraFeeProtectionEnabled: true,
  });
});
