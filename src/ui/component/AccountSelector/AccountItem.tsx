import { Tooltip } from 'antd';
import clsx from 'clsx';
import {
  BRAND_ALIAN_TYPE_TEXT,
  KEYRING_TYPE_TEXT,
  WALLET_BRAND_CONTENT,
} from 'consts';
import React, {
  memo,
  MouseEventHandler,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { CommonSignal } from '@/ui/component/ConnectStatus/CommonSignal';
import { CopyChecked } from '@/ui/component/CopyChecked';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { useBrandIcon } from '@/ui/hooks/useBrandIcon';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { ReactComponent as RcIconWhitelist } from 'ui/assets/address/whitelist.svg';
import IconCheck from 'ui/assets/check-3.svg';
import { AddressViewer } from 'ui/component';
import { isSameAddress, splitNumberByStep, useAlias } from 'ui/utils';

export interface AddressItemProps {
  balance: number;
  address: string;
  type: string;
  brandName: string;
  className?: string;
  style?: React.CSSProperties;
  extra?: ReactNode;
  alias?: string;
  onClick: MouseEventHandler<HTMLDivElement>;
  isSelected?: boolean;
  rightIcon?: ReactNode;
}

export const AccountItem = memo(
  ({
    style,
    balance,
    address,
    type,
    brandName,
    className,
    onClick,
    alias: aliasName,
    isSelected,
    extra,
    rightIcon,
  }: AddressItemProps) => {
    const { t } = useTranslation();
    const { whitelistEnable, whiteList } = useRabbySelector((s) => ({
      whitelistEnable: s.whitelist.enabled,
      whiteList: s.whitelist.whitelist,
    }));

    const isInWhiteList = useMemo(() => {
      return whiteList.some((e) => isSameAddress(e, address));
    }, [whiteList, address]);
    const formatAddressTooltip = (type: string, brandName: string) => {
      if (KEYRING_TYPE_TEXT[type]) {
        return KEYRING_TYPE_TEXT[type];
      }
      if (WALLET_BRAND_CONTENT[brandName]) {
        return (
          <Trans
            i18nKey="page.manageAddress.addressTypeTip"
            values={{
              type: WALLET_BRAND_CONTENT[brandName].name,
            }}
          />
        );
      }
      return '';
    };

    const [isEdit, setIsEdit] = useState(false);
    const [_alias] = useAlias(address);
    const alias = _alias || aliasName;
    const titleRef = useRef<HTMLDivElement>(null);
    const dispatch = useRabbyDispatch();

    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        const isOut =
          titleRef.current && !titleRef.current.contains(e.target as Node);
        if (isOut) {
          setIsEdit(false);
        }
      };
      document.body.addEventListener('click', handleClickOutside);
      return () => {
        document.body.removeEventListener('click', handleClickOutside);
      };
    }, []);

    const addressTypeIcon = useBrandIcon({
      address,
      brandName,
      type,
      forceLight: false,
    });

    return (
      <div
        className={clsx(
          className,
          'relative flex items-center px-[15px] py-[11px] gap-[8px] cursor-pointer',
          'border-[1px] border-solid border-transparent rounded-[8px]',
          'hover:border-rabby-blue-default hover:bg-r-blue-light1'
        )}
        style={style}
        onClick={onClick}
      >
        <Tooltip
          overlayClassName="rectangle addressType__tooltip"
          placement="topRight"
          title={formatAddressTooltip(
            type,
            BRAND_ALIAN_TYPE_TEXT[brandName] || brandName
          )}
        >
          <div className="relative flex-none">
            <img src={addressTypeIcon} className={'w-[28px] h-[28px]'} />
            <CommonSignal
              type={type}
              brandName={brandName}
              address={address}
              className={'bottom-0 right-0'}
            />
          </div>
        </Tooltip>

        <div className={clsx('min-w-0')}>
          {
            <div
              className="flex items-center gap-[4px] mb-[2px]"
              ref={titleRef}
            >
              {
                <>
                  <div
                    className={clsx(
                      'text-r-neutral-title1 font-medium leading-[18px] text-[15px]'
                    )}
                    title={alias}
                  >
                    {alias}
                  </div>
                  {whitelistEnable && isInWhiteList && (
                    <Tooltip
                      overlayClassName="rectangle"
                      placement="top"
                      title={t('page.manageAddress.whitelisted-address')}
                    >
                      <ThemeIcon
                        src={RcIconWhitelist}
                        className={clsx('w-14 h-14')}
                      />
                    </Tooltip>
                  )}
                  {extra}
                </>
              }
            </div>
          }
          <div className="flex items-center">
            <AddressViewer
              address={address?.toLowerCase()}
              showArrow={false}
              className={clsx('text-[13px] text-r-neutral-body leading-[16px]')}
            />

            <CopyChecked
              addr={address}
              className={clsx('w-[14px] h-[14px] ml-2 text-14')}
            />
            <span className="ml-[12px] text-13 text-r-neutral-body leading-[16px] truncate flex-1 block">
              ${splitNumberByStep(balance?.toFixed(2))}
            </span>
          </div>
        </div>
        {rightIcon || isSelected ? (
          <div className="flex justify-center items-center ml-auto">
            {rightIcon || <img src={IconCheck} className="w-[20px] h-[20px]" />}
          </div>
        ) : null}
      </div>
    );
  }
);
