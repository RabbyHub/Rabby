import type { TokenItem } from '@/background/service/openapi';
import {
  getDefaultTokenDetailState,
  useSignStore,
} from '@/ui/state/sign';

describe('sign store', () => {
  beforeEach(() => {
    useSignStore.setState({
      tokenDetail: getDefaultTokenDetailState(),
    });
  });

  test('uses the existing token detail defaults', () => {
    expect(useSignStore.getState().tokenDetail).toEqual({
      selectToken: null,
      popupVisible: false,
    });
  });

  test('opens token detail with a display-only token copy', () => {
    const token = ({
      id: '0xtoken',
      chain: 'eth',
      symbol: 'TKN',
      amount: 42,
    } as unknown) as TokenItem;

    useSignStore.getState().openTokenDetailPopup(token);

    const { tokenDetail } = useSignStore.getState();
    expect(tokenDetail.popupVisible).toBe(true);
    expect(tokenDetail.selectToken).not.toBe(token);
    expect(tokenDetail.selectToken).toMatchObject({
      id: '0xtoken',
      chain: 'eth',
      symbol: 'TKN',
      amount: undefined,
    });
    expect(token.amount).toBe(42);
  });

  test('clears token detail when closing the popup', () => {
    const token = ({ id: '0xtoken', amount: 42 } as unknown) as TokenItem;

    useSignStore.getState().openTokenDetailPopup(token);
    useSignStore.getState().closeTokenDetailPopup();

    expect(useSignStore.getState().tokenDetail).toEqual({
      selectToken: null,
      popupVisible: false,
    });
  });
});
