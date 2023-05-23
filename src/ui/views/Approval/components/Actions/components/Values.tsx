import React from 'react';
import styled from 'styled-components';
import { formatAmount } from 'ui/utils/number';
import AddressMemo from './AddressMemo';
import userDataDrawer from './UserListDrawer';
import { useWallet } from 'ui/utils';
import { formatUsdValue } from 'ui/utils/number';
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

export { Boolean, TokenAmount, Percentage, AddressMemo, AddressMark, USDValue };
