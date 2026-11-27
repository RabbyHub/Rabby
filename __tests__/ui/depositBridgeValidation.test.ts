import { ethers } from 'ethers';
import * as Sentry from '@sentry/browser';
import {
  getBridgeRouter,
  InvalidBridgeCalldataError,
  InvalidBridgeContractError,
} from '@rabby-wallet/rabby-bridge';
import type { Account } from '@/background/service/preference';
import { GAS_ACCOUNT_BRIDGE_COLLECTION_ADDRESS } from '@/constant/gas-account';
import type { WalletControllerType } from '@/ui/utils/WalletContext';
import { validateDepositQuote } from '@/utils/deposit-bridge';
import {
  buildGasAccountBridgeTxs,
  fetchGasAccountBridgeQuote,
  getGasAccountBridgeRawAmount,
} from '@/ui/views/GasAccount/components/depositUtils';
import relay from '../fixtures/perps-deposit-relay.json';

jest.mock('@sentry/browser', () => ({ captureEvent: jest.fn() }));
jest.mock('@/ui/utils', () => ({
  isSameAddress: (a: string, b: string) => a.toLowerCase() === b.toLowerCase(),
}));
jest.mock('@/utils/chain', () => ({
  findChain: () => ({ id: 42161, serverId: 'arb', nativeTokenAddress: 'arb' }),
  findChainByServerID: () => ({
    id: 42161,
    serverId: 'arb',
    nativeTokenAddress: 'arb',
  }),
}));

const account = { address: relay.tx.from } as Account;
const token = { id: relay.fromTokenId, chain: 'arb', decimals: 6, price: 1 };
const openapi = {
  getGasAccountBridgeQuote: jest.fn(),
};
const requestETHRpc = jest.fn();
const approveToken = jest.fn();
const wallet = ({
  openapi,
  requestETHRpc,
  approveToken,
} as unknown) as WalletControllerType;

const perpsRequest = (fromTokenRawAmount = '10000000') => ({
  user_addr: account.address,
  from_chain_id: token.chain,
  from_token_id: token.id,
  from_token_raw_amount: fromTokenRawAmount,
});

// Real Relay HyperCore order from rabby-bridge's providers/relay/hypercore fixture.
const relayTx = { ...relay.tx, gasLimit: '0x0', gasPrice: '0x0' };
const relayQuote = {
  bridge_id: 'relay',
  approve_contract_id: relay.tx.to,
  to_token_raw_amount: relay.toTokenRawAmount,
  to_token_amount: 10,
  tx: { ...relayTx, order_data: relay.order_data },
};

const acrossQuote = (receiver: string, fromToken = token) => {
  const router = getBridgeRouter('across', fromToken.chain)!;
  const abi = new ethers.utils.Interface([
    'function depositV3(address,address,address,address,uint256,uint256,uint256,address,uint32,uint32,uint32,bytes)',
  ]);
  const message = ethers.utils.hexConcat([
    '0x00',
    ethers.utils.defaultAbiCoder.encode(['address', 'uint256'], [receiver, 0]),
  ]);
  return {
    bridge_id: 'across',
    approve_contract_id: router,
    to_token_raw_amount_hex_str: '0x3b4e9380',
    to_token_amount: 9.95,
    tx: {
      from: account.address,
      to: router,
      chainId: fromToken.chain === 'eth' ? 1 : 42161,
      value: '0x0',
      gasLimit: '0x0',
      gasPrice: '0x0',
      data: abi.encodeFunctionData('depositV3', [
        account.address,
        '0xbfb53e9c8acce6d6ac54885a8e33a7aec95427d5',
        fromToken.id,
        '0xb8ce59fc3717ada4c02eadf9682a9e934f625ebb',
        10_000_000,
        9_950_000,
        999,
        ethers.constants.AddressZero,
        1794499200,
        1794501000,
        0,
        message,
      ]),
    },
  };
};

