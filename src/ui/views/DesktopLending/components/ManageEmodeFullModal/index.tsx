import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Button, Select, Checkbox } from 'antd';
import { formatUserSummary } from '@aave/math-utils';
import dayjs from 'dayjs';
import { useWallet } from '@/ui/utils/WalletContext';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { message } from 'antd';
import { ModalCloseIcon } from '@/ui/views/DesktopProfile/components/TokenDetailModal';
import { useMiniSigner } from '@/ui/hooks/useSigner';
import { MINI_SIGN_ERROR } from '@/ui/component/MiniSignV2/state/SignatureManager';
import { DirectSignToConfirmBtn } from '@/ui/component/ToConfirmButton';
import { supportedDirectSign } from '@/ui/hooks/useMiniApprovalDirectSign';
import { DirectSignGasInfo } from '@/ui/views/Bridge/Component/BridgeShowMore';
import { ReactComponent as RcIconWarningCC } from '@/ui/assets/warning-cc.svg';
import { Tx } from '@rabby-wallet/rabby-api/dist/types';

import { useMode } from '../../hooks/useMode';
import { buildManageEmodeTx } from '../../utils/poolService';
import {
  useLendingSummary,
  useLendingRemoteData,
  usePoolDataProviderContract,
  useRefreshHistoryId,
  useSelectedMarket,
} from '../../hooks';
import {
  HF_BLOCK_THRESHOLD,
  HF_RISK_CHECKBOX_THRESHOLD,
} from '../../utils/constant';
import { isEModeCategoryAvailable } from '../../utils/emode';
import { getHealthFactorText } from '../../utils/health';
import { formatPercent } from '../../utils/format';
import { isHFEmpty } from '../../utils';
import SymbolIcon from '../SymbolIcon';
import { EmodeCategory } from '../../types';

