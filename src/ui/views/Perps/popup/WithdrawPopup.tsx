import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Button, Tooltip } from 'antd';
import Popup, { PopupProps } from '@/ui/component/Popup';
import { useTranslation } from 'react-i18next';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import { useMemoizedFn } from 'ahooks';
import { TokenWithChain } from '@/ui/component';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { ReactComponent as RcIconInfo } from '@/ui/assets/perps/IconInfo.svg';
import { RcIconArrowDownCC } from '@/ui/assets/desktop/common';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { findChainByServerID } from '@/utils/chain';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { Account } from '@/background/service/preference';
import { getTokenSymbol } from '@/ui/utils/token';
import { formatNumber, formatUsdValue } from '@/ui/utils/number';
import {
  ARB_USDC_TOKEN_ITEM,
  ARB_USDC_TOKEN_SERVER_CHAIN,
  HYPE_EVM_BRIDGE_ADDRESS_MAP,
  WITHDRAW_CHAIN_TOKENS,
  WITHDRAW_CHAINS,
  PerpsQuoteAsset,
} from '../constants';
import { usePerpsAccount } from '../hooks/usePerpsAccount';
import { getPerpsSDK } from '../sdkManager';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';

const MIN_WITHDRAW = 2;

export type PerpsWithdrawPopupProps = PopupProps & {
  currentPerpsAccount: Account | null;
  handleWithdraw?: (
    amount: number,
    isHypeWithdraw?: boolean,
    targetAsset?: PerpsQuoteAsset
  ) => Promise<boolean>;
  onClose: () => void;
};

