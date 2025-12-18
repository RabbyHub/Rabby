import { ConnectedSite } from '@/background/service/permission';
import { Account } from '@/background/service/preference';
import { RcIconSuccessCC } from '@/ui/assets/desktop/common';
import IconRabbyWallet from '@/ui/assets/icon-rabby-circle.svg';
import IconHyperliquid from '@/ui/assets/perps/icon-hyperliquid.svg';
import { ReactComponent as RcStarBg } from '@/ui/assets/perps/star-bg.svg';
import { AccountSelector } from '@/ui/component/AccountSelector';
import { typedDataSignatureStore } from '@/ui/component/MiniSignV2';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { supportedDirectSign } from '@/ui/hooks/useMiniApprovalDirectSign';
import { useRabbySelector } from '@/ui/store';
import { PERPS_REFERENCE_CODE } from '@/ui/views/Perps/constants';
import { getPerpsSDK } from '@/ui/views/Perps/sdkManager';
import { useEventListener, useRequest } from 'ahooks';
import { Button, message } from 'antd';
import clsx from 'clsx';
import { CHAINS_ENUM, EVENTS, KEYRING_CLASS } from 'consts';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { ReactComponent as RcIconCloseCC } from 'ui/assets/component/close-cc.svg';
import IconMetamask from 'ui/assets/metamask-mode-circle.svg';
import { FallbackSiteLogo } from 'ui/component';
import { useApproval, useWallet } from 'ui/utils';
import { WaitingSignMessageComponent } from '../map';
import eventBus from '@/eventBus';

interface ConnectProps {
  params: any;
  onChainChange?(chain: CHAINS_ENUM): void;
  defaultChain?: CHAINS_ENUM;
}

const Footer = styled.div`
  display: flex;
  flex-direction: column;
  padding: 20px;
  border-top: 1px solid var(--r-neutral-line, #e0e5ec);
  border-top: 0.5px solid var(--r-neutral-line, #e0e5ec);
  width: 100%;
  background: var(--r-neutral-card-1, #fff);
  .ant-btn {
    width: 100%;
    height: 48px;
  }
  .security-tip {
    width: 100%;
    font-weight: 500;
    font-size: 13px;
    line-height: 15px;
    padding: 6px;
    display: flex;
    align-items: center;
    border-radius: 4px;
    position: relative;
    &::before {
      content: '';
      position: absolute;
      width: 0;
      height: 0;
      border: 5px solid transparent;
      border-bottom: 8px solid currentColor;
      top: -12px;
      left: 50%;
      transform: translateX(-50%);
    }
    .icon-level {
      margin-right: 6px;
    }
  }
  .account-selector {
    border: none !important;
    background-color: transparent !important;
    height: unset !important;
    padding: 0;
  }
`;

