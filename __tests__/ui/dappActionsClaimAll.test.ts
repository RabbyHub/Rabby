import {
  BalanceChange,
  ExplainTxResponse,
  PortfolioItem,
  WithdrawAction,
} from '@rabby-wallet/rabby-api/dist/types';
import {
  getClaimAllCandidates,
  getClaimAllCandidatesKey,
  getClaimAllRewardUsdValue,
  isClaimAllPreExecValid,
  mergeBalanceChanges,
} from '../../src/ui/views/CommonPopup/AssetList/components/DappActions/claimAllUtils';
import { buildDappActionTx } from '../../src/ui/views/CommonPopup/AssetList/components/DappActions/hook';
import { encodeFunctionData, parseAbiItem, toFunctionSelector } from 'viem';

// hook.ts is a React hook module, keep the UI store out of the test
jest.mock('@/ui/hooks/backgroundState/useAccount', () => ({
  useCurrentAccount: jest.fn(),
}));
jest.mock('@/utils/chain', () => ({
  findChain: jest.fn(),
  getChainList: () => [],
  getMainnetChainList: () => [],
  ensureChainHashValid: (v: unknown) => v,
  ensureChainListValid: (v: unknown) => v,
}));
jest.mock('@/ui/utils', () => ({
  isSameAddress: (a: string, b: string) =>
    a?.toLowerCase() === b?.toLowerCase(),
  useWallet: jest.fn(),
}));
jest.mock(
  '../../src/ui/views/CommonPopup/AssetList/components/DappActions/DappActionsForPopup',
  () => ({
    ActionType: { Withdraw: 'withdraw', Claim: 'claim', Queue: 'queue' },
  })
);

const USER = '0x33ae910bec9de30cadf4b92559dfdc3f82f82630';
// Aave Umbrella RewardsController on Ethereum
const UMBRELLA_REWARDS_CONTROLLER =
  '0x4655ce3d625a63d30ba704087e52b4c31e38188b';

// Shape returned by /v1/user/complex_protocol_list for Umbrella stakes
const umbrellaClaim = (stakeToken: string, reward: string): WithdrawAction =>
  ({
    type: 'claim',
    contract_id: UMBRELLA_REWARDS_CONTROLLER,
    func: 'claimSelectedRewards(address,address[],address)(uint256[])',
    params: [stakeToken, [reward], USER],
    str_params: [stakeToken, [reward], USER],
  } as any);

const cooldown = (stakeToken: string): WithdrawAction =>
  ({
    type: 'queue',
    contract_id: stakeToken,
    func: 'cooldown()()',
    params: [],
    str_params: [],
  } as any);

const portfolio = (
  rewards: { amount: number; price: number }[] = [],
  extra: Partial<PortfolioItem> = {}
) =>
  (({
    detail: { reward_token_list: rewards },
    ...extra,
  } as unknown) as PortfolioItem);

const STK_USDC = '0x6bf183243fdd1e306ad2c4450bc7dcf6f0bf8aa6';
const STK_USDT = '0xa484ab92fe32b143aee7019fc1502b1daa522d31';
const WA_USDC = '0x98c23e9d8f34fefb1b7bd6a91b7ff122f4e16f5c';
const WA_USDT = '0x23878914efe38d27c4d67ab83ed1b93a74d4086a';

describe('getClaimAllCandidates', () => {
  it('picks one claim action per position', () => {
    const result = getClaimAllCandidates([
      {
        _originPortfolio: portfolio(),
        withdrawActions: [cooldown(STK_USDC), umbrellaClaim(STK_USDC, WA_USDC)],
      },
      {
        _originPortfolio: portfolio(),
        withdrawActions: [cooldown(STK_USDT), umbrellaClaim(STK_USDT, WA_USDT)],
      },
      { _originPortfolio: portfolio(), withdrawActions: [cooldown(STK_USDC)] },
      { _originPortfolio: portfolio() },
    ]);
    expect(result.map((r) => r.action.str_params?.[0])).toEqual([
      STK_USDC,
      STK_USDT,
    ]);
  });

  it('skips proxy positions', () => {
    const result = getClaimAllCandidates([
      {
        _originPortfolio: portfolio([], {
          proxy_detail: { proxy_contract_id: '0xproxy' } as any,
        }),
        withdrawActions: [umbrellaClaim(STK_USDC, WA_USDC)],
      },
    ]);
    expect(result).toHaveLength(0);
  });

  it('skips claims that need an approval', () => {
    const result = getClaimAllCandidates([
      {
        _originPortfolio: portfolio(),
        withdrawActions: [
          {
            ...umbrellaClaim(STK_USDC, WA_USDC),
            need_approve: { to: '0xspender', token_id: '0xtoken' },
          },
        ],
      },
    ]);
    expect(result).toHaveLength(0);
  });

  it('dedupes identical claims listed on several positions', () => {
    const result = getClaimAllCandidates([
      {
        _originPortfolio: portfolio(),
        withdrawActions: [umbrellaClaim(STK_USDC, WA_USDC)],
      },
      {
        _originPortfolio: portfolio(),
        withdrawActions: [
          {
            ...umbrellaClaim(
              STK_USDC.toUpperCase().replace('0X', '0x'),
              WA_USDC
            ),
          },
        ],
      },
    ]);
    expect(result).toHaveLength(1);
  });
});