export const PerpsWithdrawPopup: React.FC<PerpsWithdrawPopupProps> = ({
  visible,
  currentPerpsAccount,
  handleWithdraw,
  onClose,
  ...rest
}) => {
  const { t } = useTranslation();
  const dispatch = useRabbyDispatch();
  const inputRef = useRef<HTMLInputElement>(null);
  const { isUnifiedAccount, getAvailableByAsset } = usePerpsAccount();

  const [usdValue, setUsdValue] = useState<string>('');
  const [selectedToken, setSelectedToken] = useState<TokenItem | null>(null);
  const [selectChainId, setSelectChainId] = useState<string>(
    ARB_USDC_TOKEN_SERVER_CHAIN
  );
  const [tokenVisible, setTokenVisible] = useState(false);
  const [chainSelectVisible, setChainSelectVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Reset on close
  useEffect(() => {
    if (!visible) {
      setUsdValue('');
      setSelectedToken(null);
      setSelectChainId(ARB_USDC_TOKEN_SERVER_CHAIN);
      setIsLoading(false);
      setTokenVisible(false);
      setChainSelectVisible(false);
    }
  }, [visible]);

  // Auto-select default token on open
  useEffect(() => {
    if (visible && !selectedToken) {
      setSelectedToken(ARB_USDC_TOKEN_ITEM);
    }
  }, [visible, selectedToken]);

  // Focus input
  useEffect(() => {
    if (visible && inputRef.current) {
      const timer = setTimeout(() => inputRef.current?.focus(), 200);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  // HyperEVM withdraw activation fee — bridge is per-asset (USDC/USDT/USDE/USDH).
  const [hypeTransferFee, setHypeTransferFee] = useState<string>('0');
  useEffect(() => {
    if (!visible || !currentPerpsAccount?.address) {
      setHypeTransferFee('0');
      return;
    }
    const sym = selectedToken
      ? (getTokenSymbol(selectedToken).toUpperCase() as PerpsQuoteAsset)
      : 'USDC';
    const bridge =
      HYPE_EVM_BRIDGE_ADDRESS_MAP[
        sym === 'USDC' || sym === 'USDT' || sym === 'USDE' || sym === 'USDH'
          ? sym
          : 'USDC'
      ];
    const sdk = getPerpsSDK();
    sdk.info
      .getPreTransferCheck(bridge, currentPerpsAccount.address)
      .then((res) => setHypeTransferFee(res?.fee || '0'))
      .catch(() => setHypeTransferFee('0'));
  }, [visible, currentPerpsAccount?.address, selectedToken]);

  const marketDataMap = useRabbySelector((state) => state.perps.marketDataMap);
  const hypeGasFeeUsd = useMemo(() => {
    const hypePrice = Number(marketDataMap?.['HYPE']?.markPx || 0);
    return new BigNumber(0.00002).times(hypePrice).toNumber();
  }, [marketDataMap]);

  const isHypeWithdraw = useMemo(
    () => selectChainId !== ARB_USDC_TOKEN_SERVER_CHAIN,
    [selectChainId]
  );

  const withdrawTargetAsset = useMemo<PerpsQuoteAsset>(() => {
    if (!selectedToken) return 'USDC';
    const sym = getTokenSymbol(selectedToken).toUpperCase() as PerpsQuoteAsset;
    if (sym === 'USDC' || sym === 'USDT' || sym === 'USDH' || sym === 'USDE') {
      return sym;
    }
    return 'USDC';
  }, [selectedToken]);

  const chainTokenItems = useMemo(() => {
    const list = WITHDRAW_CHAIN_TOKENS[selectChainId] || [];
    return list
      .map((tk) => {
        const sym = getTokenSymbol(tk).toUpperCase() as PerpsQuoteAsset;
        const isStable =
          sym === 'USDC' || sym === 'USDT' || sym === 'USDE' || sym === 'USDH';
        // Non-unified accounts can only hold USDC; other stables are 0.
        const balance =
          isStable && (isUnifiedAccount || sym === 'USDC')
            ? getAvailableByAsset(sym)
            : 0;
        return { token: tk, balance };
      })
      .sort((a, b) => b.balance - a.balance);
  }, [selectChainId, isUnifiedAccount, getAvailableByAsset]);

  const withdrawMaxBalance = useMemo(() => {
    const baseBalance = (() => {
      // ARB withdrawals can only settle USDC, so the cap must be the
      // USDC-specific balance — not the unified-account aggregate sum.
      if (!isHypeWithdraw) return getAvailableByAsset('USDC');
      if (!selectedToken) return getAvailableByAsset('USDC');
      const row = chainTokenItems.find(
        (i) =>
          i.token.id === selectedToken.id &&
          i.token.chain === selectedToken.chain
      );
      return row ? row.balance : 0;
    })();
    if (!isHypeWithdraw || !Number(hypeTransferFee)) return baseBalance;
    return Math.max(
      0,
      new BigNumber(baseBalance)
        .minus(hypeTransferFee)
        .decimalPlaces(6, BigNumber.ROUND_DOWN)
        .toNumber()
    );
  }, [
    isHypeWithdraw,
    getAvailableByAsset,
    hypeTransferFee,
    selectedToken,
    chainTokenItems,
  ]);

  const handleChainSelect = useCallback((serverChain: string) => {
    setSelectChainId(serverChain);
    setChainSelectVisible(false);
    const first = WITHDRAW_CHAIN_TOKENS[serverChain]?.[0];
    if (first) setSelectedToken(first);
    setUsdValue('');
  }, []);

  const amountValidation = useMemo(() => {
    const value = Number(usdValue) || 0;
    if (!usdValue) return { isValid: false, error: null as string | null };
    // Validate against the selected token's max balance, not the global
    // availableBalance — required for non-USDC stablecoin withdrawal on
    // HyperEVM (USDT/USDE/USDH) where each token has its own spot balance.
    if (value > withdrawMaxBalance) {
      return {
        isValid: false,
        error: t('page.perps.insufficientBalance'),
      };
    }
    if (value < MIN_WITHDRAW) {
      return {
        isValid: false,
        error: t('page.perps.depositAmountPopup.minimumWithdrawSize'),
      };
    }
    return { isValid: true, error: null };
  }, [usdValue, withdrawMaxBalance, t]);

  const isValidAmount = amountValidation.isValid;

  const handlePercent = useMemoizedFn((pct: number) => {
    const val = new BigNumber(withdrawMaxBalance)
      .times(pct)
      .div(100)
      .decimalPlaces(6, BigNumber.ROUND_DOWN);
    setUsdValue(val.toFixed());
  });

  const handleMax = useMemoizedFn(() => {
    setUsdValue(
      new BigNumber(withdrawMaxBalance)
        .decimalPlaces(6, BigNumber.ROUND_DOWN)
        .toFixed()
    );
  });

  const feeUsd = isHypeWithdraw ? hypeGasFeeUsd : 1;
  const estReceive = useMemo(
    () => Math.max(0, Number(usdValue || 0) - feeUsd),
    [usdValue, feeUsd]
  );

  const handleSubmit = useMemoizedFn(async () => {
    setIsLoading(true);
    let withdrawAmount = Number(usdValue);
    if (isHypeWithdraw && hypeGasFeeUsd > 0) {
      withdrawAmount = new BigNumber(withdrawAmount)
        .minus(hypeGasFeeUsd)
        .decimalPlaces(6, BigNumber.ROUND_DOWN)
        .toNumber();
    }
    const success = await handleWithdraw?.(
      withdrawAmount,
      isHypeWithdraw,
      withdrawTargetAsset
    );
    setIsLoading(false);
    if (success) onClose?.();
  });

  const chainInfo = useMemo(() => findChainByServerID(selectChainId), [
    selectChainId,
  ]);

  return (
    <Popup
      placement="bottom"
      height={440}
      isSupportDarkMode
      bodyStyle={{ padding: 0 }}
      destroyOnClose
      push={false}
      closable
      visible={visible}
      onCancel={onClose}
      {...rest}
    >
      <div className="flex flex-col h-full bg-r-neutral-bg2 rounded-t-[16px]">
        {/* Title */}
        <div className="text-20 font-medium text-r-neutral-title-1 text-center pt-16 mb-16">
          {t('page.perps.withdraw')}
        </div>

        <div className="px-16 flex-1">
          {/* Chain section */}
          <div className="text-13 text-r-neutral-foot mb-8">
            {t('page.perps.depositAmountPopup.chain')}
          </div>
          <div
            onClick={() => setChainSelectVisible(true)}
            className={clsx(
              'flex items-center justify-between bg-r-neutral-card1 rounded-[8px] px-16 h-[48px] mb-12 cursor-pointer',
              'border border-solid border-transparent hover:border-rabby-blue-default'
            )}
          >
            <div className="flex items-center gap-8">
              {chainInfo?.logo ? (
                <img
                  src={chainInfo.logo}
                  alt={chainInfo.name}
                  className="w-24 h-24 rounded-full"
                />
              ) : null}
              <span className="text-15 font-medium text-r-neutral-title-1">
                {chainInfo?.name || selectChainId}
              </span>
            </div>
            <ThemeIcon
              className="text-r-neutral-foot"
              src={RcIconArrowDownCC}
            />
          </div>

          {/* Amount section */}
          <div className="flex items-center justify-between mb-8">
            <div className="text-13 text-r-neutral-foot">
              {t('page.perps.depositAmountPopup.amount')}
            </div>
            <div className="text-13 text-r-neutral-foot flex items-center">
              {t('page.perps.availableBalance', {
                balance: formatUsdValue(
                  withdrawMaxBalance,
                  BigNumber.ROUND_DOWN
                ),
              })}
              {isHypeWithdraw && Number(hypeTransferFee) > 0 && (
                <Tooltip
                  overlayClassName="rectangle"
                  placement="topLeft"
                  title={t(
                    'page.perps.depositAmountPopup.hypeActivationFeeTip',
                    { fee: formatUsdValue(hypeTransferFee) }
                  )}
                >
                  <RcIconInfo
                    viewBox="0 0 12 12"
                    width={12}
                    height={12}
                    className="text-rabby-neutral-foot ml-4"
                  />
                </Tooltip>
              )}
            </div>
          </div>

          {/* Amount input card */}
          <div className="flex flex-col bg-r-neutral-card1 rounded-[8px] px-16 py-16">
            <div className="flex items-center gap-8">
              <input
                ref={inputRef}
                autoFocus
                placeholder="0"
                value={usdValue}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/^\d*\.?\d*$/.test(v) || v === '') setUsdValue(v);
                }}
                className={clsx(
                  'text-[28px] font-medium leading-[34px] flex-1 bg-transparent border-none p-0 w-full outline-none focus:outline-none',
                  amountValidation.error
                    ? 'text-r-red-default'
                    : 'text-r-neutral-title-1'
                )}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  boxShadow: 'none',
                }}
              />
              <div
                className={clsx(
                  'flex items-center gap-6 px-12 h-[36px] rounded-[6px]',
                  'bg-r-neutral-card-2 border border-solid border-transparent',
                  'cursor-pointer hover:bg-r-blue-light1 hover:border-rabby-blue-default'
                )}
                onClick={() => setTokenVisible(true)}
              >
                <TokenWithChain
                  token={selectedToken || ARB_USDC_TOKEN_ITEM}
                  hideConer
                  width="20px"
                  height="20px"
                />
                <span className="text-15 font-medium text-r-neutral-title-1">
                  {getTokenSymbol(selectedToken || ARB_USDC_TOKEN_ITEM)}
                </span>
                <ThemeIcon
                  className="text-r-neutral-foot"
                  src={RcIconArrowDownCC}
                />
              </div>
            </div>
          </div>

          {/* Percent buttons */}
          <div className="flex items-center gap-8 mt-8">
            {[25, 50, 75].map((pct) => (
              <div
                key={pct}
                className={clsx(
                  'flex-1 h-[36px] flex items-center justify-center rounded-[8px]',
                  'bg-r-neutral-card1 border border-solid border-transparent',
                  'text-13 font-medium text-r-neutral-title-1 cursor-pointer',
                  'hover:border-rabby-blue-default hover:text-r-blue-default'
                )}
                onClick={() => handlePercent(pct)}
              >
                {pct}%
              </div>
            ))}
            <div
              className={clsx(
                'flex-1 h-[36px] flex items-center justify-center rounded-[8px]',
                'bg-r-neutral-card1 border border-solid border-transparent',
                'text-13 font-medium text-r-neutral-title-1 cursor-pointer',
                'hover:border-rabby-blue-default hover:text-r-blue-default'
              )}
              onClick={handleMax}
            >
              {t('page.perps.PerpsSpotSwap.max')}
            </div>
          </div>

          {/* Error / Est.Receive line */}
          {amountValidation.error ? (
            <div className="text-13 text-r-red-default text-left mt-8 h-[18px]">
              {amountValidation.error}
            </div>
          ) : isValidAmount ? (
            <div className="flex items-center text-12 text-r-neutral-foot mt-8 h-[18px]">
              <span>
                {t('page.perps.depositAmountPopup.estReceive', {
                  balance: formatUsdValue(estReceive, BigNumber.ROUND_DOWN),
                })}
              </span>
              <TooltipWithMagnetArrow
                overlayClassName="rectangle"
                placement="top"
                title={t(
                  isHypeWithdraw
                    ? 'page.perps.depositAmountPopup.feeTipTooltipHype'
                    : 'page.perps.depositAmountPopup.feeTipTooltip'
                )}
              >
                <RcIconInfo
                  viewBox="0 0 12 12"
                  width={12}
                  height={12}
                  className="text-rabby-neutral-foot ml-4 relative"
                />
              </TooltipWithMagnetArrow>
            </div>
          ) : (
            <div className="h-[18px] mt-8" />
          )}
        </div>

        {/* Bottom: Fee + Withdraw button */}
        <div
          className={clsx(
            'border-t-[0.5px] border-solid border-rabby-neutral-line w-full mt-auto px-20 py-16 flex flex-col items-center justify-center'
          )}
        >
          <div className="mb-10 flex items-center justify-center">
            <div className="text-12 text-r-neutral-foot">
              {isHypeWithdraw
                ? `${t('page.perps.fee')} : $${formatNumber(hypeGasFeeUsd, 6)}`
                : `${t('page.perps.fee')} : $1.00`}
            </div>
            <Tooltip
              overlayClassName="rectangle"
              placement="top"
              title={t(
                isHypeWithdraw
                  ? 'page.perps.depositAmountPopup.feeTipTooltipHype'
                  : 'page.perps.depositAmountPopup.feeTipTooltip'
              )}
            >
              <RcIconInfo
                viewBox="0 0 12 12"
                width={12}
                height={12}
                className="text-rabby-neutral-foot ml-4"
              />
            </Tooltip>
          </div>
          <Button
            block
            disabled={!isValidAmount}
            size="large"
            type="primary"
            loading={isLoading}
            className="h-[48px] text-15 font-medium rounded-[8px]"
            style={{ height: 48 }}
            onClick={handleSubmit}
          >
            {t('page.perps.withdraw')}
          </Button>
        </div>
      </div>

      {/* Token select (internal, dynamic height) */}
      <Popup
        placement="bottom"
        visible={tokenVisible}
        onCancel={() => setTokenVisible(false)}
        getContainer={false}
        bodyStyle={{ padding: 0 }}
        height={340}
        closable
      >
        <div className="flex flex-col px-20 pt-16 pb-20 bg-r-neutral-bg2 h-full rounded-t-[16px]">
          <div className="text-18 font-medium text-r-neutral-title-1 text-center mb-16">
            {t('page.perps.selectTokenToWithdraw')}
          </div>
          <div className="flex flex-col gap-8">
            {chainTokenItems.map(({ token, balance }) => {
              const sym = getTokenSymbol(token);
              const selected =
                selectedToken?.id === token.id &&
                selectedToken?.chain === token.chain;
              return (
                <div
                  key={`${token.chain}-${token.id}`}
                  onClick={() => {
                    setUsdValue('');
                    setSelectedToken(token);
                    setTokenVisible(false);
                    setTimeout(() => inputRef.current?.focus(), 50);
                  }}
                  className={clsx(
                    'flex items-center justify-between bg-r-neutral-card1 rounded-[8px] px-16 h-[56px] cursor-pointer',
                    'border border-solid',
                    selected
                      ? 'border-rabby-blue-default'
                      : 'border-transparent hover:border-rabby-blue-default'
                  )}
                >
                  <div className="flex items-center gap-12">
                    <TokenWithChain
                      token={token}
                      hideConer
                      width="24px"
                      height="24px"
                    />
                    <span className="text-15 font-medium text-r-neutral-title-1">
                      {sym}
                    </span>
                  </div>
                  <span className="text-15 font-medium text-r-neutral-title-1">
                    {new BigNumber(balance)
                      .decimalPlaces(2, BigNumber.ROUND_DOWN)
                      .toFixed()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </Popup>

      {/* Chain select */}
      <Popup
        placement="bottom"
        visible={chainSelectVisible}
        onCancel={() => setChainSelectVisible(false)}
        getContainer={false}
        bodyStyle={{ padding: 0 }}
        height={280}
        closable
      >
        <div className="flex flex-1 flex-col px-20 pt-16 bg-r-neutral-bg2 rounded-t-[16px] h-full">
          <div className="text-18 font-medium text-r-neutral-title-1 text-center mb-16">
            {t('page.perps.selectChainToWithdraw')}
          </div>
          <div className="flex flex-col gap-8">
            {WITHDRAW_CHAINS.map((c) => {
              const chain = findChainByServerID(c.serverChain);
              const selected = selectChainId === c.serverChain;
              return (
                <div
                  key={c.serverChain}
                  onClick={() => handleChainSelect(c.serverChain)}
                  className={clsx(
                    'flex items-center bg-r-neutral-card1 rounded-[8px] px-16 h-[56px] cursor-pointer',
                    'border border-solid',
                    selected
                      ? 'border-rabby-blue-default'
                      : 'border-transparent hover:border-rabby-blue-default'
                  )}
                >
                  {chain?.logo ? (
                    <img
                      src={chain.logo}
                      alt={chain.name}
                      className="w-24 h-24 rounded-full mr-12"
                    />
                  ) : null}
                  <span className="text-15 font-medium text-r-neutral-title-1">
                    {chain?.name || c.serverChain}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </Popup>
    </Popup>
  );
};

export default PerpsWithdrawPopup;