export const PerpsInviteContent = (props: ConnectProps) => {
  const {
    params: { icon, origin, name, $ctx },
  } = props;
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [, resolveApproval, rejectApproval] = useApproval();
  const { t } = useTranslation();
  const wallet = useWallet();

  const [currentSite, setCurrentSite] = useState<ConnectedSite>();
  const isEnabledDappAccount = useRabbySelector((s) => {
    return s.preference.isEnabledDappAccount;
  });

  const init = async () => {
    const site = await wallet.getSite(origin);
    setCurrentSite(site);
    const currentAccount = await wallet.getCurrentAccount();
    if (isEnabledDappAccount && site?.account) {
      setSelectedAccount(site.account);
    } else {
      setSelectedAccount(currentAccount);
    }
  };

  useEffect(() => {
    init();
  }, []);

  const handleClose = () => {
    window.close();
  };

  useEventListener('blur', () => {
    handleClose();
  });

  const { runAsync: handleInvite, data: isSuccess } = useRequest(
    async () => {
      if (!selectedAccount) {
        throw new Error('Please select an account');
      }
      const sdk = getPerpsSDK();
      sdk.initAccount(selectedAccount.address);
      const resp = sdk.exchange?.prepareSetReferrer(PERPS_REFERENCE_CODE);
      if (!resp) {
        throw new Error('Prepare set referrer failed');
      }

      if (selectedAccount.type === KEYRING_CLASS.HARDWARE.TREZOR) {
        const promise = wallet.signPerpsSendSetReferrer({
          address: selectedAccount.address,
          action: resp?.action,
          nonce: resp?.nonce || 0,
          typedData: resp?.typedData,
        });
        eventBus.emit(EVENTS.RELOAD_APPROVAL);
        await promise;
        return true;
      }

      let signature = '';
      if (supportedDirectSign(selectedAccount.type)) {
        typedDataSignatureStore.close();
        const res = await typedDataSignatureStore.start(
          {
            txs: [
              {
                data: resp?.typedData,
                from: selectedAccount.address,
                version: 'V4',
              },
            ],
            config: {
              account: selectedAccount,
            },
            wallet,
          },
          {}
        );
        signature = res[0];
        typedDataSignatureStore.close();
      } else {
        const promise = wallet.sendRequest<string>({
          method: 'eth_signTypedData_v4',
          params: [selectedAccount.address, JSON.stringify(resp?.typedData)],
        });

        if (WaitingSignMessageComponent[selectedAccount.type]) {
          resolveApproval({
            uiRequestComponent:
              WaitingSignMessageComponent[selectedAccount?.type],
            $account: selectedAccount,
            type: selectedAccount.type,
            address: selectedAccount.address,
            extra: {
              brandName: selectedAccount.brandName,
              signTextMethod: 'eth_signTypedData_v4',
            },
          });
        }

        signature = await promise;
      }
      if (!signature) {
        throw new Error('Signature failed');
      }
      const res = await sdk.exchange?.sendSetReferrer({
        action: resp?.action,
        nonce: resp?.nonce || 0,
        signature,
      });

      return true;
    },
    {
      manual: true,
      onSuccess() {
        message.success(t('page.perps.invitePopup.activatedSuccess'));
        setTimeout(() => {
          handleClose();
        }, 3_000);
      },
      onError(e) {
        console.error('activate invite failed', e);
        message.error(e?.message || t('page.perps.invitePopup.activateFailed'));
        // setTimeout(() => {
        //   handleClose();
        // }, 3_000);
      },
    }
  );

  return (
    <div className="h-full flex flex-col overflow-auto bg-r-neutral-bg-4">
      <div className="flex-1 px-[20px] pt-[24px]">
        <div className="rounded-[8px] bg-r-neutral-card1 flex flex-col items-center py-[24px]">
          <div className="relative">
            <FallbackSiteLogo
              url={icon}
              origin={origin}
              width="44px"
              height="44px"
            />
            {currentSite?.isMetamaskMode ? (
              <div className="absolute top-[-4px] right-[-4px] text-r-neutral-title-2">
                <img src={IconMetamask} className="w-[20px] h-[20px]" />
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-[4px] mt-[8px]">
            <RcIconSuccessCC className="text-r-green-default" />
            <div className="text-[15px] leading-[18px] font-medium text-r-green-default">
              {t('page.connect.connected')}
            </div>
          </div>
          <div className="text-[13px] leading-[16px] text-r-neutral-foot mt-[4px]">
            {origin}
          </div>
        </div>

        <div
          className={clsx(
            'border-[0.5px] border-rabby-neutral-line bg-r-neutral-card-1 rounded-[8px]',
            'flex flex-col items-center',
            'px-[20px] pb-[90px] mt-[18px]',
            'relative'
          )}
        >
          <div className="relative z-10 flex flex-col items-center">
            <div
              className={clsx(
                'flex items-center justify-center gap-[8px] px-[12px] py-[5px]',
                'rounded-b-[8px] bg-r-neutral-card-2',
                'text-[12px] leading-[14px] text-r-neutral-body'
              )}
            >
              <div className="flex items-center gap-[4px]">
                <img
                  src={IconHyperliquid}
                  className="w-[14px] h-[14px]"
                  alt=""
                />
                Hyperliquid
              </div>
              <RcIconCloseCC
                viewBox="0 0 20 20"
                className="w-[14px] h-[14px] opacity-50 text-r-neutral-foot"
              />
              <div className="flex items-center gap-[4px]">
                <img
                  src={IconRabbyWallet}
                  className="w-[14px] h-[14px]"
                  alt=""
                />
                Rabby Wallet
              </div>
            </div>
            <div className="mt-[75px] text-[13px] leading-[16px] text-r-neutral-foot">
              {t('page.perps.invitePopup.description')}
            </div>
            <div className="relative mt-[10px] mb-[12px]">
              <div className="flex items-end gap-[6px] relative z-10 pl-[10px] pr-[6px]">
                <div className="text-[44px] leading-[53px] font-bold text-r-blue-default">
                  4%
                </div>
                <div className="text-[22px] leading-[30px] font-bold text-r-blue-default pb-[6px]">
                  off
                </div>
              </div>
              <div
                className="absolute left-0 right-0 bottom-[8px] h-[10px] bg-r-blue-light2"
                style={{
                  zIndex: 1,
                }}
              ></div>
            </div>
            <div className="text-[18px] leading-[21px] font-medium text-r-neutral-title-1">
              {t('page.perps.invitePopup.hyperliquidFee')}
            </div>
          </div>
          <ThemeIcon
            src={RcStarBg}
            className="absolute top-[40px] left-[50%] translate-x-[-50%]"
          />
        </div>

        {isSuccess ? (
          <div
            className={clsx(
              'mt-[18px] rounded-[8px] border-[0.5px] border-rabby-neutral-line',
              'px-[24px] py-[16px] bg-r-neutral-card-1',
              'flex items-center gap-[10px]'
            )}
          >
            <RcIconSuccessCC
              viewBox="0 0 24 24"
              className="text-r-green-default w-[20px] h-[20px]"
            />
            <div className="text-[15px] leading-[18px] font-medium text-r-green-default">
              {t('page.perps.invitePopup.activatedSuccess')}
            </div>
          </div>
        ) : null}
      </div>

      <div>
        {isSuccess ? (
          <div className="px-[20px] py-[24px] border-[1px] border-rabby-neutral-line">
            <Button
              type="primary"
              block
              className="h-[48px] text-[15px] font-medium rounded-[8px]"
              onClick={handleClose}
            >
              {t('global.Done')}
            </Button>
          </div>
        ) : (
          <Footer>
            <div className="flex items-center justify-between mb-[20px]">
              <div className="text-[14px] leading-[17px] text-r-neutral-body">
                {t('page.connect.connectAddress')}
              </div>
              <AccountSelector
                className="account-selector"
                value={selectedAccount}
                onChange={(account) => {
                  setSelectedAccount(account);
                }}
                disabled
                modalHeight={'calc(100% - 60px)'}
              />
            </div>
            <div className="flex flex-col items-center gap-[16px]">
              <Button type="primary" size="large" onClick={handleInvite}>
                {t('page.perps.invitePopup.activateNow')}
              </Button>

              <Button
                type="primary"
                ghost
                className={clsx(
                  'rabby-btn-ghost',
                  'flex items-center justify-center gap-2'
                )}
                size="large"
                onClick={handleClose}
              >
                {t('global.Cancel')}
              </Button>
            </div>
          </Footer>
        )}
      </div>
    </div>
  );
};
