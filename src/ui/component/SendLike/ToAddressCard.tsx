import React, { useEffect, useMemo } from 'react';

import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import styled from 'styled-components';
import { copyAddress } from '@/ui/utils/clipboard';
import { Account } from '@/background/service/preference';
import { AddressTypeCard } from '@/ui/component/AddressRiskAlert';
import { ReactComponent as RcIconCopy } from 'ui/assets/send-token/modal/copy.svg';
import { Cex } from '@rabby-wallet/rabby-api/dist/types';
import { getUiType, isSameAddress } from '@/ui/utils';
import { ellipsisAddress } from '@/ui/utils/address';
import clsx from 'clsx';

const AddressText = styled.span`
  font-weight: 500;
  color: var(--r-neutral-title1);
`;

const isTab = getUiType().isTab;
const getContainer = isTab ? '.js-rabby-popup-container' : undefined;

interface AddressTypeCardProps {
  loading?: boolean;
  account: Account;
  cexInfo?: Cex;
}

export const ToAddressCard = ({
  account: targetAccount,
  loading,
  cexInfo,
}: AddressTypeCardProps) => {
  const { whitelist } = useRabbySelector((s) => ({
    whitelist: s.whitelist.whitelist,
  }));
  const dispatch = useRabbyDispatch();

  const addressSplit = useMemo(() => {
    const address = targetAccount.address || '';
    if (!address) {
      return [];
    }
    const prefix = address.slice(0, 8);
    const middle = address.slice(8, -6);
    const suffix = address.slice(-6);

    return [prefix, middle, suffix];
  }, [targetAccount.address]);

  useEffect(() => {
    dispatch.whitelist.getWhitelist();
  }, [dispatch.whitelist]);

  return (
    <header
      className={clsx(
        'header bg-r-neutral-card1 rounded-[8px] px-[28px] py-[20px]',
        'flex flex-col items-center gap-[8px]'
      )}
    >
      <div
        className="text-[16px] w-full text-center text-r-neutral-foot break-words cursor-pointer"
        onClick={() => {
          copyAddress(targetAccount.address);
        }}
      >
        <AddressText>{addressSplit[0]}</AddressText>
        {addressSplit[1]}
        <AddressText>{addressSplit[2]}</AddressText>
        <span className="ml-2 inline-block w-[14px] h-[13px]">
          <RcIconCopy />
        </span>
      </div>

      <AddressTypeCard
        type={targetAccount.type}
        address={targetAccount.address}
        getContainer={getContainer}
        cexInfo={{
          id: cexInfo?.id,
          name: cexInfo?.name,
          logo: cexInfo?.logo_url,
          isDeposit: !!cexInfo?.is_deposit,
        }}
        allowEditAlias
        loading={loading}
        inWhitelist={whitelist?.some((w) =>
          isSameAddress(w, targetAccount.address)
        )}
        brandName={targetAccount.brandName}
        aliasName={
          targetAccount.alianName || ellipsisAddress(targetAccount.address)
        }
      />
    </header>
  );
};
