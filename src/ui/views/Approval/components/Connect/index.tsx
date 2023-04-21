import React, { useEffect, useMemo, useState } from 'react';
import { Button } from 'antd';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Chain } from 'background/service/openapi';
import { ChainSelector, Spin, FallbackSiteLogo } from 'ui/component';
import { useApproval, useWallet } from 'ui/utils';
import { CHAINS_ENUM, CHAINS } from 'consts';
import styled from 'styled-components';
import UserDataList from './UserDataList';
import {
  UserData,
  ContextActionData,
  RuleConfig,
  Level,
} from '@debank/rabby-security-engine/dist/rules';
import { Result } from '@debank/rabby-security-engine';
import { useSecurityEngine } from 'ui/utils/securityEngine';
import RuleResult from './RuleResult';
import RuleDrawer from '../SecurityEngine/RuleDrawer';

interface ConnectProps {
  params: any;
  onChainChange?(chain: CHAINS_ENUM): void;
  defaultChain?: CHAINS_ENUM;
}

const ConnectWrapper = styled.div`
  .approval-connect {
    padding: 26px 20px;
    .approval-title {
      font-weight: 500;
      font-size: 17px;
      line-height: 20px;
      color: #13141a;
    }
    .chain-selector {
      height: 32px;
      border-radius: 8px;
      background: #fff;
      font-size: 13px;
      border: 1px solid #e5e9ef;
      box-shadow: none;
      .chain-icon-comp {
        width: 16px;
        height: 16px;
        img {
          width: 16px;
          height: 16px;
        }
      }
      &.hover {
        background: rgba(134, 151, 255, 0.1);
      }
    }
    .connect-card {
      background: #f5f6fa;
      border-radius: 8px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      .connect-origin {
        margin-top: 12px;
        margin-bottom: 14px;
        font-weight: 500;
        font-size: 22px;
        line-height: 26px;
        text-align: center;
        color: #13141a;
      }
    }
  }
  .rule-list {
    padding: 0 20px;
  }
`;

const RuleDesc = [
  {
    id: '1004',
    desc: 'Listed by community platform',
    fixed: true,
  },
  {
    id: '1005',
    desc: 'Site popularity',
    fixed: true,
  },
  {
    id: '1001',
    desc: 'Flagged by Rabby',
    fixed: false,
  },
  {
    id: '1002',
    desc: 'Flagged by MetaMask',
    fixed: false,
  },
  {
    id: '1003',
    desc: 'Flagged by ScamSniffer',
    fixed: false,
  },
];

