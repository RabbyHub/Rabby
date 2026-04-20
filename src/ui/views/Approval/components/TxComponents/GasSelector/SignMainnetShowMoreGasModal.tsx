import { calcMaxPriorityFee } from '@/utils/transaction';
import { getGasLevelI18nKey } from '@/ui/utils/trans';
import { ReactComponent as IconGasCustomRightArrowCC } from 'ui/assets/approval/edit-arrow-right.svg';
import { ReactComponent as IconGasLevelChecked } from '@/ui/assets/sign/check.svg';
import { ReactComponent as RcIconLoading } from 'ui/component/ChainSelector/icons/loading-cc.svg';
import { Dropdown, Tooltip } from 'antd';
import { GasLevel } from '@rabby-wallet/rabby-api/dist/types';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { GasLevelIcon } from '../GasMenuButton';
import { ReactComponent as RcIconGasActive } from 'ui/assets/sign/tx/gas-active.svg';
import { ReactComponent as RcIconGasBlurCC } from 'ui/assets/sign/tx/gas-blur-cc.svg';
import { ReactComponent as RcIconGasAccountBlurCC } from 'ui/assets/sign/tx/gas-account-blur-cc.svg';
import { ReactComponent as RcIconGasAccountActive } from 'ui/assets/sign/tx/gas-account-active.svg';
import { calcGasAccountUsd } from './directSignSummary';
import { GasMethod } from '../GasSelectorHeader';
import {
  resolveApprovalGasMethod,
  resolveApprovalDisplayedGasLevelNotEnough,
  resolveApprovalGasLevelMethod,
  shouldHideApprovalGasMethodTabs,
} from './approvalGasDisplay';
import type {
  SignMainnetGasLevelState,
  SignMainnetSupportedGasLevel,
} from './signMainnetGasLevelPrefetch';

type SignMainnetGasChange = GasLevel & {
  gasLimit: number;
  nonce: number;
  maxPriorityFee: number;
};

type Props = {
  visible: boolean;
  onVisibleChange(open: boolean): void;
  children: React.ReactElement;
  gasList: GasLevel[];
  selectedGas: GasLevel | null;
  gasMethod?: 'native' | 'gasAccount';
  onChangeGasMethod?: (value: 'native' | 'gasAccount') => void;
  noCustomRPC?: boolean;
  freeGasAvailable?: boolean;
  chainId?: number;
  gasLimit: string | number | BigNumber;
  nonce: string | number;
  onChange: (gas: SignMainnetGasChange) => void;
  isCancel?: boolean;
  isSpeedUp?: boolean;
  selectedGasCostUsdStr: string;
  gasAccountCost?: {
    gas_account_cost: {
      total_cost: number;
      tx_cost: number;
      gas_cost: number;
      estimate_tx_cost: number;
    };
    is_gas_account: boolean;
    balance_is_enough: boolean;
    chain_not_support: boolean;
  };
  nativeTokenInsufficient?: boolean;
  levelState: SignMainnetGasLevelState;
  autoOpenSignal?: number;
  onEditCustomGas?: () => void;
};

const SignMainnetGasMethod = GasMethod;

