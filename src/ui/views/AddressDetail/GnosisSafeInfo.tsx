import React, { useEffect, useState } from 'react';
import { isSameAddress, useWallet } from 'ui/utils';
import './style.less';
import { CHAINS } from '@/constant';
import { useRabbySelector } from '@/ui/store';
import { sortAccountsByBalance } from '@/ui/utils/account';
import { useAsync } from 'react-use';
import { BasicSafeInfo } from '@rabby-wallet/gnosis-sdk';
import { SvgIconLoading } from 'ui/assets';
import clsx from 'clsx';
import { Chain } from '@debank/common';
import { sortBy } from 'lodash';
import { NameAndAddress } from '@/ui/component';
import IconTagYou from 'ui/assets/tag-you.svg';
import { Trans, useTranslation } from 'react-i18next';
import { findChain } from '@/utils/chain';

const GnosisAdminItem = ({
  accounts,
  address,
}: {
  accounts: string[];
  address: string;
}) => {
  const addressInWallet = accounts.find((addr) => isSameAddress(addr, address));
  return (
    <div className="rabby-list-item">
      <div className="rabby-list-item-content py-0 min-h-[40px]">
        <NameAndAddress address={address} nameClass="max-143" />
        {addressInWallet ? (
          <img src={IconTagYou} className="icon icon-tag ml-[12px]" />
        ) : (
          <></>
        )}
      </div>
    </div>
  );
};

export const GnonisSafeInfo = ({
  address,
  type,
  brandName,
}: {
  address: string;
  type: string;
  brandName: string;
}) => {
  const { t } = useTranslation();
  const wallet = useWallet();
  const [activeData, setActiveData] = useState<
    | {
        chain?: Chain | null;
        data: BasicSafeInfo;
      }
    | undefined
  >(undefined);
  const { accountsList, highlightedAddresses } = useRabbySelector((s) => ({
    accountsList: s.accountToDisplay.accountsList,
    highlightedAddresses: s.addressManagement.highlightedAddresses,
  }));
  const { value: safeInfo, error, loading } = useAsync(async () => {
    const networks = await wallet.getGnosisNetworkIds(address);
    const res = await Promise.all(
      networks.map(async (networkId) => {
        const info = await wallet.getBasicSafeInfo({ address, networkId });

        return {
          chain: findChain({
            networkId: networkId,
          }),
          data: {
            ...info,
          },
        };
      })
    );
    const list = sortBy(res, (item) => {
      return -(item?.data?.owners?.length || 0);
    });
    setActiveData(list[0]);
    return list;
  }, [address]);

  const { sortedAccountsList } = React.useMemo(() => {
    const restAccounts = [...accountsList];
    let highlightedAccounts: typeof accountsList = [];

    highlightedAddresses.forEach((highlighted) => {
      const idx = restAccounts.findIndex(
        (account) =>
          account.address === highlighted.address &&
          account.brandName === highlighted.brandName
      );
      if (idx > -1) {
        highlightedAccounts.push(restAccounts[idx]);
        restAccounts.splice(idx, 1);
      }
    });

    highlightedAccounts = sortAccountsByBalance(highlightedAccounts);

    return {
      sortedAccountsList: highlightedAccounts.concat(restAccounts),
    };
  }, [accountsList, highlightedAddresses]);

  useEffect(() => {
    if (address) {
      wallet.syncGnosisNetworks(address);
    }
  }, [address]);

  if (loading) {
    return (
      <div className="rabby-list-item">
        <div className="rabby-list-item-content ">
          <SvgIconLoading
            className="animate-spin w-[20px] h-[20px]"
            fill="#707280"
            viewBox="0 0 36 36"
          />
        </div>
      </div>
    );
  }

  if (safeInfo) {
    return (
      <>
        <div className="rabby-list-item no-hover">
          <div className="rabby-list-item-content border-0">
            <div className="rabby-list-item-label">
              {t('page.addressDetail.admins')}
              <div className="tabs-container">
                <div className="tabs">
                  {safeInfo?.map((item) => {
                    return (
                      <div
                        className={clsx(
                          'tabs-item',
                          activeData?.chain?.enum === item?.chain?.enum &&
                            'is-active'
                        )}
                        onClick={() => {
                          setActiveData(item);
                        }}
                        key={item?.chain?.enum}
                      >
                        <div className="tabs-item-title">
                          {item?.chain?.name}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="rabby-list-item-desc text-r-neutral-body">
                <Trans t={t} i18nKey="page.addressDetail.tx-requires">
                  Any transaction requires{' '}
                  <span className="text-r-neutral-foot text-14">
                    {{
                      num: `${activeData?.data?.threshold}/${activeData?.data?.owners.length}`,
                    }}
                  </span>{' '}
                  confirmations
                </Trans>
              </div>
            </div>
            <div className="rabby-list-item-extra flex gap-[4px]"></div>
          </div>
        </div>
        {activeData?.data?.owners.map((owner, index) => (
          <GnosisAdminItem
            address={owner}
            accounts={sortedAccountsList.map((e) => e.address)}
            key={index}
          />
        ))}
      </>
    );
  }
  return null;
};
