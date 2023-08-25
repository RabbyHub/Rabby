import { Account } from '@/background/service/preference';
import { FallbackSiteLogo } from '@/ui/component';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { useWallet } from '@/ui/utils';
import { Chain } from '@debank/common';
import { Result } from '@rabby-wallet/rabby-security-engine';
import { Level } from '@rabby-wallet/rabby-security-engine/dist/rules';
import { ConnectedSite } from 'background/service/permission';
import clsx from 'clsx';
import { CHAINS, INTERNAL_REQUEST_ORIGIN, SecurityEngineLevel } from 'consts';
import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import SecurityLevelTagNoText from '../SecurityEngine/SecurityLevelTagNoText';
import { AccountInfo } from './AccountInfo';
import { ActionGroup, Props as ActionGroupProps } from './ActionGroup';

interface Props extends Omit<ActionGroupProps, 'account'> {
  chain?: Chain;
  gnosisAccount?: Account;
  securityLevel?: Level;
  origin?: string;
  originLogo?: string;
  hasUnProcessSecurityResult?: boolean;
  hasShadow?: boolean;
  isTestnet?: boolean;
  engineResults?: Result[];
  onIgnoreAllRules(): void;
}

const Wrapper = styled.section`
  padding: 20px;
  padding-top: 12px;
  box-shadow: 0px -8px 24px rgba(0, 0, 0, 0.1);
  border-radius: 16px 16px 0px 0px;
  position: relative;
  .request-origin {
    font-weight: 500;
    font-size: 13px;
    line-height: 15px;
    color: #666;
    padding-bottom: 12px;
    position: relative;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    position: relative;
    .origin {
      color: #333;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 15px;
      line-height: 18px;
    }
    .right {
      font-size: 12px;
      line-height: 14px;
      color: #707280;
    }
    .security-level-tag {
      margin-top: -15px;
    }
    &::after {
      content: '';
      position: absolute;
      left: 0;
      bottom: 0;
      width: 100vw;
      margin-left: -20px;
      height: 1px;
      background-color: rgba(0, 0, 0, 0.05);
    }
  }
  .security-level-tip {
    margin-top: 10px;
    border-radius: 4px;
    padding: 6px 10px 6px 8px;
    font-weight: 500;
    font-size: 13px;
    line-height: 15px;
    display: flex;
    position: relative;
    .icon-level {
      width: 14px;
      height: 14px;
      margin-right: 6px;
    }
    &::before {
      content: '';
      position: absolute;
      width: 0;
      height: 0;
      border: 5px solid transparent;
      border-bottom: 8px solid currentColor;
      top: -12px;
      left: 115px;
    }
  }
`;

const Shadow = styled.div`
  pointer-events: none;
  position: absolute;
  top: -85px;
  height: 85px;
  left: 0;
  width: 100%;
  background: linear-gradient(
    180deg,
    rgba(217, 217, 217, 0) 10.74%,
    rgba(175, 175, 175, 0.168147) 41.66%,
    rgba(130, 130, 130, 0.35) 83.44%
  );
`;

const ChainLogo = styled.img`
  position: absolute;
  top: -4px;
  right: -4px;
  width: 14px;
  height: 14px;
  border-radius: 100%;
`;

const SecurityLevelTipColor = {
  [Level.FORBIDDEN]: {
    bg: 'rgba(175, 22, 14, 0.1)',
    text: '#AF160E',
    icon: SecurityEngineLevel[Level.FORBIDDEN].icon,
  },
  [Level.DANGER]: {
    bg: 'rgba(236, 81, 81, 0.1)',
    text: '#EC5151',
    icon: SecurityEngineLevel[Level.DANGER].icon,
  },
  [Level.WARNING]: {
    bg: 'rgba(255, 176, 32, 0.1)',
    text: '#FFB020',
    icon: SecurityEngineLevel[Level.WARNING].icon,
  },
};

