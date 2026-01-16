import React, { useMemo, useState } from 'react';
import { Button, Modal, Skeleton, Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { ModalCloseIcon } from '@/ui/views/DesktopProfile/components/TokenDetailModal';
import { SvgIconCross } from 'ui/assets';
import { TokenWithChain } from '@/ui/component';
import { ReactComponent as RcIconArrowRight } from '@/ui/assets/dashboard/settings/icon-right-arrow-cc.svg';
import { ReactComponent as RcIconHistory } from '@/ui/assets/swap/history.svg';
import { SvgPendingSpin } from '@/ui/assets';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { formatUsdValue } from '@/ui/utils/number';
import BigNumber from 'bignumber.js';
import {
  ARB_USDC_TOKEN_ID,
  ARB_USDC_TOKEN_ITEM,
} from '@/ui/views/Perps/constants';
import { getTokenSymbol } from '@/ui/utils/token';
import { TokenSelectPopup } from './TokenSelectPopup';
import { useDepositWithdraw } from './useDepositWithdraw';
import { PopupContainer } from '@/ui/hooks/usePopupContainer';
import { useRabbySelector } from '@/ui/store';
import { HistoryPopup } from './HistoryPopup';
import { ReactComponent as RcIconPending } from '@/ui/assets/perps/IconPending.svg';
import { DepositPending } from './DepositPending';
import { DashedUnderlineText } from '../DashedUnderlineText';

export type DepositWithdrawModalType = 'deposit' | 'withdraw';

interface DepositWithdrawModalProps {
  visible: boolean;
  type: DepositWithdrawModalType;
  onCancel: () => void;
}

const PERCENTAGE_OPTIONS = [
  { label: '25%', value: 0.25 },
  { label: '50%', value: 0.5 },
  { label: '75%', value: 0.75 },
  { label: 'Max', value: 1 },
];

export const DepositWithdrawModal: React.FC<DepositWithdrawModalProps> = ({
  visible,
  type,
  onCancel,
}) => {
  const { t } = useTranslation();
  const [historyVisible, setHistoryVisible] = useState(false);

  // Get pending history count
  const localLoadingHistory = useRabbySelector(
    (state) => state.perps.localLoadingHistory
  );
  const pendingCount = localLoadingHistory.length;

  const {
    // State
    usdValue,
    setUsdValue,
    selectedToken,
    tokenList,
    tokenListLoading,
    tokenSelectVisible,
    setTokenSelectVisible,
    isPreparingSign,
    isWithdrawLoading,
    quoteLoading,
    bridgeQuote,
    inputRef,

    // Computed
    availableBalance,
    depositMaxUsdValue,
    isDirectDeposit,
    estReceiveUsdValue,

    // Actions
    handlePercentageClick,
    handleTokenSelect,
    handleCloseTokenSelect,
    handleDepositClick,
    handleWithdrawClick,
  } = useDepositWithdraw(visible, type, onCancel);

  // Validation
  const amountValidation = useMemo(() => {
    const value = Number(usdValue) || 0;
    if (!usdValue) {
      return { isValid: false, error: null };
    }

    if (type === 'withdraw') {
      if (value > Number(availableBalance)) {
        return {
          isValid: false,
          error: 'insufficient_balance',
          errorMessage: t('page.perps.insufficientBalance'),
        };
      }
      if (value < 2) {
        return {
          isValid: false,
          error: 'minimum_limit',
          errorMessage: t('page.perps.depositAmountPopup.minimumWithdrawSize'),
        };
      }
      return { isValid: true, error: null };
    } else {
      if (value < 5) {
        return {
          isValid: false,
          error: 'minimum_limit',
          errorMessage: t('page.perps.depositAmountPopup.minimumDepositSize'),
        };
      }
      if (value > depositMaxUsdValue) {
        return {
          isValid: false,
          error: 'insufficient_balance',
          errorMessage: t('page.perps.insufficientBalance'),
        };
      }
      return { isValid: true, error: null };
    }
  }, [usdValue, t, depositMaxUsdValue, availableBalance, type]);

  const isValidAmount = useMemo(() => amountValidation.isValid, [
    amountValidation.isValid,
  ]);

  const estTimeMinutes = useMemo(() => {
    if (isDirectDeposit) {
      return 1;
    }

    if (bridgeQuote?.duration && bridgeQuote.duration < 60) {
      return 1;
    }

    return bridgeQuote?.duration ? Math.ceil(bridgeQuote.duration / 60) : 2;
  }, [bridgeQuote]);

  const quoteError = useMemo(() => {
    return type === 'deposit' &&
      selectedToken?.id !== ARB_USDC_TOKEN_ID &&
      isValidAmount &&
      !quoteLoading &&
      !bridgeQuote?.tx
      ? t('page.perps.depositAmountPopup.fetchQuoteFailed')
      : '';
  }, [bridgeQuote, quoteLoading, type, selectedToken, t, isValidAmount]);

  return (
    <>
      <Modal
        visible={visible}
        onCancel={onCancel}
        footer={null}
        width={400}
        centered
        bodyStyle={{ padding: 0, height: '520px', maxHeight: '520px' }}
        maskStyle={{
          zIndex: 1000,
          backdropFilter: 'blur(8px)',
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
        }}
        closeIcon={
          historyVisible ? null : (
            <SvgIconCross className="w-14 fill-current text-rb-neutral-title-1" />
          )
        }
        closable={!historyVisible}
        className="modal-support-darkmode desktop-perps-deposit-withdraw-modal"
      >
        <PopupContainer>
          <div className="bg-rb-neutral-bg-2 h-[520px] flex flex-col h-full relative overflow-hidden desktop-perps-deposit-withdraw-content">
            <div className="px-20 pt-16 flex-1 pb-24">
              {/* Header */}
              <div className="flex items-center justify-center gap-8 mb-16 relative">
                {/* History Button - Left Side */}
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 cursor-pointer"
                  onClick={() => setHistoryVisible(true)}
                >
                  {pendingCount > 0 ? (
                    <DepositPending pendingCount={pendingCount} />
                  ) : (
                    <RcIconHistory className="w-20 h-20 text-rb-neutral-title-1" />
                  )}
                </div>

                <h3 className="text-[20px] font-medium text-rb-neutral-title-1 text-center">
                  {type === 'deposit'
                    ? t('page.perps.deposit')
                    : t('page.perps.withdraw')}
                </h3>
              </div>

              {/* Amount Input */}
              <div className="bg-rb-neutral-bg-1 rounded-[8px] px-20 py-20 mb-12">
                <div className="flex flex-col items-center justify-center">
                  <input
                    ref={inputRef}
                    className={clsx(
                      'text-[32px] font-medium bg-transparent border-none p-0 text-center w-full outline-none focus:outline-none',
                      amountValidation.error
                        ? 'text-r-red-default'
                        : 'text-rb-neutral-title-1'
                    )}
                    placeholder="$0"
                    value={usdValue ? `$${usdValue}` : ''}
                    onChange={(e) => {
                      let value = e.target.value;
                      if (value.startsWith('$')) {
                        value = value.slice(1);
                      }
                      if (/^\d*\.?\d*$/.test(value) || value === '') {
                        setUsdValue(value);
                      }
                    }}
                  />
                  <div className="text-13 text-r-neutral-body mt-8">
                    {type === 'withdraw'
                      ? t('page.perps.availableBalance', {
                          balance: formatUsdValue(
                            availableBalance,
                            BigNumber.ROUND_DOWN
                          ),
                        })
                      : t('page.perps.balanceAvailable', {
                          balance: formatUsdValue(
                            depositMaxUsdValue,
                            BigNumber.ROUND_DOWN
                          ),
                        })}
                  </div>
                </div>

                {/* Percentage Buttons */}
                <div className="flex items-center justify-center gap-8 mt-16">
                  {PERCENTAGE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handlePercentageClick(option.value)}
                      className={clsx(
                        'px-20 h-[36px] flex items-center justify-center rounded-[8px] text-13 font-medium',
                        'hover:bg-rb-brand-light-1 hover:text-rb-brand-default',
                        'bg-rb-neutral-bg-2 text-rb-neutral-body'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {/* Error Message */}
                {(amountValidation.errorMessage || quoteError) && (
                  <div className="text-13 text-r-red-default text-center mt-12">
                    {amountValidation.errorMessage || quoteError}
                  </div>
                )}
              </div>

              {/* Token Selector */}
              <div
                onClick={() => {
                  if (type === 'deposit') {
                    setTokenSelectVisible(true);
                  }
                }}
                className={clsx(
                  'bg-rb-neutral-bg-1 rounded-[8px] w-full flex items-center justify-between text-13 px-16 h-[48px] border border-solid border-transparent',
                  type === 'deposit' &&
                    'hover:border-rabby-blue-default cursor-pointer'
                )}
              >
                <div className="text-r-neutral-body text-13">
                  {type === 'deposit'
                    ? t('page.perps.depositAmountPopup.payWith')
                    : t('page.perps.depositAmountPopup.receiveToken')}
                </div>
                <div className="flex items-center">
                  <TokenWithChain
                    token={selectedToken || ARB_USDC_TOKEN_ITEM}
                    hideConer
                    width="20px"
                    height="20px"
                  />
                  <div className="text-rb-neutral-title-1 font-medium text-13 ml-4">
                    {type === 'withdraw'
                      ? getTokenSymbol(ARB_USDC_TOKEN_ITEM)
                      : getTokenSymbol(selectedToken || ARB_USDC_TOKEN_ITEM)}
                  </div>
                  {type === 'deposit' && (
                    <ThemeIcon
                      className="icon icon-arrow-right text-rb-neutral-title-1 ml-4"
                      src={RcIconArrowRight}
                    />
                  )}
                </div>
              </div>

              {/* Info Section */}
              <div className="mt-12 space-y-8">
                {type === 'withdraw' && (
                  <>
                    <div className="flex items-center justify-between text-13">
                      <Tooltip
                        overlayClassName={clsx('rectangle')}
                        placement="top"
                        title={t('page.perps.depositAmountPopup.feeTipTooltip')}
                      >
                        <DashedUnderlineText className="text-r-neutral-foot">
                          {t(
                            'page.perps.depositAmountPopup.hyperliquidFeeLabel'
                          )}
                        </DashedUnderlineText>
                      </Tooltip>
                      <span className="text-rb-neutral-title-1">$1</span>
                    </div>
                    <div className="flex items-center justify-between text-13">
                      <span className="text-r-neutral-foot">
                        {t('page.perps.depositAmountPopup.estTimeLabel')}
                      </span>
                      <span className="text-rb-neutral-title-1">~5 min</span>
                    </div>
                    <div className="flex items-center justify-between text-13">
                      <span className="text-r-neutral-foot">
                        {t('page.perps.depositAmountPopup.estReceiveLabel')}
                      </span>
                      <span className="text-rb-neutral-title-1">
                        {usdValue && isValidAmount
                          ? formatUsdValue(Math.max(0, Number(usdValue) - 1))
                          : '-'}
                      </span>
                    </div>
                  </>
                )}

                {type === 'deposit' && isValidAmount && (
                  <>
                    <div className="flex items-center justify-between text-13">
                      {isDirectDeposit ? (
                        <span className="text-r-neutral-foot">
                          {t('page.perps.depositAmountPopup.estReceiveLabel')}
                        </span>
                      ) : (
                        <Tooltip
                          overlayClassName={clsx('rectangle')}
                          placement="top"
                          title={t(
                            'page.perps.depositAmountPopup.estReceiveTooltipNoTime'
                          )}
                        >
                          <DashedUnderlineText className="text-r-neutral-foot">
                            {t('page.perps.depositAmountPopup.estReceiveLabel')}
                          </DashedUnderlineText>
                        </Tooltip>
                      )}
                      {quoteLoading ? (
                        <Skeleton.Button
                          active
                          className="h-[16px] rounded-[4px]"
                          style={{ width: 60 }}
                        />
                      ) : (
                        <span className="text-rb-neutral-title-1">
                          {quoteError
                            ? '-'
                            : formatUsdValue(estReceiveUsdValue)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-13">
                      <span className="text-r-neutral-foot">
                        {t('page.perps.depositAmountPopup.estTimeLabel')}
                      </span>
                      {quoteLoading ? (
                        <Skeleton.Button
                          active
                          className="h-[16px] rounded-[4px]"
                          style={{ width: 60 }}
                        />
                      ) : (
                        <span className="text-rb-neutral-title-1">
                          {quoteError ? '-' : `~${estTimeMinutes} min`}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t-[0.5px] border-solid border-rabby-neutral-line px-20 py-16">
              <Button
                loading={
                  type === 'deposit' ? isPreparingSign : isWithdrawLoading
                }
                onClick={
                  type === 'deposit' ? handleDepositClick : handleWithdrawClick
                }
                disabled={
                  !isValidAmount ||
                  Boolean(quoteError) ||
                  (type === 'deposit' && !isDirectDeposit && quoteLoading)
                }
                size="large"
                type="primary"
                className="w-full h-[44px] rounded-[8px] text-[14px] font-medium"
              >
                {type === 'deposit'
                  ? t('page.perps.deposit')
                  : t('page.perps.withdraw')}
              </Button>
            </div>
          </div>
          {/* Token Select Popup */}
          {type === 'deposit' && (
            <TokenSelectPopup
              visible={tokenSelectVisible}
              onCancel={handleCloseTokenSelect}
              onSelect={handleTokenSelect}
              tokenList={tokenList}
              tokenListLoading={tokenListLoading}
            />
          )}

          {/* History Popup */}
          <HistoryPopup
            visible={historyVisible}
            onClose={() => setHistoryVisible(false)}
          />
        </PopupContainer>
      </Modal>
    </>
  );
};

export default DepositWithdrawModal;
