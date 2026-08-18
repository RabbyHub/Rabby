import type { ContactBookItem } from '@/background/service/contactBook';
import {
  getDefaultContactBookState,
  selectAllAddrs,
  selectAllAliasAddrs,
  selectAllContacts,
  useContactBookStore,
} from '@/ui/state/contactBook';
import { wallet } from '@/ui/wallet';

jest.mock('@/ui/wallet', () => ({
  wallet: {
    getContactsByMap: jest.fn(),
  },
}));

const contact = (
  partial: Partial<ContactBookItem> & Pick<ContactBookItem, 'address'>
): ContactBookItem => ({
  name: 'Contact',
  isAlias: false,
  isContact: false,
  ...partial,
});

describe('contact book store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useContactBookStore.setState(getDefaultContactBookState());
  });

  test('loads contacts and normalizes item addresses', async () => {
    (wallet.getContactsByMap as jest.Mock).mockResolvedValue({
      '0xabc': contact({
        address: '0xAbC',
        name: 'Alice',
        isAlias: true,
        isContact: true,
      }),
    });

    const result = await useContactBookStore
      .getState()
      .getContactBookAsync();

    expect(result['0xabc']).toMatchObject({
      address: '0xabc',
      name: 'Alice',
    });
    expect(useContactBookStore.getState().contactsByAddr).toEqual(result);
  });

  test('derives all addresses, aliases, and contacts', () => {
    useContactBookStore.setState({
      contactsByAddr: {
        '0xalias': contact({ address: '0xalias', isAlias: true }),
        '0xcontact': contact({ address: '0xcontact', isContact: true }),
        '0xboth': contact({
          address: '0xboth',
          isAlias: true,
          isContact: true,
        }),
      },
    });

    const state = useContactBookStore.getState();
    expect(selectAllAddrs(state)).toHaveLength(3);
    expect(selectAllAliasAddrs(state).map((item) => item.address)).toEqual([
      '0xalias',
      '0xboth',
    ]);
    expect(selectAllContacts(state).map((item) => item.address)).toEqual([
      '0xcontact',
      '0xboth',
    ]);
  });
});
