import { isAddress } from 'viem';
import { ProviderRequest } from '../controller/provider/type';

export function assertProviderRequest(
  args: ProviderRequest
): asserts args is Omit<ProviderRequest, 'session' | 'account'> & {
  session: NonNullable<ProviderRequest['session']>;
  account: NonNullable<ProviderRequest['account']>;
} & Record<string, any> {
  const { session, account } = args;
  if (!session) {
    throw new Error('Invalid session');
  }
  if (!account) {
    throw new Error('Account is undefined or null');
  }
  if (!isAddress(account.address)) {
    throw new Error(`Invalid address: ${account.address}`);
  }
}
