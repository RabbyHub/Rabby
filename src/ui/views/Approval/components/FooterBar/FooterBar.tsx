import { Account } from '@/background/service/preference';
import { FallbackSiteLogo } from '@/ui/component';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { useWallet } from '@/ui/utils';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { Chain } from '@debank/common';
import { Result } from '@rabby-wallet/rabby-security-engine';
import { Level } from '@rabby-wallet/rabby-security-engine/dist/rules';
import { ConnectedSite } from 'background/service/permission';
import clsx from 'clsx';
import { CHAINS, INTERNAL_REQUEST_ORIGIN, SecurityEngineLevel } from 'consts';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import SecurityLevelTagNoText from '../SecurityEngine/SecurityLevelTagNoText';
import { AccountInfo } from './AccountInfo';
import { ActionGroup, Props as ActionGroupProps } from './ActionGroup';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { findChain } from '@/utils/chain';
import {
  GasLessToSign,
  GasLessNotEnough,
  GasLessActivityToSign,
  GasLessConfig,
} from './GasLessComponents';

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
  useGasLess?: boolean;
  showGasLess?: boolean;
  enableGasLess?: () => void;
  canUseGasLess?: boolean;
  Header?: React.ReactNode;
  gasLessFailedReason?: string;
  isWatchAddr?: boolean;
  gasLessConfig?: GasLessConfig;
  isGasNotEnough?: boolean;
}

const Wrapper = styled.section`
  padding: 20px;
  padding-top: 12px;
  border-radius: 16px 16px 0px 0px;
  background: var(--r-neutral-bg-1, #3d4251);
  box-shadow: 0px -4px 12px 0px rgba(0, 0, 0, 0.1);

  &.is-darkmode {
    box-shadow: 0px -4px 12px 0px rgba(0, 0, 0, 0.3);
  }

  position: relative;

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
      top: -13px;
      left: 115px;
    }
  }
`;

const Shadow = styled.div<{ isShow: boolean }>`
  pointer-events: none;
  position: absolute;
  top: -85px;
  height: 100px;
  left: 0;
  width: 100%;
  background: linear-gradient(
    180deg,
    rgba(217, 217, 217, 0) 10.74%,
    rgba(175, 175, 175, 0.168147) 41.66%,
    rgba(130, 130, 130, 0.35) 83.44%
  );
  z-index: 0;
  opacity: ${(props) => (props.isShow ? 1 : 0)};
  transition: opacity 0.1s;
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
    bg: 'var(--r-red-light-2, #EFD4D1)',
    text: 'var(--r-red-dark, #AE2A19)',
    icon: SecurityEngineLevel[Level.FORBIDDEN].icon,
  },
  [Level.DANGER]: {
    bg: 'var(--r-red-light, #FFDFDB)',
    text: 'var(--r-red-default, #E34935)',
    icon: SecurityEngineLevel[Level.DANGER].icon,
  },
  [Level.WARNING]: {
    bg: 'var(--r-orange-light, #FFEDCB)',
    text: 'var(--r-orange-default, #FFB020)',
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
  showGasLess = false,
  useGasLess = false,
  canUseGasLess = false,
  onIgnoreAllRules,
  enableGasLess,
  Header,
  gasLessFailedReason,
  isWatchAddr,
  gasLessConfig,
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

  const { rules, processedRules } = useRabbySelector((s) => ({
    rules: s.securityEngine.rules,
    processedRules: s.securityEngine.currentTx.processedRules,
  }));

  const currentChain = useMemo(() => {
    if (origin === INTERNAL_REQUEST_ORIGIN) {
      return props.chain || CHAINS.ETH;
    } else {
      if (!connectedSite) return CHAINS.ETH;
      return findChain({
        enum: connectedSite.chain,
      })!;
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

  const { isDarkTheme } = useThemeMode();

  if (!account) {
    return null;
  }

  return (
    <div className="relative">
      {!isDarkTheme && <Shadow isShow={hasShadow} />}
      <Wrapper
        className={clsx({
          'is-darkmode': hasShadow,
        })}
      >
        {Header}
        <AccountInfo
          chain={props.chain}
          account={account}
          isTestnet={props.isTestnet}
        />
        <ActionGroup
          account={account}
          gasLess={useGasLess}
          {...props}
          disabledProcess={useGasLess ? false : props.disabledProcess}
          enableTooltip={useGasLess ? false : props.enableTooltip}
          gasLessThemeColor={
            isDarkTheme ? gasLessConfig?.dark_color : gasLessConfig?.theme_color
          }
        />
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
        {showGasLess &&
          (!securityLevel || !hasUnProcessSecurityResult) &&
          (canUseGasLess ? (
            <GasLessActivityToSign
              gasLessEnable={useGasLess}
              handleFreeGas={() => {
                enableGasLess?.();
              }}
              gasLessConfig={gasLessConfig}
            />
          ) : isWatchAddr ? null : (
            <GasLessNotEnough gasLessFailedReason={gasLessFailedReason} />
          ))}
      </Wrapper>
    </div>
  );
};
