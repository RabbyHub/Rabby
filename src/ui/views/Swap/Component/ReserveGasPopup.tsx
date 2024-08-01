import { Checkbox, Popup } from '@/ui/component';
import { formatTokenAmount } from '@/ui/utils';
import { CHAINS_ENUM } from '@debank/common';
import { GasLevel } from '@rabby-wallet/rabby-api/dist/types';
import { Button } from 'antd';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ReactComponent as RcIconCheckedCC } from '@/ui/assets/icon-checked-cc.svg';
import { ReactComponent as RcIconUnCheckedCC } from '@/ui/assets/icon-unchecked-cc.svg';
import { PopupProps } from '@/ui/component/Popup';
import { findChain } from '@/utils/chain';

export type GasLevelType = keyof typeof SORT_SCORE;
interface ReserveGasContentProps {
  chain: CHAINS_ENUM;
  gasList?: GasLevel[];
  limit: number;
  selectedItem?: GasLevelType | string;
  onGasChange: (gasLevel: GasLevel) => void;
  rawHexBalance?: string | number;
}

const SORT_SCORE = {
  fast: 1,
  normal: 2,
  slow: 3,
  custom: 4,
};

type ReserveGasType = {
  getSelectedGasLevel: () => GasLevel | null;
};
const ReserveGasContent = React.forwardRef<
  ReserveGasType,
  ReserveGasContentProps
>((props, ref) => {
  const {
    gasList,
    chain,
    limit = 1000000,
    selectedItem = 'normal',
    onGasChange,
    rawHexBalance,
  } = props;

  const [currentSelectedItem, setCurrentSelectedItem] = useState(selectedItem);
  const [gasLevel, setGasLevel] = useState<GasLevel>();

  React.useImperativeHandle(ref, () => ({
    getSelectedGasLevel: () => gasLevel ?? null,
  }));

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
      decimals: findChain({ enum: chain })?.nativeTokenDecimals || 1e18,
      symbol: findChain({ enum: chain })?.nativeTokenSymbol || '',
    }),
    [chain]
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
          .toString(),
        6
      ),
    [limit, decimals]
  );

  const checkIsInsufficient = useCallback(
    (price: number) => {
      if (rawHexBalance !== undefined && rawHexBalance !== null) {
        return false;
      }
      return new BigNumber(rawHexBalance || 0, 16).lt(
        new BigNumber(limit).times(price)
      );
    },
    [rawHexBalance, limit]
  );

  return (
    <div>
      <div className={clsx('flex flex-col gap-12')}>
        {sortedList?.map((item) => {
          const checked = currentSelectedItem === item.level;

          const gasIsSufficient = checkIsInsufficient(item.price);

          const onChecked = () => {
            if (gasIsSufficient) {
              return;
            }
            setGasLevel(item);
            setCurrentSelectedItem(item.level as any);
          };

          if (checked && gasLevel?.level !== currentSelectedItem) {
            setGasLevel(item);
          }

          const isCustom = item.level === 'custom';

          return (
            <div
              key={item.level}
              className={clsx(
                'flex justify-between',
                'py-[22px] px-16 rounded-[8px] ',
                'bg-r-neutral-card-1 border border-solid  ',
                checked ? 'border-rabby-blue-default' : 'border-transparent',
                gasIsSufficient
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:border-rabby-blue-default cursor-pointer'
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
                  checked={checked}
                  onChange={onChecked}
                  background="transparent"
                  unCheckBackground="transparent"
                  width="20px"
                  height="20px"
                  checkIcon={
                    checked ? (
                      <RcIconCheckedCC
                        viewBox="0 0 20 20"
                        className="text-r-blue-default w-full h-full"
                      />
                    ) : (
                      <RcIconUnCheckedCC
                        viewBox="0 0 20 20"
                        className="text-r-neutral-body w-full h-full"
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
});

export const ReserveGasPopup = (props: ReserveGasContentProps & PopupProps) => {
  const {
    gasList,
    chain,
    onGasChange,
    limit,
    selectedItem,
    rawHexBalance,
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
          rawHexBalance={rawHexBalance}
        />
      )}
    </Popup>
  );
};

export const SendReserveGasPopup = (
  props: ReserveGasContentProps &
    (Omit<PopupProps, 'onClose' | 'onCancel'> & {
      onClose?: (gasLevel?: GasLevel | null) => void;
      onCancel?: (gasLevel?: GasLevel | null) => void;
    })
) => {
  const {
    gasList,
    chain,
    onGasChange,
    limit,
    selectedItem,
    onClose,
    onCancel,
    ...otherPopupProps
  } = props;
  const { t } = useTranslation();

  const reverseGasContentRef = React.useRef<ReserveGasType>(null);

  const handleClose = useCallback(() => {
    const gasLevel = reverseGasContentRef.current?.getSelectedGasLevel();
    onClose?.(gasLevel);
  }, [onClose]);

  return (
    <Popup
      title={t('component.ReserveGasPopup.title')}
      height={454}
      isSupportDarkMode
      isNew
      maskClosable
      {...otherPopupProps}
      onClose={handleClose}
    >
      {gasList && (
        <ReserveGasContent
          ref={reverseGasContentRef}
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
