import React, { useMemo, useRef } from 'react';
import styled from 'styled-components';
import clsx from 'clsx';
import { message, Tooltip } from 'antd';
import { ellipsis } from 'ui/utils/address';
import { IDisplayedAccountWithBalance } from 'ui/models/accountToDisplay';
import { splitNumberByStep } from 'ui/utils/number';
import { WALLET_BRAND_CONTENT, KEYRING_ICONS } from 'consts';
import IconCopy from 'ui/assets/component/icon-copy.svg';
import IconWhitelist from 'ui/assets/address/whitelist.svg';
import { useRabbySelector } from '@/ui/store';
import { isSameAddress } from '@/ui/utils';
import { copyAddress } from '@/ui/utils/clipboard';
import { CopyChecked } from '../CopyChecked';
import { useTranslation } from 'react-i18next';

const AccountItemWrapper = styled.div`
  padding: 10px 16px;
  background-color: #f5f6fa;
  border-radius: 6px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  flex: 1;
  border: 1px solid transparent;

  &:hover {
    background-color: var(--r-blue-light-1, #eef1ff);
    border-color: var(--r-blue-default, #7084ff);
  }
  .name {
    font-weight: 500;
    font-size: 15px;
    line-height: 18px;
    margin-bottom: 0;
  }
  .address {
    font-weight: 400;
    font-size: 12px;
    line-height: 14px;
    margin: 0;
    display: flex;
  }
  .icon-copy {
    width: 14px;
    height: 14px;
    margin-left: 4px;
    cursor: pointer;
  }
  .account-info {
    margin-left: 8px;
  }
  &:nth-last-child(1) {
    margin-bottom: 0;
  }
  &.disabled {
    cursor: not-allowed;
    background-color: rgba(245, 246, 250, 0.5);
    &:hover {
      background-color: #f5f6fa;
      border-color: transparent;
    }
    & > *,
    .account-info .name,
    .account-info .addr {
      opacity: 0.5;
    }
    & > .account-info {
      opacity: 1;
    }
  }
`;

const AccountItem = ({
  account,
  disabled = false,
  onClick,
}: {
  account: IDisplayedAccountWithBalance;
  disabled?: boolean;
  onClick?(account: IDisplayedAccountWithBalance): void;
}) => {
  const { whitelistEnable, whiteList } = useRabbySelector((s) => ({
    whitelistEnable: s.whitelist.enabled,
    whiteList: s.whitelist.whitelist,
  }));

  const { t } = useTranslation();

  const isInWhiteList = useMemo(() => {
    return whiteList.some((e) => isSameAddress(e, account.address));
  }, [whiteList, account.address]);

  const addressElement = useRef(null);
  const handleClickCopy = (e: React.MouseEvent<HTMLImageElement>) => {
    e.stopPropagation();
    copyAddress(account.address);
  };
  const handleClickItem = () => {
    if (disabled) {
      message.error(t('component.Contact.AddressItem.notWhitelisted'));
      return;
    }

    onClick && onClick(account);
  };
  return (
    <AccountItemWrapper
      className={clsx({ disabled, 'cursor-pointer': !disabled && onClick })}
      onClick={handleClickItem}
    >
      <img
        className="icon icon-account-type w-[24px] h-[24px]"
        src={
          WALLET_BRAND_CONTENT[account.brandName]?.image ||
          KEYRING_ICONS[account.type]
        }
      />
      <div className="account-info flex-1">
        <p className="name">
          <div className="flex items-center gap-4">
            <span className="inline-block max-w-[180px] overflow-hidden overflow-ellipsis whitespace-nowrap">
              {account.alianName}
            </span>
            {onClick && whitelistEnable && isInWhiteList && (
              <Tooltip
                overlayClassName="rectangle"
                placement="top"
                title={t('component.Contact.AddressItem.whitelistedTip')}
              >
                <img src={IconWhitelist} className={'w-14 h-14'} />
              </Tooltip>
            )}
          </div>
        </p>
        <p className="address" title={account.address} ref={addressElement}>
          <div className="addr">{ellipsis(account.address)}</div>

          <CopyChecked addr={account.address} className="icon icon-copy" />
        </p>
      </div>
      <p className="text-13 text-gray-title mb-0">
        ${splitNumberByStep(Math.floor(account.balance))}
      </p>
    </AccountItemWrapper>
  );
};

export default AccountItem;