const modalStyle = {
  width: 400,
  title: null as React.ReactNode,
  bodyStyle: { background: 'transparent', padding: 0 } as const,
  maskClosable: true,
  footer: null as React.ReactNode,
  zIndex: 1000,
  className: 'modal-support-darkmode',
  closeIcon: ModalCloseIcon,
  centered: true,
  maskStyle: {
    zIndex: 1000,
    backdropFilter: 'blur(8px)',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
};

const PairTable: React.FC<{ data: EmodeCategory['assets'] }> = ({ data }) => {
  const { t } = useTranslation();
  if (!data?.length) return null;

  return (
    <div className="mt-[12px]">
      <div className="flex bg-rb-neutral-bg-3 rounded-[6px] px-[12px] py-[8px]">
        <div className="flex-1 text-left text-[12px] leading-[16px] font-medium text-rb-neutral-body">
          {t('page.lending.manageEmode.overview.row.asset')}
        </div>
        <div className="flex-1 text-center text-[12px] leading-[16px] font-medium text-rb-neutral-body">
          {t('page.lending.manageEmode.overview.row.collateral')}
        </div>
        <div className="flex-1 text-center text-[12px] leading-[16px] font-medium text-rb-neutral-body">
          {t('page.lending.manageEmode.overview.row.borrowable')}
        </div>
      </div>
      <div className="mt-[12px] space-y-[12px]">
        {data.map((item) => (
          <div key={item.underlyingAsset} className="flex items-center">
            <div className="flex-1 flex items-center gap-[8px]">
              <SymbolIcon
                tokenSymbol={item.iconSymbol || item.symbol}
                size={24}
              />
              <span className="text-[12px] leading-[16px] font-medium text-r-neutral-title-1 truncate max-w-[100px]">
                {item.symbol}
              </span>
            </div>
            <div className="flex-1 flex justify-center">
              {item.collateral ? (
                <span className="text-[16px] text-r-green-default">✓</span>
              ) : (
                <span className="text-[16px] text-r-red-default">✗</span>
              )}
            </div>
            <div className="flex-1 flex justify-center">
              {item.borrowable ? (
                <span className="text-[16px] text-r-green-default">✓</span>
              ) : (
                <span className="text-[16px] text-r-red-default">✗</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

type ManageEmodeFullModalProps = {
  visible: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
};

export const ManageEmodeFullModal: React.FC<ManageEmodeFullModalProps> = ({
  visible,
  onCancel,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const wallet = useWallet();
  const currentAccount = useCurrentAccount();
  const { emodeEnabled, emodeCategoryId, eModes } = useMode();
  const { chainInfo } = useSelectedMarket();
  const { refresh } = useRefreshHistoryId();
  const { userReserves, reserves } = useLendingRemoteData();
  const {
    iUserSummary,
    formattedPoolReservesAndIncentives,
  } = useLendingSummary();
  const { pools } = usePoolDataProviderContract();

  const [isLoading, setIsLoading] = useState(false);
  const [miniSignLoading, setMiniSignLoading] = useState(false);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [isChecked, setIsChecked] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    emodeCategoryId || 0
  );

  const wantDisableEmode = emodeEnabled;

  const isTargetCategoryAvailable = useMemo(() => {
    const targetCategory = eModes?.[selectedCategoryId];
    return iUserSummary && targetCategory
      ? isEModeCategoryAvailable(iUserSummary, targetCategory)
      : false;
  }, [eModes, iUserSummary, selectedCategoryId]);

  const hasChangeCategory = useMemo(() => {
    return selectedCategoryId !== emodeCategoryId || wantDisableEmode;
  }, [selectedCategoryId, emodeCategoryId, wantDisableEmode]);

  const newSummary = useMemo(() => {
    return formatUserSummary({
      currentTimestamp: dayjs().unix(),
      userReserves: userReserves?.userReserves || [],
      formattedReserves: formattedPoolReservesAndIncentives || [],
      userEmodeCategoryId: wantDisableEmode ? 0 : selectedCategoryId || 0,
      marketReferenceCurrencyDecimals:
        reserves?.baseCurrencyData?.marketReferenceCurrencyDecimals || 0,
      marketReferencePriceInUsd:
        reserves?.baseCurrencyData?.marketReferenceCurrencyPriceInUsd || 0,
    });
  }, [
    wantDisableEmode,
    formattedPoolReservesAndIncentives,
    reserves?.baseCurrencyData?.marketReferenceCurrencyDecimals,
    reserves?.baseCurrencyData?.marketReferenceCurrencyPriceInUsd,
    selectedCategoryId,
    userReserves?.userReserves,
  ]);

  const { isRisky, isBlock, desc } = useMemo(() => {
    if (Number(newSummary?.healthFactor || '0') <= 0) {
      return { isRisky: false, isBlock: false, desc: '' };
    }
    const _isRisky =
      Number(newSummary?.healthFactor || '0') < HF_RISK_CHECKBOX_THRESHOLD;
    const _isBlock =
      Number(newSummary?.healthFactor || '0') <= HF_BLOCK_THRESHOLD;
    return {
      isRisky: _isRisky,
      isBlock: _isBlock,
      desc: _isBlock
        ? t('page.lending.risk.blockEmodeWarning')
        : _isRisky
        ? t('page.lending.risk.emodeBlockWarning')
        : '',
    };
  }, [newSummary?.healthFactor, t]);

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

  const buildTx = useCallback(async () => {
    if (
      !currentAccount ||
      !pools ||
      !chainInfo ||
      !hasChangeCategory ||
      isBlock ||
      !isTargetCategoryAvailable
    ) {
      setTxs([]);
      return;
    }
    try {
      const manageEmodeResult = await buildManageEmodeTx({
        pool: pools.pool,
        address: currentAccount.address,
        categoryId: wantDisableEmode ? 0 : selectedCategoryId,
      });
      const txItems = Array.isArray(manageEmodeResult)
        ? manageEmodeResult
        : [manageEmodeResult];
      const resolved = await Promise.all(
        txItems.map((item: { tx: () => Promise<Record<string, unknown>> }) =>
          item.tx()
        )
      );
      const formatTxs: Tx[] = resolved.map((txData) => {
        const txObj = txData as {
          to?: string;
          data?: string;
          value?: { toHexString?: () => string } | string;
          from?: string;
          gasLimit?: number;
        };
        delete (txObj as Record<string, unknown>).gasLimit;
        return {
          ...txObj,
          from: txObj.from || currentAccount.address,
          value:
            typeof txObj.value === 'object' && txObj.value?.toHexString
              ? txObj.value.toHexString()
              : (txObj.value as string) || '0x0',
          chainId: chainInfo.id,
        } as Tx;
      });
      setTxs(formatTxs);
    } catch (error) {
      console.error('Manage emode build tx error:', error);
      setTxs([]);
    }
  }, [
    currentAccount,
    pools,
    chainInfo,
    hasChangeCategory,
    isBlock,
    isTargetCategoryAvailable,
    wantDisableEmode,
    selectedCategoryId,
  ]);

  useEffect(() => {
    if (!currentAccount || !canShowDirectSubmit) {
      prefetch({ txs: [] });
      return;
    }
    closeSign();
    if (!txs.length) {
      prefetch({ txs: [] });
      return;
    }
    prefetch({
      txs,
      ga: {
        category: 'Lending',
        source: 'Lending',
        trigger: wantDisableEmode ? 'ManageEmodeDisable' : 'ManageEmodeEnable',
      },
    }).catch(() => {});
  }, [
    currentAccount,
    canShowDirectSubmit,
    txs,
    prefetch,
    closeSign,
    wantDisableEmode,
  ]);

  useEffect(() => {
    if (!visible) {
      setTxs([]);
      setIsChecked(false);
      setSelectedCategoryId(emodeCategoryId || 0);
    }
  }, [visible, emodeCategoryId]);

  useEffect(() => {
    if (visible) buildTx();
  }, [visible, buildTx]);

  const handleSubmit = useCallback(
    async (forceFullSign?: boolean) => {
      if (!currentAccount || !txs.length) return;

      try {
        if (canShowDirectSubmit && !forceFullSign) {
          setMiniSignLoading(true);
          try {
            await openDirect({
              txs,
              ga: {
                category: 'Lending',
                source: 'Lending',
                trigger: wantDisableEmode
                  ? 'ManageEmodeDisable'
                  : 'ManageEmodeEnable',
              },
            });
            message.success(
              `${
                wantDisableEmode
                  ? t('page.lending.manageEmode.actions.disable')
                  : t('page.lending.manageEmode.actions.enable')
              } ${t('page.lending.submitted')}`
            );
            onCancel();
            refresh();
            onSuccess?.();
          } catch (error) {
            if (error === MINI_SIGN_ERROR.USER_CANCELLED) {
              onCancel();
              return;
            }
            if (error === MINI_SIGN_ERROR.CANT_PROCESS) {
              return;
            }
            await handleSubmit(true);
            return;
          } finally {
            setMiniSignLoading(false);
          }
          return;
        }

        setIsLoading(true);
        onCancel();
        for (let i = 0; i < txs.length; i++) {
          await wallet.sendRequest({
            method: 'eth_sendTransaction',
            params: [txs[i]],
            $ctx: {
              ga: {
                category: 'Lending',
                source: 'Lending',
                trigger: wantDisableEmode
                  ? 'ManageEmodeDisable'
                  : 'ManageEmodeEnable',
              },
            },
          });
        }
        message.success(
          `${
            wantDisableEmode
              ? t('page.lending.manageEmode.actions.disable')
              : t('page.lending.manageEmode.actions.enable')
          } ${t('page.lending.submitted')}`
        );
        refresh();
        onSuccess?.();
      } catch (error) {
        console.error('Manage emode error:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [
      currentAccount,
      txs,
      canShowDirectSubmit,
      openDirect,
      wallet,
      onCancel,
      onSuccess,
      wantDisableEmode,
      t,
      refresh,
    ]
  );

  const categoryOptions = useMemo(() => {
    if (!eModes || !iUserSummary) return [];
    return Object.values(eModes)
      .filter((e) => e.id !== 0 && e.assets?.length > 0)
      .map((e) => {
        const available = isEModeCategoryAvailable(iUserSummary, e);
        return {
          value: e.id,
          label: available
            ? e.label
            : `${e.label} ${t('page.lending.manageEmode.unavailable')}`,
          available,
        };
      });
  }, [eModes, iUserSummary, t]);

  const targetMode = eModes?.[selectedCategoryId];
  const healthFactor = iUserSummary?.healthFactor || '';
  const afterHealthFactor = newSummary?.healthFactor || '';
  const showLTVChange =
    iUserSummary?.currentLoanToValue !== '0' &&
    Number(newSummary.currentLoanToValue).toFixed(3) !==
      Number(iUserSummary?.currentLoanToValue).toFixed(3);
  const isEmptyHF =
    isHFEmpty(Number(healthFactor || '0')) &&
    isHFEmpty(Number(afterHealthFactor || '0'));

  const ltvLineContent =
    wantDisableEmode || !selectedCategoryId
      ? showLTVChange
        ? `${formatPercent(
            Number(iUserSummary?.currentLoanToValue || '0')
          )} → ${formatPercent(Number(newSummary.currentLoanToValue || '0'))}`
        : formatPercent(Number(newSummary.currentLoanToValue))
      : showLTVChange
      ? `${formatPercent(
          Number(iUserSummary?.currentLoanToValue || '0')
        )} → ${formatPercent(Number(targetMode?.ltv) / 10000)}`
      : formatPercent(Number(targetMode?.ltv) / 10000);

  const canSubmit =
    txs.length > 0 &&
    currentAccount &&
    !isLoading &&
    !isBlock &&
    isTargetCategoryAvailable &&
    (!isRisky || isChecked);

  if (!visible) return null;

  return (
    <Modal {...modalStyle} visible={visible} onCancel={onCancel}>
      <div className="bg-r-neutral-bg-2 rounded-[12px] p-[24px]">
        <h2 className="text-[20px] leading-[24px] font-bold text-center text-r-neutral-title-1">
          {wantDisableEmode
            ? t('page.lending.manageEmode.actions.disable')
            : t('page.lending.manageEmode.title')}
        </h2>
        {!wantDisableEmode && (
          <p className="text-[16px] leading-[24px] text-r-neutral-foot text-center mt-[8px]">
            {t('page.lending.manageEmode.description')}
          </p>
        )}

        <div className="mt-[24px] rounded-[8px] bg-rb-neutral-card-1 p-[20px] space-y-[26px]">
          <div>
            <div className="text-[14px] leading-[18px] font-medium text-r-neutral-foot mb-[12px]">
              {t('page.lending.manageEmode.overview.title')}
            </div>
            {wantDisableEmode ? (
              <div className="text-[17px] leading-[22px] font-bold text-r-neutral-title-1">
                {emodeCategoryId ? eModes?.[emodeCategoryId]?.label || '' : ''}
              </div>
            ) : (
              <Select
                className="w-full"
                placeholder={t(
                  'page.lending.manageEmode.categorySelector.placeholder'
                )}
                value={selectedCategoryId || undefined}
                onChange={(v) => setSelectedCategoryId(v ?? 0)}
                options={categoryOptions.map(({ value, label, available }) => ({
                  value,
                  label,
                  disabled: !available,
                }))}
                disabled={wantDisableEmode}
              />
            )}
            {!wantDisableEmode &&
              !isTargetCategoryAvailable &&
              selectedCategoryId && (
                <p className="text-[16px] leading-[24px] text-r-neutral-foot mt-[4px]">
                  {t('page.lending.manageEmode.categorySelector.desc')}
                </p>
              )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[14px] leading-[18px] font-medium text-r-neutral-foot">
              {t('page.lending.maxLtv')}
            </span>
            <span className="text-[16px] leading-[22px] font-bold text-r-neutral-title-1">
              {ltvLineContent}
            </span>
          </div>

          {!isEmptyHF && (
            <div className="flex items-center justify-between">
              <span className="text-[14px] leading-[18px] font-medium text-r-neutral-foot">
                {t('page.lending.hfTitle')}
              </span>
              <span className="text-[16px] leading-[22px] font-medium text-r-neutral-title-1">
                {afterHealthFactor ? (
                  <>
                    {getHealthFactorText(healthFactor)} →{' '}
                    {getHealthFactorText(afterHealthFactor)}
                  </>
                ) : (
                  getHealthFactorText(healthFactor)
                )}
              </span>
            </div>
          )}

          {!isEmptyHF && (
            <div className="flex justify-end">
              <span className="text-[12px] leading-[15px] text-r-neutral-foot">
                {t('page.lending.popup.liquidationAt')}
              </span>
            </div>
          )}

          {!wantDisableEmode && (
            <PairTable
              data={
                selectedCategoryId
                  ? eModes?.[selectedCategoryId]?.assets || []
                  : []
              }
            />
          )}
        </div>

        {canShowDirectSubmit &&
          hasChangeCategory &&
          !isBlock &&
          isTargetCategoryAvailable &&
          chainInfo?.serverId &&
          txs.length > 0 && (
            <div className="mt-[12px]">
              <DirectSignGasInfo
                supportDirectSign
                loading={isLoading}
                openShowMore={() => {}}
                chainServeId={chainInfo.serverId}
                noQuote={false}
                type="send"
              />
            </div>
          )}

        {isRisky && (
          <div className="mt-[16px] flex flex-col gap-[12px]">
            <div className="flex items-center gap-[8px] py-[8px] px-[10px] rounded-[8px] bg-rb-red-light-1">
              <RcIconWarningCC
                viewBox="0 0 16 16"
                className="w-15 h-15 text-rb-red-default flex-shrink-0"
              />
              <span className="text-[14px] leading-[18px] font-medium text-rb-red-default flex-1">
                {desc}
              </span>
            </div>
            {!isBlock && (
              <div className="flex items-center justify-center gap-[8px]">
                <Checkbox
                  checked={isChecked}
                  onChange={(e) => setIsChecked(e.target.checked)}
                  className="text-[13px] text-r-neutral-foot"
                >
                  {t('page.lending.risk.checkbox')}
                </Checkbox>
              </div>
            )}
          </div>
        )}

        {canShowDirectSubmit && currentAccount?.type ? (
          <DirectSignToConfirmBtn
            className="mt-[20px]"
            title={
              wantDisableEmode
                ? t('page.lending.manageEmode.actions.disable')
                : t('page.lending.manageEmode.actions.enable')
            }
            disabled={!canSubmit}
            loading={miniSignLoading}
            onConfirm={() => handleSubmit()}
            accountType={currentAccount.type}
          />
        ) : (
          <Button
            type={wantDisableEmode ? 'default' : 'primary'}
            block
            size="large"
            className={`mt-[20px] h-[48px] rounded-[8px] font-medium text-[16px] ${
              wantDisableEmode
                ? '!border-rb-neutral-line !bg-rb-neutral-line !text-r-neutral-title-1'
                : ''
            }`}
            loading={isLoading}
            disabled={!canSubmit}
            onClick={() => handleSubmit()}
          >
            {wantDisableEmode
              ? t('page.lending.manageEmode.actions.disable')
              : t('page.lending.manageEmode.actions.enable')}
          </Button>
        )}
      </div>
    </Modal>
  );
};
