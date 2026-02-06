import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Button } from 'antd';
import { formatUserSummary } from '@aave/math-utils';
import dayjs from 'dayjs';
import { useWallet } from '@/ui/utils/WalletContext';
import { useSceneAccount } from '@/ui/hooks/backgroundState/useAccount';
import { message } from 'antd';
import { ModalCloseIcon } from '@/ui/views/DesktopProfile/components/TokenDetailModal';
import { useMiniSigner } from '@/ui/hooks/useSigner';
import { MINI_SIGN_ERROR } from '@/ui/component/MiniSignV2/state/SignatureManager';
import { DirectSignToConfirmBtn } from '@/ui/component/ToConfirmButton';
import { supportedDirectSign } from '@/ui/hooks/useMiniApprovalDirectSign';
import { DirectSignGasInfo } from '@/ui/views/Bridge/Component/BridgeShowMore';
import { ReactComponent as RcIconWarningCC } from '@/ui/assets/lending/warning-2.svg';
import { Tx } from '@rabby-wallet/rabby-api/dist/types';

import { useMode } from '../../hooks/useMode';
import { buildManageEmodeTx } from '../../utils/poolService';
import { useLendingSummary, useLendingRemoteData } from '../../hooks';
import { useSelectedMarket } from '../../hooks/market';
import { usePoolDataProviderContract } from '../../hooks/pool';
import {
  HF_BLOCK_THRESHOLD,
  HF_RISK_CHECKBOX_THRESHOLD,
} from '../../utils/constant';
import { isEModeCategoryAvailable } from '../../utils/emode';
import { StyledCheckbox } from '../BorrowModal';
import { ManageEmodeFullModalOverview } from './Overview';
import {
  PopupContainer,
  usePopupContainer,
} from '@/ui/hooks/usePopupContainer';
import clsx from 'clsx';

const modalStyle = {
  width: 400,
  title: null as React.ReactNode,
  bodyStyle: { background: 'transparent', padding: 0, minHeight: 600 } as const,
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

type ManageEmodeFullModalProps = {
  visible: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
  height?: number;
};

const ManageEmodeFullContent: React.FC<ManageEmodeFullModalProps> = ({
  visible,
  onCancel,
  onSuccess,
  height = 600,
}) => {
  const { t } = useTranslation();
  const wallet = useWallet();
  const [currentAccount] = useSceneAccount({
    scene: 'lending',
  });
  const { emodeEnabled, emodeCategoryId, eModes } = useMode();
  const { chainInfo } = useSelectedMarket();
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

  const wantDisableEmode = useMemo(() => emodeEnabled, [emodeEnabled]);
  const { getContainer } = usePopupContainer();

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
    // 无风险 或 用户未操作
    if (Number(newSummary?.healthFactor || '0') <= 0 || !hasChangeCategory) {
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
  }, [newSummary?.healthFactor, t, hasChangeCategory]);

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
      message.error('Something error');
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
              getContainer,
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
          await wallet.sendRequest(
            {
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
            },
            {
              account: currentAccount,
            }
          );
        }
        message.success(
          `${
            wantDisableEmode
              ? t('page.lending.manageEmode.actions.disable')
              : t('page.lending.manageEmode.actions.enable')
          } ${t('page.lending.submitted')}`
        );
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
      onCancel,
      wantDisableEmode,
      t,
      onSuccess,
      openDirect,
      getContainer,
      wallet,
    ]
  );

  const canSubmit = useMemo(() => {
    return (
      txs.length > 0 &&
      currentAccount &&
      !isLoading &&
      !isBlock &&
      isTargetCategoryAvailable &&
      (!isRisky || isChecked)
    );
  }, [
    txs.length,
    currentAccount,
    isLoading,
    isBlock,
    isTargetCategoryAvailable,
    isRisky,
    isChecked,
  ]);
  const isUnAvailable = useMemo(() => {
    return !isTargetCategoryAvailable && !!selectedCategoryId;
  }, [isTargetCategoryAvailable, selectedCategoryId]);
  if (!visible) return null;

  return (
    <div
      className="bg-r-neutral-bg-2 flex flex-col px-[20px] py-[16px] overscroll-y-auto"
      style={{ height: isRisky && wantDisableEmode ? 'auto' : height }}
    >
      <div className="text-[20px] leading-[24px] font-medium text-center text-r-neutral-title-1">
        {wantDisableEmode
          ? t('page.lending.manageEmode.actions.disable')
          : t('page.lending.manageEmode.title')}
      </div>
      {!wantDisableEmode && (
        <div className="text-[14px] leading-[17px] text-r-neutral-foot mt-[8px]">
          {t('page.lending.manageEmode.description')}
        </div>
      )}

      <ManageEmodeFullModalOverview
        selectedCategoryId={
          wantDisableEmode ? emodeCategoryId : selectedCategoryId
        }
        newSummary={newSummary}
        disabled={wantDisableEmode}
        onSelectCategory={setSelectedCategoryId}
        isUnAvailable={isUnAvailable}
      />

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

      <div className={clsx('mt-auto flex flex-col justify-end')}>
        {isRisky && (
          <div className="mt-[16px] flex flex-col gap-[12px]">
            <div className="flex items-center gap-8 py-8 px-10 rounded-[8px] bg-rb-neutral-card-1">
              <RcIconWarningCC
                viewBox="0 0 16 16"
                className="w-12 h-12 text-rb-red-default flex-shrink-0 -mt-2"
              />
              <span className="text-[14px] leading-[18px] font-medium text-rb-red-default flex-1">
                {desc}
              </span>
            </div>
            {!isBlock && (
              <div className="flex items-center justify-center gap-[8px]">
                <StyledCheckbox
                  checked={isChecked}
                  onChange={(e) => setIsChecked(e.target.checked)}
                  className="text-[13px] text-r-neutral-foot"
                >
                  {t('page.lending.risk.checkbox')}
                </StyledCheckbox>
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
    </div>
  );
};

export const ManageEmodeFullModal: React.FC<ManageEmodeFullModalProps> = (
  props
) => {
  const { visible, onCancel, height = 600 } = props;
  return (
    <Modal
      {...modalStyle}
      bodyStyle={{ ...modalStyle.bodyStyle, minHeight: height }}
      visible={visible}
      onCancel={onCancel}
    >
      <PopupContainer>
        <ManageEmodeFullContent {...props} />
      </PopupContainer>
    </Modal>
  );
};
