import React, { useEffect, useMemo, useState } from 'react';
import { Button } from 'antd';
import clsx from 'clsx';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Chain } from 'background/service/openapi';
import { ChainSelector, Spin, FallbackSiteLogo } from 'ui/component';
import { useApproval, useWallet } from 'ui/utils';
import { CHAINS_ENUM, CHAINS } from 'consts';
import styled from 'styled-components';
import UserDataList from './UserDataList';
import {
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
  height: 100vh;
  display: flex;
  flex-direction: column;
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
      position: relative;
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
    flex: 1;
    overflow: auto;
    padding: 0 20px;
  }
`;

const Footer = styled.div`
  display: flex;
  flex-direction: column;
  padding: 20px;
  border-top: 1px solid #e5e9ef;
  width: 100%;
  background-color: #fff;
  .ant-btn {
    width: 100%;
    height: 52px;
    &:nth-child(1) {
      margin-bottom: 12px;
    }
    &:nth-last-child(1) {
      margin-top: 20px;
    }
  }
  .security-tip {
    font-weight: 500;
    font-size: 13px;
    line-height: 15px;
    text-align: center;
    color: #4b4d59;
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
    desc: 'Phishing check by Rabby',
    fixed: false,
  },
  {
    id: '1002',
    desc: 'Phishing check by MetaMask',
    fixed: false,
  },
  {
    id: '1003',
    desc: 'Phishing check by ScamSniffer',
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

  const connectBtnStatus = useMemo(() => {
    let disabled = false;
    let text = '';
    let forbiddenCount = 0;
    let safeCount = 0;
    let needProcessCount = 0;
    let cancelBtnText = 'Cancel';

    engineResults.forEach((result) => {
      if (result.level === Level.SAFE) {
        safeCount++;
      } else if (result.level === Level.FORBIDDEN) {
        forbiddenCount++;
      } else if (
        result.level !== Level.ERROR &&
        result.level !== Level.CLOSED &&
        !processedRules.includes(result.id)
      ) {
        needProcessCount++;
      }
    });

    if (forbiddenCount > 0) {
      disabled = true;
      text = `Found ${forbiddenCount} forbidden risk${
        forbiddenCount > 1 ? 's' : ''
      }.`;
      cancelBtnText = 'Close';
    } else if (needProcessCount > 0) {
      if (safeCount > 0) {
        disabled = false;
        text = '';
      } else {
        disabled = true;
        text = `Found ${needProcessCount} risk${
          needProcessCount > 1 ? 's' : ''
        }. Please process it before connecting.`;
      }
    }

    return {
      disabled,
      text,
      cancelBtnText,
    };
  }, [engineResults, processedRules]);

  const hasForbidden = useMemo(() => {
    return engineResults.some((item) => item.level === Level.FORBIDDEN);
  }, [engineResults]);

  const hasSafe = useMemo(() => {
    return engineResults.some((item) => item.level === Level.SAFE);
  }, [engineResults]);

  const handleIgnoreRule = (id: string) => {
    setProcessedRules([...processedRules, id]);
    if (selectRule) {
      setSelectRule({
        ...selectRule,
        ignored: true,
      });
    }
  };

  const handleUndoIgnore = (id: string) => {
    setProcessedRules(processedRules.filter((item) => item !== id));
    if (selectRule) {
      setSelectRule({
        ...selectRule,
        ignored: false,
      });
    }
  };

  const handleRuleEnableStatusChange = async (id: string, value: boolean) => {
    await wallet.ruleEnableStatusChange(id, value);
    setNonce(nonce + 1);
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

  const handleRuleDrawerClose = (update: boolean) => {
    if (update) {
      handleExecuteSecurityEngine();
    }
    setRuleDrawerVisible(false);
  };

  const handleChainChange = (val: CHAINS_ENUM) => {
    setDefaultChain(val);
  };

  const handleSelectRule = (rule: {
    id: string;
    desc: string;
    result: Result | null;
  }) => {
    const target = rules.find((item) => item.id === rule.id);
    if (!target) return;
    setSelectRule({
      ruleConfig: target,
      value: rule.result?.value,
      level: rule.result?.level,
      ignored: processedRules.includes(rule.id),
    });
    setRuleDrawerVisible(true);
  };

  return (
    <Spin spinning={isLoading}>
      <ConnectWrapper>
        <div className="approval-connect">
          <div className="flex justify-between items-center mb-20">
            <div className="approval-title">Connect to Dapp</div>
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
              modalHeight={540}
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
              processedRules={processedRules}
              onChange={handleUserDataListChange}
              onUpdateSecurityEngine={handleExecuteSecurityEngine}
              onIgnore={handleIgnoreRule}
              onUndo={handleUndoIgnore}
              onRuleEnableStatusChange={handleRuleEnableStatusChange}
              rules={rules}
              hasSafe={hasSafe}
              hasForbidden={hasForbidden}
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
              hasSafe={hasSafe}
              hasForbidden={hasForbidden}
            />
          ))}
        </div>

        <Footer>
          <div className="action-buttons flex flex-col mt-4">
            <Button
              type="primary"
              size="large"
              onClick={() => handleAllow()}
              disabled={connectBtnStatus.disabled}
              className={clsx({
                'mb-0': !connectBtnStatus.text,
              })}
            >
              {t('Connect')}
            </Button>
            {connectBtnStatus.text && (
              <div className="security-tip">{connectBtnStatus.text}</div>
            )}
            <Button
              type="primary"
              ghost
              className="rabby-btn-ghost"
              size="large"
              onClick={handleCancel}
            >
              {connectBtnStatus.cancelBtnText}
            </Button>
          </div>
        </Footer>
        <RuleDrawer
          selectRule={selectRule}
          visible={ruleDrawerVisible}
          onIgnore={handleIgnoreRule}
          onUndo={handleUndoIgnore}
          onRuleEnableStatusChange={handleRuleEnableStatusChange}
          onClose={handleRuleDrawerClose}
        />
      </ConnectWrapper>
    </Spin>
  );
};

export default Connect;
