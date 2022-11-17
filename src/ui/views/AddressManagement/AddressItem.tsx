import { Input, message, Tooltip } from 'antd';
import clsx from 'clsx';
import {
  BRAND_ALIAN_TYPE_TEXT,
  KEYRINGS_LOGOS,
  KEYRING_CLASS,
  KEYRING_ICONS,
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
import { ReactComponent as IconArrowRight } from 'ui/assets/address/bold-right-arrow.svg';
import { ReactComponent as IconDeleteAddress } from 'ui/assets/address/delete.svg';

import IconCopy from 'ui/assets/component/icon-copy.svg';
import { AddressViewer, Copy } from 'ui/component';
import { splitNumberByStep, useAlias, useWallet } from 'ui/utils';
import IconSuccess from 'ui/assets/success.svg';
import { useRabbyDispatch } from '@/ui/store';
import IconCheck from 'ui/assets/check.svg';

export interface AddressItemProps {
  balance: number;
  address: string;
  type: string;
  brandName: string;
  className?: string;
  extra?: ReactNode;
  alias?: string;
  onClick: MouseEventHandler<HTMLDivElement>;
  onSwitchCurrentAccount?: () => void;
  enableSwitch?: boolean;
  isCurrentAccount?: boolean;
}

const AddressItem = memo(
  ({
    balance,
    address,
    type,
    brandName,
    className,
    onClick,
    onSwitchCurrentAccount,
    alias: aliasName,
    extra,
    enableSwitch = false,
    isCurrentAccount = false,
  }: AddressItemProps) => {
    const { t } = useTranslation();
    const formatAddressTooltip = (type: string, brandName: string) => {
      if (KEYRING_TYPE_TEXT[type]) {
        return t(KEYRING_TYPE_TEXT[type]);
      }
      if (WALLET_BRAND_CONTENT[brandName]) {
        return (
          <Trans
            i18nKey="addressTypeTip"
            values={{
              type: WALLET_BRAND_CONTENT[brandName].name,
            }}
          />
        );
      }
      return '';
    };

    const [isEdit, setIsEdit] = useState(false);
    const [_alias, setAlias] = useAlias(address);
    const alias = _alias || aliasName;
    const inputRef = useRef<Input>(null);
    const titleRef = useRef<HTMLDivElement>(null);

    const wallet = useWallet();
    const dispatch = useRabbyDispatch();

    const canFastDeleteAccount = useMemo(
      // not seed phrase ,not privacy secret
      () => ![KEYRING_CLASS.MNEMONIC, KEYRING_CLASS.PRIVATE_KEY].includes(type),
      [type]
    );
    const deleteAccount = async (e: React.MouseEvent<any>) => {
      e.stopPropagation();
      if (canFastDeleteAccount) {
        await dispatch.addressManagement.removeAddress([
          address,
          type,
          brandName,
        ]);
        message.success({
          icon: <img src={IconSuccess} className="icon icon-success" />,
          content: t('Deleted'),
          duration: 0.5,
        });
      }
    };

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

    const addressTypeIcon = useMemo(
      () =>
        isCurrentAccount
          ? WALLET_BRAND_CONTENT?.[brandName]?.image || KEYRINGS_LOGOS[type]
          : KEYRING_ICONS[type] || WALLET_BRAND_CONTENT?.[brandName]?.image,
      [type, brandName]
    );

    return (
      <div
        className={clsx(
          className,
          'rabby-address-item relative  py-[9px]',
          isCurrentAccount
            ? 'bg-blue-light hover:bg-blue-light'
            : 'group hover:bg-blue-light hover:bg-opacity-[0.1]'
        )}
        onClick={enableSwitch ? onSwitchCurrentAccount : onClick}
      >
        {canFastDeleteAccount && (
          <div className="absolute hidden group-hover:flex w-[20px] left-[-20px] h-full top-0  justify-center items-center">
            <IconDeleteAddress
              className="cursor-pointer w-[16px] h-[16px]"
              onClick={deleteAccount}
            />
          </div>
        )}
        <Tooltip
          overlayClassName="rectangle addressType__tooltip"
          placement="topRight"
          title={formatAddressTooltip(
            type,
            BRAND_ALIAN_TYPE_TEXT[brandName] || brandName
          )}
        >
          <img
            src={addressTypeIcon}
            className="rabby-address-item-icon w-[24px] h-[24px]"
          />
        </Tooltip>

        <div className={clsx('rabby-address-item-content')}>
          {
            <div className="rabby-address-item-title" ref={titleRef}>
              {
                <>
                  <div
                    className={clsx(
                      'rabby-address-item-alias',
                      isCurrentAccount && 'text-white'
                    )}
                    title={alias}
                  >
                    {alias}
                  </div>
                  {extra}
                </>
              }
            </div>
          }
          <div className="flex items-center">
            <AddressViewer
              address={address?.toLowerCase()}
              showArrow={false}
              className={clsx('subtitle', isCurrentAccount && 'text-white')}
            />
            <Copy
              onClick={(e) => e.stopPropagation()}
              icon={IconCopy}
              variant="address"
              data={address}
              className={clsx(
                'w-[14px] h-[14px] ml-4',
                isCurrentAccount && 'text-white brightness-[100]'
              )}
            ></Copy>
            {!isCurrentAccount && (
              <span className="ml-[6px] text-12 text-gray-subTitle">
                ${splitNumberByStep(balance?.toFixed(2))}
              </span>
            )}
          </div>
        </div>

        {enableSwitch && !isCurrentAccount && (
          <div className="rabby-address-item-extra flex justify-center items-center pr-[44px]">
            <div className="opacity-0 group-hover:opacity-100 w-[16px] h-[16px] rounded-full bg-blue-light flex items-center justify-center">
              <img src={IconCheck} className="w-[54%] icon icon-check" />
            </div>
            <div className="hidden group-hover:block w-[1px] h-full absolute top-0 right-[44px] bg-blue-light"></div>
          </div>
        )}
        {isCurrentAccount && (
          <div className="rabby-address-item-extra mr-[16px]">
            <span className="text-12 text-white">
              ${splitNumberByStep(balance?.toFixed(2))}
            </span>
          </div>
        )}
        <div
          className="rabby-address-item-arrow"
          onClick={
            enableSwitch
              ? (e) => {
                  e.stopPropagation();
                  onClick?.(e);
                }
              : undefined
          }
        >
          <div
            className={clsx(
              ' absolute h-full top-0 right-0 w-[44px]  items-center justify-center',
              isCurrentAccount
                ? 'flex text-white'
                : 'text-blue-light hidden group-hover:flex'
            )}
          >
            <IconArrowRight />
          </div>
        </div>
      </div>
    );
  }
);

export default AddressItem;
