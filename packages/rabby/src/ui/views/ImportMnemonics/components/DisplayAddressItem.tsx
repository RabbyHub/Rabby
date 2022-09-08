import React, { useState } from 'react';
import { useDebounce } from 'react-use';
import styled from 'styled-components';
import clsx from 'clsx';

import LessPalette from '@/ui/style/var-defs';
import { useRabbyDispatch } from '@/ui/store';
import { useTranslation } from 'react-i18next';

const AddressViewer = styled.div`
  .address-name {
    color: ${LessPalette['@color-title']};
    font-weight: 500;
    font-size: 15px;
    line-height: 18px;
  }

  .number-index {
    margin-right: 0;
    width: 12px;
    flex-shrink: 0;
  }
`;

const NumberIndex = styled.div`
  font-weight: normal;
  font-size: 12px;
  color: ${LessPalette['@color-comment-2']};
  width: 36px;
  text-align: left;
`;

export interface DisplayAddressItemProps {
  account: {
    address: string;
    alianName?: string;
    index?: number;
  };
  className?: string;
  imported?: boolean;
}

const DisplayAddressItem = ({
  account,
  className,
  imported,
}: DisplayAddressItemProps) => {
  if (!account) {
    return null;
  }
  const { t } = useTranslation();
  const [alianName, setAlianName] = useState<string>(account?.alianName || '');
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
    <li className={clsx(className)}>
      <div
        className={clsx('flex items-center justify-between w-[100%] relative')}
      >
        <div className="flex items-center relative">
          <NumberIndex>{account.index}</NumberIndex>
          <div className={clsx('address-info', 'ml-0')}>
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
        <div>
          {imported && (
            <span className="rounded-full bg-gray-bg text-gray-comment text-12 px-[5px] py-[3px]">
              {t('Imported')}
            </span>
          )}
        </div>
      </div>
    </li>
  );
};

export default DisplayAddressItem;