describe('getClaimAllCandidatesKey', () => {
  const build = (amount: number) =>
    getClaimAllCandidates([
      {
        _originPortfolio: portfolio([{ amount, price: 1 }]),
        withdrawActions: [umbrellaClaim(STK_USDC, WA_USDC)],
      },
      {
        _originPortfolio: portfolio([{ amount: 1, price: 1 }]),
        withdrawActions: [umbrellaClaim(STK_USDT, WA_USDT)],
      },
    ]);

  it('is stable across refreshes returning the same positions', () => {
    expect(getClaimAllCandidatesKey(build(1))).toBe(
      getClaimAllCandidatesKey(build(1))
    );
  });

  it('changes when the claimable amounts change', () => {
    expect(getClaimAllCandidatesKey(build(1))).not.toBe(
      getClaimAllCandidatesKey(build(0))
    );
  });
});

describe('getClaimAllRewardUsdValue', () => {
  it('sums every reward of the selected positions', () => {
    expect(
      getClaimAllRewardUsdValue([
        portfolio([{ amount: 45.976206, price: 1.0013016921998599 }]),
        portfolio([
          { amount: 23.800983, price: 0.99859 },
          { amount: 2, price: 3 },
        ]),
        portfolio(),
      ])
    ).toBeCloseTo(45.976206 * 1.0013016921998599 + 23.800983 * 0.99859 + 6);
  });
});

const token = (id: string, amount: number, usd: number, raw?: string) =>
  ({
    id,
    chain: 'eth',
    amount,
    usd_value: usd,
    raw_amount: raw,
    symbol: id,
  } as any);

const balanceChange = (
  receive: ReturnType<typeof token>[],
  extra: Partial<BalanceChange> = {}
): BalanceChange => ({
  success: true,
  error: null,
  usd_value_change: receive.reduce((acc, t) => acc + t.usd_value, 0),
  receive_token_list: receive,
  send_token_list: [],
  receive_nft_list: [],
  send_nft_list: [],
  ...extra,
});

describe('mergeBalanceChanges', () => {
  it('sums the same token received by several txs', () => {
    const merged = mergeBalanceChanges([
      balanceChange([token('usdc', 10, 10, '10000000')]),
      balanceChange([
        token('usdc', 5, 5, '5000000'),
        token('usdt', 1, 1, '1000000'),
      ]),
    ]);
    expect(merged.success).toBe(true);
    expect(merged.usd_value_change).toBe(16);
    expect(merged.receive_token_list).toHaveLength(2);
    const usdc = merged.receive_token_list.find((t) => t.id === 'usdc')!;
    expect(usdc.amount).toBe(15);
    expect(usdc.usd_value).toBe(15);
    expect(usdc.raw_amount).toBe('15000000');
  });

  it('is not successful if one tx fails', () => {
    const merged = mergeBalanceChanges([
      balanceChange([token('usdc', 10, 10)]),
      balanceChange([], {
        success: false,
        error: { code: 1, msg: 'reverted' },
      }),
    ]);
    expect(merged.success).toBe(false);
    expect(merged.error).toEqual({ code: 1, msg: 'reverted' });
  });
});

describe('isClaimAllPreExecValid', () => {
  const result = (success: boolean, receive: ReturnType<typeof token>[]) =>
    (({
      pre_exec: { success },
      balance_change: balanceChange(receive),
    } as unknown) as ExplainTxResponse);

  it('accepts a batch where every tx succeeds and receives tokens', () => {
    expect(
      isClaimAllPreExecValid(
        [
          result(true, [token('usdc', 1, 1)]),
          result(true, [token('usdt', 1, 1)]),
        ],
        2
      )
    ).toBe(true);
  });

  it('fails closed when any tx fails or receives nothing', () => {
    expect(
      isClaimAllPreExecValid(
        [
          result(false, [token('usdc', 1, 1)]),
          result(true, [token('usdt', 1, 1)]),
        ],
        2
      )
    ).toBe(false);
    expect(
      isClaimAllPreExecValid(
        [result(true, [token('usdc', 1, 1)]), result(true, [])],
        2
      )
    ).toBe(false);
  });

  it('fails closed when a tx sends something out', () => {
    const sending = ({
      pre_exec: { success: true },
      balance_change: balanceChange([token('usdc', 1, 1)], {
        send_token_list: [token('weth', 1, 3000)],
      }),
    } as unknown) as ExplainTxResponse;
    expect(
      isClaimAllPreExecValid([sending, result(true, [token('usdt', 1, 1)])], 2)
    ).toBe(false);
  });

  it('fails closed when results are missing', () => {
    expect(isClaimAllPreExecValid(undefined, 2)).toBe(false);
    expect(isClaimAllPreExecValid([], 2)).toBe(false);
    expect(
      isClaimAllPreExecValid([result(true, [token('usdc', 1, 1)])], 2)
    ).toBe(false);
  });
});

describe('buildDappActionTx', () => {
  it('builds the per-position Umbrella claim tx unchanged', () => {
    const action = umbrellaClaim(STK_USDC, WA_USDC);
    const tx = buildDappActionTx({
      data: action,
      chainId: 1,
      chainServerId: 'eth',
      from: USER,
      protocolName: 'Aave V3',
    });
    const abi = parseAbiItem(
      'function claimSelectedRewards(address,address[],address)'
    );
    expect(tx).toEqual({
      chainId: 1,
      from: USER,
      to: UMBRELLA_REWARDS_CONTROLLER,
      value: '0x0',
      data: encodeFunctionData({
        abi: [abi],
        functionName: 'claimSelectedRewards',
        args: [STK_USDC, [WA_USDC], USER],
      }),
    });
    expect(tx!.data.slice(0, 10)).toBe(toFunctionSelector(abi));
  });

  it('refuses blacklisted methods', () => {
    expect(
      buildDappActionTx({
        data: {
          ...umbrellaClaim(STK_USDC, WA_USDC),
          func: 'approve(address,uint256)(bool)',
          str_params: [USER, '1'],
        },
        chainId: 1,
        chainServerId: 'eth',
        from: USER,
      })
    ).toBeNull();
  });
});
