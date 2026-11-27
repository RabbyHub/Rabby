import { INTERNAL_REQUEST_ORIGIN } from '@/constant';
import { FallbackSiteLogo } from '@/ui/component';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { findChain } from '@/utils/chain';
import { CHAINS, Chain } from '@debank/common';
import React, { useEffect, useMemo } from 'react';
import SecurityLevelTagNoText from './SecurityEngine/SecurityLevelTagNoText';
import { ConnectedSite } from '@/background/service/permission';
import { useWallet } from '@/ui/utils';
import { Result } from '@rabby-wallet/rabby-security-engine';
import { useSecurityEngineStore } from '@/ui/state/securityEngine';
import { useShallow } from 'zustand/react/shallow';

interface Props {
  chain?: Chain;
  origin?: string;
  originLogo?: string;
  engineResults?: Result[];
}

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
  const {
    rules,
    processedRules,
    openRuleDrawer,
    initSecurityEngine,
  } = useSecurityEngineStore(
    useShallow((s) => ({
      rules: s.rules,
      processedRules: s.currentTx.processedRules,
      openRuleDrawer: s.openRuleDrawer,
      initSecurityEngine: s.init,
    }))
  );

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
    openRuleDrawer({
      ruleConfig: rule,
      value: result?.value,
      level: result?.level,
      ignored: processedRules.includes(id),
    });
  };

  const init = async () => {
    await initSecurityEngine();
  };

  useEffect(() => {
    init();
  }, []);

  if (!origin) {
    return null;
  }

  return (
    <div className="h-[26px] font-medium text-13 leading-[15px] relative box-content pt-10 px-12 pb-8 flex items-center justify-center">
      {originLogo && (
        <div className="relative mr-8">
          <FallbackSiteLogo
            url={originLogo}
            origin={origin}
            width="24px"
            height="24px"
          />
          <TooltipWithMagnetArrow
            inApproval
            className="rectangle w-[max-content]"
            title={currentChain.name}
          >
            <img
              className="absolute bottom-[-4px] right-[-4px] w-14 h-14 rounded-full"
              src={currentChain.logo}
            />
          </TooltipWithMagnetArrow>
        </div>
      )}
      <span className="origin text-r-neutral-title-1 overflow-hidden text-ellipsis whitespace-nowrap text-[16px] leading-[18px]">
        {displayOrigin}
      </span>
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
    </div>
  );
};
