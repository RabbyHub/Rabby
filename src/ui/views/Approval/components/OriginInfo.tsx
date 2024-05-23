import { INTERNAL_REQUEST_ORIGIN } from '@/constant';
import { FallbackSiteLogo } from '@/ui/component';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { findChain } from '@/utils/chain';
import { CHAINS, Chain } from '@debank/common';
import React, { useEffect, useMemo } from 'react';
import SecurityLevelTagNoText from './SecurityEngine/SecurityLevelTagNoText';
import { ConnectedSite } from '@/background/service/permission';
import { useWallet } from '@/ui/utils';
import styled from 'styled-components';
import { Result } from '@rabby-wallet/rabby-security-engine';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';

interface Props {
  chain?: Chain;
  origin?: string;
  originLogo?: string;
  engineResults?: Result[];
}

const ChainLogo = styled.img`
  position: absolute;
  bottom: -4px;
  right: -4px;
  width: 14px;
  height: 14px;
  border-radius: 100%;
`;

const RequestOrigin = styled.div`
  height: 26px;
  font-weight: 500;
  font-size: 13px;
  line-height: 15px;
  position: relative;
  box-sizing: content-box;
  padding-top: 10px;
  padding-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  .origin {
    color: var(--r-neutral-title-1, #f7fafc);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 16px;
    line-height: 18px;
  }
`;

export const OriginInfo: React.FC<Props> = ({
  origin,
  chain,
  originLogo,
  engineResults = [],
}) => {
  const wallet = useWallet();

  const [
    connectedSite,
    setConnectedSite,
  ] = React.useState<ConnectedSite | null>(null);
  const dispatch = useRabbyDispatch();
  const { rules, processedRules } = useRabbySelector((s) => ({
    rules: s.securityEngine.rules,
    processedRules: s.securityEngine.currentTx.processedRules,
  }));

  const currentChain = useMemo(() => {
    if (origin === INTERNAL_REQUEST_ORIGIN) {
      return chain || CHAINS.ETH;
    } else {
      if (!connectedSite) return CHAINS.ETH;
      return findChain({
        enum: connectedSite.chain,
      })!;
    }
  }, [chain, origin, connectedSite]);

  const displayOrigin = useMemo(() => {
    if (origin === INTERNAL_REQUEST_ORIGIN) {
      return 'Rabby Wallet';
    }
    return origin;
  }, [origin]);

  useEffect(() => {
    if (origin) {
      wallet.getConnectedSite(origin).then((site) => {
        site && setConnectedSite(site);
      });
    }
  }, [origin]);

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
    dispatch.securityEngine.init();
  };

  useEffect(() => {
    init();
  }, []);

  if (!origin) {
    return null;
  }

  return (
    <RequestOrigin>
      {originLogo && (
        <div className="relative mr-8">
          <FallbackSiteLogo
            url={originLogo}
            origin={origin}
            width="24px"
            height="24px"
          />
          <TooltipWithMagnetArrow
            className="rectangle w-[max-content]"
            title={currentChain.name}
          >
            <ChainLogo src={currentChain.logo} />
          </TooltipWithMagnetArrow>
        </div>
      )}
      <span className="origin">{displayOrigin}</span>
      {engineResultMap['1088'] && (
        <SecurityLevelTagNoText
          enable={engineResultMap['1088'].enable}
          level={
            processedRules.includes('1088')
              ? 'proceed'
              : engineResultMap['1088'].level
          }
          onClick={() => handleClickRule('1088')}
          right="-14px"
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
          right="-14px"
        />
      )}
    </RequestOrigin>
  );
};
