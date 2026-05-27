import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Modal } from 'antd';
import clsx from 'clsx';
import { useDebounce, useMemoizedFn } from 'ahooks';
import Popup from '@/ui/component/Popup';
import { splitNumberByStep } from '@/ui/utils';
import { ReactComponent as RcIconEdit } from 'ui/assets/perps/IconEditCC.svg';
import { ReactComponent as RcIconCloseCC } from 'ui/assets/component/close-cc.svg';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { MarketData } from '@/ui/models/perps';
import { PerpsBlueBorderedButton } from './BlueBorderedButton';
import { formatTpOrSlPrice, validatePriceInput } from '../utils';
import { computeLimitPriceDeviation } from '../limitOrderUtils';
import {
  PERPS_LIMIT_PRICE_BLOCK_PCT,
  PERPS_LIMIT_PRICE_CONFIRM_PCT,
} from '../constants';
import { formatPerpsCoin } from '../../DesktopPerps/utils';

const QUICK_OPTIONS: { label: string; pct: number | 'mid' }[] = [
  { label: '-1%', pct: -0.01 },
  { label: '-0.3%', pct: -0.003 },
  { label: 'mid', pct: 'mid' },
  { label: '+0.3%', pct: 0.003 },
  { label: '+1%', pct: 0.01 },
];

interface EditLimitPriceTagProps {
  markPrice: number;
  szDecimals: number;
  direction: 'Long' | 'Short';
  limitPx: string;
  currentAssetCtx?: MarketData;
  onChange: (price: string) => void;
}