describe('deposit bridge validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requestETHRpc.mockResolvedValue(ethers.constants.HashZero);
    approveToken.mockResolvedValue({ params: [{ to: token.id }] });
  });

  it('accepts a valid Relay Perps deposit quote', () => {
    const result = validateDepositQuote(
      relayQuote,
      perpsRequest(),
      'perps_deposit'
    );
    expect(result.pass).toBe(true);
    expect(Sentry.captureEvent).not.toHaveBeenCalled();
  });

  it.each([
    ['missing Relay order', { ...relayQuote, tx: relayTx }, '10000000'],
    ['input amount above the requested limit', relayQuote, '9000000'],
    [
      'wrong Perps recipient',
      acrossQuote(GAS_ACCOUNT_BRIDGE_COLLECTION_ADDRESS),
      '10000000',
    ],
  ] as const)(
    'rejects Perps quote with %s and tags Sentry as perps_deposit',
    (_, quote, rawAmount) => {
      expect(() =>
        validateDepositQuote(quote, perpsRequest(rawAmount), 'perps_deposit')
      ).toThrow(InvalidBridgeCalldataError);
      expect(Sentry.captureEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: expect.objectContaining({ bridge_source: 'perps_deposit' }),
        }),
        expect.anything()
      );
    }
  );

  it('rejects a Gas Account quote to the user instead of the collection address', async () => {
    openapi.getGasAccountBridgeQuote.mockResolvedValue(
      acrossQuote(account.address)
    );
    await expect(
      fetchGasAccountBridgeQuote({ wallet, account, token, usdValue: 10 })
    ).rejects.toThrow(InvalidBridgeCalldataError);
    expect(Sentry.captureEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: expect.objectContaining({ bridge_source: 'gas_account_deposit' }),
      }),
      expect.anything()
    );
  });

  it('checks the Gas Account spender again at build time before allowance or approval', async () => {
    openapi.getGasAccountBridgeQuote.mockResolvedValue(
      acrossQuote(GAS_ACCOUNT_BRIDGE_COLLECTION_ADDRESS)
    );
    const rawAmount = getGasAccountBridgeRawAmount({ token, usdValue: 10 });
    const quote = await fetchGasAccountBridgeQuote({
      wallet,
      account,
      token,
      usdValue: 10,
      fromTokenRawAmount: rawAmount,
    });
    await expect(
      buildGasAccountBridgeTxs({
        wallet,
        account,
        token,
        usdValue: 10,
        fromTokenRawAmount: rawAmount,
        quote: { ...quote, approve_contract_id: account.address },
      })
    ).rejects.toThrow(InvalidBridgeContractError);
    expect(requestETHRpc).not.toHaveBeenCalled();
    expect(approveToken).not.toHaveBeenCalled();
  });

  it('uses the quoted rawAmount even when the token price changes before confirmation', async () => {
    openapi.getGasAccountBridgeQuote.mockResolvedValue(
      acrossQuote(GAS_ACCOUNT_BRIDGE_COLLECTION_ADDRESS)
    );
    const rawAmount = getGasAccountBridgeRawAmount({ token, usdValue: 10 });
    const quote = await fetchGasAccountBridgeQuote({
      wallet,
      account,
      token,
      usdValue: 10,
      fromTokenRawAmount: rawAmount,
    });
    expect(openapi.getGasAccountBridgeQuote).toHaveBeenCalledWith(
      expect.objectContaining({ from_token_raw_amount: rawAmount })
    );
    const refreshedToken = { ...token, price: 1.1 };
    const txs = await buildGasAccountBridgeTxs({
      wallet,
      token: refreshedToken,
      account,
      quote,
      usdValue: 10,
      fromTokenRawAmount: rawAmount,
    });
    expect(txs).toHaveLength(2);
    expect(approveToken.mock.calls[0].slice(0, 4)).toEqual([
      token.chain,
      token.id,
      quote.approve_contract_id,
      '10000000',
    ]);
    expect(Sentry.captureEvent).not.toHaveBeenCalled();
  });
});
