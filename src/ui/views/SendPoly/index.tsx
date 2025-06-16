import React, { useCallback, useEffect, useState } from 'react';
import clsx from 'clsx';
import { useHistory } from 'react-router-dom';

import { FullscreenContainer } from '@/ui/component/FullscreenContainer';
import { getUiType, openInternalPageInTab } from '@/ui/utils';
import { PageHeader } from '@/ui/component';
import { connectStore, useRabbySelector } from '@/ui/store';
import { EmptyWhitelistHolder } from './components/EmptyWhitelistHolder';

// icons
import { ReactComponent as RcIconFullscreen } from '@/ui/assets/fullscreen-cc.svg';
import { ReactComponent as RcIconAddWhitelist } from '@/ui/assets/address/add-whitelist.svg';
import { ReactComponent as RcIconRight } from '@/ui/assets/address/right.svg';
import { EnterAddress } from './components/EnterAddress';
import { useAccounts } from '@/ui/hooks/useAccounts';

const isTab = getUiType().isTab;

const SendPoly = () => {
  const history = useHistory();
  const [inputingAddress, setInputingAddress] = useState(false);

  const {
    fetchAllAccounts,
    loadingAccounts,
    accountsList,
    allSortedAccountList,
  } = useAccounts();

  const { whitelist, whitelistEnabled } = useRabbySelector((s) => ({
    whitelist: s.whitelist.whitelist,
    whitelistEnabled: s.whitelist.enabled,
  }));

  console.log(
    'CUSTOM_LOGGER:=>: whitelist',
    accountsList,
    whitelistEnabled,
    whitelist
  );

  const handleClickBack = useCallback(() => {
    if (inputingAddress) {
      setInputingAddress(false);
      return;
    }
    const from = (history.location.state as any)?.from;
    if (from) {
      history.replace(from);
    } else {
      history.replace('/');
    }
  }, [history, inputingAddress]);

  useEffect(() => {
    fetchAllAccounts();
  }, [fetchAllAccounts]);

  return (
    <FullscreenContainer className="h-[700px]">
      <div
        className={clsx(
          'send-token',
          isTab
            ? 'w-full h-full overflow-auto min-h-0 rounded-[16px] shadow-[0px_40px_80px_0px_rgba(43,57,143,0.40)'
            : ''
        )}
      >
        <PageHeader
          onBack={handleClickBack}
          forceShowBack={!isTab}
          canBack={!isTab || inputingAddress}
          rightSlot={
            isTab ? null : (
              <div
                className="text-r-neutral-title1 cursor-pointer"
                onClick={() => {
                  openInternalPageInTab(`send-poly${history.location.search}`);
                }}
              >
                <RcIconFullscreen />
              </div>
            )
          }
        >
          Send to
        </PageHeader>
        {inputingAddress ? (
          <EnterAddress />
        ) : (
          <div>
            {/* Enter Address */}
            <div
              className={`
            border border-r-neutral-line rounded-[8px] bg-r-neutral-card1
            text-r-neutral-line text-[15px]
             h-[52px] leading-[52px] px-[15px] justify-center items-center
            `}
              onClick={() => setInputingAddress(true)}
            >
              Enter address / ENS
            </div>
            {/* WhiteList or Imported Addresses List */}
            <div>
              <div className="flex justify-between items-center pt-[17px] pb-[8px]">
                <div className="text-[15px] text-r-neutral-title1">
                  Whitelist
                </div>
                <div className="text-r-neutral-body">
                  <RcIconAddWhitelist width={20} height={20} />
                </div>
              </div>
              <div>
                <EmptyWhitelistHolder />
              </div>
            </div>
            {/* Imported Addresses Entry */}
            <div>
              <div
                className="flex justify-center items-center pt-[32px] pb-[8px] gap-[4px]"
                onClick={() => {
                  console.log('popup imported address list');
                }}
              >
                <div className="text-[15px] text-r-neutral-body">
                  Send to Imported Address
                </div>
                <RcIconRight width={16} height={16} />
              </div>
            </div>
          </div>
        )}
      </div>
    </FullscreenContainer>
  );
};

export default connectStore()(SendPoly);
