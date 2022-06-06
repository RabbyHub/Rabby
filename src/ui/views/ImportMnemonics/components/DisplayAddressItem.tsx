import React, { useState, forwardRef } from 'react';
import { useDebounce } from 'react-use';
import { Input } from 'antd';
import styled from 'styled-components';
import clsx from 'clsx';

import LessPalette from '@/ui/style/var-defs';
import { useRabbyDispatch } from '@/ui/store';

const AddressViewer = styled.div`
  .address-name {
    font-size: 12px;
    color: ${LessPalette['@color-comment']};
  }

  .number-index {
    margin-right: 0;
    width: 12px;
    flex-shrink: 0;
  }
`;

export interface DisplayAddressItemProps {
  account: {
    address: string;
    alianName?: string;
    index?: number;
  };
  className?: string;
  index?: number;
}

const DisplayAddressItem = forwardRef(
  ({ account, className }: DisplayAddressItemProps) => {
    if (!account) {
      return null;
    }
    const [alianName, setAlianName] = useState<string>(
      account?.alianName || ''
    );
    const dispatch = useRabbyDispatch();
    useDebounce(
      () => {
        dispatch.importMnemonics.setImportingAccountAlianNameByIndex({
          index: account.index,
          alianName,
        });
      },
      250,
      [alianName, account]
    );

    const address = account?.address?.toLowerCase() || '';

    return (
      <li className={className}>
        <div
          className={clsx('flex items-center relative')}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <div className="number-index">{account.index}</div>
          <div className={clsx('address-info', 'ml-0')}>
            <div className="brand-name flex">
              <Input
                value={alianName}
                defaultValue={alianName}
                onChange={(e) => {
                  e.stopPropagation();
                  setAlianName(e.target.value);
                }}
                onClick={(e) => e.stopPropagation()}
                autoFocus
                maxLength={20}
                min={0}
              />
            </div>
            <div className="flex items-center">
              <AddressViewer className="flex items-center">
                <div
                  className={'flex items-center address-name'}
                  title={address}
                >
                  {`${address.slice(0, 6)}...${address.slice(-4)}`}
                </div>
              </AddressViewer>
            </div>
          </div>
        </div>
      </li>
    );
  }
);

export default DisplayAddressItem;
