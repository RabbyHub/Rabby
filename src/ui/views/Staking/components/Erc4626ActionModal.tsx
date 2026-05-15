import React, { useCallback, useMemo, useState } from 'react';
import { Button, Input, Skeleton, message } from 'antd';
import { useRequest } from 'ahooks';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import { formatUnits, parseUnits } from 'ethers/lib/utils';

import {
  ERC4626_ABI,
  buildErc4626DepositTx,
  buildErc4626WithdrawTx,
  getErc4626PoolEntry,
} from '@rabby-wallet/staking-sdk';
import type { StakingPool as SdkStakingPool } from '@rabby-wallet/staking-sdk';
import type { TokenItem } from 'background/service/openapi';

import type { Account } from '@/background/service/preference';
import { INPUT_NUMBER_RE, filterNumber } from '@/constant/regexp';
import { Popup } from '@/ui/component';
import TokenWithChain from '@/ui/component/TokenWithChain';
import { MINI_SIGN_ERROR } from '@/ui/component/MiniSignV2/state/SignatureManager';
import { ReactComponent as RcIconWalletCC } from '@/ui/assets/swap/wallet-cc.svg';
import { formatUsdValue, useWallet } from '@/ui/utils';
import { findChainByServerID } from '@/utils/chain';

import type { StakingPool } from '../types';
import { useStakingMiniSign } from '../hooks/useStakingMiniSign';
import { formatStakingAmount } from '../utils/format';
import {
  buildStakingMiniSignTxs,
  getStakingMainTxHash,
  readStakingContract,
  waitForStakingTxReceipt,
} from '../utils/tx';

type Erc4626Action = 'deposit' | 'withdraw';

interface Erc4626ActionModalProps {
  visible: boolean;
  action: Erc4626Action;
  pool: StakingPool;
  account: Account;
  onCancel: () => void;
  onSubmitted: () => void;
}

const getActionLabel = (action: Erc4626Action) =>
  action === 'deposit' ? 'Deposit' : 'Withdraw';

const toSdkPool = (pool: StakingPool) => (pool as unknown) as SdkStakingPool;

const getAmountUsdText = (amount: string, price?: number | null) => {
  const value = new BigNumber(amount || 0).multipliedBy(price || 0);
  if (!value.isFinite()) {
    return '$0.00';
  }
  return formatUsdValue(value.toString());
};

