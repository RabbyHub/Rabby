import React, { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import BigNumber from 'bignumber.js';
import { ReactComponent as IconGasCustomRightArrowCC } from 'ui/assets/approval/edit-arrow-right.svg';
import { ReactComponent as IconGasLevelChecked } from '@/ui/assets/sign/check.svg';
import { formatGasHeaderUsdValue, getUiType } from '@/ui/utils';
import { getGasLevelI18nKey } from '@/ui/utils/trans';
import { Dropdown, Modal, Tooltip } from 'antd';
import { GasLevelIcon } from '../../Approval/components/TxComponents/GasMenuButton';

import { ReactComponent as RcIconGasActive } from 'ui/assets/sign/tx/gas-active.svg';
import { ReactComponent as RcIconGasBlurCC } from 'ui/assets/sign/tx/gas-blur-cc.svg';

import { ReactComponent as RcIconGasAccountBlurCC } from 'ui/assets/sign/tx/gas-account-blur-cc.svg';
import { ReactComponent as RcIconGasAccountActive } from 'ui/assets/sign/tx/gas-account-active.svg';
import { GasMethod } from '../../Approval/components/TxComponents/GasSelectorHeader';
import clsx from 'clsx';
import { createGlobalState } from 'react-use';
import { ReactComponent as RcIconLoading } from 'ui/component/ChainSelector/icons/loading-cc.svg';
import {
  useSignatureStore,
  signatureStore,
} from '@/ui/component/MiniSignV2/state';
import { Popup } from '@/ui/component';
import styled, { css } from 'styled-components';
import { GAS_ACCOUNT_INSUFFICIENT_TIP } from '../../GasAccount/hooks/checkTxs';
import { GasLevel } from '@rabby-wallet/rabby-api/dist/types';

export const useShowMoreGasSelectModalVisible = createGlobalState(false);

export const useGetShowMoreGasSelectVisible = () =>
  useShowMoreGasSelectModalVisible()[0];

const useGasInfoByUI = createGlobalState<
  | {
      externalPanelSelection: (gas: GasLevel) => void;
      handleClickEdit: () => void;
      gasCostUsdStr: string;
      gasUsdList: {
        slow: string;
        normal: string;
        fast: string;
      };
      gasIsNotEnough: {
        slow: boolean;
        normal: boolean;
        fast: boolean;
      };
      gasAccountIsNotEnough: {
        slow: [boolean, string];
        normal: [boolean, string];
        fast: [boolean, string];
      };
      gasAccountCost?: {
        total_cost: number;
        tx_cost: number;
        gas_cost: number;
        estimate_tx_cost: number;
      };
    }
  | undefined
>(undefined);

export const [useGetGasInfoByUI, useSetGasInfoByUI] = [
  () => useGasInfoByUI()[0],
  () => useGasInfoByUI()[1],
];

export default function ShowMoreGasSelectModal({
  visible,
  onCancel,
  onConfirm,
  children,
  //   layout,
}) {
  const { t } = useTranslation();

  const state = useSignatureStore();
  const { ctx, config, status } = state;
  const gasInfoByUI = useGetGasInfoByUI();
  const setGasInfoByUI = useSetGasInfoByUI();

  useEffect(() => {
    if (['idle', 'prefetching'].includes(status) || !ctx?.txsCalc?.length) {
      setGasInfoByUI(undefined);
    }
  }, [setGasInfoByUI, status, ctx?.txsCalc?.length]);

  const calcGasAccountUsd = useCallback((n) => {
    const v = Number(n);
    if (!Number.isNaN(v) && v < 0.0001) {
      return `$${n}`;
    }
    return formatGasHeaderUsdValue(n || '0');
  }, []);

  const hasCustomRpc = !ctx?.noCustomRPC;

  const [_, setVisible] = useShowMoreGasSelectModalVisible();

  // Gas 方法切换 - 添加异步处理
  const handleChangeGasMethod = useCallback(
    async (method: 'native' | 'gasAccount') => {
      try {
        signatureStore.setGasMethod(method);
      } catch (error) {
        console.error('Gas method change error:', error);
      }
    },
    [ctx?.selectedGas]
  );

  useEffect(() => {
    setVisible(false);
    return () => {
      setVisible(false);
    };
  }, []);

  const uiType = useMemo(() => getUiType(), []);
  const {
    externalPanelSelection,
    handleClickEdit,
    gasCostUsdStr,
    gasUsdList,
    gasIsNotEnough,
    gasAccountIsNotEnough,
    gasAccountCost,
  } = gasInfoByUI || {};
  const gasAccountErrorMsg = (ctx?.gasAccount as any)?.err_msg as string;
  const gasAccountError =
    !!gasAccountErrorMsg &&
    gasAccountErrorMsg?.toLowerCase() !==
      GAS_ACCOUNT_INSUFFICIENT_TIP.toLowerCase();

  if (!ctx?.txsCalc?.length) return null;

  return (
    <Dropdown
      onVisibleChange={(v) => {
        setVisible(v);
      }}
      placement="topRight"
      trigger={['click']}
      overlay={
        <div
          className={clsx(
            'w-[256px] rounded-[8px]',
            'bg-r-neutral-bg1',
            'border border-solid border-rabby-neutral-line'
          )}
          style={{
            boxShadow: '0px 4px 12px 0px rgba(0, 0, 0, 0.10)',
          }}
        >
          <div className="flex items-center p-2 m-[8px] rounded-md border-[0.5px] border-solid border-rabby-neutral-line bg-transparent">
            <GasMethod
              active={ctx?.gasMethod === 'native'}
              onChange={(e) => {
                e.stopPropagation();
                handleChangeGasMethod?.('native');
              }}
              ActiveComponent={RcIconGasActive}
              BlurComponent={RcIconGasBlurCC}
              title={t('page.gasAccount.gasToken')}
            />

            <Tooltip
              placement={'top'}
              overlayClassName="rectangle w-[max-content]"
              title={
                hasCustomRpc
                  ? t('page.signTx.BroadcastMode.tips.customRPC')
                  : undefined
              }
            >
              <div
                className={clsx(
                  hasCustomRpc && 'cursor-not-allowed opacity-50'
                )}
              >
                <GasMethod
                  active={ctx?.gasMethod === 'gasAccount'}
                  onChange={(e) => {
                    e.stopPropagation();
                    if (hasCustomRpc) {
                      return;
                    }
                    handleChangeGasMethod?.('gasAccount');
                  }}
                  ActiveComponent={RcIconGasAccountActive}
                  BlurComponent={RcIconGasAccountBlurCC}
                  title={t('page.gasAccount.title')}
                />
              </div>
            </Tooltip>
          </div>

          <div className="space-y-2 w-full px-4 pb-[4px]">
            {ctx.gasList?.map((gas) => {
              const gwei = new BigNumber(gas.price / 1e9).toFixed().slice(0, 8);
              const levelTitle = t(getGasLevelI18nKey(gas.level));
              const isActive = ctx.selectedGas?.level === gas.level;
              const isCustom = gas.level === 'custom';
              let costUsd =
                ctx.gasMethod === 'native'
                  ? gasUsdList?.[gas.level]
                  : gasAccountIsNotEnough?.[gas.level]?.[1];

              const isNotEnough =
                ctx.gasMethod === 'native'
                  ? gasIsNotEnough?.[gas.level]
                  : gasAccountIsNotEnough?.[gas.level]?.[0];

              const isGasAccountLoading =
                !isActive &&
                ctx.gasMethod === 'gasAccount' &&
                (gasAccountIsNotEnough?.[gas.level]?.[1] === '' ||
                  gasAccountIsNotEnough?.[gas.level]?.[1] === 0);

              const errorOnGasAccount =
                ctx.gasMethod === 'gasAccount' && !!gasAccountError;

              costUsd = isActive
                ? ctx.gasMethod === 'gasAccount'
                  ? calcGasAccountUsd(
                      (gasAccountCost?.estimate_tx_cost || 0) +
                        (gasAccountCost?.gas_cost || 0)
                    )
                  : gasCostUsdStr
                : costUsd;

              return (
                <div
                  key={gas.level}
                  onClick={() => {
                    externalPanelSelection?.(gas);
                    if (gas.level === 'custom') handleClickEdit?.();
                    onCancel();
                  }}
                  className={clsx(
                    'flex justify-between items-center',
                    'px-[8px] h-[48px] rounded-[6px]',
                    'cursor-pointer',
                    'hover:bg-r-blue-light-1',
                    isActive ? 'bg-r-blue-light-1' : 'bg-transparent'
                  )}
                >
                  <div className="flex items-center space-x-1 gap-[6px]">
                    <GasLevelIcon
                      isActive={false}
                      overWriteClass={clsx(
                        isActive
                          ? 'text-r-neutral-title-1'
                          : 'text-r-neutral-body'
                      )}
                      level={gas.level}
                    />
                    <span className="text-[13px] font-medium text-r-neutral-title-1">
                      {levelTitle}
                    </span>
                    {!isCustom && (
                      <span className="text-[12px] text-r-neutral-foot">
                        {gwei} Gwei
                      </span>
                    )}
                    {isActive && (
                      <IconGasLevelChecked className="text-r-blue-default" />
                    )}
                  </div>
                  {isCustom ? (
                    <IconGasCustomRightArrowCC className="text-r-neutral-foot" />
                  ) : (
                    <span
                      className={clsx(
                        'text-[13px] font-medium',
                        (isNotEnough && !isGasAccountLoading) ||
                          errorOnGasAccount
                          ? 'text-r-red-default'
                          : 'text-r-neutral-title-1'
                      )}
                    >
                      {isGasAccountLoading ? (
                        <RcIconLoading
                          className="w-12 h-12 animate-spin"
                          viewBox="0 0 20 20"
                        />
                      ) : (
                        costUsd
                      )}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      }
    >
      {children}
    </Dropdown>
  );
}
