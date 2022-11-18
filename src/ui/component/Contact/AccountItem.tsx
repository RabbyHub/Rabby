import React, { useRef } from 'react';
import styled from 'styled-components';
import ClipboardJS from 'clipboard';
import clsx from 'clsx';
import { message } from 'antd';
import { ellipsis } from 'ui/utils/address';
import { IDisplayedAccountWithBalance } from 'ui/models/accountToDisplay';
import { splitNumberByStep } from 'ui/utils/number';
import { WALLET_BRAND_CONTENT, KEYRING_ICONS } from 'consts';
import IconSuccess from 'ui/assets/success.svg';
import IconCopy from 'ui/assets/component/icon-copy.svg';

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
    background-color: rgba(134, 151, 255, 0.1);
    border-color: #8697ff;
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
    opacity: 0.5;
    cursor: not-allowed;
    &:hover {
      background-color: f5f6fa;
      border-color: transparent;
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
  const addressElement = useRef(null);
  const handleClickCopy = (e: React.MouseEvent<HTMLImageElement>) => {
    if (disabled) return;
    e.stopPropagation();
    const clipboard = new ClipboardJS(addressElement.current!, {
      text: function () {
        return account.address;
      },
    });
    clipboard.on('success', () => {
      message.success({
        duration: 3,
        icon: <i />,
        content: (
          <div>
            <div className="flex gap-4 mb-4">
              <img src={IconSuccess} alt="" />
              Copied
            </div>
            <div className="text-white">{account.address}</div>
          </div>
        ),
      });
      clipboard.destroy();
    });
  };
  const handleClickItem = () => {
    if (disabled) {
      message.error('This address is not whitelisted');
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
        <p className="name">{account.alianName}</p>
        <p className="address" title={account.address} ref={addressElement}>
          {ellipsis(account.address)}
          <div className="cursor-pointer" onClick={handleClickCopy}>
            <img className="icon icon-copy" src={IconCopy} />
          </div>
        </p>
      </div>
      <p className="text-13 text-gray-title mb-0">
        ${splitNumberByStep(Math.floor(account.balance))}
      </p>
    </AccountItemWrapper>
  );
};

export default AccountItem;
