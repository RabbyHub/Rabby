import { Checkbox, Popup } from '@/ui/component';
import { formatTokenAmount } from '@/ui/utils';
import { CHAINS, CHAINS_ENUM } from '@debank/common';
import { GasLevel } from '@rabby-wallet/rabby-api/dist/types';
import { Button } from 'antd';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ReactComponent as RcIconCheckedCC } from '@/ui/assets/icon-checked-cc.svg';
import { ReactComponent as RcIconUnCheckedCC } from '@/ui/assets/icon-unchecked-cc.svg';
import { PopupProps } from '@/ui/component/Popup';

interface ReserveGasContentProps {
  chain: CHAINS_ENUM;
  gasList?: GasLevel[];
  limit: number;
  selectedItem?: string;
  onGasChange: (gasLevel: GasLevel) => void;
}

const SORT_SCORE = {
  fast: 1,
  normal: 2,
  slow: 3,
  custom: 4,
};

const ReserveGasContent = (props: ReserveGasContentProps) => {
  const {
    gasList,
    chain,
    limit = 1000000,
    selectedItem = 'normal',
    onGasChange,
  } = props;

  const [currentSelectedItem, setCurrentSelectedItem] = useState(selectedItem);
  const [gasLevel, setGasLevel] = useState<GasLevel>();

  const { t } = useTranslation();
  const nameMapping = React.useMemo(
    () => ({
      slow: t('component.ReserveGasPopup.normal'),
      normal: t('component.ReserveGasPopup.fast'),
      fast: t('component.ReserveGasPopup.instant'),
    }),
    [t]
  );

  const { decimals, symbol } = React.useMemo(
    () => ({
      decimals: CHAINS[chain].nativeTokenDecimals,
      symbol: CHAINS[chain].nativeTokenSymbol,
    }),
    [CHAINS[chain]]
  );

  const sortedList = React.useMemo(
    () =>
      gasList?.sort((a, b) => {
        const v1 = SORT_SCORE[a.level];
        const v2 = SORT_SCORE[b.level];
        return v1 - v2;
      }),
    [gasList]
  );

  const getAmount = React.useCallback(
    (price: number) =>
      formatTokenAmount(
        new BigNumber(limit)
          .times(price)
          .div(10 ** decimals)
          .toString()
      ),
    [limit, decimals]
  );

  return (
    <div>
      <div className={clsx('flex flex-col gap-12')}>
        {sortedList?.map((item) => {
          const onChecked = () => {
            setGasLevel(item);
            setCurrentSelectedItem(item.level as any);
          };

          if (
            currentSelectedItem === item.level &&
            gasLevel?.level !== currentSelectedItem
          ) {
            setGasLevel(item);
          }

          const isCustom = item.level === 'custom';

          return (
            <div
              key={item.level}
              className={clsx(
                'flex justify-between',
                'py-[22px] px-16 rounded-[8px] cursor-pointer',
                'bg-r-neutral-card-1 border border-solid border-transparent hover:border-rabby-blue-default'
              )}
              onClick={onChecked}
            >
              <div
                className={clsx(
                  'flex items-center gap-6',
                  'text-15 text-r-neutral-title1 font-medium'
                )}
              >
                <span>
                  {isCustom
                    ? t('component.ReserveGasPopup.doNotReserve')
                    : nameMapping[item.level]}
                </span>
                {!isCustom && (
                  <>
                    <span>·</span>
                    <span className="text-14 text-r-neutral-foot">
                      {new BigNumber(item.price / 1e9).toFixed().slice(0, 8)}{' '}
                      Gwei
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-16">
                {!isCustom && (
                  <span className="text-r-neutral-title-1 text-15 font-medium">
                    ≈ {getAmount(item.price)} {symbol}
                  </span>
                )}
                <Checkbox
                  checked={currentSelectedItem === item.level}
                  onChange={onChecked}
                  background="transparent"
                  unCheckBackground="transparent"
                  checkIcon={
                    currentSelectedItem === item.level ? (
                      <RcIconCheckedCC
                        viewBox="0 0 20 20"
                        className="text-r-blue-default w-20 h-20"
                      />
                    ) : (
                      <RcIconUnCheckedCC
                        viewBox="0 0 20 20"
                        className="text-r-neutral-body w-20 h-20"
                      />
                    )
                  }
                />
              </div>
            </div>
          );
        })}

        <div
          className={clsx(
            'fixed left-0 bottom-0',
            'w-full px-20 py-18',
            'border-t-[0.5px] border-solid border-rabby-neutral-line'
          )}
        >
          <Button
            type="primary"
            block
            className="h-[44px] text-15 text-r-neutral-title2"
            onClick={() => {
              if (gasLevel) {
                onGasChange(gasLevel);
              }
            }}
          >
            {t('global.Confirm')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export const ReserveGasPopup = (props: ReserveGasContentProps & PopupProps) => {
  const {
    gasList,
    chain,
    onGasChange,
    limit,
    selectedItem,
    ...otherPopupProps
  } = props;
  const { t } = useTranslation();

  return (
    <Popup
      title={t('component.ReserveGasPopup.title')}
      height={454}
      isSupportDarkMode
      isNew
      {...otherPopupProps}
    >
      {gasList && (
        <ReserveGasContent
          gasList={gasList}
          chain={chain}
          limit={limit}
          selectedItem={selectedItem}
          onGasChange={onGasChange}
        />
      )}
    </Popup>
  );
};
