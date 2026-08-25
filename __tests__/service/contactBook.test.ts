import contactBookService from '@/background/service/contactBook';
import { createPersistStore, patchPersistStore } from 'background/utils';

jest.mock('background/utils', () => ({
  createPersistStore: jest.fn(async ({ template }) => ({ ...template })),
  isSameAddress: (a: string, b: string) => a.toLowerCase() === b.toLowerCase(),
  patchPersistStore: jest.fn((store, partials) => {
    Object.assign(store, partials);
  }),
}));

jest.mock('@/background/service', () => ({
  keyringService: {
    getAllVisibleAccountsArray: jest.fn(),
  },
  openapiService: {
    addrDesc: jest.fn(),
  },
  whitelistService: {
    getWhitelist: jest.fn(),
    isWhitelistEnabled: jest.fn(),
  },
}));

const alias = {
  name: 'Alice',
  address: '0xabc',
  isAlias: true,
  isContact: false,
};

describe('contact book service store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    contactBookService.store = {};
  });

  test('initializes the persisted store with a validating schema', async () => {
    await contactBookService.init();

    const options = (createPersistStore as jest.Mock).mock.calls[0][0];
    expect(options).toMatchObject({ name: 'contactBook', template: {} });
    expect(options.schema.safeParse({ '0xabc': alias }).success).toBe(true);
    expect(options.schema.safeParse({ '0xabc': { name: 'Alice' } }).success).toBe(
      false
    );
  });

  test('routes generic patches through the validated persistence helper', () => {
    contactBookService.patchStore({ '0xabc': alias });

    expect(patchPersistStore).toHaveBeenCalledWith(contactBookService.store, {
      '0xabc': alias,
    });
  });

  test('broadcasts alias removal as an undefined address patch', () => {
    contactBookService.store = { '0xabc': alias };

    contactBookService.removeAlias('0xAbC');

    expect(patchPersistStore).toHaveBeenCalledWith(contactBookService.store, {
      '0xabc': undefined,
    });
    expect(contactBookService.store['0xabc']).toBeUndefined();
  });

  test('keeps a contact while removing only its alias flag', () => {
    contactBookService.store = {
      '0xabc': { ...alias, isContact: true },
    };

    contactBookService.removeAlias('0xabc');

    expect(contactBookService.store['0xabc']).toMatchObject({
      isAlias: false,
      isContact: true,
    });
    expect(patchPersistStore).not.toHaveBeenCalled();
  });
});
