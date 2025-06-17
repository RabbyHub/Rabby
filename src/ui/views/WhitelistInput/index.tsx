import React, { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { useHistory } from 'react-router-dom';

import { FullscreenContainer } from '@/ui/component/FullscreenContainer';
import { getUiType, isSameAddress, openInternalPageInTab } from '@/ui/utils';
import { PageHeader } from '@/ui/component';
import { connectStore, useRabbyDispatch, useRabbySelector } from '@/ui/store';

// icons
import { ReactComponent as RcIconFullscreen } from '@/ui/assets/fullscreen-cc.svg';
import { ReactComponent as RcIconWarningCC } from '@/ui/assets/warning-cc.svg';
import { ReactComponent as RcIconDownCC } from '@/ui/assets/dashboard/arrow-down-cc.svg';

import { AddressRiskAlert } from '@/ui/component/AddressRiskAlert';
import { Button, Input, Switch, Select } from 'antd';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { CexListSelectModal, IExchange } from '@/ui/component/CexSelect';
import { isValidAddress } from '@ethereumjs/util';

const isTab = getUiType().isTab;
const getContainer = isTab ? '.js-rabby-popup-container' : undefined;

const SectionHeader = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: var(--r-neutral-title1);
`;

const WhitelistInput = () => {
  const history = useHistory();

  // main state
  const [inputAddress, setInputAddress] = useState('');
  const [inputAlias, setInputAlias] = useState('');
  const [isCex, setIsCex] = useState(false);
  const [selectedExchange, setSelectedExchange] = useState<IExchange | null>(
    null
  );

  // other state
  const [isValidAddr, setIsValidAddr] = useState(true);
  const [showAddressRiskAlert, setShowAddressRiskAlert] = useState(false);
  const [showCexListModal, setShowCexListModal] = useState(false);
  const { t } = useTranslation();

  const handleClickBack = useCallback(() => {
    const from = (history.location.state as any)?.from;
    if (from) {
      history.replace(from);
    } else {
      history.replace('/');
    }
  }, [history]);

  const handleInputChangeAddress = (v) => {
    if (!isValidAddress(v)) {
      setIsValidAddr(false);
      return;
    }
    setIsValidAddr(true);
    setInputAddress(v);
  };

  const handleSubmit = () => {
    if (!isValidAddr) {
      setIsValidAddr(false);
      return;
    }
    console.log('CUSTOM_LOGGER:=>: handleSubmit', {
      inputAddress,
      inputAlias,
      isCex,
      selectedExchange,
    });
  };

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
          canBack={!isTab}
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
          Add Whitelist Address
        </PageHeader>
        <main className="flex-1 flex flex-col gap-[20px]">
          <div className="flex flex-col gap-[8px]">
            <SectionHeader>Address</SectionHeader>
            <div className="rounded-[8px] overflow-hidden">
              <Input.TextArea
                maxLength={44}
                placeholder="Enter address"
                allowClear
                autoFocus
                size="large"
                spellCheck={false}
                rows={4}
                onChange={(v) => handleInputChangeAddress(v.target.value)}
                className="rounded-[8px] leading-normal"
              />
            </div>
            {!isValidAddr && (
              <div className="text-r-red-default text-[13px] font-medium flex gap-[4px] items-center">
                <div className="text-r-red-default">
                  <RcIconWarningCC />
                </div>
                <div>This address is invalid</div>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-[8px]">
            <SectionHeader>Name</SectionHeader>
            <div className="rounded-[8px] overflow-hidden">
              <Input
                maxLength={20}
                placeholder="Name Your Address"
                allowClear
                size="large"
                autoFocus
                onChange={(v) => setInputAlias(v.target.value)}
                className="border-bright-on-active rounded-[8px] leading-normal"
              />
            </div>
          </div>
          <div className="flex flex-col gap-[10px]">
            <div className="flex justify-between items-center">
              <SectionHeader>Exchange Address</SectionHeader>
              <Switch
                checked={isCex}
                onChange={(v) => {
                  if (isValidAddress(inputAddress)) {
                    setIsCex(!!v);
                    if (v && !selectedExchange) {
                      setShowCexListModal(true);
                    }
                  }
                }}
              />
            </div>
            {isCex && selectedExchange && (
              <div
                className={`
                  h-[52px]  bg-r-neutral-card1 rounded-[8px] w-full pl-[16px] pr-[18px] 
                  flex justify-between items-center cursor-pointer`}
                onClick={() => {
                  setShowCexListModal(true);
                }}
              >
                <div className="flex items-center gap-[8px]">
                  <img
                    src={selectedExchange.logo}
                    alt=""
                    className="w-[24px] h-[24px]"
                  />
                  <div className="text-[15px] font-medium text-r-neutral-title1">
                    {selectedExchange.name}
                  </div>
                </div>
                <div className="text-r-neutral-foot">
                  <RcIconDownCC width={14} height={14} />
                </div>
              </div>
            )}
          </div>
        </main>
        <div className={'footer'}>
          <div className="btn-wrapper w-[100%] px-[20px] flex justify-center">
            <Button
              onClick={handleSubmit}
              disabled={!isValidAddr}
              type="primary"
              htmlType="submit"
              size="large"
              className="w-[100%] h-[48px] text-[16px]"
            >
              {t('global.confirm')}
            </Button>
          </div>
        </div>
      </div>
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
      <CexListSelectModal
        visible={showCexListModal}
        onCancel={() => {
          setShowCexListModal(false);
        }}
        onSelect={(cex) => {
          setSelectedExchange(cex);
          setShowCexListModal(false);
        }}
        getContainer={getContainer}
        height="calc(100% - 60px)"
      />
    </FullscreenContainer>
  );
};

export default connectStore()(WhitelistInput);
