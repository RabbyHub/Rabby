import { Button, DrawerProps, Form, Input, Tooltip } from 'antd';
import clsx from 'clsx';
import {
  BRAND_ALIAN_TYPE_TEXT,
  KEYRING_CLASS,
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
import { useBrandIcon } from '@/ui/hooks/useBrandIcon';
import IconCheck from 'ui/assets/check-3.svg';
import { AddressViewer, Popup } from 'ui/component';
import { splitNumberByStep, useAlias, useCexId } from 'ui/utils';
import { ReactComponent as RcWhitelistGuardBordered } from '@/ui/assets/component/whitelist-guard-bordered.svg';
import { ReactComponent as IconEditPen } from 'ui/assets/edit-pen-cc.svg';
import { Exchange } from '@/ui/models/exchange';
import { useForm } from 'antd/lib/form/Form';
import styled from 'styled-components';

export interface AddressItemProps {
  balance: number;
  address: string;
  type: string;
  brandName: string;
  className?: string;
  style?: React.CSSProperties;
  extra?: ReactNode;
  alias?: string;
  onClick?: MouseEventHandler<HTMLDivElement>;
  isSelected?: boolean;
  rightIcon?: ReactNode;
  showWhitelistIcon?: boolean;
  disabled?: boolean;
  tmpCexInfo?: Exchange;
  allowEditAlias?: boolean;
  hideBalance?: boolean;
  longEllipsis?: boolean;
  getContainer?: DrawerProps['getContainer'];
}

const HoverShowEditPenWrapper = styled.div<{ hideBalance?: boolean }>`
  position: relative;
  .edit-pen {
    opacity: 0;
  }
  .copy-icon {
    display: ${(props) => (props.hideBalance ? 'none' : 'block')};
  }
  &:hover {
    .edit-pen {
      opacity: 1;
    }
    .copy-icon {
      opacity: 1;
      display: block;
      color: var(--r-neutral-body) !important;
      &:hover {
        color: var(--r-blue-default) !important;
      }
    }
  }
`;

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
    showWhitelistIcon,
    disabled = false,
    allowEditAlias = false,
    hideBalance,
    tmpCexInfo,
    longEllipsis,
    getContainer,
  }: AddressItemProps) => {
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
    const [_alias, setAlias] = useAlias(address);
    const [_cexInfo] = useCexId(address);
    const alias = _alias || aliasName;
    const titleRef = useRef<HTMLDivElement>(null);
    const [form] = useForm();

    const inputRef = useRef<Input>(null);
    const { t } = useTranslation();

    const cexInfo = useMemo(() => {
      if (tmpCexInfo && !showWhitelistIcon) {
        return tmpCexInfo;
      }
      return _cexInfo;
    }, [tmpCexInfo, _cexInfo, showWhitelistIcon]);

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
    const cexLogo = useMemo(() => {
      if (type === KEYRING_CLASS.WATCH) {
        return cexInfo?.logo;
      }
      return undefined;
    }, [cexInfo?.logo, type]);

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!disabled) {
        onClick?.(e);
      }
    };

    const handleEditMemo = () => {
      form.setFieldsValue({
        memo: alias,
      });
      const { destroy } = Popup.info({
        title: t('page.addressDetail.edit-memo-title'),
        isSupportDarkMode: true,
        height: 215,
        isNew: true,
        getContainer,
        content: (
          <div
            ref={() => {
              setTimeout(() => {
                inputRef.current?.focus();
              }, 200);
            }}
            className="pt-[4px]"
          >
            <Form
              form={form}
              onFinish={async () => {
                form
                  .validateFields()
                  .then((values) => {
                    return setAlias(values.memo);
                  })
                  .then(() => {
                    destroy();
                  });
              }}
              initialValues={{
                memo: alias,
              }}
            >
              <Form.Item
                name="memo"
                className="h-[80px] mb-0"
                rules={[
                  {
                    required: true,
                    message: t('page.addressDetail.please-input-address-note'),
                  },
                ]}
              >
                <Input
                  ref={inputRef}
                  className="popup-input h-[48px] bg-r-neutral-card-1"
                  size="large"
                  placeholder={t(
                    'page.addressDetail.please-input-address-note'
                  )}
                  autoFocus
                  allowClear
                  spellCheck={false}
                  autoComplete="off"
                  maxLength={50}
                ></Input>
              </Form.Item>
              <div className="text-center flex gap-x-16">
                <Button
                  size="large"
                  type="ghost"
                  onClick={() => destroy()}
                  className={clsx(
                    'w-[200px]',
                    'text-blue-light',
                    'border-blue-light',
                    'hover:bg-[#8697FF1A] active:bg-[#0000001A]',
                    'before:content-none'
                  )}
                >
                  {t('global.Cancel')}
                </Button>
                <Button
                  type="primary"
                  size="large"
                  className="w-[200px]"
                  htmlType="submit"
                >
                  {t('global.confirm')}
                </Button>
              </div>
            </Form>
          </div>
        ),
      });
    };

    return (
      <HoverShowEditPenWrapper
        hideBalance={hideBalance}
        className={clsx(
          className,
          'relative flex items-center px-[15px] py-[11px] gap-[8px]',
          'border-[1px] border-solid border-transparent rounded-[12px]',
          disabled
            ? 'cursor-default'
            : 'cursor-pointer hover:border-rabby-blue-default hover:bg-r-blue-light1'
        )}
        style={style}
        onClick={handleClick}
      >
        <Tooltip
          overlayClassName="rectangle addressType__tooltip"
          placement="topRight"
          title={
            !showWhitelistIcon
              ? formatAddressTooltip(
                  type,
                  BRAND_ALIAN_TYPE_TEXT[brandName] || brandName
                )
              : ''
          }
        >
          <div className="relative flex-none">
            <img
              src={cexLogo || addressTypeIcon}
              className={'w-[28px] h-[28px] rounded-full'}
            />
            {showWhitelistIcon ? (
              <Tooltip
                overlayClassName="rectangle addressType__tooltip"
                title="Whitelist Address"
              >
                <div className="absolute w-[18px] h-[18px] whitelist-guard-bordered-view text-r-blue-default">
                  <RcWhitelistGuardBordered className="w-[18px] h-[18px]" />
                </div>
              </Tooltip>
            ) : (
              <CommonSignal
                type={type}
                brandName={brandName}
                address={address}
                className={'bottom-0 right-0'}
              />
            )}
          </div>
        </Tooltip>

        <div className={clsx('min-w-0')}>
          <div className="flex items-center mb-[4px]" ref={titleRef}>
            {
              <>
                <div
                  className={clsx(
                    'text-r-neutral-title1 font-bold leading-[20px] text-[16px]'
                  )}
                  title={alias}
                >
                  {alias}
                </div>
                {allowEditAlias && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditMemo();
                    }}
                    className={`
                      edit-pen
                      text-r-neutral-body transition-opacity duration-100 cursor-pointer
                      hover:text-r-blue-default
                    `}
                  >
                    <IconEditPen />
                  </div>
                )}
                {extra}
              </>
            }
          </div>
          <div className="flex items-center">
            <AddressViewer
              address={address?.toLowerCase()}
              showArrow={false}
              longEllipsis={longEllipsis}
              className={clsx('text-[12px] text-r-neutral-foot leading-[16px]')}
            />

            <CopyChecked
              addr={address}
              className={clsx('copy-icon w-[14px] h-[14px] ml-4 text-14')}
            />
            {!hideBalance && (
              <span className="ml-[12px] text-[12px] text-r-neutral-foot leading-[16px] truncate flex-1 block">
                ${splitNumberByStep(balance?.toFixed(2))}
              </span>
            )}
          </div>
        </div>
        {(!disabled && rightIcon) || isSelected ? (
          <div className="flex justify-center items-center ml-auto">
            {rightIcon || <img src={IconCheck} className="w-[20px] h-[20px]" />}
          </div>
        ) : null}
      </HoverShowEditPenWrapper>
    );
  }
);