export const SignMainnetShowMoreGasModal = ({
  visible,
  onVisibleChange,
  children,
  gasList,
  selectedGas,
  gasMethod,
  onChangeGasMethod,
  noCustomRPC,
  freeGasAvailable,
  chainId,
  gasLimit,
  nonce,
  onChange,
  isCancel,
  isSpeedUp,
  selectedGasCostUsdStr,
  gasAccountCost,
  nativeTokenInsufficient,
  levelState,
  autoOpenSignal = 0,
  onEditCustomGas,
}: Props) => {
  const { t } = useTranslation();
  const currentGasMethod = gasMethod ?? 'native';
  const noCustomRPCEnabled = noCustomRPC ?? true;
  const gasAccountChainSupported =
    !!gasAccountCost && !gasAccountCost.chain_not_support;
  const lastHandledAutoOpenSignalRef = React.useRef(0);

  React.useEffect(() => {
    if (
      !autoOpenSignal ||
      autoOpenSignal === lastHandledAutoOpenSignalRef.current ||
      visible
    ) {
      return;
    }

    lastHandledAutoOpenSignalRef.current = autoOpenSignal;
    onVisibleChange(true);
  }, [autoOpenSignal, onVisibleChange, visible]);

  return (
    <Dropdown
      placement="topRight"
      trigger={['click']}
      open={visible}
      onOpenChange={onVisibleChange}
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
          {shouldHideApprovalGasMethodTabs() ? null : (
            <div className="flex items-center p-2 m-[8px] rounded-md border-[0.5px] border-solid border-rabby-neutral-line bg-transparent">
              <SignMainnetGasMethod
                active={currentGasMethod === 'native'}
                onChange={(e) => {
                  e.stopPropagation();
                  onChangeGasMethod?.('native');
                }}
                ActiveComponent={RcIconGasActive}
                BlurComponent={RcIconGasBlurCC}
                title={t('page.gasAccount.gasToken')}
              />

              <Tooltip
                placement="top"
                overlayClassName="rectangle w-[max-content]"
                title={
                  !noCustomRPCEnabled
                    ? t('page.signTx.BroadcastMode.tips.customRPC')
                    : undefined
                }
              >
                <div
                  className={clsx(
                    !noCustomRPCEnabled && 'cursor-not-allowed opacity-50'
                  )}
                >
                  <SignMainnetGasMethod
                    active={currentGasMethod === 'gasAccount'}
                    onChange={(e) => {
                      e.stopPropagation();
                      if (!noCustomRPCEnabled) {
                        return;
                      }
                      onChangeGasMethod?.('gasAccount');
                    }}
                    ActiveComponent={RcIconGasAccountActive}
                    BlurComponent={RcIconGasAccountBlurCC}
                    title={t('page.gasAccount.title')}
                  />
                </div>
              </Tooltip>
            </div>
          )}

          <div className="space-y-2 w-full px-4 pb-[4px]">
            {gasList.map((gas) => {
              const gwei = new BigNumber(gas.price / 1e9).toFixed().slice(0, 8);
              const levelTitle = t(getGasLevelI18nKey(gas.level));
              const isActive = selectedGas?.level === gas.level;
              const isCustom = gas.level === 'custom';
              const levelKey = gas.level as SignMainnetSupportedGasLevel;
              const levelNativeInsufficient = isCustom
                ? false
                : !!levelState[levelKey]?.nativeNotEnough;
              const displayMethod = isActive
                ? resolveApprovalGasMethod({
                    nativeTokenInsufficient: !!nativeTokenInsufficient,
                    gasAccountChainSupported: !!gasAccountChainSupported,
                    noCustomRPC: noCustomRPCEnabled,
                    freeGasAvailable,
                    legacyGasMethod: currentGasMethod,
                  })
                : resolveApprovalGasLevelMethod({
                    isCustom,
                    currentGasMethod,
                    nativeTokenInsufficient: levelNativeInsufficient,
                    gasAccountChainSupported,
                    noCustomRPC: noCustomRPCEnabled,
                    freeGasAvailable,
                  });
              const isRowLoading = !!levelState[levelKey]?.loading;

              let costUsd =
                displayMethod === 'native'
                  ? levelState[levelKey]?.nativeUsd
                  : levelState[levelKey]?.gasAccount?.[1];

              const isNotEnough = resolveApprovalDisplayedGasLevelNotEnough({
                isActive,
                displayMethod,
                nativeTokenInsufficient: !!nativeTokenInsufficient,
                gasAccountBalanceEnough: gasAccountCost?.balance_is_enough,
                levelNativeInsufficient: levelState[levelKey]?.nativeNotEnough,
                levelGasAccountNotEnough: levelState[levelKey]?.gasAccount?.[0],
              });

              costUsd = isActive
                ? displayMethod === 'gasAccount'
                  ? calcGasAccountUsd(
                      (gasAccountCost?.gas_account_cost.estimate_tx_cost || 0) +
                        (gasAccountCost?.gas_account_cost.gas_cost || 0)
                    )
                  : selectedGasCostUsdStr
                : costUsd;

              const handleSelect = () => {
                if (shouldHideApprovalGasMethodTabs()) {
                  onChangeGasMethod?.(displayMethod);
                }

                if (gas.level === 'custom') {
                  onVisibleChange(false);
                  onEditCustomGas?.();
                  return;
                }

                onChange({
                  ...gas,
                  gasLimit: Number(gasLimit),
                  nonce: Number(nonce),
                  level: gas.level,
                  maxPriorityFee: calcMaxPriorityFee(
                    gasList,
                    gas,
                    chainId || 0,
                    !!(isCancel || isSpeedUp)
                  ),
                });
                onVisibleChange(false);
              };

              return (
                <div
                  key={gas.level}
                  onClick={handleSelect}
                  className={clsx(
                    'flex justify-between items-center',
                    'px-[8px] h-[48px] rounded-[6px]',
                    'cursor-pointer',
                    'hover:bg-r-blue-light-1',
                    isActive ? 'bg-r-blue-light-1' : 'bg-transparent'
                  )}
                >
                  <div className="flex items-center space-x-1 gap-[6px] min-w-0">
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
                    <div className="flex items-center gap-6">
                      {isActive && costUsd ? (
                        <span
                          className={clsx(
                            'text-[13px] font-medium',
                            isNotEnough
                              ? 'text-r-red-default'
                              : 'text-r-neutral-title-1'
                          )}
                        >
                          {costUsd}
                        </span>
                      ) : null}
                      <IconGasCustomRightArrowCC className="text-r-neutral-foot" />
                    </div>
                  ) : (
                    <span
                      className={clsx(
                        'text-[13px] font-medium',
                        isNotEnough
                          ? 'text-r-red-default'
                          : 'text-r-neutral-title-1'
                      )}
                    >
                      {isRowLoading ? (
                        <RcIconLoading
                          className="w-12 h-12 animate-spin"
                          viewBox="0 0 20 20"
                        />
                      ) : (
                        costUsd || '-'
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
};

export default SignMainnetShowMoreGasModal;
