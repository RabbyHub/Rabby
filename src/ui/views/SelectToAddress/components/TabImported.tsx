import React, { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { useHistory, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

import { AccountItem } from '@/ui/component/AccountSelector/AccountItem';
import { ellipsisAddress } from '@/ui/utils/address';

import { getUiType, isSameAddress, useWallet } from '@/ui/utils';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { groupBy } from 'lodash';
import { findAccountByPriority, filterMyAccounts } from '@/utils/account';

import type { Account } from '@/background/service/preference';
import { VerifyPwdForNonWhitelisted } from '@/ui/component/Whitelist/Modal';

const AccountItemWrapper = styled.div`
  background-color: var(--r-neutral-card1);
  position: relative;
  border-radius: 12px;
  margin-top: 12px;
  &:first-child {
    margin-top: 0;
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

type RenderAccount = Account & {
  _inWhitelist: boolean;
  _isFirstOtherAccount?: boolean;
};
export default function TabImported({
  handleChange,
}: {
  handleChange: (account: Account) => void;
}) {
  const { accountsList, whitelist } = useRabbySelector((s) => ({
    accountsList: s.accountToDisplay.accountsList,
    whitelist: s.whitelist.whitelist,
  }));

  const { sortedAccounts } = useMemo(() => {
    const whitelistSet = new Set(whitelist.map((item) => item.toLowerCase()));

    const groupAccounts = groupBy(accountsList, (item) =>
      item.address.toLowerCase()
    );

    const ret = {
      myImportedAccounts: [] as RenderAccount[],
      otherAccounts: [] as RenderAccount[],
      sortedAccounts: [] as RenderAccount[],
    };

    Object.values(groupAccounts).forEach((item) => {
      const result = findAccountByPriority(item);

      const value: RenderAccount = {
        ...result,
        _inWhitelist: whitelistSet.has(result.address.toLowerCase()),
      };

      const { isMyImported, isGnosis } = filterMyAccounts(value);

      const targetList =
        isMyImported || isGnosis ? ret.myImportedAccounts : ret.otherAccounts;

      if (!(isMyImported || isGnosis) && !targetList.length) {
        value._isFirstOtherAccount = true;
      }

      if ((targetList[0]?.balance || 0) >= (value.balance || 0)) {
        targetList.push(value);
      } else {
        targetList.unshift(value);
      }
    });

    ret.sortedAccounts = ret.myImportedAccounts.concat(ret.otherAccounts);
    return ret;
  }, [accountsList, whitelist]);

  return (
    <div className="h-full static">
      <div
        className="flex-1 overflow-y-auto px-[20px]"
        style={{ paddingBottom: 20 }}
      >
        <div className="h-full">
          {sortedAccounts.length > 0 &&
            sortedAccounts.map((item) => (
              <AccountItemWrapper
                key={`${item.address}-${item.type}`}
                className={clsx(item._isFirstOtherAccount && 'mt-[30px]')}
              >
                <AccountItem
                  getContainer={getContainer}
                  className="group whitelist-item"
                  balance={item.balance || 0}
                  showWhitelistIcon={item._inWhitelist}
                  allowEditAlias
                  hideBalance={false}
                  longEllipsis
                  address={item.address}
                  alias={ellipsisAddress(item.address)}
                  type={item.type}
                  brandName={item.brandName}
                  onClick={() => {
                    handleChange(item);
                  }}
                />
              </AccountItemWrapper>
            ))}
        </div>
      </div>
    </div>
  );
}
