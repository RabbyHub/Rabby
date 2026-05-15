import React, { useCallback, useMemo, useState } from 'react';
import { Button, Input, Skeleton, message } from 'antd';
import { useRequest } from 'ahooks';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import { formatUnits, parseUnits } from 'ethers/lib/utils';

import {
  ERC4626_ABI,
  buildErc4626DepositTx,
  buildErc4626RedeemTx,
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
import { SwapSlider } from '@/ui/views/Swap/Component/Slider';
import { formatUsdValue, useWallet } from '@/ui/utils';
import { findChainByServerID } from '@/utils/chain';

import type { StakingPool } from '../types';
import { useStakingMiniSign } from '../hooks/useStakingMiniSign';
import { formatStakingAmount, formatStakingUsd } from '../utils/format';
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
  onConfirmed: () => void;
}

const getActionLabel = (action: Erc4626Action) =>
  action === 'deposit' ? 'Deposit' : 'Withdraw';

const ActionPopupTitle = ({
  title,
  onBack,
}: {
  title: string;
  onBack: () => void;
}) => (
  <div className="staking-action-title">
    <button
      type="button"
      className="staking-action-title-back"
      onClick={onBack}
      aria-label="Back"
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path
          d="M13.5 3L6.5 10L13.5 17"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
    <span>{title}</span>
  </div>
);

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
  onConfirmed,
}: Erc4626ActionModalProps) => {
  const wallet = useWallet();
  const [amount, setAmount] = useState('');
  const [percent, setPercent] = useState(100);
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

  const { data: maxRedeemRaw = '0', loading: maxRedeemLoading } = useRequest(
    async () => {
      if (!visible || action !== 'withdraw') {
        return '0';
      }
      if (!entry) {
        throw new Error('Unsupported ERC4626 pool');
      }

      const rawMaxRedeem = await readStakingContract({
        wallet,
        chainServerId: pool.chain_id,
        account,
        address: entry.vault,
        abi: ERC4626_ABI,
        functionName: 'maxRedeem',
        args: [account.address],
      });

      return String(rawMaxRedeem || 0);
    },
    {
      ready: visible && action === 'withdraw',
      refreshDeps: [
        account.address,
        action,
        entry?.vault,
        pool.chain_id,
        visible,
      ],
    }
  );

  const selectedRedeemSharesRaw = useMemo(() => {
    try {
      return (
        (BigInt(maxRedeemRaw || '0') * BigInt(percent)) /
        100n
      ).toString();
    } catch {
      return '0';
    }
  }, [maxRedeemRaw, percent]);

  const {
    data: previewRedeemAssetsRaw = '0',
    loading: previewRedeemLoading,
  } = useRequest(
    async () => {
      if (
        !visible ||
        action !== 'withdraw' ||
        !entry ||
        BigInt(selectedRedeemSharesRaw || '0') <= 0n
      ) {
        return '0';
      }

      const rawAssets = await readStakingContract({
        wallet,
        chainServerId: pool.chain_id,
        account,
        address: entry.vault,
        abi: ERC4626_ABI,
        functionName: 'previewRedeem',
        args: [BigInt(selectedRedeemSharesRaw)],
      });

      return String(rawAssets || 0);
    },
    {
      ready: visible && action === 'withdraw' && !!entry,
      refreshDeps: [
        account.address,
        action,
        entry?.vault,
        pool.chain_id,
        selectedRedeemSharesRaw,
        visible,
      ],
    }
  );

  const maxAmount = String(balance || 0);
  const amountNumber = new BigNumber(amount || '0');
  const maxAmountNumber = new BigNumber(maxAmount || '0');
  const depositAmountInvalid =
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
  const selectedRedeemShares = useMemo(() => {
    try {
      return BigInt(selectedRedeemSharesRaw || '0');
    } catch {
      return 0n;
    }
  }, [selectedRedeemSharesRaw]);
  const previewRedeemAssets = useMemo(() => {
    try {
      return BigInt(previewRedeemAssetsRaw || '0');
    } catch {
      return 0n;
    }
  }, [previewRedeemAssetsRaw]);
  const withdrawInvalid =
    action === 'withdraw' &&
    (selectedRedeemShares <= 0n || previewRedeemAssets <= 0n);
  const canSubmit =
    !disabledReason &&
    (action === 'deposit'
      ? !depositAmountInvalid
      : !previewRedeemLoading && !withdrawInvalid);
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
            assets: parseUnits(amount, decimals).toString(),
          })
        : buildErc4626RedeemTx({
            ...common,
            shares: selectedRedeemSharesRaw,
            owner: account.address,
          });

    return buildStakingMiniSignTxs({
      wallet,
      chainServerId: pool.chain_id,
      evmChainId: chainInfo.id,
      account,
      buildResult,
    });
  }, [
    account,
    action,
    amount,
    chainInfo,
    decimals,
    entry,
    pool,
    selectedRedeemSharesRaw,
    wallet,
  ]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) {
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
        setPercent(100);
        setSubmitting(false);
        submitted = true;
        onSubmitted();
        const receipt = await waitForStakingTxReceipt({
          wallet,
          chainServerId: pool.chain_id,
          account,
          hash,
        });
        if (receipt) {
          onConfirmed();
        }
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
    buildTxs,
    canSubmit,
    account,
    onConfirmed,
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
    setPercent(100);
    onCancel();
  };

  const maxLoading =
    tokenLoading || (action === 'withdraw' && maxRedeemLoading);
  const amountUsdText = getAmountUsdText(amount, tokenPrice);
  const balanceText = formatStakingAmount(maxAmount || '0');
  const redeemReceiveAmount = formatUnits(previewRedeemAssetsRaw, decimals);
  const redeemReceiveUsd = new BigNumber(redeemReceiveAmount || 0)
    .multipliedBy(tokenPrice || 0)
    .toNumber();
  const redeemReceiveText = formatStakingAmount(redeemReceiveAmount);

  return (
    <Popup
      visible={visible}
      title={<ActionPopupTitle title={actionLabel} onBack={resetAndCancel} />}
      onCancel={resetAndCancel}
      height={action === 'withdraw' ? 408 : 258}
      closable={false}
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
            width: 100%;
            color: var(--r-neutral-title1);
            font-size: 20px;
            line-height: 24px;
            font-weight: 500;
          }

          .staking-action-popup .staking-action-title {
            position: relative;
            display: flex;
            width: 100%;
            height: 60px;
            align-items: center;
            justify-content: center;
          }

          .staking-action-popup .staking-action-title-back {
            position: absolute;
            left: 20px;
            top: 20px;
            display: flex;
            width: 20px;
            height: 20px;
            align-items: center;
            justify-content: center;
            padding: 0;
            border: 0;
            background: transparent;
            color: var(--r-neutral-title1);
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

          .staking-action-popup .staking-action-withdraw-box {
            width: 400px;
            padding: 16px 20px 24px;
          }

          .staking-action-popup .staking-action-percent-value {
            display: flex;
            align-items: baseline;
            gap: 8px;
            color: var(--r-neutral-title1);
            font-size: 32px;
            line-height: 38px;
            font-weight: 700;
          }

          .staking-action-popup .staking-action-percent-value span:last-child {
            color: var(--r-neutral-foot);
          }

          .staking-action-popup .staking-action-percent-slider.ant-slider {
            width: 360px;
            margin: 8px 0 0;
            padding: 14px 0;
          }

          .staking-action-popup .staking-action-percent-slider.ant-slider .ant-slider-handle {
            width: 16px;
            height: 16px;
            margin-top: -6px;
          }

          .staking-action-popup .staking-action-percent-slider.ant-slider .ant-slider-handle::after {
            width: 16px;
            height: 16px;
            box-shadow: 0 0 0 2px var(--r-blue-default);
          }

          .staking-action-popup .staking-action-presets {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            margin-top: 8px;
          }

          .staking-action-popup .staking-action-presets button {
            height: 32px;
            border: 0;
            border-radius: 4px;
            background: var(--r-neutral-bg2);
            color: var(--r-neutral-title1);
            font-size: 13px;
            line-height: 16px;
          }

          .staking-action-popup .staking-action-presets button.is-active {
            background: var(--r-blue-light1);
            color: var(--r-blue-default);
          }

          .staking-action-popup .staking-action-preview {
            width: 400px;
            padding: 0 20px;
          }

          .staking-action-popup .staking-action-preview-title {
            margin-bottom: 8px;
            color: var(--r-neutral-title1);
            font-size: 15px;
            line-height: 18px;
            font-weight: 500;
          }

          .staking-action-popup .staking-action-preview-card {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            min-height: 56px;
            border: 0.5px solid #edf0ff;
            border-radius: 8px;
            padding: 16px;
            background: linear-gradient(112deg, rgba(237, 240, 255, 0.25) 0%, rgba(237, 240, 255, 0) 100%);
          }

          .staking-action-popup .staking-action-preview-left {
            display: flex;
            min-width: 0;
            align-items: center;
            gap: 8px;
            color: var(--r-neutral-body);
            font-size: 13px;
            line-height: 16px;
          }

          .staking-action-popup .staking-action-preview-value {
            color: var(--r-neutral-foot);
            font-size: 13px;
            line-height: 16px;
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
            {action === 'deposit' ? (
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
                  <div className="staking-action-amount-usd">
                    {amountUsdText}
                  </div>
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
            ) : (
              <>
                <div className="staking-action-withdraw-box">
                  <div className="staking-action-percent-value">
                    <span>{percent}</span>
                    <span>%</span>
                  </div>
                  <SwapSlider
                    className="staking-action-percent-slider"
                    min={0}
                    max={100}
                    step={1}
                    value={percent}
                    tooltipVisible={false}
                    onChange={(value) => setPercent(Number(value))}
                  />
                  <div className="staking-action-presets">
                    {[25, 50, 75, 100].map((item) => (
                      <button
                        type="button"
                        key={item}
                        className={clsx(percent === item && 'is-active')}
                        onClick={() => setPercent(item)}
                      >
                        {item}%
                      </button>
                    ))}
                  </div>
                </div>
                <div className="staking-action-preview">
                  <div className="staking-action-preview-title">Receive</div>
                  <div className="staking-action-preview-card">
                    <div className="staking-action-preview-left">
                      {actionToken ? (
                        <TokenWithChain
                          width="24px"
                          height="24px"
                          chainSize={12}
                          token={actionToken}
                          hideConer
                        />
                      ) : null}
                      <span>
                        {previewRedeemLoading
                          ? '-'
                          : `${redeemReceiveText} ${asset?.symbol || ''}`}
                      </span>
                    </div>
                    <span className="staking-action-preview-value">
                      {previewRedeemLoading
                        ? '-'
                        : formatStakingUsd(redeemReceiveUsd)}
                    </span>
                  </div>
                </div>
              </>
            )}

            <div className="staking-action-footer">
              {disabledReason ? (
                <div className="staking-action-error">{disabledReason}</div>
              ) : action === 'deposit' && amountNumber.gt(maxAmountNumber) ? (
                <div className="staking-action-error">
                  Insufficient {asset?.symbol || 'token'} balance
                </div>
              ) : action === 'withdraw' && withdrawInvalid ? (
                <div className="staking-action-error">
                  No withdrawable position
                </div>
              ) : null}

              <Button
                type="primary"
                block
                className="staking-action-submit"
                loading={submitting}
                disabled={!canSubmit}
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
