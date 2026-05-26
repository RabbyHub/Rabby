import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Button } from 'antd';
import clsx from 'clsx';
import { useMemoizedFn } from 'ahooks';
import { splitNumberByStep } from '@/ui/utils';
import { ReactComponent as RcIconEdit } from 'ui/assets/perps/IconEditCC.svg';
import { ReactComponent as RcIconClose } from 'ui/assets/perps/icon-close-cc.svg';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { MarketData } from '@/ui/models/perps';
import { WsActiveAssetCtx } from '@rabby-wallet/hyperliquid-sdk';
import { AssetPriceInfo } from './AssetPriceInfo';
import { formatTpOrSlPrice, validatePriceInput } from '../utils';
import { computeLimitPriceDeviation } from '../limitOrderUtils';
import {
  PERPS_LIMIT_PRICE_BLOCK_PCT,
  PERPS_LIMIT_PRICE_CONFIRM_PCT,
} from '../constants';

const QUICK_OPTIONS: { label: string; pct: number | 'mid' }[] = [
  { label: '-1%', pct: -0.01 },
  { label: '-0.3%', pct: -0.003 },
  { label: 'mid', pct: 'mid' },
  { label: '+0.3%', pct: 0.003 },
  { label: '+1%', pct: 0.01 },
];

interface EditLimitPriceTagProps {
  coin: string;
  markPrice: number;
  szDecimals: number;
  direction: 'Long' | 'Short';
  limitPx: string;
  currentAssetCtx?: MarketData;
  activeAssetCtx?: WsActiveAssetCtx['ctx'] | null;
  onChange: (price: string) => void;
}

export const EditLimitPriceTag: React.FC<EditLimitPriceTagProps> = ({
  coin,
  markPrice,
  szDecimals,
  direction,
  limitPx,
  currentAssetCtx,
  activeAssetCtx,
  onChange,
}) => {
  const { t } = useTranslation();
  const { isDarkTheme } = useThemeMode();
  const [modalVisible, setModalVisible] = useState(false);
  const [price, setPrice] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [activeOption, setActiveOption] = useState<number | 'mid' | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const deviation = useMemo(
    () => computeLimitPriceDeviation(price, markPrice),
    [price, markPrice]
  );
  const priceEmpty = !price || !Number(price);
  const isBlocked = !priceEmpty && deviation >= PERPS_LIMIT_PRICE_BLOCK_PCT;
  const isWarning =
    !priceEmpty &&
    deviation >= PERPS_LIMIT_PRICE_CONFIRM_PCT &&
    deviation < PERPS_LIMIT_PRICE_BLOCK_PCT;

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
      setActiveOption(null);
    }
  });

  const handleQuickOption = useMemoizedFn((pct: number | 'mid') => {
    setActiveOption(pct);
    const next = pct === 'mid' ? markPrice : markPrice * (1 + (pct as number));
    setPrice(formatTpOrSlPrice(next, szDecimals));
  });

  useEffect(() => {
    if (modalVisible) {
      const seed = limitPx || formatTpOrSlPrice(markPrice, szDecimals);
      setPrice(seed);
      setActiveOption(limitPx ? null : 'mid');
      const timer = setTimeout(() => inputRef.current?.focus(), 300);
      return () => clearTimeout(timer);
    }
    setPrice('');
    setActiveOption(null);
  }, [modalVisible]);

  const handleConfirm = useMemoizedFn(() => {
    if (isBlocked || priceEmpty) return;
    onChange(price);
    setModalVisible(false);
  });

  return (
    <>
      <div
        className="inline-flex items-center gap-[5px] px-12 py-4 pr-6 rounded-[100px] cursor-pointer bg-r-blue-light1"
        onClick={() => setModalVisible(true)}
      >
        <span className="text-14 font-bold leading-[18px] text-r-blue-default">
          {limitPx ? `@ $${splitNumberByStep(limitPx)}` : '-'}
        </span>
        <RcIconEdit className="w-16 h-16 text-r-blue-default" />
      </div>

      <Modal
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        width={352}
        footer={null}
        className={clsx(
          'perps-bridge-swap-modal perps-edit-tp-sl-modal',
          isDarkTheme
            ? 'perps-bridge-swap-modal-dark'
            : 'perps-bridge-swap-modal-light'
        )}
        centered
        bodyStyle={{
          background: 'var(--r-neutral-card-2, #F5F6FA)',
        }}
        destroyOnClose
        closeIcon={
          <RcIconClose className="w-20 h-20 text-rb-neutral-secondary" />
        }
      >
        <div className="flex flex-col items-center">
          <div className="mb-20 text-center">
            <div className="text-20 font-medium text-r-neutral-title-1 mb-4 inline-flex items-baseline gap-4">
              <span>
                {direction === 'Long'
                  ? t('page.perpsDetail.PerpEditLimitPriceTag.setLimitBuyPrice')
                  : t(
                      'page.perpsDetail.PerpEditLimitPriceTag.setLimitSellPrice'
                    )}
              </span>
            </div>
            <div className="text-14 text-rb-neutral-secondary">
              <AssetPriceInfo
                coin={coin}
                activeAssetCtx={activeAssetCtx}
                currentAssetCtx={currentAssetCtx}
              />
            </div>
          </div>

          <div className="w-full">
            <div className="flex gap-8 mb-12">
              {QUICK_OPTIONS.map((option) => (
                <div
                  key={option.label}
                  className={clsx(
                    'flex-1 h-[40px] flex items-center justify-center rounded-[6px] cursor-pointer text-[13px] font-medium',
                    'border border-solid',
                    activeOption === option.pct
                      ? 'bg-r-blue-light1 border-rabby-blue-default text-r-blue-default'
                      : 'bg-r-neutral-line border-transparent text-r-neutral-body hover:border-rabby-blue-default'
                  )}
                  onClick={() => handleQuickOption(option.pct)}
                >
                  {option.pct === 'mid'
                    ? t('page.perpsDetail.PerpEditLimitPriceTag.mid')
                    : option.label}
                </div>
              ))}
            </div>

            <div
              className={clsx(
                'bg-r-neutral-card1 rounded-[12px] p-12 border border-transparent border-solid',
                inputFocused && 'border-rabby-blue-default'
              )}
            >
              <input
                ref={inputRef}
                type="text"
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                value={price ? `$${price}` : ''}
                onChange={(e) => handlePriceChange(e.target.value)}
                placeholder="$0"
                className={clsx(
                  'text-24 text-rb-neutral-title-1 font-bold bg-transparent border-none p-0 w-full outline-none focus:outline-none',
                  isBlocked && 'text-r-red-default'
                )}
                style={{
                  boxShadow: 'none',
                  backgroundColor: 'transparent',
                }}
              />
            </div>

            {isBlocked && (
              <div
                className="text-14 font-medium text-r-red-default mt-10"
                style={{ marginBottom: '-10px' }}
              >
                {t('page.perpsDetail.PerpEditLimitPriceTag.blockError')}
              </div>
            )}
            {isWarning && (
              <div
                className="text-14 font-medium text-r-orange-default mt-10"
                style={{ marginBottom: '-10px' }}
              >
                {t('page.perpsDetail.PerpEditLimitPriceTag.warning')}
              </div>
            )}
          </div>

          <Button
            block
            size="large"
            type="primary"
            className="h-[48px] mt-20 text-15 font-medium"
            disabled={isBlocked || priceEmpty}
            onClick={handleConfirm}
          >
            {t('page.perpsDetail.PerpEditLimitPriceTag.set')}
          </Button>
        </div>
      </Modal>
    </>
  );
};

export default EditLimitPriceTag;
