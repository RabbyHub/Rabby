import IconUnknown from '@/ui/assets/token-default.svg';
import { ReactComponent as IconArrowDownCC } from '@/ui/assets/swap/arrow-down-cc.svg';
import { ReactComponent as IconGasCustomRightArrowCC } from 'ui/assets/approval/edit-arrow-right.svg';
import { ReactComponent as RcIconLoading } from 'ui/component/ChainSelector/icons/loading-cc.svg';
import { ReactComponent as RcIconGasBlurCC } from 'ui/assets/sign/tx/gas-blur-cc.svg';
import { ReactComponent as RcIconGasTabActive } from '@/ui/assets/swap/gas-token-tab-active.svg';
import { ReactComponent as RcIconGasAccountTabCC } from '@/ui/assets/swap/gas-account-tab-cc.svg';
import { Popup, TokenWithChain } from 'ui/component';
import { formatTokenAmount, formatUsdValue } from '@/ui/utils/number';
import { getTokenSymbol } from '@/ui/utils/token';
import { getUiType } from '@/ui/utils';
import { calcMaxPriorityFee } from '@/utils/transaction';
import { getGasLevelI18nKey } from '@/ui/utils/trans';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import React from 'react';
import { Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import { ReactComponent as RcIconRefreshCC } from '@/ui/assets/swap/quote-refresh-cc.svg';
import { GasLevelIcon } from '../GasMenuButton';
import { calcGasAccountUsd } from './directSignSummary';
import {
  canDisplaySharedGasAccountForApproval,
  isGasAccountBalanceEnoughForDisplay,
  resolveApprovalGasMethod,
  resolveApprovalDisplayedGasLevelNotEnough,
  resolveApprovalGasLevelMethod,
  shouldHideApprovalGasMethodTabs,
} from './approvalGasDisplay';
import type { SignMainnetSupportedGasLevel } from './signMainnetGasLevelPrefetch';
import type { SignMainnetShowMoreGasModalProps } from './SignMainnetShowMoreGasModal';

type Props = Omit<SignMainnetShowMoreGasModalProps, 'children'> & {
  renderQuotes(onSelect: () => void): React.ReactNode;
  onRefreshQuotes(): void;
  quotesLoading?: boolean;
};

export const SignMainnetSwapGasQuotePopup = ({
  visible,
  onVisibleChange,
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
  pendingHardwareGasAccountBalance,
  nativeTokenInsufficient,
  isWalletConnect = false,
  levelState,
  autoOpenSignal = 0,
  showTempoGasTokenSelector = false,
  selectedGasToken,
  tempoGasTokenList = [],
  onSelectTempoGasToken,
  tempoGasTokenLoading = false,
  getContainer,
  onEditCustomGas,
  renderQuotes,
  onRefreshQuotes,
  quotesLoading,
}: Props) => {
  const { t } = useTranslation();
  const currentGasMethod = gasMethod ?? 'native';
  const noCustomRPCEnabled = noCustomRPC ?? true;
  const uiType = React.useMemo(() => getUiType(), []);
  const [tempoGasTokenVisible, setTempoGasTokenVisible] = React.useState(false);
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

  const renderGasMethod = ({
    value,
    ActiveComponent,
    BlurComponent,
    title,
  }: {
    value: 'native' | 'gasAccount';
    ActiveComponent: React.FC<React.SVGProps<SVGSVGElement>>;
    BlurComponent: React.FC<React.SVGProps<SVGSVGElement>>;
    title: React.ReactNode;
  }) => {
    const active = currentGasMethod === value;
    const disabled = value === 'gasAccount' && !noCustomRPCEnabled;
    return (
      <Tooltip
        placement="top"
        overlayClassName="rectangle w-[max-content]"
        title={
          disabled ? t('page.signTx.BroadcastMode.tips.customRPC') : undefined
        }
      >
        <div
          className={clsx(
            'flex h-[24px] items-center gap-4 rounded-[4px] px-8',
            disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
            active ? 'bg-r-blue-light1' : 'bg-transparent'
          )}
          onClick={(e) => {
            e.stopPropagation();
            if (disabled) return;
            onChangeGasMethod?.(value);
          }}
        >
          {active ? (
            <ActiveComponent className="h-14 w-14 text-r-blue-default" />
          ) : (
            <BlurComponent className="h-14 w-14 text-r-neutral-foot" />
          )}
          <span
            className={clsx(
              'text-12 font-normal',
              active ? 'text-r-blue-default' : 'text-r-neutral-foot'
            )}
          >
            {title}
          </span>
        </div>
      </Tooltip>
    );
  };

  const renderGasLevel = (gas: typeof gasList[number]) => {
    const gwei = new BigNumber(gas.price / 1e9).toFixed().slice(0, 8);
    const levelTitle = t(getGasLevelI18nKey(gas.level));
    const isActive = selectedGas?.level === gas.level;
    const isCustom = gas.level === 'custom';
    const levelKey = gas.level as SignMainnetSupportedGasLevel;
    const levelGasAccountResult = isCustom
      ? undefined
      : levelState[levelKey]?.gasAccountResult;
    const displayGasAccountCost = isActive
      ? levelGasAccountResult || gasAccountCost
      : levelGasAccountResult;
    const gasAccountChainSupported = isActive
      ? !!displayGasAccountCost && !displayGasAccountCost.chain_not_support
      : !displayGasAccountCost?.chain_not_support;
    const levelGasAccountBalanceEnough = isGasAccountBalanceEnoughForDisplay({
      gasAccountCost: displayGasAccountCost,
      pendingHardwareGasAccountBalance,
    });
    const levelSupportedUseGasAccount = canDisplaySharedGasAccountForApproval({
      gasAccountBalanceEnough: levelGasAccountBalanceEnough,
      gasAccountChainSupported,
      noCustomRPC: noCustomRPCEnabled,
      gasAccountErrMsg: displayGasAccountCost?.err_msg,
      isWalletConnect,
    });
    const levelNativeNotEnough = isCustom
      ? undefined
      : levelState[levelKey]?.nativeNotEnough;
    const levelNativeInsufficient = !!levelNativeNotEnough;
    const displayNativeInsufficient =
      isActive && levelNativeNotEnough !== undefined
        ? levelNativeNotEnough
        : !!nativeTokenInsufficient;
    const displayMethod = isActive
      ? resolveApprovalGasMethod({
          nativeTokenInsufficient: displayNativeInsufficient,
          gasAccountChainSupported,
          noCustomRPC: noCustomRPCEnabled,
          freeGasAvailable,
          legacyGasMethod: currentGasMethod,
          isWalletConnect,
        })
      : resolveApprovalGasLevelMethod({
          isCustom,
          currentGasMethod,
          nativeTokenInsufficient: levelNativeInsufficient,
          gasAccountChainSupported,
          noCustomRPC: noCustomRPCEnabled,
          freeGasAvailable,
          sharedGasAccountAvailable: levelSupportedUseGasAccount,
        });
    const isRowLoading = !!levelState[levelKey]?.loading;
    let costUsd =
      displayMethod === 'native'
        ? levelState[levelKey]?.nativeUsd
        : levelState[levelKey]?.gasAccount?.[1];
    const isNotEnough = resolveApprovalDisplayedGasLevelNotEnough({
      isActive,
      displayMethod,
      nativeTokenInsufficient: displayNativeInsufficient,
      gasAccountBalanceEnough: levelGasAccountBalanceEnough,
      levelNativeInsufficient,
      sharedGasAccountAvailable: levelSupportedUseGasAccount,
    });
    costUsd = isActive
      ? displayMethod === 'gasAccount'
        ? levelState[levelKey]?.gasAccount?.[1] ||
          calcGasAccountUsd(
            (gasAccountCost?.gas_account_cost.estimate_tx_cost || 0) +
              (gasAccountCost?.gas_account_cost.gas_cost || 0)
          )
        : levelState[levelKey]?.nativeUsd || selectedGasCostUsdStr
      : costUsd;

    const handleSelect = () => {
      if (isCustom) {
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
        className={clsx(
          'flex h-[106px] min-w-0 flex-1 cursor-pointer flex-col items-center justify-center gap-12 rounded-[8px] border border-solid py-12',
          isActive
            ? 'border-r-blue-default bg-r-blue-light1'
            : 'border-transparent bg-r-neutral-card-1'
        )}
        onClick={handleSelect}
      >
        <div className="flex flex-col items-center gap-4">
          <GasLevelIcon
            isActive={false}
            overWriteClass="h-20 w-20 text-r-neutral-body"
            level={gas.level}
          />
          {isCustom ? (
            <span className="text-13 font-medium text-r-neutral-title-1">
              {levelTitle}
            </span>
          ) : (
            <span
              className={clsx(
                'text-13 font-medium',
                isNotEnough ? 'text-r-red-default' : 'text-r-neutral-title-1'
              )}
            >
              {isRowLoading ? (
                <RcIconLoading
                  className="h-12 w-12 animate-spin"
                  viewBox="0 0 20 20"
                />
              ) : (
                costUsd || '-'
              )}
            </span>
          )}
        </div>
        {isCustom ? (
          <div className="flex h-[30px] items-center justify-center">
            <IconGasCustomRightArrowCC className="h-14 w-14 text-r-neutral-foot" />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-12 text-r-neutral-foot">
            <span className="font-medium">{levelTitle}</span>
            <span className="font-normal">{gwei} Gwei</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Popup
        visible={visible}
        onCancel={() => onVisibleChange(false)}
        height={571}
        closable={false}
        maskClosable
        destroyOnClose
        bodyStyle={{ padding: 0 }}
        isNew
        isSupportDarkMode
        className="z-[999]"
        getContainer={getContainer}
      >
        <div className="flex h-full flex-col gap-24 overflow-hidden rounded-t-[16px] bg-r-neutral-bg-2 p-20 pb-0 shadow-[0_-12px_10px_rgba(35,47,129,0.1)]">
          <div className="flex shrink-0 flex-col gap-12">
            <div className="flex items-center justify-between">
              <span className="text-[16px] font-medium text-r-neutral-title-1">
                {t('global.gas')}
              </span>
              {shouldHideApprovalGasMethodTabs() ? null : (
                <div className="flex items-center rounded-[4px] bg-r-neutral-card-1 p-2">
                  {renderGasMethod({
                    value: 'native',
                    ActiveComponent: RcIconGasTabActive,
                    BlurComponent: RcIconGasBlurCC,
                    title: t('page.gasAccount.gasToken'),
                  })}
                  {renderGasMethod({
                    value: 'gasAccount',
                    ActiveComponent: RcIconGasAccountTabCC,
                    BlurComponent: RcIconGasAccountTabCC,
                    title: t('page.gasAccount.title'),
                  })}
                </div>
              )}
            </div>

            {showTempoGasTokenSelector && currentGasMethod !== 'gasAccount' ? (
              <div
                className="flex h-[32px] cursor-pointer items-center justify-between rounded-[6px] bg-r-neutral-card-1 px-8"
                onClick={() => {
                  onVisibleChange(false);
                  setTempoGasTokenVisible(true);
                }}
              >
                <span className="text-12 text-r-neutral-foot">
                  {t('page.gasAccount.gasToken')}
                </span>
                <div className="flex items-center">
                  <img
                    src={selectedGasToken?.logoUrl || IconUnknown}
                    className="mr-4 h-14 w-14 rounded-full"
                  />
                  <span className="mr-2 text-12 font-medium text-r-neutral-title-1">
                    {selectedGasToken?.symbol || '-'}
                  </span>
                  <IconArrowDownCC className="text-r-neutral-foot" />
                </div>
              </div>
            ) : null}

            <div className="flex w-full items-stretch gap-6">
              {gasList.map(renderGasLevel)}
            </div>
          </div>

          <div className="h-px w-full shrink-0 bg-r-neutral-line" />

          <div className="flex min-h-0 flex-1 flex-col gap-16">
            <div className="flex shrink-0 flex-col gap-12">
              <div className="flex items-center justify-between">
                <span className="text-[16px] font-medium text-r-neutral-title-1">
                  {t('page.swap.quotes')}
                </span>
                <div
                  className="flex cursor-pointer items-center gap-4 text-r-blue-default"
                  onClick={onRefreshQuotes}
                >
                  <div className="h-14 w-14 overflow-hidden">
                    <RcIconRefreshCC
                      className={clsx(
                        'h-14 w-14',
                        quotesLoading && 'animate-spin'
                      )}
                    />
                  </div>
                  <span className="text-13 font-medium">
                    {t('global.refresh')}
                  </span>
                </div>
              </div>
              <div className="text-12 leading-[14px] text-r-neutral-foot">
                {t('page.swap.best-subtitle')}
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {renderQuotes(() => onVisibleChange(false))}
            </div>
          </div>
        </div>
      </Popup>

      <Popup
        isNew
        visible={tempoGasTokenVisible}
        title={t('page.gasAccount.gasToken')}
        onCancel={() => setTempoGasTokenVisible(false)}
        destroyOnClose
        closable
        height="auto"
        isSupportDarkMode
        className={clsx(uiType.isPop && 'is-popup')}
        getContainer={getContainer}
      >
        <div className="max-h-[420px] overflow-y-auto pr-2">
          {tempoGasTokenLoading ? (
            <div className="flex h-[120px] items-center justify-center">
              <RcIconLoading
                className="h-20 w-20 animate-spin text-r-neutral-foot"
                viewBox="0 0 20 20"
              />
            </div>
          ) : (
            tempoGasTokenList.map((item) => {
              const isDisabled = !!item.isDisabledByTempoGasBalance;
              return (
                <div
                  key={item.id}
                  className={clsx(
                    'mb-8 flex h-[52px] items-center justify-between rounded-[8px] border border-transparent bg-r-neutral-card-1 px-10',
                    isDisabled
                      ? 'cursor-not-allowed opacity-50'
                      : 'cursor-pointer hover:border-r-blue-default hover:bg-r-blue-light1'
                  )}
                  onClick={() => {
                    if (isDisabled) return;
                    onSelectTempoGasToken?.(item);
                    setTempoGasTokenVisible(false);
                  }}
                >
                  <div className="flex items-center">
                    <TokenWithChain
                      token={item}
                      width="32px"
                      height="32px"
                      className="mr-12"
                    />
                    <div className="text-[15px] font-medium text-r-neutral-title1">
                      {getTokenSymbol(item)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[15px] font-medium text-r-neutral-title1">
                      {formatUsdValue(item.usd_value || 0)}
                    </div>
                    <div className="text-12 text-r-neutral-foot">
                      {formatTokenAmount(item.amount)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Popup>
    </>
  );
};
