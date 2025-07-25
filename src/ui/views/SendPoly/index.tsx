import React, { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { useHistory, useLocation } from 'react-router-dom';
import { isValidAddress } from '@ethereumjs/util';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { Button, message } from 'antd';
import { groupBy } from 'lodash';

import { findAccountByPriority } from '@/utils/account';
import { FullscreenContainer } from '@/ui/component/FullscreenContainer';
import { getUiType, isSameAddress, openInternalPageInTab } from '@/ui/utils';
import { PageHeader } from '@/ui/component';
import { connectStore, useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { EmptyWhitelistHolder } from './components/EmptyWhitelistHolder';
import { EnterAddress } from './components/EnterAddress';
import { AccountItem } from '@/ui/component/AccountSelector/AccountItem';
import { padWatchAccount } from './util';
import { AddressRiskAlert } from '@/ui/component/AddressRiskAlert';
import { useWallet } from '@/ui/utils/WalletContext';
import { ellipsisAddress } from '@/ui/utils/address';

// icons
import { ReactComponent as RcIconFullscreen } from '@/ui/assets/fullscreen-cc.svg';
import { ReactComponent as RcIconAddWhitelist } from '@/ui/assets/address/add-whitelist.svg';
import { ReactComponent as RcIconDeleteAddress } from 'ui/assets/address/delete.svg';
import { ReactComponent as IconAdd } from '@/ui/assets/address/add.svg';
import IconSuccess from 'ui/assets/success.svg';

const OuterInput = styled.div`
  border: 1px solid var(--r-neutral-line);
  &:hover {
    border: 1px solid var(--r-blue-default, #7084ff);
    cursor: text;
  }
`;

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

const AnimatedInputWrapper = styled.div`
  transition: max-height 0.5s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  /* overflow: hidden; */
  will-change: max-height, opacity, transform;
  &.collapsed {
    height: 69px;
    max-height: 69px;
    padding-bottom: 17px;
    opacity: 1;
    transform: scaleY(1);
  }
  &.expanded {
    max-height: 1000px;
    opacity: 1;
    flex: 1;
    display: flex;
    flex-direction: column;
    transform: scaleY(1);
  }
`;

const isTab = getUiType().isTab;
const getContainer = isTab ? '.js-rabby-popup-container' : undefined;

const SendPoly = () => {
  const history = useHistory();
  const { search } = useLocation();
  const dispatch = useRabbyDispatch();
  const wallet = useWallet();
  const { t } = useTranslation();

  const { accountsList, whitelist } = useRabbySelector((s) => ({
    accountsList: s.accountToDisplay.accountsList,
    whitelist: s.whitelist.whitelist,
  }));

  // main state
  const [inputingAddress, setInputingAddress] = useState(false);
  const [showAddressRiskAlert, setShowAddressRiskAlert] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [selectedAddressType, setSelectedAddressType] = useState('');

  const importWhitelistAccounts = useMemo(() => {
    const groupAccounts = groupBy(accountsList, (item) =>
      item.address.toLocaleLowerCase()
    );
    const uniqueAccounts = Object.values(groupAccounts).map((item) =>
      findAccountByPriority(item)
    );
    return [...uniqueAccounts].filter((a) =>
      whitelist?.some((w) => isSameAddress(w, a.address))
    );
  }, [accountsList, whitelist]);

  const nftItem = useMemo(() => {
    const query = new URLSearchParams(search);
    return query.get('nftItem') || null;
  }, [search]);

  const allAccounts = useMemo(() => {
    return [...whitelist].reverse().map((addr) => {
      const account = importWhitelistAccounts.find((a) =>
        isSameAddress(a.address, addr)
      );
      if (account) {
        return account;
      }
      return padWatchAccount(addr);
    });
  }, [importWhitelistAccounts, whitelist]);

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
    history.replace('/');
  }, [history, inputingAddress]);

  const handleGotoSend = (address: string, type?: string) => {
    if (nftItem) {
      handleGotoSendNFT(address);
    } else {
      handleGotoSendToken(address, type);
    }
  };

  const handleGotoSendToken = (address: string, type?: string) => {
    const query = new URLSearchParams(history.location.search);
    query.set('to', address);
    if (type) {
      query.set('type', type);
    } else {
      query.delete('type');
    }
    history.push(`/send-token?${query.toString()}`);
  };

  const handleGotoSendNFT = (address: string) => {
    const query = new URLSearchParams(history.location.search);
    query.set('to', address);
    query.set('nftItem', nftItem || '');
    // avoid again jump send nft when tx done nft amount error
    history.replace(`/send-nft?${query.toString()}`);
  };

  const handleChange = (address: string, type?: string) => {
    if (!isValidAddress(address)) {
      return;
    }
    const inWhitelist = whitelist.some((item) => isSameAddress(address, item));
    if (inWhitelist) {
      handleGotoSend(address, type);
    } else {
      setSelectedAddress(address);
      setSelectedAddressType(type || '');
      setShowAddressRiskAlert(true);
    }
  };

  const handleDeleteWhitelist = async (address: string) => {
    await wallet.removeWhitelist(address);
    const isImported = importWhitelistAccounts.some((a) =>
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

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <FullscreenContainer className="h-[700px]">
      <div
        className={clsx(
          'send-token overflow-y-scroll',
          isTab
            ? 'w-full h-full overflow-auto min-h-0 rounded-[16px] shadow-[0px_40px_80px_0px_rgba(43,57,143,0.40)'
            : ''
        )}
      >
        <PageHeader
          onBack={handleClickBack}
          forceShowBack={!isTab || inputingAddress}
          canBack={!isTab || inputingAddress}
          fixed
          rightSlot={
            isTab ? null : (
              <div
                className="text-r-neutral-title1 absolute right-0 cursor-pointer"
                onClick={() => {
                  openInternalPageInTab(`send-poly${history.location.search}`);
                }}
              >
                <RcIconFullscreen />
              </div>
            )
          }
        >
          {t('page.sendPoly.title')}
        </PageHeader>
        <AnimatedInputWrapper
          className={inputingAddress ? 'expanded' : 'collapsed'}
        >
          {inputingAddress ? (
            <EnterAddress
              onCancel={() => {
                setInputingAddress(false);
              }}
              onNext={handleChange}
            />
          ) : (
            <OuterInput
              className={`
                border border-r-neutral-line rounded-[8px] bg-r-neutral-card1
                text-r-neutral-foot text-[15px] 
                h-[52px] leading-[52px] px-[15px] justify-center items-center
                hover:cursor-text hover:border-r-blue-default
              `}
              onClick={() => setInputingAddress(true)}
            >
              {t('page.sendPoly.enterAddress')}
            </OuterInput>
          )}
        </AnimatedInputWrapper>

        {!inputingAddress && (
          <div className="flex-1 overflow-y-auto w-[calc(100%+40px)] px-[20px] ml-[-20px] pb-[24px]">
            {/* WhiteList or Imported Addresses List */}
            <div>
              <div className="flex justify-between items-center">
                <div className="text-[15px] text-r-neutral-title1">
                  {t('page.sendPoly.whitelist.title')}
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
            {allAccounts.length > 0 && (
              <div>
                <Button
                  onClick={() => {
                    history.push('/whitelist-input');
                  }}
                  type="primary"
                  className={`
                  bg-r-neutral-card1 mt-[12px] w-full shadow-none h-[48px] border-transparent 
                  hover:border-rabby-blue-default hover:bg-r-blue-light-2 hover:before:hidden`}
                >
                  <div className="flex items-center justify-center space-x-6 text-r-blue-default">
                    <IconAdd />
                    <span
                      className="text-[13px] font-medium"
                      style={{
                        textShadow: 'none',
                      }}
                    >
                      {t('page.sendPoly.whitelist.addWhitelist')}
                    </span>
                  </div>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
      <AddressRiskAlert
        type={selectedAddressType}
        address={selectedAddress}
        title={t('page.sendPoly.whitelist.notWhitelist')}
        visible={showAddressRiskAlert}
        getContainer={getContainer}
        height="calc(100% - 60px)"
        onConfirm={async (cexId) => {
          handleGotoSend(selectedAddress, selectedAddressType);
          setSelectedAddress('');
          setSelectedAddressType('');
          setShowAddressRiskAlert(false);
          if (cexId) {
            const alias = await wallet.getAlianName(selectedAddress);
            wallet.updateAlianName(selectedAddress, alias || '', cexId);
          }
        }}
        onCancel={() => {
          setSelectedAddress('');
          setSelectedAddressType('');
          setShowAddressRiskAlert(false);
        }}
      />
    </FullscreenContainer>
  );
};

export default connectStore()(SendPoly);