export const Erc4626ActionModal = ({
  visible,
  action,
  pool,
  account,
  onCancel,
  onSubmitted,
}: Erc4626ActionModalProps) => {
  const wallet = useWallet();
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const chainInfo = findChainByServerID(pool.chain_id);
  const entry = useMemo(() => {
    try {
      return getErc4626PoolEntry(toSdkPool(pool));
    } catch {
      return null;
    }
  }, [pool]);
  const asset = pool.tokens.supplies[0];
  const assetId = entry?.asset || asset?.id;
  const actionState = pool.actions?.[action];
  const actionLabel = getActionLabel(action);

  const { data: tokenInfo, loading: tokenLoading } = useRequest(
    async () => {
      if (!visible || !assetId) {
        return;
      }
      return wallet.openapi.getToken(account.address, pool.chain_id, assetId);
    },
    {
      ready: visible && !!assetId,
      refreshDeps: [account.address, assetId, pool.chain_id, visible],
    }
  );

  const decimals = tokenInfo?.decimals ?? asset?.decimals ?? 18;
  const balance = tokenInfo?.amount ?? 0;
  const tokenPrice = tokenInfo?.price ?? asset?.price;
  const actionToken = useMemo(
    () =>
      asset
        ? ({
            id: assetId || asset.id,
            chain: asset.chain_id || pool.chain_id,
            symbol: asset.symbol,
            display_symbol: asset.symbol,
            logo_url: asset.logo_url || tokenInfo?.logo_url,
            amount: Number(balance || 0),
            decimals,
            price: tokenPrice,
          } as TokenItem)
        : null,
    [
      asset,
      assetId,
      balance,
      decimals,
      pool.chain_id,
      tokenInfo?.logo_url,
      tokenPrice,
    ]
  );

  const { data: maxWithdraw, loading: maxWithdrawLoading } = useRequest(
    async () => {
      if (!visible || action !== 'withdraw') {
        return '0';
      }
      if (!entry) {
        throw new Error('Unsupported ERC4626 pool');
      }

      const rawMaxWithdraw = await readStakingContract({
        wallet,
        chainServerId: pool.chain_id,
        account,
        address: entry.vault,
        abi: ERC4626_ABI,
        functionName: 'maxWithdraw',
        args: [account.address],
      });

      return formatUnits(String(rawMaxWithdraw), decimals);
    },
    {
      ready: visible && action === 'withdraw',
      refreshDeps: [
        account.address,
        action,
        decimals,
        entry?.vault,
        pool.chain_id,
        visible,
      ],
    }
  );

  const maxAmount = action === 'deposit' ? String(balance || 0) : maxWithdraw;
  const amountNumber = new BigNumber(amount || '0');
  const maxAmountNumber = new BigNumber(maxAmount || '0');
  const amountInvalid =
    !amount ||
    !amountNumber.isFinite() ||
    amountNumber.lte(0) ||
    (maxAmountNumber.isFinite() && amountNumber.gt(maxAmountNumber));
  const disabledReason = !entry
    ? 'Unsupported pool'
    : !chainInfo
    ? 'Unsupported chain'
    : actionState?.is_supported !== true
    ? actionState?.reason || 'Unavailable'
    : undefined;
  const { sign } = useStakingMiniSign({
    account,
    chainServerId: pool.chain_id,
  });

  const buildTxs = useCallback(async () => {
    if (!chainInfo) {
      throw new Error('Unsupported chain');
    }
    if (!entry) {
      throw new Error('Unsupported ERC4626 pool');
    }

    const rawAmount = parseUnits(amount, decimals).toString();
    const common = {
      pool: toSdkPool(pool),
      from: account.address,
      receiver: account.address,
      evmChainId: chainInfo.id,
    };
    const buildResult =
      action === 'deposit'
        ? buildErc4626DepositTx({
            ...common,
            assets: rawAmount,
          })
        : buildErc4626WithdrawTx({
            ...common,
            assets: rawAmount,
            owner: account.address,
          });

    return buildStakingMiniSignTxs({
      wallet,
      chainServerId: pool.chain_id,
      evmChainId: chainInfo.id,
      account,
      buildResult,
    });
  }, [account, action, amount, chainInfo, decimals, pool, wallet]);

  const handleSubmit = useCallback(async () => {
    if (disabledReason || amountInvalid) {
      return;
    }

    let submitted = false;
    try {
      setSubmitting(true);
      const { txs } = await buildTxs();
      const hashes = await sign({ txs, trigger: actionLabel });
      const hash = getStakingMainTxHash(hashes);
      if (hash) {
        message.success(`${actionLabel} submitted`);
        setAmount('');
        setSubmitting(false);
        submitted = true;
        onSubmitted();
        await waitForStakingTxReceipt({
          wallet,
          chainServerId: pool.chain_id,
          account,
          hash,
        });
        onSubmitted();
      }
    } catch (error) {
      if (
        error === MINI_SIGN_ERROR.USER_CANCELLED ||
        error === MINI_SIGN_ERROR.CANT_PROCESS
      ) {
        return;
      }
      console.error('staking erc4626 action error', error);
      message.error(`Failed to submit ${actionLabel.toLowerCase()}`);
    } finally {
      if (!submitted) {
        setSubmitting(false);
      }
    }
  }, [
    actionLabel,
    amountInvalid,
    buildTxs,
    disabledReason,
    account,
    onSubmitted,
    pool.chain_id,
    sign,
    wallet,
  ]);

  const onAmountChange = useCallback((value: string) => {
    if (value === '' || INPUT_NUMBER_RE.test(value)) {
      setAmount(value === '' ? '' : filterNumber(value));
    }
  }, []);

  const resetAndCancel = () => {
    setAmount('');
    onCancel();
  };

  const maxLoading = tokenLoading || maxWithdrawLoading;
  const amountUsdText = getAmountUsdText(amount, tokenPrice);
  const balanceText = formatStakingAmount(maxAmount || '0');

  return (
    <Popup
      visible={visible}
      title={actionLabel}
      onCancel={resetAndCancel}
      height={258}
      closable
      isNew
      isSupportDarkMode
      className="staking-action-popup"
    >
      <style>
        {`
          .staking-action-popup .ant-drawer-content {
            background: var(--r-neutral-card1) !important;
            border-radius: 16px 16px 0 0;
            box-shadow: 0 -12px 20px rgba(19, 20, 26, 0.05);
          }

          .staking-action-popup .ant-drawer-header {
            height: 60px;
            padding: 0;
          }

          .staking-action-popup .ant-drawer-title {
            height: 60px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--r-neutral-title1);
            font-size: 20px;
            line-height: 24px;
            font-weight: 500;
          }

          .staking-action-popup .ant-drawer-close {
            right: 20px;
            top: 20px;
            width: 20px;
            height: 20px;
            padding: 0;
          }

          .staking-action-popup .ant-drawer-body {
            padding: 0;
          }

          .staking-action-popup .staking-action-amount-row {
            display: flex;
            width: 400px;
            height: 106px;
            align-items: center;
            justify-content: space-between;
            padding: 24px 20px;
          }

          .staking-action-popup .staking-action-amount-left {
            display: flex;
            min-width: 0;
            flex: 1 1 0;
            flex-direction: column;
            gap: 4px;
          }

          .staking-action-popup .staking-action-amount-input.ant-input {
            width: 100%;
            height: 38px;
            padding: 0;
            border: 0 !important;
            border-radius: 0;
            background: transparent !important;
            box-shadow: none !important;
            color: var(--r-neutral-title1);
            font-size: 32px;
            line-height: 38px;
            font-weight: 700;
          }

          .staking-action-popup .staking-action-amount-input.ant-input::placeholder {
            color: var(--r-neutral-title1);
          }

          .staking-action-popup .staking-action-amount-row.is-error .staking-action-amount-input.ant-input {
            color: var(--r-red-default);
          }

          .staking-action-popup .staking-action-amount-usd {
            color: var(--r-neutral-foot);
            font-size: 13px;
            line-height: 16px;
            font-weight: 400;
          }

          .staking-action-popup .staking-action-token-side {
            display: flex;
            flex-shrink: 0;
            flex-direction: column;
            align-items: flex-end;
            gap: 8px;
          }

          .staking-action-popup .staking-action-token-main {
            display: flex;
            height: 34px;
            align-items: center;
            gap: 4px;
          }

          .staking-action-popup .staking-action-token-symbol {
            color: var(--r-neutral-title1);
            font-size: 15px;
            line-height: 18px;
            font-weight: 600;
          }

          .staking-action-popup .staking-action-balance {
            display: flex;
            align-items: center;
            gap: 4px;
            color: var(--r-neutral-foot);
            font-size: 13px;
            line-height: 16px;
            font-weight: 400;
          }

          .staking-action-popup .staking-action-balance-text {
            max-width: 108px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .staking-action-popup .staking-action-max {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            height: 18px;
            padding: 1px 6px;
            border: 0;
            border-radius: 4px;
            background: var(--r-blue-light1);
            color: var(--r-blue-default);
            font-size: 12px;
            line-height: 14px;
            font-weight: 500;
          }

          .staking-action-popup .staking-action-footer {
            display: flex;
            width: 400px;
            flex-direction: column;
            align-items: center;
            padding: 24px 20px 20px;
            position: relative;
          }

          .staking-action-popup .staking-action-error {
            position: absolute;
            top: 0;
            width: 360px;
            text-align: center;
            color: var(--r-red-default);
            font-size: 13px;
            line-height: 16px;
          }

          .staking-action-popup .staking-action-submit {
            height: 48px;
            border-radius: 6px;
            font-size: 15px;
            line-height: 18px;
            font-weight: 500;
          }
        `}
      </style>

      <div className="text-r-neutral-title1">
        {maxLoading ? (
          <div className="px-[20px] py-[24px]">
            <Skeleton active paragraph={{ rows: 2 }} title={false} />
          </div>
        ) : (
          <>
            <div
              className={clsx(
                'staking-action-amount-row',
                amountNumber.gt(maxAmountNumber) && 'is-error'
              )}
            >
              <div className="staking-action-amount-left">
                <Input
                  className="staking-action-amount-input"
                  placeholder="0"
                  value={amount}
                  onChange={(event) => onAmountChange(event.target.value)}
                />
                <div className="staking-action-amount-usd">{amountUsdText}</div>
              </div>
              <div className="staking-action-token-side">
                <div className="staking-action-token-main">
                  {actionToken ? (
                    <TokenWithChain
                      width="32px"
                      height="32px"
                      chainSize={16}
                      token={actionToken}
                      hideConer
                    />
                  ) : null}
                  <span className="staking-action-token-symbol">
                    {asset?.symbol || ''}
                  </span>
                </div>
                <div className="staking-action-balance">
                  <RcIconWalletCC
                    viewBox="0 0 16 16"
                    className="w-[14px] h-[14px]"
                  />
                  <span
                    className="staking-action-balance-text"
                    title={balanceText}
                  >
                    {balanceText}
                  </span>
                  <button
                    type="button"
                    className="staking-action-max"
                    onClick={() => setAmount(maxAmount || '')}
                  >
                    Max
                  </button>
                </div>
              </div>
            </div>

            <div className="staking-action-footer">
              {disabledReason ? (
                <div className="staking-action-error">{disabledReason}</div>
              ) : amountNumber.gt(maxAmountNumber) ? (
                <div className="staking-action-error">
                  Insufficient {asset?.symbol || 'token'} balance
                </div>
              ) : null}

              <Button
                type="primary"
                block
                className="staking-action-submit"
                loading={submitting}
                disabled={!!disabledReason || amountInvalid}
                onClick={handleSubmit}
              >
                {actionLabel}
              </Button>
            </div>
          </>
        )}
      </div>
    </Popup>
  );
};