export const FooterBar: React.FC<Props> = ({
  origin,
  originLogo,
  gnosisAccount,
  securityLevel,
  engineResults = [],
  hasUnProcessSecurityResult,
  hasShadow = false,
  onIgnoreAllRules,
  ...props
}) => {
  const [account, setAccount] = React.useState<Account>();
  const [
    connectedSite,
    setConnectedSite,
  ] = React.useState<ConnectedSite | null>(null);
  const wallet = useWallet();
  const dispatch = useRabbyDispatch();
  const { t } = useTranslation();

  const displayOirigin = useMemo(() => {
    if (origin === INTERNAL_REQUEST_ORIGIN) {
      return 'Rabby Wallet';
    }
    return origin;
  }, [origin]);

  const { rules, processedRules } = useRabbySelector((s) => ({
    rules: s.securityEngine.rules,
    processedRules: s.securityEngine.currentTx.processedRules,
  }));

  const currentChain = useMemo(() => {
    if (origin === INTERNAL_REQUEST_ORIGIN) {
      return props.chain || CHAINS.ETH;
    } else {
      if (!connectedSite) return CHAINS.ETH;
      return CHAINS[connectedSite.chain];
    }
  }, [props.chain, origin, connectedSite]);

  const engineResultMap = useMemo(() => {
    const map: Record<string, Result> = {};
    engineResults.forEach((item) => {
      map[item.id] = item;
    });
    return map;
  }, [engineResults]);

  const handleClickRule = (id: string) => {
    const rule = rules.find((item) => item.id === id);
    if (!rule) return;
    const result = engineResultMap[id];
    dispatch.securityEngine.openRuleDrawer({
      ruleConfig: rule,
      value: result?.value,
      level: result?.level,
      ignored: processedRules.includes(id),
    });
  };

  const init = async () => {
    const currentAccount =
      gnosisAccount || (await wallet.syncGetCurrentAccount());
    if (currentAccount) setAccount(currentAccount);
    dispatch.securityEngine.init();
  };

  useEffect(() => {
    if (origin) {
      wallet.getConnectedSite(origin).then((site) => {
        site && setConnectedSite(site);
      });
    }
  }, [origin]);

  React.useEffect(() => {
    init();
  }, []);

  if (!account) {
    return null;
  }

  return (
    <div className="relative">
      {hasShadow && <Shadow />}
      <Wrapper
        className={clsx('bg-white', {
          'has-shadow': hasShadow,
        })}
      >
        {origin && (
          <div className="request-origin">
            {originLogo && (
              <div className="relative mr-8">
                <FallbackSiteLogo
                  url={originLogo}
                  origin={origin}
                  width="24px"
                  height="24px"
                />
                <ChainLogo src={currentChain.logo} />
              </div>
            )}
            <span className="origin">{displayOirigin}</span>
            <span className="right">{t('page.signFooterBar.requestFrom')}</span>
            {engineResultMap['1088'] && (
              <SecurityLevelTagNoText
                enable={engineResultMap['1088'].enable}
                level={
                  processedRules.includes('1088')
                    ? 'proceed'
                    : engineResultMap['1088'].level
                }
                onClick={() => handleClickRule('1088')}
                right="0px"
                className="security-level-tag"
              />
            )}
            {engineResultMap['1089'] && (
              <SecurityLevelTagNoText
                enable={engineResultMap['1089'].enable}
                level={
                  processedRules.includes('1089')
                    ? 'proceed'
                    : engineResultMap['1089'].level
                }
                onClick={() => handleClickRule('1089')}
                className="security-level-tag"
              />
            )}
          </div>
        )}
        <AccountInfo
          chain={props.chain}
          account={account}
          isTestnet={props.isTestnet}
        />
        <ActionGroup account={account} {...props} />
        {securityLevel && hasUnProcessSecurityResult && (
          <div
            className="security-level-tip"
            style={{
              color: SecurityLevelTipColor[securityLevel].bg,
              backgroundColor: SecurityLevelTipColor[securityLevel].bg,
            }}
          >
            <img
              src={SecurityLevelTipColor[securityLevel].icon}
              className="icon icon-level"
            />
            <span
              className="flex-1"
              style={{
                color: SecurityLevelTipColor[securityLevel].text,
              }}
            >
              {t('page.signFooterBar.processRiskAlert')}
            </span>
            <span
              className="underline text-13 font-medium cursor-pointer"
              style={{
                color: SecurityLevelTipColor[securityLevel].text,
              }}
              onClick={onIgnoreAllRules}
            >
              {t('page.signFooterBar.ignoreAll')}
            </span>
          </div>
        )}
      </Wrapper>
    </div>
  );
};
