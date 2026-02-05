import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Input, message } from 'antd';
import BigNumber from 'bignumber.js';
import { parseUnits } from 'ethers/lib/utils';
import { isSameAddress } from '@/ui/utils';
import { useWallet } from '@/ui/utils/WalletContext';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { DisplayPoolReserveInfo, UserSummary } from '../../types';
import { API_ETH_MOCK_ADDRESS } from '../../utils/constant';
import wrapperToken from '../../config/wrapperToken';
import {
  calculateHFAfterSupply,
  effectUserAvailable,
} from '../../utils/hfUtils';
import { buildSupplyTx, optimizedPath } from '../../utils/poolService';
import { SUPPLY_UI_SAFE_MARGIN } from '../../utils/constant';
import { SupplyOverView } from './SupplyOverView';
import { ReserveErrorTip } from './ReserveErrorTip';
import SymbolIcon from '../SymbolIcon';
import {
  useLendingSummary,
  useSelectedMarket,
  usePoolDataProviderContract,
} from '../../hooks';
import { sendTransaction } from '@/ui/utils/sendTransaction';
import { INTERNAL_REQUEST_SESSION } from '@/constant';
import { CHAINS_ENUM } from '@debank/common';
import { ETH_USDT_CONTRACT } from '@/constant';
import { INPUT_NUMBER_RE, filterNumber } from '@/constant/regexp';
import { formatTokenAmount, formatUsdValue } from '@/ui/utils/number';
import { Tx } from '@rabby-wallet/rabby-api/dist/types';
import { ReactComponent as RcIconWalletCC } from '@/ui/assets/swap/wallet-cc.svg';
import { useMiniSigner } from '@/ui/hooks/useSigner';
import { MINI_SIGN_ERROR } from '@/ui/component/MiniSignV2/state/SignatureManager';
import { DirectSignToConfirmBtn } from '@/ui/component/ToConfirmButton';
import { supportedDirectSign } from '@/ui/hooks/useMiniApprovalDirectSign';
import { DirectSignGasInfo } from '@/ui/views/Bridge/Component/BridgeShowMore';
import { StyledInput } from '../StyledInput';

type SupplyModalProps = {
  visible: boolean;
  onCancel: () => void;
  reserve: DisplayPoolReserveInfo;
  userSummary: UserSummary | null;
};

