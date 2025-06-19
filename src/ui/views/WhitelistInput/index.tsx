import React, { useCallback, useState } from 'react';
import clsx from 'clsx';
import { useHistory } from 'react-router-dom';

import { FullscreenContainer } from '@/ui/component/FullscreenContainer';
import { getUiType, openInternalPageInTab, useWallet } from '@/ui/utils';
import { PageHeader } from '@/ui/component';
import { connectStore, useRabbyDispatch } from '@/ui/store';

// icons
import { ReactComponent as RcIconFullscreen } from '@/ui/assets/fullscreen-cc.svg';
import { ReactComponent as RcIconWarningCC } from '@/ui/assets/warning-cc.svg';
import { ReactComponent as RcIconDownCC } from '@/ui/assets/dashboard/arrow-down-cc.svg';

import { AddressRiskAlert } from '@/ui/component/AddressRiskAlert';
import { Button, Input, Switch, message } from 'antd';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { CexListSelectModal, IExchange } from '@/ui/component/CexSelect';
import { isValidAddress } from '@ethereumjs/util';
import AuthenticationModalPromise from 'ui/component/AuthenticationModal';
import { useAddressInfo } from '@/ui/hooks/useAddressInfo';
import IconSuccess from 'ui/assets/success.svg';

const isTab = getUiType().isTab;
const getContainer = isTab ? '.js-rabby-popup-container' : undefined;

const SectionHeader = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: var(--r-neutral-title1);
`;
const StyledInputWrapper = styled.div`
  border-radius: 8px;
  overflow: hidden;
  .ant-input-clear-icon {
    top: unset !important;
    bottom: 8px !important;
  }
`;

const WhitelistInput = () => {
  const history = useHistory();
  const wallet = useWallet();
  const dispatch = useRabbyDispatch();
  // main state
  const [inputAddress, setInputAddress] = useState('');
  const [inputAlias, setInputAlias] = useState('');
  const [isCex, setIsCex] = useState(false);
  const [selectedExchange, setSelectedExchange] = useState<IExchange | null>(
    null
  );
  const { isMyImported } = useAddressInfo(inputAddress, { disableDesc: true });

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

  const detectAddress = useCallback(
    async (address: string) => {
      if (!isValidAddress(address)) {
        return;
      }
      wallet.openapi.addrDesc(address).then((result) => {
        if (result.desc.cex?.id && result.desc.cex?.is_deposit) {
          setIsCex(true);
          setSelectedExchange({
            id: result.desc.cex.id,
            name: result.desc.cex.name,
            logo: result.desc.cex?.logo_url || '',
          });
        }
      });
      wallet.getAlianName(address).then((name) => {
        setInputAlias(name || '');
      });
    },
    [wallet]
  );

  const handleInputChangeAddress = (v) => {
    if (!isValidAddress(v)) {
      setIsValidAddr(false);
    } else {
      setIsValidAddr(true);
      detectAddress(v);
    }
    setInputAddress(v);
  };

  const confrimToWhitelist = async (address: string) => {
    if (!isValidAddress(address)) {
      return;
    }
    AuthenticationModalPromise({
      title: t('page.addressDetail.add-to-whitelist'),
      cancelText: t('global.Cancel'),
      wallet,
      validationHandler: async (password) => {
        await wallet.addWhitelist(password, address);
      },
      onFinished: async () => {
        dispatch.whitelist.getWhitelist();
        await wallet.updateAlianName(
          address,
          inputAlias || '',
          isCex && selectedExchange?.id ? selectedExchange?.id : ''
        );
        setShowAddressRiskAlert(false);
        history.goBack();
        message.success({
          icon: <img src={IconSuccess} className="icon icon-success" />,
          content: 'Add successfully',
          duration: 0.5,
        });
      },
      onCancel() {
        // do nothing
      },
    });
  };

  const handleSubmit = async () => {
    if (!isValidAddress(inputAddress)) {
      setIsValidAddr(false);
      return;
    }
    try {
      if (isMyImported) {
        confrimToWhitelist(inputAddress);
      } else {
        setShowAddressRiskAlert(true);
      }
    } catch (e) {
      console.error('Failed to add whitelist:', e);
    }
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
            <StyledInputWrapper>
              <Input.TextArea
                maxLength={44}
                placeholder="Enter address"
                allowClear
                autoFocus
                size="large"
                spellCheck={false}
                rows={4}
                value={inputAddress}
                onChange={(v) => handleInputChangeAddress(v.target.value)}
                className="rounded-[8px] leading-normal"
              />
            </StyledInputWrapper>
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
                value={inputAlias}
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
        address={inputAddress}
        visible={showAddressRiskAlert}
        getContainer={getContainer}
        height="calc(100% - 60px)"
        onConfirm={() => {
          confrimToWhitelist(inputAddress);
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
