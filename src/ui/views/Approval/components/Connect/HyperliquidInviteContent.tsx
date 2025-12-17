import { ConnectedSite } from '@/background/service/permission';
import i18n from '@/i18n';
import { ReactComponent as ArrowDownSVG } from '@/ui/assets/approval/arrow-down-blue.svg';
import { findChain } from '@/utils/chain';
import { Result } from '@rabby-wallet/rabby-security-engine';
import {
  ContextActionData,
  Level,
  RuleConfig,
} from '@rabby-wallet/rabby-security-engine/dist/rules';
import { Button, message } from 'antd';
import { Chain } from 'background/service/openapi';
import clsx from 'clsx';
import { CHAINS_ENUM, SecurityEngineLevel } from 'consts';
import PQueue from 'p-queue';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import styled from 'styled-components';
import IconMetamask from 'ui/assets/metamask-mode-circle.svg';
import IconSuccess from 'ui/assets/success.svg';
import { ChainSelector, FallbackSiteLogo, Spin } from 'ui/component';
import { useApproval, useCommonPopupView, useWallet } from 'ui/utils';
import { useSecurityEngine } from 'ui/utils/securityEngine';
import RuleDrawer from '../SecurityEngine/RuleDrawer';
import RuleResult from './RuleResult';
import UserListDrawer from './UserListDrawer';
import { AccountSelector } from '@/ui/component/AccountSelector';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { useRabbyGetter, useRabbySelector } from '@/ui/store';
import { Account } from '@/background/service/preference';
import { RcIconSuccessCC } from '@/ui/assets/desktop/common';
import { ReactComponent as RcIconCloseCC } from 'ui/assets/component/close-cc.svg';
import IconHyperliquid from '@/ui/assets/perps/icon-hyperliquid.svg';
import IconRabbyWallet from '@/ui/assets/icon-rabby-circle.svg';
import { ReactComponent as RcStarBg } from '@/ui/assets/perps/star-bg.svg';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { WaitingSignMessageComponent } from '../map';

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
    height: 52px;
    &:nth-child(1) {
      margin-bottom: 12px;
    }
    &:nth-last-child(1) {
      margin-top: 16px;
    }
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

