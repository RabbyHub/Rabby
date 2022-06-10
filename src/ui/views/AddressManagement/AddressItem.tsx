import { Input, Tooltip } from 'antd';
import clsx from 'clsx';
import {
  BRAND_ALIAN_TYPE_TEXT,
  KEYRING_ICONS,
  KEYRING_TYPE_TEXT,
  WALLET_BRAND_CONTENT,
} from 'consts';
import React, {
  memo,
  MouseEventHandler,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { ReactComponent as IconArrowRight } from 'ui/assets/arrow-right-gray.svg';
import IconCopy from 'ui/assets/component/icon-copy.svg';
import IconCorrect from 'ui/assets/dashboard/contacts/correct.png';
import IconEditPen from 'ui/assets/editpen.svg';
import { ReactComponent as IconStar } from 'ui/assets/star-1.svg';
import { AddressViewer, Copy } from 'ui/component';
import { useAlias } from 'ui/utils';
export interface AddressItemProps {
  address: string;
  type: string;
  brandName: string;
  className?: string;
  extra?: ReactNode;
  alias?: string;
  onClick: MouseEventHandler<HTMLDivElement>;
}

const AddressItem = memo(
  ({
    address,
    type,
    brandName,
    className,
    onClick,
    alias: aliasName,
    extra,
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

    return (
      <div className={clsx(className, 'rabby-address-item')} onClick={onClick}>
        <Tooltip
          overlayClassName="rectangle addressType__tooltip"
          placement="topRight"
          title={formatAddressTooltip(
            type,
            BRAND_ALIAN_TYPE_TEXT[brandName] || brandName
          )}
        >
          <img
            src={KEYRING_ICONS[type] || WALLET_BRAND_CONTENT[brandName]?.image}
            className="rabby-address-item-icon"
          />
        </Tooltip>

        <div className={clsx('rabby-address-item-content')}>
          {
            <div className="rabby-address-item-title" ref={titleRef}>
              {isEdit ? (
                <>
                  <Input
                    ref={inputRef}
                    defaultValue={alias}
                    onPressEnter={() => {
                      setIsEdit(false);
                      setAlias(inputRef.current?.state.value);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    maxLength={50}
                    min={0}
                  />
                  <img
                    className="w-[16px] h-[16px] flex-shrink-0"
                    src={IconCorrect}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsEdit(false);
                      setAlias(inputRef.current?.state.value);
                    }}
                  />
                </>
              ) : (
                <>
                  <div className="rabby-address-item-alias" title={alias}>
                    {alias}
                  </div>
                  <img
                    className="icon-edit w-[12px] h-[12px] flex-shrink-0"
                    src={IconEditPen}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEdit(true);
                    }}
                  />
                </>
              )}
            </div>
          }
          <div className="flex items-center">
            <AddressViewer
              address={address?.toLowerCase()}
              showArrow={false}
              className={'subtitle'}
            />
            <Copy
              onClick={(e) => e.stopPropagation()}
              icon={IconCopy}
              variant="address"
              data={address}
              className="w-[14px] h-[14px] ml-4"
            ></Copy>
          </div>
        </div>

        <div className="rabby-address-item-extra">{extra}</div>
        <div className="rabby-address-item-arrow">
          <IconArrowRight
            width={20}
            height={20}
            viewBox="0 0 12 12"
          ></IconArrowRight>
        </div>
      </div>
    );
  }
);

export default AddressItem;
