import React, { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { useHistory, useLocation } from 'react-router-dom';
import { isValidAddress } from '@ethereumjs/util';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { Button, message, Tabs } from 'antd';

import { EmptyWhitelistHolder } from '../components/EmptyWhitelistHolder';
import { AccountItem } from '@/ui/component/AccountSelector/AccountItem';
import { ellipsisAddress } from '@/ui/utils/address';

import { getUiType, isSameAddress, useWallet } from '@/ui/utils';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { groupBy } from 'lodash';
import { findAccountByPriority } from '@/utils/account';
import { padWatchAccount } from '../util';

// icons
import { ReactComponent as RcIconAddWhitelist } from '@/ui/assets/address/add-whitelist.svg';
import { ReactComponent as RcIconDeleteAddress } from 'ui/assets/address/delete.svg';
import { ReactComponent as IconAdd } from '@/ui/assets/address/add.svg';
import IconSuccess from 'ui/assets/success.svg';
import qs from 'qs';

const WhitelistItemWrapper = styled.div`
  background-color: var(--r-neutral-card1);
  position: relative;
  border-radius: 8px;
  margin-top: 12px;
  &:first-child {
    margin-top: 9px;
  }
  .whitelist-item {
    gap: 12px !important;
  }
  .icon-delete-container {
    display: flex;
    opacity: 0;
    &:hover {
      g {
        stroke: #ec5151;
      }
    }
  }
  &:hover {
    .icon-delete-container {
      opacity: 1;
    }
  }
`;

const isTab = getUiType().isTab;
const isDesktop = getUiType().isDesktop;
const getContainer =
  isTab || isDesktop ? '.js-rabby-popup-container' : undefined;

export default function TabWhitelist({
  unimportedBalances = {},
  handleChange,
}: {
  unimportedBalances: Record<string, number>;
  handleChange: (address: string, type?: string) => void;
}) {
  const history = useHistory();
  const { search } = useLocation();
  const dispatch = useRabbyDispatch();
  const wallet = useWallet();
  const { t } = useTranslation();

  const { accountsList, whitelist } = useRabbySelector((s) => ({
    accountsList: s.accountToDisplay.accountsList,
    whitelist: s.whitelist.whitelist,
  }));

  const importedWhitelistAccounts = useMemo(() => {
    const groupAccounts = groupBy(accountsList, (item) =>
      item.address.toLowerCase()
    );
    const uniqueAccounts = Object.values(groupAccounts).map((item) =>
      findAccountByPriority(item)
    );
    return [...uniqueAccounts].filter((a) =>
      whitelist?.some((w) => isSameAddress(w, a.address))
    );
  }, [accountsList, whitelist]);

  const unimportedWhitelistAccounts = useMemo(() => {
    return whitelist
      ?.filter(
        (w) =>
          !importedWhitelistAccounts.some((a) => isSameAddress(w, a.address))
      )
      .map((w) => padWatchAccount(w));
  }, [importedWhitelistAccounts, whitelist]);

  const allAccounts = useMemo(() => {
    return [
      ...importedWhitelistAccounts,
      ...unimportedWhitelistAccounts.map((acc) => ({
        ...acc,
        balance: unimportedBalances[acc.address],
      })),
    ].sort((a, b) => (b.balance || 0) - (a.balance || 0));
  }, [
    importedWhitelistAccounts,
    unimportedWhitelistAccounts,
    unimportedBalances,
  ]);

  const handleDeleteWhitelist = async (address: string) => {
    await wallet.removeWhitelist(address);
    const isImported = importedWhitelistAccounts.some((a) =>
      isSameAddress(a.address, address)
    );
    if (!isImported) {
      await wallet.removeContactInfo(address);
    } else {
      const cexId = await wallet.getCexId(address);
      if (cexId) {
        await wallet.updateCexId(address, '');
      }
    }
    dispatch.whitelist.getWhitelist();
    dispatch.contactBook.getContactBookAsync();
    message.success({
      icon: <img src={IconSuccess} className="icon icon-success" />,
      content: t('page.whitelist.tips.removed'),
    });
  };
  return (
    <div className="h-full static">
      {/* WhiteList or Imported Addresses List */}
      <div
        className="flex-1 overflow-y-auto px-[20px]"
        style={{ paddingBottom: 72 }}
      >
        <div className="h-full">
          {allAccounts.length > 0 ? (
            allAccounts.map((item) => (
              <WhitelistItemWrapper key={`${item.address}-${item.type}`}>
                <div className="absolute icon-delete-container w-[20px] left-[-20px] h-full top-0  justify-center items-center">
                  <RcIconDeleteAddress
                    className="cursor-pointer w-[16px] h-[16px] icon icon-delete"
                    onClick={() => handleDeleteWhitelist(item.address)}
                  />
                </div>
                <AccountItem
                  getContainer={getContainer}
                  className="group whitelist-item"
                  balance={0}
                  showWhitelistIcon
                  allowEditAlias
                  hideBalance
                  longEllipsis
                  address={item.address}
                  alias={ellipsisAddress(item.address)}
                  type={item.type}
                  brandName={item.brandName}
                  onClick={() => {
                    handleChange(item.address, item.type);
                  }}
                />
              </WhitelistItemWrapper>
            ))
          ) : (
            <EmptyWhitelistHolder
              onAddWhitelist={() => {
                history.push('/whitelist-input');
              }}
            />
          )}
        </div>
      </div>
      {/* Add Whitelist Entry */}
      <div className="select-to-address-tab-fixed-bottom">
        {allAccounts.length > 0 && (
          <div className="px-[20px] w-full">
            <Button
              onClick={() => {
                if (isDesktop) {
                  history.push(
                    `${history.location.pathname}?${qs.stringify({
                      action: 'send',
                      sendPageType: 'whitelistInput',
                    })}`
                  );
                } else {
                  history.push('/whitelist-input');
                }
              }}
              type="primary"
              className={clsx(
                'bg-transparent w-full shadow-none h-[48px] border-rabby-blue-default hover:before:hidden'
              )}
            >
              <div className="flex items-center justify-center space-x-6 text-r-blue-default">
                <IconAdd />
                <span
                  className="text-[13px] font-medium"
                  style={{
                    textShadow: 'none',
                  }}
                >
                  {t('page.selectToAddress.whitelist.addWhitelist')}
                </span>
              </div>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