const Connect = ({ params: { icon, origin } }: ConnectProps) => {
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
  const [processedRules, setProcessedRules] = useState<string[]>([]);
  const [nonce, setNonce] = useState(0);
  const { rules, userData, executeEngine, updateUserData } = useSecurityEngine(
    nonce
  );
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
    value: number | string | boolean;
    level: Level;
    ignored: boolean;
  } | null>(null);

  const userListResult = useMemo(() => {
    const originBlacklist = engineResults.find(
      (result) => result.id === '1006'
    );
    const originWhitelist = engineResults.find(
      (result) => result.id === '1007'
    );
    return originBlacklist || originWhitelist;
  }, [engineResults]);

  const sortRules = useMemo(() => {
    const list: { id: string; desc: string; result: Result | null }[] = [];
    for (let i = 0; i < RuleDesc.length; i++) {
      const item = RuleDesc[i];
      const result = engineResults.find((result) => result.id === item.id);
      if (result || item.fixed) {
        list.push({
          id: item.id,
          desc: item.desc,
          result: result || null,
        });
      }
    }
    return list;
  }, [engineResults]);

  const handleIgnoreRule = (id: string) => {
    setProcessedRules([...processedRules, id]);
    setRuleDrawerVisible(false);
  };

  const handleRuleEnableStatusChange = (id: string, value: boolean) => {
    // setNonce(nonce + 1);
  };

  const handleUserDataListChange = () => {
    setNonce(nonce + 1);
  };

  const handleExecuteSecurityEngine = async () => {
    setIsLoading(true);
    const ctx: ContextActionData = {
      origin: {
        url: origin,
        communityCount: collectList.length,
        popularLevel: originPopularLevel!,
      },
    };
    const results = await executeEngine(ctx);
    setIsLoading(false);
    setEngineResults(results);
  };

  const init = async () => {
    const account = await wallet.getCurrentAccount();
    const site = await wallet.getSite(origin);
    const {
      collect_list,
    } = await wallet.openapi.getOriginThirdPartyCollectList(origin);
    const { level } = await wallet.openapi.getOriginPopularityLevel(origin);
    setOriginPopularLevel(level);
    setCollectList(collect_list);
    const ctx: ContextActionData = {
      origin: {
        url: origin,
        communityCount: collect_list.length,
        popularLevel: level,
      },
    };
    const results = await executeEngine(ctx);
    setEngineResults(results);
    if (site) {
      setDefaultChain(site.chain);
      setIsLoading(false);
      return;
    }
    try {
      const recommendChains = await wallet.openapi.getRecommendChains(
        account!.address,
        origin
      );
      setIsLoading(false);
      let targetChain: Chain | undefined;
      for (let i = 0; i < recommendChains.length; i++) {
        targetChain = Object.values(CHAINS).find(
          (c) => c.serverId === recommendChains[i].id
        );
        if (targetChain) break;
      }
      setDefaultChain(targetChain ? targetChain.enum : CHAINS_ENUM.ETH);
    } catch (e) {
      console.log(e);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    init();
  }, []);

  const handleCancel = () => {
    rejectApproval('User rejected the request.');
  };

  const handleAllow = async () => {
    resolveApproval({
      defaultChain,
    });
  };

  const handleChainChange = (val: CHAINS_ENUM) => {
    setDefaultChain(val);
  };

  const handleSelectRule = (rule: {
    id: string;
    desc: string;
    result: Result;
  }) => {
    const target = rules.find((item) => item.id === rule.id);
    if (!target) return;
    setSelectRule({
      ruleConfig: target,
      value: rule.result.value,
      level: rule.result.level,
      ignored: processedRules.includes(rule.id),
    });
    setRuleDrawerVisible(true);
  };

  return (
    <Spin spinning={isLoading}>
      <ConnectWrapper>
        <div className="approval-connect">
          <div className="flex justify-between items-center mb-20">
            <div className="approval-title">Dapp Connection</div>
            <ChainSelector
              title={
                <div>
                  <div className="chain-selector-tips">
                    Select a chain to connect for
                  </div>
                  <div className="chain-selector-site">{origin}</div>
                </div>
              }
              value={defaultChain}
              onChange={handleChainChange}
              connection
              showModal={showModal}
            />
          </div>
          <div className="connect-card">
            <FallbackSiteLogo url={icon} origin={origin} width="40px" />
            <p className="connect-origin">{origin}</p>
            <UserDataList
              origin={origin}
              logo={icon}
              userData={userData}
              ruleResult={userListResult}
              onChange={handleUserDataListChange}
              onUpdateSecurityEngine={handleExecuteSecurityEngine}
              rules={rules}
            />
          </div>
        </div>

        <div className="rule-list">
          {sortRules.map((rule) => (
            <RuleResult
              rule={rule}
              key={rule.id}
              onSelect={handleSelectRule}
              collectList={collectList}
              popularLevel={originPopularLevel}
              ignored={processedRules.includes(rule.id)}
            />
          ))}
        </div>

        <footer className="connect-footer">
          <div className="action-buttons flex justify-between mt-4">
            <Button
              type="primary"
              size="large"
              className="w-[172px]"
              onClick={handleCancel}
            >
              {t('Cancel')}
            </Button>
            <Button
              type="primary"
              size="large"
              className="w-[172px]"
              onClick={() => handleAllow()}
            >
              {t('Connect')}
            </Button>
          </div>
        </footer>
        <RuleDrawer
          selectRule={selectRule}
          visible={ruleDrawerVisible}
          onIgnore={handleIgnoreRule}
          onRuleEnableStatusChange={handleRuleEnableStatusChange}
          onClose={() => setRuleDrawerVisible(false)}
        />
      </ConnectWrapper>
    </Spin>
  );
};

export default Connect;
