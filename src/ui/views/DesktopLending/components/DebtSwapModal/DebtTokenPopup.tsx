import type { DrawerProps } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { ReactComponent as RcIconWalletCC } from '@/ui/assets/swap/wallet-cc.svg';
import Popup from '@/ui/component/Popup';
import { formatUsdValueKMB } from '@/ui/views/Dashboard/components/TokenDetailPopup/utils';

import { SwappableToken } from '../../types/swap';
import { formatApy, formatListNetWorth } from '../../utils/format';
import SymbolIcon from '../SymbolIcon';

interface DebtTokenPopupProps {
  visible: boolean;
  options: SwappableToken[];
  selectedAddress?: string;
  onSelect: (token: SwappableToken) => void;
  onClose: () => void;
  getContainer?: DrawerProps['getContainer'];
}

const DebtTokenPopup = ({
  visible,
  options,
  selectedAddress,
  onSelect,
  onClose,
  getContainer,
}: DebtTokenPopupProps) => {
  const { t } = useTranslation();

  return (
    <Popup
      visible={visible}
      onClose={onClose}
      height={550}
      width={400}
      closable
      className="p-0"
      isSupportDarkMode
      bodyStyle={{ padding: 0 }}
      getContainer={getContainer}
    >
      <div className="flex h-full flex-col overflow-hidden rounded-[8px] border-[0.5px] border-rb-neutral-line bg-r-neutral-bg-2 shadow-[0_16px_24px_rgba(0,0,0,0.1)]">
        <div className="relative flex h-[56px] items-center justify-center">
          <span className="text-[20px] leading-[24px] font-medium text-r-neutral-title-1">
            {t('page.lending.manageEmode.debtSwapSelector.title')}
          </span>
        </div>

        <div className="px-[18px] pt-0 pb-[4px]">
          <div className="flex items-center text-[12px] leading-[14px] text-r-neutral-foot">
            <span className="flex-1 pl-[16px]">
              {t('page.lending.manageEmode.debtSwapSelector.header.assets')}
            </span>
            <span className="w-[76px] pr-[4px] text-center">
              {t('page.lending.apy')}
            </span>
            <span className="w-[96px] pr-[16px] text-right">
              {t('page.lending.manageEmode.debtSwapSelector.header.borrow')}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-[18px] pb-[24px] pt-[4px]">
          <div className="space-y-[8px]">
            {options.map((token) => {
              const isSelected =
                !!selectedAddress && token.addressToSwap === selectedAddress;

              return (
                <button
                  key={token.addressToSwap}
                  type="button"
                  className={
                    isSelected
                      ? 'flex h-[56px] w-full items-center rounded-[8px] bg-rb-neutral-card-1 px-[16px] ring-1 ring-rb-brand-default'
                      : 'flex h-[56px] w-full items-center rounded-[8px] bg-rb-neutral-card-1 px-[16px]'
                  }
                  onClick={() => onSelect(token)}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-[8px]">
                    <SymbolIcon tokenSymbol={token.symbol} size={32} />
                    <div className="min-w-0">
                      <div className="truncate text-[14px] leading-[17px] text-left font-medium text-r-neutral-title-1">
                        {token.symbol}
                      </div>
                      <div className="mt-[2px] flex items-center gap-[4px] text-[12px] leading-[14px] text-r-neutral-foot">
                        <RcIconWalletCC className="h-16 w-16 text-r-neutral-foot" />
                        <span>
                          {formatUsdValueKMB(token.walletBalanceUSD || '0')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="w-[76px] flex-shrink-0 pr-[4px] text-right text-[14px] leading-[17px] font-medium text-r-neutral-title-1">
                    {formatApy(Number(token.variableBorrowAPY || '0'))}
                  </span>
                  <span className="w-[96px] flex-shrink-0 pr-[0px] text-right text-[14px] leading-[17px] font-medium text-r-neutral-foot">
                    {token.totalBorrowsUSD === '0'
                      ? '$0'
                      : formatListNetWorth(
                          Number(token.totalBorrowsUSD || '0')
                        )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Popup>
  );
};

export default DebtTokenPopup;
