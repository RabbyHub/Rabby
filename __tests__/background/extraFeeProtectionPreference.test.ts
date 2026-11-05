import {
  disableExtraFeeProtection,
  enableExtraFeeProtection,
} from '@/background/controller/walletUtils/extraFeeProtection';

const verifyPassword = jest.fn();
const setPreferencePartials = jest.fn();

jest.mock('background/service', () => ({
  keyringService: { verifyPassword: (p: string) => verifyPassword(p) },
  preferenceService: {
    setPreferencePartials: (v: unknown) => setPreferencePartials(v),
  },
}));

beforeEach(() => {
  verifyPassword.mockReset();
  setPreferencePartials.mockReset();
});

it('keeps protection on when password is wrong', async () => {
  verifyPassword.mockRejectedValue(new Error('incorrect password'));
  await expect(disableExtraFeeProtection('wrong')).rejects.toThrow(
    'incorrect password'
  );
  expect(setPreferencePartials).not.toHaveBeenCalled();
});

it('turns protection off after password check', async () => {
  verifyPassword.mockResolvedValue(undefined);
  await disableExtraFeeProtection('right');
  expect(verifyPassword).toHaveBeenCalledWith('right');
  expect(setPreferencePartials).toHaveBeenCalledWith({
    isExtraFeeProtectionEnabled: false,
  });
});

it('turns protection on without password', () => {
  enableExtraFeeProtection();
  expect(verifyPassword).not.toHaveBeenCalled();
  expect(setPreferencePartials).toHaveBeenCalledWith({
    isExtraFeeProtectionEnabled: true,
  });
});
