import React, { useMemo } from 'react';
import styled from 'styled-components';
import AddressMemo from './AddressMemo';
import userDataDrawer from './UserListDrawer';
import { useWallet } from 'ui/utils';
import { getTimeSpan } from 'ui/utils/time';
import { formatUsdValue, formatAmount } from 'ui/utils/number';
import IconEdit from 'ui/assets/editpen.svg';

const Boolean = ({ value }: { value: boolean }) => {
  return <>{value ? 'Yes' : 'No'}</>;
};

const TokenAmountWrapper = styled.div`
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
`;
const TokenAmount = ({ value }: { value: string | number }) => {
  return <TokenAmountWrapper>{formatAmount(value)}</TokenAmountWrapper>;
};

const Percentage = ({ value }: { value: number }) => {
  return <>{Math.floor(value * 100)}%</>;
};

const USDValue = ({ value }: { value: number | string }) => {
  return <>{formatUsdValue(value)}</>;
};

const TimeSpan = ({ value }) => {
  const timeSpan = useMemo(() => {
    const bornAt = value;

    const { d, h, m } = getTimeSpan(Math.floor(Date.now() / 1000) - bornAt);
    if (d > 0) {
      return `${d} Day${d > 1 ? 's' : ''} ago`;
    }
    if (h > 0) {
      return `${h} Hour${h > 1 ? 's' : ''} ago`;
    }
    if (m > 1) {
      return `${m} Minutes ago`;
    }
    return '1 Minute ago';
  }, [value]);
  return <>{timeSpan}</>;
};

const AddressMarkWrapper = styled.div`
  display: flex;
  .icon-edit-alias {
    width: 13px;
    height: 13px;
    cursor: pointer;
  }
`;
const AddressMark = ({
  onWhitelist,
  onBlacklist,
  address,
  chainId,
  isContract = false,
  onChange,
}: {
  onWhitelist: boolean;
  onBlacklist: boolean;
  address: string;
  chainId?: string;
  isContract?: boolean;
  onChange(): void;
}) => {
  const wallet = useWallet();
  const handleEditMark = () => {
    userDataDrawer({
      address: address,
      onWhitelist,
      onBlacklist,
      async onChange(data) {
        if (data.onWhitelist && !onWhitelist) {
          if (isContract && chainId) {
            await wallet.addContractWhitelist({
              address,
              chainId,
            });
          } else {
            await wallet.addAddressWhitelist(address);
          }
        }
        if (data.onBlacklist && !onBlacklist) {
          if (isContract && chainId) {
            await wallet.addContractBlacklist({
              address,
              chainId,
            });
          } else {
            await wallet.addAddressBlacklist(address);
          }
        }
        if (
          !data.onBlacklist &&
          !data.onWhitelist &&
          (onBlacklist || onWhitelist)
        ) {
          if (isContract && chainId) {
            await wallet.removeContractBlacklist({
              address,
              chainId,
            });
            await wallet.removeContractWhitelist({
              address,
              chainId,
            });
          } else {
            await wallet.removeAddressBlacklist(address);
            await wallet.removeAddressWhitelist(address);
          }
        }
        onChange();
      },
    });
  };
  return (
    <AddressMarkWrapper>
      <span className="mr-6">
        {onWhitelist && 'Trusted'}
        {onBlacklist && 'Blocked'}
        {!onBlacklist && !onWhitelist && 'No mark'}
      </span>
      <img
        src={IconEdit}
        className="icon-edit-alias icon"
        onClick={handleEditMark}
      />
    </AddressMarkWrapper>
  );
};

export {
  Boolean,
  TokenAmount,
  Percentage,
  AddressMemo,
  AddressMark,
  USDValue,
  TimeSpan,
};
