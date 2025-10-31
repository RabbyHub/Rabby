import { matomoRequestEvent } from '@/utils/matomo-request';
import clsx from 'clsx';
import {
  KEYRING_CLASS,
  KEYRING_ICONS_WHITE,
  KEYRING_TYPE,
  WALLET_BRAND_CONTENT,
} from 'consts';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { useInterval } from 'react-use';
import { ReactComponent as RcIconCopy } from 'ui/assets/icon-copy-1.svg';
import WatchLogo from 'ui/assets/waitcup.svg';

import { AddressViewer } from 'ui/component';
import { useRabbyDispatch, useRabbySelector } from 'ui/store';
import { useWallet } from 'ui/utils';

import { getKRCategoryByType } from '@/utils/transaction';

import {
  RcIconAddWalletCC,
  RcIconQrCodeCC,
  RcIconSettingCC,
} from '@/ui/assets/dashboard';
import { CommonSignal } from '@/ui/component/ConnectStatus/CommonSignal';
import { useWalletConnectIcon } from '@/ui/component/WalletConnect/useWalletConnectIcon';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { copyAddress } from '@/ui/utils/clipboard';
import { ga4 } from '@/utils/ga4';
import { useMemoizedFn } from 'ahooks';
import styled from 'styled-components';
import { ReactComponent as IconArrowRight } from 'ui/assets/dashboard/arrow-right.svg';
import { BalanceView } from '../BalanceView/BalanceView';
import { useHomeBalanceViewOuterPrefetch } from '../BalanceView/useHomeBalanceView';
import PendingTxs from '../PendingTxs';
import Queue from '../Queue';
import { Popover } from 'antd';
import QRCode from 'qrcode.react';

const Container = styled.div`
  width: 100%;
  height: 196px;
  background: linear-gradient(0deg, #2539b7 0%, #2539b7 100%), #2539b7;
  position: relative;
  overflow: hidden;
  padding: 12px 16px;
`;

export const DashboardHeader: React.FC<{ onSettingClick?(): void }> = ({
  onSettingClick,
}) => {
  const history = useHistory();
  const wallet = useWallet();
  const dispatch = useRabbyDispatch();

  const currentAccount = useCurrentAccount();

  const { pendingTransactionCount: pendingTxCount } = useRabbySelector((s) => ({
    ...s.transactions,
  }));

  const [displayName, setDisplayName] = useState<string>('');
  const isGnosis = currentAccount?.type === KEYRING_TYPE.GnosisKeyring;

  useInterval(() => {
    if (!currentAccount) return;
    if (currentAccount.type === KEYRING_TYPE.GnosisKeyring) return;

    dispatch.transactions.getPendingTxCountAsync(currentAccount.address);
  }, 30000);

  useEffect(() => {
    if (currentAccount) {
      if (currentAccount.type !== KEYRING_TYPE.GnosisKeyring) {
        dispatch.transactions.getPendingTxCountAsync(currentAccount.address);
      }

      wallet
        .getAlianName(currentAccount?.address.toLowerCase())
        .then((name) => {
          dispatch.account.setField({ alianName: name });
          setDisplayName(name!);
        });
    }
  }, [currentAccount]);

  const { dashboardBalanceCacheInited } = useHomeBalanceViewOuterPrefetch(
    currentAccount?.address
  );

  const handleSwitchAddress = useMemoizedFn(() => {
    matomoRequestEvent({
      category: 'Front Page Click',
      action: 'Click',
      label: 'Change Address',
    });

    ga4.fireEvent('Click_ChangeAddress', {
      event_category: 'Front Page Click',
    });

    history.push('/switch-address');
  });

  const handleAddAddress = useMemoizedFn(() => {
    // matomoRequestEvent({
    //   category: 'Front Page Click',
    //   action: 'Click',
    //   label: 'Add Address',
    // });

    // ga4.fireEvent('Click_AddAddress', {
    //   event_category: 'Front Page Click',
    // });

    history.push('/add-address');
  });

  const brandIcon = useWalletConnectIcon(currentAccount);
  const { t } = useTranslation();

  return (
    <Container>
      {currentAccount && (
        <div className={clsx('flex mb-[8px] items-center gap-[16px] relative')}>
          <div className="flex items-center gap-[8px]">
            <div
              className={clsx(
                'flex items-center gap-[6px] px-[8px] py-[6px] rounded-[6px] cursor-pointer',
                'bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)]'
              )}
              onClick={handleSwitchAddress}
            >
              <div className="relative">
                <img
                  className={clsx('w-[20px] h-[20px]')}
                  src={
                    brandIcon ||
                    WALLET_BRAND_CONTENT[currentAccount.brandName]?.image ||
                    (currentAccount.type === KEYRING_CLASS.WATCH
                      ? WatchLogo
                      : KEYRING_ICONS_WHITE[currentAccount.type])
                  }
                />
                <CommonSignal
                  type={currentAccount.type}
                  brandName={currentAccount.brandName}
                  address={currentAccount.address}
                />
              </div>
              <div
                className="text-[15px] leading-[18px] font-medium text-r-neutral-title2 truncate max-w-[86px]"
                title={displayName}
              >
                {displayName}
              </div>
              {currentAccount && (
                <AddressViewer
                  address={currentAccount.address}
                  showArrow={false}
                  className="text-[12px] leading-[14px] text-r-neutral-title2 opacity-60"
                />
              )}
              <IconArrowRight />
            </div>

            <RcIconCopy
              viewBox="0 0 16 16"
              className="w-[16px] h-[16px] cursor-pointer opacity-60 hover:opacity-80"
              onClick={() => {
                copyAddress(currentAccount.address);
                matomoRequestEvent({
                  category: 'AccountInfo',
                  action: 'headCopyAddress',
                  label: [
                    getKRCategoryByType(currentAccount?.type),
                    currentAccount?.brandName,
                  ].join('|'),
                });

                ga4.fireEvent('Click_CopyAddress', {
                  event_category: 'Front Page Click',
                });
              }}
            />

            {/* <Popover
              trigger={'click'}
              content={
                <div className="mx-[-4px]">
                  <QRCode value={currentAccount.address} size={190}></QRCode>
                </div>
              }
            >
              <RcIconQrCodeCC className="w-[16px] h-[16px] text-r-neutral-title2 cursor-pointer opacity-60 hover:opacity-80" />
            </Popover> */}
          </div>

          <div className="ml-auto flex items-center gap-[8px]">
            <div
              className={clsx(
                'py-[6px] px-[8px] rounded-[5px] cursor-pointer text-r-neutral-title-2',
                'bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)]'
              )}
              onClick={handleAddAddress}
            >
              <RcIconAddWalletCC />
            </div>

            <div
              className={clsx(
                'py-[6px] px-[8px] rounded-[5px] cursor-pointer text-r-neutral-title-2',
                'bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)]'
              )}
              onClick={onSettingClick}
            >
              <RcIconSettingCC />
            </div>
          </div>
        </div>
      )}
      {dashboardBalanceCacheInited && (
        <BalanceView currentAccount={currentAccount} />
      )}
      {isGnosis ? (
        <Queue
          // count={gnosisPendingCount || 0}
          count={0}
          className={clsx(
            'transition-all'
            // !false ? 'opacity-0 pointer-events-none' : 'opacity-100'
          )}
        />
      ) : (
        pendingTxCount > 0 && <PendingTxs pendingTxCount={pendingTxCount} />
      )}
    </Container>
  );
};
