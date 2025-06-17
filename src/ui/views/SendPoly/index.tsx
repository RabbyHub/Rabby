import React, { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { useHistory } from 'react-router-dom';

import { FullscreenContainer } from '@/ui/component/FullscreenContainer';
import { getUiType, isSameAddress, openInternalPageInTab } from '@/ui/utils';
import { PageHeader } from '@/ui/component';
import { connectStore, useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { EmptyWhitelistHolder } from './components/EmptyWhitelistHolder';
import { EnterAddress } from './components/EnterAddress';
import { AccountItem } from '@/ui/component/AccountSelector/AccountItem';
import { padWatchAccount } from './util';
import { AccountSelectorModal } from '@/ui/component/AccountSelector/AccountSelectorModal';
import { Account } from '@/background/service/preference';
import { AccountList } from './components/AccountList';

// icons
import { ReactComponent as RcIconFullscreen } from '@/ui/assets/fullscreen-cc.svg';
import { ReactComponent as RcIconAddWhitelist } from '@/ui/assets/address/add-whitelist.svg';
import { ReactComponent as RcIconRight } from '@/ui/assets/address/right.svg';
import { AddressRiskAlert } from '@/ui/component/AddressRiskAlert';

const isTab = getUiType().isTab;
const getContainer = isTab ? '.js-rabby-popup-container' : undefined;

const SendPoly = () => {
  const history = useHistory();
  const [inputingAddress, setInputingAddress] = useState(false);
  const [showSelectorModal, setShowSelectorModal] = useState(false);
  const [showAddressRiskAlert, setShowAddressRiskAlert] = useState(false);

  const dispatch = useRabbyDispatch();

  const { accountsList, whitelist, whitelistEnabled } = useRabbySelector(
    (s) => ({
      accountsList: s.accountToDisplay.accountsList,
      whitelist: s.whitelist.whitelist,
      whitelistEnabled: s.whitelist.enabled,
    })
  );

  const importWhitelistAccounts = useMemo(() => {
    if (!whitelistEnabled) {
      return accountsList;
    }
    return [...accountsList].filter((a) =>
      whitelist?.some((w) => isSameAddress(w, a.address))
    );
  }, [accountsList, whitelist]);

  const unimportedWhitelistAccounts = useMemo(() => {
    return whitelist
      ?.filter(
        (w) => !importWhitelistAccounts.some((a) => isSameAddress(w, a.address))
      )
      .map(padWatchAccount);
  }, [importWhitelistAccounts, whitelist]);

  const allAccounts = useMemo(() => {
    return [...importWhitelistAccounts, ...unimportedWhitelistAccounts];
  }, [importWhitelistAccounts, unimportedWhitelistAccounts]);

  const fetchData = async () => {
    dispatch.accountToDisplay.getAllAccountsToDisplay();
    dispatch.whitelist.getWhitelistEnabled();
    dispatch.whitelist.getWhitelist();
  };

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

  const handleChange = (value: Account) => {
    console.log('CUSTOM_LOGGER:=>: value', value);
  };

  const handleCancel = () => {
    setShowSelectorModal(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

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
              {whitelistEnabled && (
                <div className="flex justify-between items-center pt-[17px]">
                  <div className="text-[15px] text-r-neutral-title1">
                    Whitelist
                  </div>
                  <div
                    className="text-r-neutral-body cursor-pointer"
                    onClick={() => {
                      history.push('/whitelist-input');
                    }}
                  >
                    <RcIconAddWhitelist width={20} height={20} />
                  </div>
                </div>
              )}
              <div>
                {whitelistEnabled ? (
                  allAccounts.length > 0 ? (
                    allAccounts.map((item) => (
                      <div
                        key={`${item.address}-${item.type}`}
                        className="bg-r-neutral-card1 rounded-[8px] mt-[8px]"
                      >
                        <AccountItem
                          className="group"
                          balance={item.balance}
                          address={item.address}
                          type={item.type}
                          brandName={item.brandName}
                          onClick={() => {
                            // onChange?.(item);
                          }}
                        />
                      </div>
                    ))
                  ) : (
                    <EmptyWhitelistHolder
                      onAddWhitelist={() => {
                        history.push('/whitelist-input');
                      }}
                    />
                  )
                ) : (
                  <AccountList
                    onChange={handleChange}
                    containerClassName="mt-[20px]"
                  />
                )}
              </div>
            </div>
            {/* Imported Addresses Entry */}
            {whitelistEnabled && (
              <div>
                <div
                  className="flex justify-center items-center pt-[32px] pb-[8px] gap-[4px] cursor-pointer"
                  onClick={() => {
                    setShowSelectorModal(true);
                  }}
                >
                  <div className="text-[15px] text-r-neutral-body">
                    Send to Imported Address
                  </div>
                  <RcIconRight width={16} height={16} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <AccountSelectorModal
        title="Select Imported address"
        visible={showSelectorModal}
        onChange={handleChange}
        onCancel={handleCancel}
        getContainer={getContainer}
        height="calc(100% - 60px)"
      />
      <AddressRiskAlert
        address={'0xF977814e90dA44bFA03b6295A0616a897441aceC'}
        visible={showAddressRiskAlert}
        getContainer={getContainer}
        height="calc(100% - 60px)"
        onConfirm={() => {
          console.log('CUSTOM_LOGGER:=>: onConfirm');
        }}
        onCancel={() => {
          setShowAddressRiskAlert(false);
        }}
      />
    </FullscreenContainer>
  );
};

export default connectStore()(SendPoly);
