import React, { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import BigNumber from 'bignumber.js';
import { ReactComponent as IconGasCustomRightArrowCC } from 'ui/assets/approval/edit-arrow-right.svg';
import { ReactComponent as IconGasLevelChecked } from '@/ui/assets/sign/check.svg';
import { formatGasHeaderUsdValue } from '@/ui/utils';
import { getGasLevelI18nKey } from '@/ui/utils/trans';
import { useMiniApprovalGas } from '@/ui/hooks/useMiniApprovalDirectSign';
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

export const useShowMoreGasSelectModalVisible = createGlobalState(false);

export const useGetShowMoreGasSelectVisible = () =>
  useShowMoreGasSelectModalVisible()[0];

export default function ShowMoreGasSelectModal({
  visible,
  onCancel,
  onConfirm,
  children,
  //   layout,
}) {
  const { t } = useTranslation();
  const miniApprovalGas = useMiniApprovalGas();

  const calcGasAccountUsd = useCallback((n) => {
    const v = Number(n);
    if (!Number.isNaN(v) && v < 0.0001) {
      return `$${n}`;
    }
    return formatGasHeaderUsdValue(n || '0');
  }, []);

  const hasCustomRpc = !miniApprovalGas?.noCustomRPC;

  const [_, setVisible] = useShowMoreGasSelectModalVisible();

  useEffect(() => {
    setVisible(false);
    return () => {
      setVisible(false);
    };
  }, []);

  if (!miniApprovalGas) return null;

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
              active={miniApprovalGas.gasMethod === 'native'}
              onChange={(e) => {
                e.stopPropagation();
                miniApprovalGas?.onChangeGasMethod?.('native');
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
                  active={miniApprovalGas.gasMethod === 'gasAccount'}
                  onChange={(e) => {
                    e.stopPropagation();
                    if (hasCustomRpc) {
                      return;
                    }
                    miniApprovalGas?.onChangeGasMethod?.('gasAccount');
                  }}
                  ActiveComponent={RcIconGasAccountActive}
                  BlurComponent={RcIconGasAccountBlurCC}
                  title={t('page.gasAccount.title')}
                />
              </div>
            </Tooltip>
          </div>

          <div className="space-y-2 w-full px-4 pb-[4px]">
            {miniApprovalGas.gasList?.map((gas) => {
              const gwei = new BigNumber(gas.price / 1e9).toFixed().slice(0, 8);
              const levelTitle = t(getGasLevelI18nKey(gas.level));
              const isActive = miniApprovalGas.selectedGas?.level === gas.level;
              const isCustom = gas.level === 'custom';
              let costUsd =
                miniApprovalGas.gasMethod === 'native'
                  ? miniApprovalGas.gasUsdList?.[gas.level]
                  : miniApprovalGas?.gasAccountIsNotEnough?.[gas.level]?.[1];

              const isNotEnough =
                miniApprovalGas.gasMethod === 'native'
                  ? miniApprovalGas?.gasIsNotEnough?.[gas.level]
                  : miniApprovalGas?.gasAccountIsNotEnough?.[gas.level]?.[0];

              const isGasAccountLoading =
                !isActive &&
                miniApprovalGas.gasMethod === 'gasAccount' &&
                (miniApprovalGas?.gasAccountIsNotEnough?.[gas.level]?.[1] ===
                  '' ||
                  miniApprovalGas?.gasAccountIsNotEnough?.[gas.level]?.[1] ===
                    0);

              const errorOnGasAccount =
                miniApprovalGas.gasMethod === 'gasAccount' &&
                !!miniApprovalGas?.gasAccountError;

              costUsd = isActive
                ? miniApprovalGas.gasMethod === 'gasAccount'
                  ? calcGasAccountUsd(
                      (miniApprovalGas?.gasAccountCost?.estimate_tx_cost || 0) +
                        (miniApprovalGas?.gasAccountCost?.gas_cost || 0)
                    )
                  : miniApprovalGas!.gasCostUsdStr
                : costUsd;

              return (
                <div
                  key={gas.level}
                  onClick={() => {
                    miniApprovalGas?.externalPanelSelection?.(gas);
                    if (gas.level === 'custom')
                      miniApprovalGas?.handleClickEdit?.();
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
