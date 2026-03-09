import type { DrawerProps } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import Popup from '@/ui/component/Popup';

import { DisplayPoolReserveInfo } from '../../types';
import { SwappableToken } from '../../types/swap';
import { formatApy, formatListNetWorth } from '../../utils/format';
import SymbolIcon from '../SymbolIcon';

export type CollateralTokenOption = {
  token: SwappableToken;
  displayReserve?: DisplayPoolReserveInfo;
};

interface CollateralTokenPopupProps {
  visible: boolean;
  options: CollateralTokenOption[];
  selectedAddress?: string;
  onSelect: (token: SwappableToken) => void;
  onClose: () => void;
  getContainer?: DrawerProps['getContainer'];
}

const CollateralTokenPopup = ({
  visible,
  options,
  selectedAddress,
  onSelect,
  onClose,
  getContainer,
}: CollateralTokenPopupProps) => {
  const { t } = useTranslation();

  return (
    <Popup
      visible={visible}
      onClose={onClose}
      height={560}
      width={400}
      closable
      className="p-0"
      isSupportDarkMode
      bodyStyle={{ padding: 0 }}
      getContainer={getContainer}
    >
      <div className="flex h-full flex-col overflow-hidden rounded-t-[12px] bg-r-neutral-bg-2">
        <div className="relative flex h-[56px] items-center justify-center">
          <span className="text-[20px] leading-[24px] font-medium text-r-neutral-title-1">
            {t('page.lending.manageEmode.collateralSwapSelector.title')}
          </span>
        </div>

        <div className="px-[18px] pt-[6px] pb-[4px]">
          <div className="flex items-center text-[12px] leading-[14px] text-r-neutral-foot">
            <span className="w-[142px] pl-[16px]">
              {t(
                'page.lending.manageEmode.collateralSwapSelector.header.assets'
              )}
            </span>
            <span className="w-[70px] text-center">
              {t('page.lending.apy')}
            </span>
            <span className="flex-1 pr-[16px] text-right">
              {t(
                'page.lending.manageEmode.collateralSwapSelector.header.collateral'
              )}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-[18px] pt-[4px] pb-[24px]">
          <div className="space-y-[8px]">
            {options.map(({ token }) => {
              const isSelected =
                !!selectedAddress && token.addressToSwap === selectedAddress;

              return (
                <button
                  key={token.addressToSwap}
                  type="button"
                  className={
                    isSelected
                      ? 'flex h-[48px] w-full items-center rounded-[8px] bg-rb-neutral-card-1 px-[16px] ring-1 ring-rb-brand-default'
                      : 'flex h-[48px] w-full items-center rounded-[8px] bg-rb-neutral-card-1 px-[16px]'
                  }
                  onClick={() => onSelect(token)}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-[8px]">
                    <SymbolIcon tokenSymbol={token.symbol} size={24} />
                    <span className="truncate text-[14px] leading-[17px] font-medium text-r-neutral-title-1">
                      {token.symbol}
                    </span>
                  </div>
                  <span className="w-[70px] flex-shrink-0 text-center text-[14px] leading-[17px] font-medium text-r-neutral-title-1">
                    {formatApy(Number(token.variableBorrowAPY || '0'))}
                  </span>
                  <span className="min-w-[96px] flex-shrink-0 text-right text-[14px] leading-[17px] font-medium text-r-neutral-title-1">
                    {token.balance === '0'
                      ? '$0'
                      : formatListNetWorth(
                          Number(token.underlyingUsdValue || '0')
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

export default CollateralTokenPopup;
