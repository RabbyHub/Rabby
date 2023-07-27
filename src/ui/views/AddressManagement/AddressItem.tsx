import { message, Tooltip } from 'antd';
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

import { AddressViewer } from 'ui/component';
import { isSameAddress, splitNumberByStep, useAlias } from 'ui/utils';
import IconSuccess from 'ui/assets/success.svg';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import IconCheck from 'ui/assets/check.svg';

import IconWhitelist from 'ui/assets/address/whitelist.svg';
import { CopyChecked } from '@/ui/component/CopyChecked';
import SkeletonInput from 'antd/lib/skeleton/Input';
import { SessionSignal } from '@/ui/component/WalletConnect/SessionSignal';
import { useWalletConnectIcon } from '@/ui/component/WalletConnect/useWalletConnectIcon';
import { LedgerSignal } from '@/ui/component/ConnectStatus/LedgerSignal';
import { GridPlusSignal } from '@/ui/component/ConnectStatus/GridPlusSignal';
import { CommonSignal } from '@/ui/component/ConnectStatus/CommonSignal';

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
  isUpdatingBalance?: boolean;
  children?: React.ReactNode;
  // forceFastDelete?: boolean;
  onDelete?: () => void;
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
    isUpdatingBalance,
    children,
    onDelete,
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
    const [_alias] = useAlias(address);
    const alias = _alias || aliasName;
    const titleRef = useRef<HTMLDivElement>(null);
    const dispatch = useRabbyDispatch();

    const canFastDeleteAccount = useMemo(
      // not privacy secret
      () => (onDelete ? true : ![KEYRING_CLASS.PRIVATE_KEY].includes(type)),
      [type, onDelete]
    );
    const deleteAccount = async (e: React.MouseEvent<any>) => {
      e.stopPropagation();
      if (onDelete) {
        await onDelete();
        return;
      }
      if (canFastDeleteAccount) {
        await dispatch.addressManagement.removeAddress([
          address,
          type,
          brandName,
          type !== KEYRING_CLASS.HARDWARE.GRIDPLUS &&
            type !== KEYRING_CLASS.HARDWARE.KEYSTONE,
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

    const brandIcon = useWalletConnectIcon({
      address,
      brandName,
      type,
    });

    const addressTypeIcon = useMemo(
      () =>
        isCurrentAccount
          ? brandIcon ||
            WALLET_BRAND_CONTENT?.[brandName]?.image ||
            KEYRINGS_LOGOS[type]
          : brandIcon ||
            KEYRING_ICONS[type] ||
            WALLET_BRAND_CONTENT?.[brandName]?.image,
      [type, brandName, brandIcon]
    );

    return (
      <div className={clsx(className, 'rabby-address-item-container relative')}>
        {canFastDeleteAccount && (
          <div className="absolute icon-delete-container w-[20px] left-[-20px] h-full top-0  justify-center items-center">
            <IconDeleteAddress
              className="cursor-pointer w-[16px] h-[16px] icon icon-delete"
              onClick={deleteAccount}
            />
          </div>
        )}
        <div
          className={clsx({
            'bg-blue-light hover:bg-blue-light rounded-[6px] overflow-hidden': isCurrentAccount,
          })}
        >
          <div
            className={clsx(
              'rabby-address-item relative',
              isCurrentAccount
                ? 'bg-blue-light hover:bg-blue-light pr-0'
                : 'group hover:bg-blue-light hover:bg-opacity-[0.1]',
              {
                'is-switch': enableSwitch,
              }
            )}
            onClick={enableSwitch ? onSwitchCurrentAccount : onClick}
          >
            {/* {canFastDeleteAccount && (
              <div className="absolute hidden group-hover:flex w-[20px] left-[-20px] h-full top-0  justify-center items-center">
                <IconDeleteAddress
                  className="cursor-pointer w-[16px] h-[16px] icon icon-delete"
                  onClick={deleteAccount}
                />
              </div>
            )} */}
            <div
              className={clsx(
                'rabby-address-item-left',
                isCurrentAccount && 'w-[calc(100%-34px)] pr-0'
              )}
            >
              <Tooltip
                overlayClassName="rectangle addressType__tooltip"
                placement="topRight"
                title={formatAddressTooltip(
                  type,
                  BRAND_ALIAN_TYPE_TEXT[brandName] || brandName
                )}
              >
                <div className="relative mr-[12px]">
                  <img
                    src={addressTypeIcon}
                    className={
                      isCurrentAccount
                        ? 'w-[32px] h-[32px]'
                        : 'w-[24px] h-[24px]'
                    }
                  />
                  <CommonSignal
                    type={type}
                    brandName={brandName}
                    address={address}
                    className={isCurrentAccount ? 'bottom-0 right-0' : ''}
                  />
                </div>
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
                        {whitelistEnable && isInWhiteList && (
                          <Tooltip
                            overlayClassName="rectangle"
                            placement="top"
                            title={'Whitelisted address'}
                          >
                            <img
                              src={IconWhitelist}
                              className={clsx(
                                'w-14 h-14',
                                isCurrentAccount && 'brightness-[100]'
                              )}
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
                    className={clsx(
                      'subtitle',
                      isCurrentAccount ? 'text-white' : 'text-gray-subTitle'
                    )}
                  />

                  <CopyChecked
                    addr={address}
                    className={clsx('w-[14px] h-[14px] ml-4 text-14 textgre')}
                    copyClassName={clsx(
                      isCurrentAccount && 'text-white brightness-[100]'
                    )}
                    checkedClassName={clsx(
                      isCurrentAccount ? 'text-white' : 'text-[#00C087]'
                    )}
                  />
                  {!isCurrentAccount && (
                    <>
                      {isUpdatingBalance ? (
                        <>
                          <SkeletonInput
                            active
                            style={{
                              width: 60,
                              height: 14,
                              marginLeft: 8,
                            }}
                          />
                        </>
                      ) : (
                        <span className="ml-[12px] text-12 text-gray-subTitle">
                          ${splitNumberByStep(balance?.toFixed(2))}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>

              {enableSwitch && !isCurrentAccount && (
                <div className="rabby-address-item-extra flex justify-center items-center pr-[12px]">
                  <div className="opacity-0 group-hover:opacity-100 w-[20px] h-[20px] rounded-full bg-blue-light flex items-center justify-center">
                    <img src={IconCheck} className="w-[54%] icon icon-check" />
                  </div>
                </div>
              )}
              {isCurrentAccount && (
                <div className="rabby-address-item-extra flex items-center justify-center">
                  {isUpdatingBalance ? (
                    <>
                      <SkeletonInput
                        active
                        style={{
                          width: 96,
                          height: 24,
                        }}
                      />
                    </>
                  ) : (
                    <span className="text-15 font-medium text-white">
                      ${splitNumberByStep(balance?.toFixed(2))}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div
              className={clsx(
                'rabby-address-item-arrow absolute h-full top-0 right-0 bottom-0 items-center justify-center',
                isCurrentAccount ? 'w-[20px] mr-12' : 'w-[44px]'
              )}
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
                  isCurrentAccount
                    ? 'flex text-white'
                    : 'text-blue-light hidden group-hover:flex'
                )}
              >
                <IconArrowRight />
              </div>
            </div>
          </div>
          {children}
        </div>
      </div>
    );
  }
);

export default AddressItem;