export const SupplyModal: React.FC<SupplyModalProps> = ({
  visible,
  onCancel,
  reserve,
  userSummary,
}) => {
  const { t } = useTranslation();
  const wallet = useWallet();
  const currentAccount = useCurrentAccount();
  const {
    formattedPoolReservesAndIncentives,
    iUserSummary: contextUserSummary,
  } = useLendingSummary();
  const {
    selectedMarketData,
    chainInfo,
    chainEnum,
    isMainnet,
  } = useSelectedMarket();
  const { pools } = usePoolDataProviderContract();

  const summary = userSummary ?? contextUserSummary;

  const [amount, setAmount] = useState<string | undefined>(undefined);
  const [needApprove, setNeedApprove] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [miniSignLoading, setMiniSignLoading] = useState(false);
  const [supplyTx, setSupplyTx] = useState<Tx | null>(null);
  const [approveTxs, setApproveTxs] = useState<Tx[] | null>(null);

  const isNativeToken = useMemo(
    () => isSameAddress(reserve.underlyingAsset, API_ETH_MOCK_ADDRESS),
    [reserve.underlyingAsset]
  );

  const supplyAmount = useMemo(() => {
    const myAmount = new BigNumber(reserve.walletBalance || '0');
    const totalLiquidity = new BigNumber(reserve.reserve.totalLiquidity || '0');
    const poolAmount = new BigNumber(reserve.reserve.supplyCap)
      .minus(totalLiquidity)
      .multipliedBy(SUPPLY_UI_SAFE_MARGIN);
    const formattedPoolAmount = poolAmount.lt(0)
      ? new BigNumber(0)
      : poolAmount;
    const miniAmount = myAmount.gte(formattedPoolAmount)
      ? formattedPoolAmount
      : myAmount;
    const usdValue = miniAmount
      .multipliedBy(
        new BigNumber(
          reserve.reserve.formattedPriceInMarketReferenceCurrency || '0'
        )
      )
      .toString();
    return {
      isLteZero: miniAmount.lte(0),
      amount: miniAmount.toString(),
      usdValue,
    };
  }, [
    reserve.walletBalance,
    reserve.reserve.supplyCap,
    reserve.reserve.totalLiquidity,
    reserve.reserve.formattedPriceInMarketReferenceCurrency,
  ]);

  const targetPool = useMemo(() => {
    if (!formattedPoolReservesAndIncentives?.length) return undefined;
    return formattedPoolReservesAndIncentives.find((item) =>
      isNativeToken && chainEnum
        ? isSameAddress(
            item.underlyingAsset,
            wrapperToken?.[chainEnum]?.address
          )
        : isSameAddress(item.underlyingAsset, reserve.underlyingAsset)
    );
  }, [
    formattedPoolReservesAndIncentives,
    reserve.underlyingAsset,
    isNativeToken,
    chainEnum,
  ]);

  const afterHF = useMemo(() => {
    if (!amount || amount === '0' || !summary || !targetPool) return undefined;
    const bgAmount = new BigNumber(amount);
    return calculateHFAfterSupply(
      summary,
      targetPool,
      bgAmount.multipliedBy(targetPool.formattedPriceInMarketReferenceCurrency)
    ).toString();
  }, [amount, targetPool, summary]);

  const afterAvailable = useMemo(() => {
    if (!amount || amount === '0' || !summary || !targetPool) return undefined;
    if (effectUserAvailable(summary, targetPool)) {
      const bgAmount = new BigNumber(amount);
      return bgAmount
        .multipliedBy(reserve.reserve.formattedPriceInMarketReferenceCurrency)
        .multipliedBy(reserve.reserve.formattedBaseLTVasCollateral)
        .plus(new BigNumber(summary?.availableBorrowsUSD || '0'))
        .toString();
    }
    return summary?.availableBorrowsUSD || '0';
  }, [
    amount,
    summary,
    targetPool,
    reserve.reserve.formattedPriceInMarketReferenceCurrency,
    reserve.reserve.formattedBaseLTVasCollateral,
  ]);

  const txsForMiniApproval = useMemo(() => {
    const list: Tx[] = [];
    if (approveTxs?.length) {
      list.push(...approveTxs);
    }
    if (supplyTx) {
      list.push(supplyTx);
    }
    return list;
  }, [approveTxs, supplyTx]);

  const canShowDirectSubmit = useMemo(
    () =>
      !!currentAccount &&
      !!chainInfo &&
      !chainInfo.isTestnet &&
      supportedDirectSign(currentAccount.type || ''),
    [currentAccount, chainInfo]
  );

  const { openDirect, prefetch, close: closeSign } = useMiniSigner({
    account: currentAccount!,
    chainServerId: chainInfo?.serverId || '',
    autoResetGasStoreOnChainChange: true,
  });

  const checkApproveStatus = useCallback(async () => {
    if (!amount || amount === '0' || !currentAccount || !selectedMarketData) {
      setNeedApprove(false);
      return;
    }
    if (!chainInfo) return;
    if (
      isSameAddress(reserve.underlyingAsset, chainInfo.nativeTokenAddress) ||
      isNativeToken
    ) {
      setNeedApprove(false);
      return;
    }
    try {
      const allowance = await wallet.getERC20Allowance(
        chainInfo.serverId,
        reserve.underlyingAsset,
        selectedMarketData.addresses.LENDING_POOL
      );
      const requiredAmount = new BigNumber(amount)
        .multipliedBy(10 ** reserve.reserve.decimals)
        .toString();
      const isApproved = new BigNumber(allowance || '0').gte(requiredAmount);
      setNeedApprove(!isApproved);
    } catch {
      setNeedApprove(true);
    }
  }, [
    amount,
    currentAccount,
    selectedMarketData,
    chainInfo,
    reserve.underlyingAsset,
    reserve.reserve.decimals,
    isNativeToken,
    wallet,
  ]);

  const buildTransactions = useCallback(async () => {
    if (
      !amount ||
      amount === '0' ||
      !currentAccount ||
      !selectedMarketData ||
      !pools ||
      !chainInfo
    ) {
      setSupplyTx(null);
      setApproveTxs(null);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const txs: Tx[] = [];
      let allowance = '0';
      if (
        !isSameAddress(reserve.underlyingAsset, chainInfo.nativeTokenAddress) &&
        !isNativeToken
      ) {
        allowance = await wallet.getERC20Allowance(
          chainInfo.serverId,
          reserve.underlyingAsset,
          selectedMarketData.addresses.LENDING_POOL
        );
        const requiredAmount = new BigNumber(amount)
          .multipliedBy(10 ** reserve.reserve.decimals)
          .toString();
        const actualNeedApprove = !new BigNumber(allowance || '0').gte(
          requiredAmount
        );
        if (actualNeedApprove) {
          const requiredAmountStr = new BigNumber(amount)
            .multipliedBy(10 ** reserve.reserve.decimals)
            .toFixed();
          const shouldTwoStepApprove =
            isMainnet &&
            isSameAddress(reserve.underlyingAsset, ETH_USDT_CONTRACT) &&
            Number(allowance) !== 0 &&
            !new BigNumber(allowance || '0').gte(requiredAmountStr);
          if (shouldTwoStepApprove) {
            const zeroResp = await wallet.approveToken(
              chainInfo.serverId,
              reserve.underlyingAsset,
              selectedMarketData.addresses.LENDING_POOL,
              0,
              undefined,
              undefined,
              undefined,
              true,
              currentAccount
            );
            const zeroTx = (zeroResp as { params: [Tx] })?.params?.[0];
            if (zeroTx) txs.push(zeroTx);
          }
          const approveResp = await wallet.approveToken(
            chainInfo.serverId,
            reserve.underlyingAsset,
            selectedMarketData.addresses.LENDING_POOL,
            requiredAmountStr,
            undefined,
            undefined,
            undefined,
            true,
            currentAccount
          );
          const approveTx = (approveResp as { params: [Tx] })?.params?.[0];
          if (approveTx) txs.push(approveTx);
        }
      }
      setApproveTxs(txs.length ? txs : null);

      const supplyResult = await buildSupplyTx({
        poolBundle: pools.poolBundle,
        amount: parseUnits(amount, reserve.reserve.decimals).toString(),
        address: currentAccount.address,
        reserve: reserve.underlyingAsset,
        useOptimizedPath: optimizedPath(selectedMarketData.chainId),
      });
      const result = supplyResult as {
        to?: string;
        data?: string;
        value?: { toHexString?: () => string };
        from?: string;
        gasLimit?: number;
      };
      delete (result as Record<string, unknown>).gasLimit;
      const formattedSupplyResult: Tx = {
        ...result,
        from: result.from || currentAccount.address,
        value:
          typeof result.value === 'object' && result.value?.toHexString
            ? result.value.toHexString()
            : (result.value as string) || '0x0',
        chainId: chainInfo.id,
      } as Tx;
      setSupplyTx(formattedSupplyResult);
    } catch (error) {
      console.error('Build transactions error:', error);
      message.error(t('page.lending.submitted') || 'Something error');
      setSupplyTx(null);
      setApproveTxs(null);
    } finally {
      setIsLoading(false);
    }
  }, [
    amount,
    currentAccount,
    selectedMarketData,
    pools,
    chainInfo,
    reserve.underlyingAsset,
    reserve.reserve.decimals,
    isNativeToken,
    isMainnet,
    wallet,
    t,
  ]);

  useEffect(() => {
    if (!currentAccount || !canShowDirectSubmit) {
      prefetch({
        txs: [],
      });
      return;
    }

    closeSign();
    if (!txsForMiniApproval.length) {
      prefetch({
        txs: [],
      });
      return;
    }

    prefetch({
      txs: txsForMiniApproval,
      ga: {
        category: 'Lending',
        source: 'Lending',
        trigger: 'Supply',
      },
    }).catch((error) => {
      if (error !== MINI_SIGN_ERROR.PREFETCH_FAILURE) {
        // eslint-disable-next-line no-console
        console.error('lending supply prefetch error', error);
      }
    });
  }, [
    currentAccount,
    canShowDirectSubmit,
    txsForMiniApproval,
    prefetch,
    closeSign,
  ]);

  useEffect(() => {
    if (!visible) {
      setAmount(undefined);
      setSupplyTx(null);
      setApproveTxs(null);
    }
  }, [visible]);

  useEffect(() => {
    if (visible) checkApproveStatus();
  }, [visible, checkApproveStatus]);

  useEffect(() => {
    if (visible) buildTransactions();
  }, [visible, buildTransactions]);

  const handleSupply = useCallback(
    async (forceFullSign?: boolean) => {
      if (
        !currentAccount ||
        !supplyTx ||
        !amount ||
        amount === '0' ||
        !chainInfo
      ) {
        return;
      }
      const allTxs: Tx[] = [...(approveTxs || []), supplyTx];
      if (!allTxs.length) {
        message.info(t('page.lending.submitted') || 'Please retry');
        return;
      }

      try {
        if (canShowDirectSubmit && !forceFullSign) {
          setMiniSignLoading(true);
          try {
            const hashes = await openDirect({
              txs: allTxs,
              ga: {
                category: 'Lending',
                source: 'Lending',
                trigger: 'Supply',
              },
            });
            const hash = hashes[hashes.length - 1];
            if (hash) {
              message.success(
                `${t('page.lending.supplyDetail.actions')} ${t(
                  'page.lending.submitted'
                )}`
              );
              setAmount(undefined);
              onCancel();
            }
          } catch (error) {
            if (
              error === MINI_SIGN_ERROR.USER_CANCELLED ||
              error === MINI_SIGN_ERROR.CANT_PROCESS
            ) {
              return;
            }
            await handleSupply(true);
            return;
          } finally {
            setMiniSignLoading(false);
          }
          return;
        }

        setIsLoading(true);
        for (let i = 0; i < allTxs.length; i++) {
          const tx = allTxs[i];
          // 完整签名走签名页
          await wallet.sendRequest({
            method: 'eth_sendTransaction',
            params: [tx],
            $ctx: {
              ga: {
                category: 'Lending',
                source: 'Lending',
                trigger: 'Supply',
              },
            },
          });
        }
        message.success(
          `${t('page.lending.supplyDetail.actions')} ${t(
            'page.lending.submitted'
          )}`
        );
        setAmount(undefined);
        onCancel();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Supply error:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [
      currentAccount,
      supplyTx,
      amount,
      approveTxs,
      chainInfo,
      wallet,
      onCancel,
      t,
      canShowDirectSubmit,
      openDirect,
    ]
  );

  const onAmountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      if (v === '' || INPUT_NUMBER_RE.test(v)) {
        const filtered = v === '' ? undefined : filterNumber(v);
        if (filtered) {
          const maxAmount = new BigNumber(supplyAmount.amount || '0');
          const inputAmount = new BigNumber(filtered);
          if (inputAmount.gt(maxAmount)) {
            setAmount(supplyAmount.amount || '0');
          } else {
            setAmount(filtered);
          }
        } else {
          setAmount(undefined);
        }
      }
    },
    [supplyAmount.amount]
  );

  const emptyAmount = !supplyAmount.amount || supplyAmount.amount === '0';
  const canSubmit =
    amount && amount !== '0' && supplyTx && currentAccount && !isLoading;

  if (!reserve?.reserve?.symbol) return null;

  return (
    <div className="bg-r-neutral-bg-2 rounded-[8px] px-[20px] pt-[16px] pb-[16px] min-h-[600px] flex flex-col">
      <h2 className="text-[20px] leading-[24px] font-medium text-center text-r-neutral-title-1">
        {t('page.lending.supplyDetail.actions')} {reserve.reserve.symbol}
      </h2>

      <div className="mt-16">
        <div className="flex items-center justify-between mb-8">
          <span className="text-[13px] leading-[15px] text-r-neutral-foot">
            {t('page.lending.popup.amount')}
          </span>
        </div>
        <div className="flex items-start gap-4 p-16 rounded-[8px] bg-rb-neutral-card-1">
          <div className="flex items-start flex-shrink-0 flex-col gap-8">
            <div className="flex items-center gap-6">
              <SymbolIcon tokenSymbol={reserve.reserve.symbol} size={24} />
              <span className="text-[20px] leading-[20px] font-medium text-r-neutral-title-1">
                {reserve.reserve.symbol}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <RcIconWalletCC
                viewBox="0 0 16 16"
                className="w-16 h-16 text-r-neutral-foot"
              />
              <span className="text-[13px] leading-[16px] text-r-neutral-foot">
                {formatTokenAmount(supplyAmount.amount || '0')}
              </span>
              <button
                type="button"
                className={`
                  px-4 py-2 rounded-[2px] 
                  bg-rb-brand-light-1 
                  text-rb-brand-default font-medium text-[11px] leading-[11px] 
                  hover:bg-rb-brand-light-2 disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                onClick={() => setAmount(supplyAmount.amount || '0')}
                disabled={emptyAmount}
              >
                MAX
              </button>
            </div>
          </div>
          <div className="flex-1 flex flex-col items-end min-w-0">
            <StyledInput
              value={amount ?? ''}
              onChange={onAmountChange}
              placeholder="0"
              className="text-right border-0 bg-transparent p-0 h-auto hover:border-r-0"
            />
            {amount && amount !== '0' && (
              <span className="text-[13px] leading-[15px] text-r-neutral-foot mt-1">
                {formatUsdValue(
                  Number(amount) *
                    Number(
                      reserve.reserve.formattedPriceInMarketReferenceCurrency ||
                        0
                    )
                )}
              </span>
            )}
          </div>
        </div>
      </div>

      {summary && (
        <SupplyOverView
          reserve={reserve}
          userSummary={summary}
          afterHF={afterHF}
          afterAvailable={afterAvailable}
        />
      )}

      {canShowDirectSubmit &&
      chainInfo?.serverId &&
      !!amount &&
      amount !== '0' ? (
        <div className="mt-16 px-16">
          <DirectSignGasInfo
            supportDirectSign
            loading={isLoading}
            openShowMore={() => {}}
            chainServeId={chainInfo.serverId}
            noQuote={false}
            type="send"
          />
        </div>
      ) : null}
      <div className="mt-auto w-full">
        <ReserveErrorTip reserve={reserve} />
        {canShowDirectSubmit && currentAccount?.type ? (
          <DirectSignToConfirmBtn
            className="mt-20"
            title={
              <>
                {t('page.lending.supplyDetail.actions')}{' '}
                {reserve.reserve.symbol}
              </>
            }
            disabled={!canSubmit}
            loading={miniSignLoading}
            onConfirm={() => handleSupply()}
            accountType={currentAccount.type}
          />
        ) : (
          <Button
            type="primary"
            block
            size="large"
            className="mt-20 h-[48px] rounded-[8px] font-medium text-[16px]"
            loading={isLoading}
            disabled={!canSubmit}
            onClick={() => handleSupply()}
          >
            {t('page.lending.supplyDetail.actions')} {reserve.reserve.symbol}
          </Button>
        )}
      </div>
    </div>
  );
};
