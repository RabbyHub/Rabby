import React, { useCallback, useState } from 'react';
import clsx from 'clsx';
import { useHistory } from 'react-router-dom';
import { Button, Input, Switch, message } from 'antd';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { isValidAddress } from '@ethereumjs/util';

import { FullscreenContainer } from '@/ui/component/FullscreenContainer';
import {
  getUiType,
  isSameAddress,
  openInternalPageInTab,
  useWallet,
} from '@/ui/utils';
import { PageHeader } from '@/ui/component';
import { connectStore, useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { AddressRiskAlert } from '@/ui/component/AddressRiskAlert';
import { CexListSelectModal, IExchange } from '@/ui/component/CexSelect';
import { useAddressInfo } from '@/ui/hooks/useAddressInfo';

// icons
import { ReactComponent as RcIconFullscreen } from '@/ui/assets/fullscreen-cc.svg';
import { ReactComponent as RcIconWarningCC } from '@/ui/assets/warning-cc.svg';
import { ReactComponent as RcIconDownCC } from '@/ui/assets/dashboard/arrow-down-cc.svg';
import IconSuccess from 'ui/assets/success.svg';
import { IconClearCC } from '@/ui/assets/component/IconClear';

import './styles.less';

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
  .ant-input {
    font-size: 15px;
    background: var(--r-neutral-card1, #ffffff) !important;
    &:hover,
    &:focus {
      border-color: var(--r-blue-default) !important;
    }
  }
  .ant-input-clear-icon {
    top: unset !important;
    bottom: 8px !important;
    svg {
      width: 20px;
      height: 20px;
    }
  }
`;

const WhitelistInput = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const wallet = useWallet();
  const dispatch = useRabbyDispatch();
  const { exchanges } = useRabbySelector((s) => ({
    exchanges: s.exchange.exchanges,
  }));
  // main state
  const [inputAddress, setInputAddress] = useState('');
  const [inputAlias, setInputAlias] = useState('');
  const [isCex, setIsCex] = useState(false);
  const [selectedExchange, setSelectedExchange] = useState<IExchange | null>(
    null
  );

  // other state
  const { isMyImported } = useAddressInfo(inputAddress, { disableDesc: true });
  const [isValidAddr, setIsValidAddr] = useState(true);
  const [showAddressRiskAlert, setShowAddressRiskAlert] = useState(false);
  const [showCexListModal, setShowCexListModal] = useState(false);
  const [isFocusAddress, setIsFocusAddress] = useState(false);
  const [isFocusAlias, setIsFocusAlias] = useState(false);

  const handleClickBack = useCallback(() => {
    if (history.length > 1) {
      history.goBack();
    } else {
      history.push('/send-poly');
    }
  }, [history]);

  const detectAddress = useCallback(
    async (address: string) => {
      if (!isValidAddress(address)) {
        return;
      }
      const cexId = await wallet.getCexId(address);
      const localCexInfo = exchanges.find(
        (e) => e.id.toLocaleLowerCase() === cexId?.toLocaleLowerCase()
      );
      if (cexId && localCexInfo) {
        setIsCex(true);
        setSelectedExchange({
          ...localCexInfo,
        });
      } else {
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
      }
      wallet.getAlianName(address).then((name) => {
        setInputAlias(name || '');
      });
    },
    [exchanges, wallet]
  );

  const handleInputChangeAddress = (v) => {
    if (!isValidAddress(v)) {
      setInputAlias('');
      setIsValidAddr(!v);
      setIsCex(false);
      setSelectedExchange(null);
    } else {
      setIsValidAddr(true);
      detectAddress(v);
    }
    setInputAddress(v);
  };

  const confirmToWhitelist = async (address: string) => {
    if (!isValidAddress(address)) {
      return;
    }
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
      content: t('page.whitelist.tips.added'),
    });
  };

  const handleSubmit = async () => {
    if (!isValidAddress(inputAddress)) {
      setIsValidAddr(false);
      return;
    }
    try {
      const whitelist = await wallet.getWhitelist();
      if (whitelist.some((a) => isSameAddress(a, inputAddress))) {
        message.error({
          content: t('page.whitelist.tips.repeated'),
        });
        return;
      }
      if (isMyImported) {
        confirmToWhitelist(inputAddress);
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
          forceShowBack
          canBack
          rightSlot={
            isTab ? null : (
              <div
                className="text-r-neutral-title1 cursor-pointer absolute right-0 "
                onClick={() => {
                  openInternalPageInTab(`send-poly${history.location.search}`);
                }}
              >
                <RcIconFullscreen />
              </div>
            )
          }
        >
          {t('page.whitelist.title')}
        </PageHeader>
        <main className="flex-1 flex flex-col gap-[20px]">
          <div className="flex flex-col gap-[8px]">
            <SectionHeader>{t('page.whitelist.address')}</SectionHeader>
            <StyledInputWrapper className="relative">
              <Input.TextArea
                maxLength={44}
                placeholder={t('page.whitelist.enterAddress')}
                allowClear={false}
                autoFocus
                size="large"
                spellCheck={false}
                rows={4}
                onFocus={() => setIsFocusAddress(true)}
                onBlur={() => setIsFocusAddress(false)}
                value={inputAddress}
                onChange={(v) => handleInputChangeAddress(v.target.value)}
                className="rounded-[8px] leading-normal"
              />
              <div className="absolute w-[20px] h-[20px] right-[16px] bottom-[16px]">
                <IconClearCC
                  onClick={() => {
                    handleInputChangeAddress('');
                  }}
                  className={clsx(
                    isFocusAddress && inputAddress.length > 0
                      ? 'opacity-100 cursor-pointer'
                      : 'opacity-0 cursor-text'
                  )}
                />
              </div>
            </StyledInputWrapper>
            {!isValidAddr && (
              <div className="text-r-red-default text-[13px] font-medium flex gap-[4px] items-center">
                <div className="text-r-red-default">
                  <RcIconWarningCC />
                </div>
                <div>{t('page.whitelist.invalidAddress')}</div>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-[8px]">
            <SectionHeader>{t('page.whitelist.name')}</SectionHeader>
            <div className="relative rounded-[8px] overflow-hidden">
              <Input
                placeholder={t('page.whitelist.nameYourAddress')}
                allowClear={false}
                size="large"
                style={{ height: 52 }}
                value={inputAlias}
                onFocus={() => setIsFocusAlias(true)}
                onBlur={() => setIsFocusAlias(false)}
                onChange={(v) => setInputAlias(v.target.value)}
                className="border-bright-on-active bg-r-neutral-card1 rounded-[8px] leading-normal"
              />
              <div className="absolute w-[20px] h-[20px] right-[16px] bottom-[16px]">
                <IconClearCC
                  onClick={() => {
                    setInputAlias('');
                  }}
                  className={clsx(
                    isFocusAlias && inputAlias.length > 0
                      ? 'opacity-100 cursor-pointer'
                      : 'opacity-0 cursor-text'
                  )}
                />
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-[10px]">
            <div className="flex justify-between items-center">
              <SectionHeader>
                {t('page.whitelist.exchangeAddress')}
              </SectionHeader>
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
                    className="w-[24px] h-[24px] rounded-full"
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
        <div className={'footer bg-r-neutral-bg2'}>
          <div className="btn-wrapper w-[100%] px-[16px] flex justify-center">
            <Button
              onClick={handleSubmit}
              disabled={!isValidAddr || !inputAddress}
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
        editAlias={inputAlias}
        forWhitelist
        title={t('page.whitelist.riskTitle')}
        editCex={isCex ? selectedExchange : null}
        height="calc(100% - 60px)"
        onConfirm={() => {
          confirmToWhitelist(inputAddress);
        }}
        onCancel={() => {
          setShowAddressRiskAlert(false);
        }}
      />
      <CexListSelectModal
        visible={showCexListModal}
        onCancel={() => {
          setShowCexListModal(false);
          if (isCex && !selectedExchange) {
            setIsCex(false);
          }
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