export const EditLimitPriceTag: React.FC<EditLimitPriceTagProps> = ({
  markPrice,
  szDecimals,
  direction,
  limitPx,
  currentAssetCtx,
  onChange,
}) => {
  const { t } = useTranslation();
  const { isDarkTheme } = useThemeMode();
  const [popupVisible, setPopupVisible] = useState(false);
  const [price, setPrice] = useState('');
  // Don't flash the red error mid-typing — wait 300ms idle, then re-evaluate.
  const debouncedPrice = useDebounce(price, { wait: 300 });
  const inputRef = React.useRef<HTMLInputElement>(null);

  const debouncedDeviation = useMemo(
    () => computeLimitPriceDeviation(debouncedPrice, markPrice),
    [debouncedPrice, markPrice]
  );
  const priceEmpty = !price || !Number(price);
  const debouncedEmpty = !debouncedPrice || !Number(debouncedPrice);
  const isBlocked =
    !debouncedEmpty && debouncedDeviation >= PERPS_LIMIT_PRICE_BLOCK_PCT;

  const handlePriceChange = useMemoizedFn((raw: string) => {
    let value = raw.replace(',', '.');
    if (value.startsWith('$')) {
      value = value.slice(1);
    }
    if (
      (/^\d*\.?\d*$/.test(value) || value === '') &&
      validatePriceInput(value, szDecimals)
    ) {
      setPrice(value);
    }
  });

  const handleQuickOption = useMemoizedFn((pct: number | 'mid') => {
    const next = pct === 'mid' ? markPrice : markPrice * (1 + (pct as number));
    setPrice(formatTpOrSlPrice(next, szDecimals));
  });

  useEffect(() => {
    if (popupVisible) {
      const seed = limitPx || formatTpOrSlPrice(markPrice, szDecimals);
      setPrice(seed);
      const timer = setTimeout(() => inputRef.current?.focus(), 300);
      return () => clearTimeout(timer);
    }
    setPrice('');
  }, [popupVisible]);

  const applyPrice = useMemoizedFn(() => {
    onChange(price);
    setPopupVisible(false);
  });

  const handleSet = useMemoizedFn(() => {
    if (priceEmpty) return;
    // Re-validate against live price — Set may be clicked within the debounce window.
    const liveDeviation = computeLimitPriceDeviation(price, markPrice);
    if (liveDeviation >= PERPS_LIMIT_PRICE_BLOCK_PCT) return;
    if (liveDeviation < PERPS_LIMIT_PRICE_CONFIRM_PCT) {
      applyPrice();
      return;
    }
    const confirmModal = Modal.info({
      width: 320,
      closable: false,
      maskClosable: true,
      centered: true,
      title: null,
      icon: null,
      className: clsx(
        'perps-bridge-swap-modal perps-close-all-position-modal',
        isDarkTheme
          ? 'perps-bridge-swap-modal-dark'
          : 'perps-bridge-swap-modal-light'
      ),
      bodyStyle: { padding: 0 },
      content: (
        <div
          className={clsx(
            'flex items-center justify-center flex-col gap-8',
            'bg-r-neutral-bg2 rounded-lg',
            'px-[16px] pt-[20px] pb-[24px]'
          )}
        >
          <div className="text-[17px] font-bold text-r-neutral-title-1 text-center">
            {t('page.perpsDetail.PerpEditLimitPriceTag.confirmTitle')}
          </div>
          <div className="text-13 font-medium text-r-neutral-body text-center">
            {t('page.perpsDetail.PerpEditLimitPriceTag.confirmMessage')}
          </div>
          <div className="flex items-center justify-center w-full gap-12 mt-12">
            <PerpsBlueBorderedButton
              block
              onClick={() => confirmModal.destroy()}
            >
              {t('page.manageAddress.cancel')}
            </PerpsBlueBorderedButton>
            <Button
              size="large"
              block
              type="primary"
              onClick={() => {
                confirmModal.destroy();
                applyPrice();
              }}
            >
              {t('page.perpsDetail.PerpEditLimitPriceTag.set')}
            </Button>
          </div>
        </div>
      ),
    });
  });

  const coinName = currentAssetCtx?.displayName || currentAssetCtx?.name || '';
  const quote = currentAssetCtx?.quoteAsset || 'USDC';

  return (
    <>
      <div
        className="inline-flex items-center gap-[5px] px-12 py-4 pr-6 rounded-[100px] cursor-pointer bg-r-blue-light1"
        onClick={() => setPopupVisible(true)}
      >
        <span className="text-13 leading-[16px] font-medium text-r-blue-default">
          {limitPx ? `@ $${splitNumberByStep(limitPx)}` : '-'}
        </span>
        <RcIconEdit className="w-16 h-16 text-r-blue-default" />
      </div>

      <Popup
        closable
        placement="bottom"
        visible={popupVisible}
        onCancel={() => setPopupVisible(false)}
        height={'fit-content'}
        bodyStyle={{
          padding: 0,
          background: 'var(--r-neutral-bg1, #FFF)',
          borderRadius: '16px 16px 0 0',
        }}
        closeIcon={
          <RcIconCloseCC className="w-[20px] h-[20px] text-r-neutral-body mt-[-2px]" />
        }
        destroyOnClose
        isSupportDarkMode
      >
        <div className="flex flex-col px-[20px] pb-[24px]">
          <div className="text-[18px] leading-[22px] font-medium text-r-neutral-title-1 text-center pt-[16px]">
            {direction === 'Long'
              ? t('page.perpsDetail.PerpEditLimitPriceTag.setLimitBuyPrice')
              : t('page.perpsDetail.PerpEditLimitPriceTag.setLimitSellPrice')}
          </div>
          <div className="flex items-center justify-center gap-4 mt-4 mb-16 text-13">
            <span className={clsx('text-r-neutral-foot')}>
              {formatPerpsCoin(coinName)}/{quote}
            </span>
            <span className="font-bold text-r-neutral-title-1">
              ${splitNumberByStep(markPrice)}
            </span>
          </div>
          <div className="bg-r-neutral-card2 rounded-[12px] py-[24px] px-[16px] flex items-center justify-center flex-col relative">
            <input
              ref={inputRef}
              type="text"
              value={price ? `$${price}` : ''}
              onChange={(e) => handlePriceChange(e.target.value)}
              placeholder="$0"
              className={clsx(
                'text-[32px] leading-[38px] font-bold bg-transparent border-none p-0 text-center w-full outline-none focus:outline-none',
                isBlocked ? 'text-r-red-default' : 'text-r-neutral-title-1'
              )}
              style={{
                boxShadow: 'none',
                backgroundColor: 'transparent',
              }}
            />
            {/* Absolute-positioned so the error doesn't shift the chips/Set button. */}
            {isBlocked && (
              <div className="absolute left-0 right-0 bottom-4 mt-12 text-center text-r-red-default font-medium text-[12px] leading-[16px]">
                {t('page.perpsDetail.PerpEditLimitPriceTag.blockError')}
              </div>
            )}
          </div>
          <div className="flex gap-8 mt-8 mb-24">
            {QUICK_OPTIONS.map((option) => (
              <div
                key={option.label}
                className={clsx(
                  'flex-1 h-[32px] flex items-center justify-center rounded-[8px] cursor-pointer text-13px',
                  'border border-solid',
                  'bg-r-neutral-card2 border-transparent text-r-neutral-body hover:border-rabby-blue-default'
                )}
                onClick={() => handleQuickOption(option.pct)}
              >
                {option.pct === 'mid'
                  ? t('page.perpsDetail.PerpEditLimitPriceTag.mid')
                  : option.label}
              </div>
            ))}
          </div>
          <Button
            type="primary"
            block
            size="large"
            disabled={isBlocked || priceEmpty}
            className="h-[48px] text-15 font-medium rounded-[8px]"
            onClick={handleSet}
          >
            {t('page.perpsDetail.PerpEditLimitPriceTag.set')}
          </Button>
        </div>
      </Popup>
    </>
  );
};

export default EditLimitPriceTag;