export const HyperliquidInviteContent = (props: ConnectProps) => {
  const {
    params: { icon, origin, name, $ctx },
  } = props;
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const { state } = useLocation<{
    showChainsModal?: boolean;
  }>();
  const { showChainsModal = false } = state ?? {};
  const [showModal] = useState(showChainsModal);
  const [, resolveApproval, rejectApproval] = useApproval();
  const { t } = useTranslation();
  const wallet = useWallet();
  const [defaultChain, setDefaultChain] = useState(CHAINS_ENUM.ETH);
  const [isLoading, setIsLoading] = useState(true);
  const [listDrawerVisible, setListDrawerVisible] = useState(false);
  const [processedRules, setProcessedRules] = useState<string[]>([]);
  const [nonce, setNonce] = useState(0);
  const { rules, userData, executeEngine } = useSecurityEngine(nonce);
  const [engineResults, setEngineResults] = useState<Result[]>([]);
  const [collectList, setCollectList] = useState<
    { name: string; logo_url: string }[]
  >([]);
  const [originPopularLevel, setOriginPopularLevel] = useState<string | null>(
    null
  );
  const [ruleDrawerVisible, setRuleDrawerVisible] = useState(false);
  const [selectRule, setSelectRule] = useState<{
    ruleConfig: RuleConfig;
    value?: number | string | boolean;
    level?: Level;
    ignored: boolean;
  } | null>(null);

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

  const handleCancel = () => {
    rejectApproval('User rejected the request.');
  };

  const handleAllow = async () => {
    const account = selectedAccount!;
    await resolveApproval(
      {
        defaultChain,
        defaultAccount: selectedAccount,
      },
      true
    );
    const typedData = JSON.stringify({
      domain: {
        chainId: '1',
        name: 'Ether Mail',
        verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
        version: '1',
      },
      message: {
        contents: 'Hello, Bob!',
        from: {
          name: 'Cow',
          wallets: [
            '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
            '0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF',
          ],
        },
        to: [
          {
            name: 'Bob',
            wallets: [
              '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
              '0xB0BdaBea57B0BDABeA57b0bdABEA57b0BDabEa57',
              '0xB0B0b0b0b0b0B000000000000000000000000000',
            ],
          },
        ],
        attachment: '0x',
      },
      primaryType: 'Mail',
      types: {
        EIP712Domain: [
          {
            name: 'name',
            type: 'string',
          },
          {
            name: 'version',
            type: 'string',
          },
          {
            name: 'chainId',
            type: 'uint256',
          },
          {
            name: 'verifyingContract',
            type: 'address',
          },
        ],
        Group: [
          {
            name: 'name',
            type: 'string',
          },
          {
            name: 'members',
            type: 'Person[]',
          },
        ],
        Mail: [
          {
            name: 'from',
            type: 'Person',
          },
          {
            name: 'to',
            type: 'Person[]',
          },
          {
            name: 'contents',
            type: 'string',
          },
          {
            name: 'attachment',
            type: 'bytes',
          },
        ],
        Person: [
          {
            name: 'name',
            type: 'string',
          },
          {
            name: 'wallets',
            type: 'address[]',
          },
        ],
      },
    });
    const promise = wallet
      .sendRequest({
        method: 'eth_signTypedData_v4',
        params: [account.address, typedData],
      })
      .then((signature) => {
        console.log('signature', signature);
      }, console.error);

    if (WaitingSignMessageComponent[account.type]) {
      wallet.signTypedDataWithUI(
        account.type,
        account.address,
        typedData as any,
        {
          brandName: account.brandName,
          version: 'V4',
        }
      );

      resolveApproval({
        uiRequestComponent: WaitingSignMessageComponent[account.type],
        type: account.type,
        address: account.address,
        data: [account.address, typedData],
        account: account,
        $account: account,
        extra: {
          popupProps: {
            maskStyle: {
              backgroundColor: 'transparent',
            },
          },
        },
      });
    }
    // const signature = await wallet.signTypedData(
    //   account.type,
    //   account.address,
    //  ,
    //   { version: 'V4' }
    // );
    // resolveApproval(
    //   {
    //     defaultChain,
    //     defaultAccount: selectedAccount,
    //   },
    //   true
    // );
  };

  const onIgnoreAllRules = () => {
    setProcessedRules(engineResults.map((item) => item.id));
  };

  const [
    displayBlockedRequestApproval,
    setDisplayBlockedRequestApproval,
  ] = React.useState<boolean>(false);
  const { activePopup, setData } = useCommonPopupView();

  React.useEffect(() => {
    wallet
      .checkNeedDisplayBlockedRequestApproval()
      .then(setDisplayBlockedRequestApproval);
  }, []);

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
              Connected
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
              Use Rabby’s code to enable
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
              Hyperliquid trading fees.
            </div>
          </div>
          <ThemeIcon
            src={RcStarBg}
            className="absolute top-[40px] left-[50%] translate-x-[-50%]"
          />
        </div>
      </div>

      <div>
        <div className="px-[20px] py-[24px] border-[1px] border-rabby-neutral-line">
          <Button
            type="primary"
            block
            className="mt-[24px] h-[44px] text-[15px] font-medium rounded-[8px]"
          >
            Done
          </Button>
        </div>
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
              modalHeight={'calc(100% - 60px)'}
            />
          </div>
          <div className="action-buttons flex flex-col items-center">
            <Button type="primary" size="large" onClick={() => handleAllow()}>
              Active Now
            </Button>

            <Button
              type="primary"
              ghost
              className={clsx(
                'rabby-btn-ghost',
                'flex items-center justify-center gap-2'
              )}
              size="large"
              onClick={handleCancel}
            >
              {t('global.Cancel')}
            </Button>
          </div>
        </Footer>
      </div>
    </div>
  );
};
