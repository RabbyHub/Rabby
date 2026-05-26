import React, { useCallback, useMemo, useState } from 'react';
import { Button, Skeleton, message } from 'antd';
import { useRequest } from 'ahooks';
import BigNumber from 'bignumber.js';
import { formatUnits, parseUnits } from 'ethers/lib/utils';
import { useTranslation } from 'react-i18next';

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
import { MINI_SIGN_ERROR } from '@/ui/component/MiniSignV2/state/SignatureManager';
import { formatUsdValue, useWallet } from '@/ui/utils';
import { findChainByServerID } from '@/utils/chain';

import { ActionPopupTitle } from './ActionModalShared';
import {
  Erc4626ActionError,
  Erc4626DepositContent,
  Erc4626WithdrawContent,
} from './Erc4626ActionModalSections';
import type { StakingPool } from '../types';
import { useStakingMiniSign } from '../hooks/useStakingMiniSign';
import {
  formatStakingAmount,
  formatStakingUsd,
  getStakingTokenBalanceAmount,
  isStakingAmountPrecisionExceeded,
} from '../utils/format';
import {
  buildStakingMiniSignTxs,
  getStakingMainTxHash,
  readStakingContract,
} from '../utils/tx';
import './actionModal.less';

type Erc4626Action = 'deposit' | 'withdraw';

interface Erc4626ActionModalProps {
  visible: boolean;
  action: Erc4626Action;
  pool: StakingPool;
  account: Account;
  onCancel: () => void;
  onSubmitted: (payload: { hash: string }) => void;
}

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
  const { t } = useTranslation();
  const wallet = useWallet();
  const [amount, setAmount] = useState('');
  const [percent, setPercent] = useState(100);
  const [selectedPercentPreset, setSelectedPercentPreset] = useState<
    number | null
  >(100);
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
  const actionLabel =
    action === 'deposit'
      ? t('page.staking.actions.deposit')
      : t('page.staking.actions.withdraw');

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
  const balance = getStakingTokenBalanceAmount(tokenInfo, tokenInfo?.amount);
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
            raw_amount_hex_str: tokenInfo?.raw_amount_hex_str,
          } as TokenItem)
        : null,
    [
      asset,
      assetId,
      balance,
      decimals,
      pool.chain_id,
      tokenInfo?.logo_url,
      tokenInfo?.raw_amount_hex_str,
      tokenPrice,
    ]
  );

  const { data: maxRedeemRaw = '0', loading: maxRedeemLoading } = useRequest(
    async () => {
      if (!visible || action !== 'withdraw') {
        return '0';
      }
      if (!entry) {
        throw new Error(t('page.staking.actionModal.unsupportedErc4626Pool'));
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

  const maxAmount = balance;
  const amountNumber = new BigNumber(amount || '0');
  const maxAmountNumber = new BigNumber(maxAmount || '0');
  const amountPrecisionExceeded = isStakingAmountPrecisionExceeded(
    amount,
    decimals
  );
  const depositAmountInvalid =
    !amount ||
    !amountNumber.isFinite() ||
    amountNumber.lte(0) ||
    amountPrecisionExceeded ||
    (maxAmountNumber.isFinite() && amountNumber.gt(maxAmountNumber));
  const disabledReason = !entry
    ? t('page.staking.actionModal.unsupportedPool')
    : !chainInfo
    ? t('page.staking.actionModal.unsupportedChain')
    : actionState?.is_supported !== true
    ? actionState?.reason || t('page.staking.actionModal.unavailable')
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
  const showWithdrawInvalidMessage = withdrawInvalid && percent > 0;
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
      throw new Error(t('page.staking.actionModal.unsupportedChain'));
    }
    if (!entry) {
      throw new Error(t('page.staking.actionModal.unsupportedErc4626Pool'));
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
    t,
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
      const hashes = await sign({
        txs,
        trigger: actionLabel,
        logo: pool.protocol.logo_url,
      });
      const hash = getStakingMainTxHash(hashes);
      if (hash) {
        setAmount('');
        setPercent(100);
        setSelectedPercentPreset(100);
        setSubmitting(false);
        submitted = true;
        onSubmitted({ hash });
      }
    } catch (error) {
      if (
        error === MINI_SIGN_ERROR.USER_CANCELLED ||
        error === MINI_SIGN_ERROR.CANT_PROCESS
      ) {
        return;
      }
      console.error('staking erc4626 action error', error);
      message.error(
        t('page.staking.actionModal.submitFailed', {
          action: actionLabel.toLowerCase(),
        })
      );
    } finally {
      if (!submitted) {
        setSubmitting(false);
      }
    }
  }, [actionLabel, buildTxs, canSubmit, onSubmitted, sign, t]);

  const onAmountChange = useCallback((value: string) => {
    if (value === '' || INPUT_NUMBER_RE.test(value)) {
      setAmount(value === '' ? '' : filterNumber(value));
    }
  }, []);

  const resetAndCancel = () => {
    setAmount('');
    setPercent(100);
    setSelectedPercentPreset(100);
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
  const redeemReceiveUsdText = formatStakingUsd(redeemReceiveUsd);
  const handlePercentChange = useCallback((value: number) => {
    setPercent(value);
    setSelectedPercentPreset(null);
  }, []);
  const handlePercentPresetChange = useCallback((value: number) => {
    setPercent(value);
    setSelectedPercentPreset(value);
  }, []);
  const depositBalanceError = amountNumber.gt(maxAmountNumber);
  const depositAmountError = depositBalanceError || amountPrecisionExceeded;

  return (
    <Popup
      visible={visible}
      title={
        <ActionPopupTitle
          title={actionLabel}
          onBack={resetAndCancel}
          className="staking-action-title"
          backClassName="staking-action-title-back"
        />
      }
      onCancel={resetAndCancel}
      height={action === 'withdraw' ? 408 : 258}
      closable={false}
      isNew
      isSupportDarkMode
      className="staking-action-popup"
    >
      <div className="text-r-neutral-title1">
        {maxLoading ? (
          <div className="px-[20px] py-[24px]">
            <Skeleton active paragraph={{ rows: 2 }} title={false} />
          </div>
        ) : (
          <>
            {action === 'deposit' ? (
              <Erc4626DepositContent
                amount={amount}
                amountError={depositAmountError}
                amountUsdText={amountUsdText}
                actionToken={actionToken}
                assetSymbol={asset?.symbol}
                balanceText={balanceText}
                onAmountChange={onAmountChange}
                onMax={() => setAmount(maxAmount || '')}
              />
            ) : (
              <Erc4626WithdrawContent
                percent={percent}
                onPercentChange={handlePercentChange}
                selectedPresetPercent={selectedPercentPreset}
                onPresetPercentChange={handlePercentPresetChange}
                actionToken={actionToken}
                previewRedeemLoading={previewRedeemLoading}
                redeemReceiveText={redeemReceiveText}
                redeemReceiveUsdText={redeemReceiveUsdText}
                assetSymbol={asset?.symbol}
              />
            )}

            <div className="staking-action-footer">
              <Erc4626ActionError
                disabledReason={disabledReason}
                action={action}
                depositBalanceError={depositBalanceError}
                depositPrecisionError={amountPrecisionExceeded}
                showWithdrawInvalidMessage={showWithdrawInvalidMessage}
                assetSymbol={asset?.symbol}
              />

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
