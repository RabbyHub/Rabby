import React, { useEffect, useMemo, useState } from 'react';
import { Button, message } from 'antd';
import clsx from 'clsx';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Chain } from 'background/service/openapi';
import { ChainSelector, Spin, FallbackSiteLogo } from 'ui/component';
import { useApproval, useWallet } from 'ui/utils';
import {
  CHAINS_ENUM,
  CHAINS,
  SecurityEngineLevel,
  SIGN_PERMISSION_TYPES,
} from 'consts';
import styled from 'styled-components';
import {
  ContextActionData,
  RuleConfig,
  Level,
} from '@rabby-wallet/rabby-security-engine/dist/rules';
import { Result } from '@rabby-wallet/rabby-security-engine';
import { useSecurityEngine } from 'ui/utils/securityEngine';
import RuleResult from './RuleResult';
import RuleDrawer from '../SecurityEngine/RuleDrawer';
import UserListDrawer from './UserListDrawer';
import IconSuccess from 'ui/assets/success.svg';
import PQueue from 'p-queue';
import { SignTestnetPermission } from './SignTestnetPermission';
import { useRabbySelector } from '@/ui/store';

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
    padding: 6px 12px;
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
`;

const RuleDesc = [
  {
    id: '1004',
    desc: 'Listed by',
    fixed: true,
  },
  {
    id: '1005',
    desc: 'Site popularity',
    fixed: true,
  },
  {
    id: '1006',
    desc: 'My Mark',
    fixed: false,
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
  {
    id: '1070',
    desc: 'Verified by Rabby',
    fixed: false,
  },
];

const SecurityLevelTipColor = {
  [Level.FORBIDDEN]: {
    bg: '#EFCFCF',
    text: '#AF160E',
    icon: SecurityEngineLevel[Level.FORBIDDEN].icon,
  },
  [Level.DANGER]: {
    bg: '#FCDCDC',
    text: '#EC5151',
    icon: SecurityEngineLevel[Level.DANGER].icon,
  },
  [Level.WARNING]: {
    bg: '#FFEFD2',
    text: '#FFB020',
    icon: SecurityEngineLevel[Level.WARNING].icon,
  },
};

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

  const [signPermission, setSignPermission] = useState<SIGN_PERMISSION_TYPES>();

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
    const list: {
      id: string;
      desc: string;
      result: Result | null;
    }[] = [];
    for (let i = 0; i < RuleDesc.length; i++) {
      const item = RuleDesc[i];
      const result = engineResults.find((result) => {
        return result.id === item.id;
      });
      if (result || item.fixed) {
        list.push({
          id: item.id,
          desc: item.desc,
          result: result || null,
        });
      }
    }
    engineResults.forEach((result) => {
      if (!list.find((item) => item.id === result.id)) {
        list.push({
          id: result.id,
          desc: '',
          result,
        });
      }
    });
    return list;
  }, [engineResults]);

  const resultsWithoutDisable = useMemo(() => {
    return engineResults.filter((item) => item.enable);
  }, [engineResults]);

  const connectBtnStatus = useMemo(() => {
    let disabled = false;
    let text = '';
    let forbiddenCount = 0;
    let safeCount = 0;
    let warningCount = 0;
    let dangerCount = 0;
    let needProcessCount = 0;
    let cancelBtnText = 'Cancel';
    let level: Level = Level.SAFE;
    resultsWithoutDisable.forEach((result) => {
      if (result.level === Level.SAFE) {
        safeCount++;
      } else if (result.level === Level.FORBIDDEN) {
        forbiddenCount++;
      } else if (
        result.level !== Level.ERROR &&
        result.enable &&
        !processedRules.includes(result.id)
      ) {
        needProcessCount++;
        if (result.level === Level.WARNING) {
          warningCount++;
        } else if (result.level === Level.DANGER) {
          dangerCount++;
        }
      }
    });

    if (forbiddenCount > 0) {
      disabled = true;
      text = 'Found forbidden risks. Connection is blocked.';
      cancelBtnText = 'Close';
      level = Level.FORBIDDEN;
    } else if (needProcessCount > 0) {
      if (safeCount > 0) {
        disabled = false;
        text = '';
        level = Level.SAFE;
      } else {
        disabled = true;
        text = 'Please process the alert before signing';
        if (dangerCount > 0) {
          level = Level.DANGER;
        } else {
          level = Level.WARNING;
        }
      }
    }

    return {
      disabled,
      text,
      cancelBtnText,
      level,
    };
  }, [resultsWithoutDisable, processedRules]);

  const hasForbidden = useMemo(() => {
    return resultsWithoutDisable.some((item) => item.level === Level.FORBIDDEN);
  }, [resultsWithoutDisable]);

  const hasSafe = useMemo(() => {
    return resultsWithoutDisable.some((item) => item.level === Level.SAFE);
  }, [resultsWithoutDisable]);

  const isInBlacklist = useMemo(() => {
    return userData.originBlacklist.includes(origin.toLowerCase());
  }, [origin, userData]);

  const isInWhitelist = useMemo(() => {
    return userData.originWhitelist.includes(origin.toLowerCase());
  }, [origin, userData]);

  const handleIgnoreRule = (id: string) => {
    setProcessedRules([...processedRules, id]);
    if (selectRule) {
      setSelectRule({
        ...selectRule,
        ignored: true,
      });
    }
    setRuleDrawerVisible(false);
  };

  const handleUndoIgnore = (id: string) => {
    setProcessedRules(processedRules.filter((item) => item !== id));
    if (selectRule) {
      setSelectRule({
        ...selectRule,
        ignored: false,
      });
    }
    setRuleDrawerVisible(false);
  };

  const handleRuleEnableStatusChange = async (id: string, value: boolean) => {
    if (processedRules.includes(id)) {
      setProcessedRules(processedRules.filter((i) => i !== id));
    }
    await wallet.ruleEnableStatusChange(id, value);
    setNonce(nonce + 1);
  };

  const handleUserListChange = async ({
    onWhitelist,
    onBlacklist,
  }: {
    onWhitelist: boolean;
    onBlacklist: boolean;
  }) => {
    if (onWhitelist === isInWhitelist && onBlacklist === isInBlacklist) return;
    if (onWhitelist) {
      await wallet.addOriginWhitelist(origin);
      message.success({
        duration: 3,
        icon: <i />,
        content: (
          <div>
            <div className="flex gap-4">
              <img src={IconSuccess} alt="" />
              <div className="text-white">Mark as "Trusted"</div>
            </div>
          </div>
        ),
      });
    } else if (onBlacklist) {
      await wallet.addOriginBlacklist(origin);
      message.success({
        duration: 3,
        icon: <i />,
        content: (
          <div>
            <div className="flex gap-4">
              <img src={IconSuccess} alt="" />
              <div className="text-white">Mark as "Blocked"</div>
            </div>
          </div>
        ),
      });
    } else {
      await wallet.removeOriginBlacklist(origin);
      await wallet.removeOriginWhitelist(origin);
      message.success({
        duration: 3,
        icon: <i />,
        content: (
          <div>
            <div className="flex gap-4">
              <img src={IconSuccess} alt="" />
              <div className="text-white">Mark removed</div>
            </div>
          </div>
        ),
      });
    }
    setListDrawerVisible(false);
    setNonce(nonce + 1); // update security engine
    handleExecuteSecurityEngine();
  };

  const handleEditUserDataList = () => {
    setListDrawerVisible(true);
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
    let level: 'very_low' | 'low' | 'medium' | 'high' = 'low';
    let collectList: { name: string; logo_url: string }[] = [];
    let defaultChain = CHAINS_ENUM.ETH;
    let isShowTestnet = false;
    const queue = new PQueue();
    const waitQueueFinished = (q: PQueue) => {
      return new Promise((resolve) => {
        q.on('empty', () => {
          if (q.pending <= 0) resolve(null);
        });
      });
    };
    queue.add(async () => {
      try {
        const result = await wallet.openapi.getOriginPopularityLevel(origin);
        level = result.level;
      } catch (e) {
        level = 'low';
      }
    });
    queue.add(async () => {
      try {
        const {
          collect_list,
        } = await wallet.openapi.getOriginThirdPartyCollectList(origin);
        collectList = collect_list;
      } catch (e) {
        collectList = [];
      }
    });
    queue.add(async () => {
      try {
        const recommendChains = await wallet.openapi.getRecommendChains(
          account!.address,
          origin
        );
        let targetChain: Chain | undefined;
        for (let i = 0; i < recommendChains.length; i++) {
          targetChain = Object.values(CHAINS).find(
            (c) => c.serverId === recommendChains[i].id
          );
          if (targetChain) break;
        }
        defaultChain = targetChain ? targetChain.enum : CHAINS_ENUM.ETH;
      } catch (e) {
        console.log(e);
      }
    });
    queue.add(async () => {
      try {
        isShowTestnet = await wallet.getIsShowTestnet();
      } catch (e) {
        console.log(e);
      }
    });
    await waitQueueFinished(queue);
    setOriginPopularLevel(level);
    setCollectList(collectList);
    setDefaultChain(defaultChain);

    const ctx: ContextActionData = {
      origin: {
        url: origin,
        communityCount: collectList.length,
        popularLevel: level,
      },
    };
    const results = await executeEngine(ctx);

    setEngineResults(results);
    if (site) {
      setIsLoading(false);
      if (!isShowTestnet && CHAINS[site.chain]?.isTestnet) {
        return;
      }
      setDefaultChain(site.chain);
      return;
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
      signPermission,
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
          </div>
        </div>

        <div className="rule-list">
          {RuleDesc.map((rule) => {
            if (rule.id === '1006') {
              return (
                <RuleResult
                  rule={{
                    id: '1006',
                    desc: 'My mark',
                    result: userListResult || null,
                  }}
                  onSelect={handleSelectRule}
                  collectList={collectList}
                  popularLevel={originPopularLevel}
                  userListResult={userListResult}
                  ignored={false}
                  hasSafe={hasSafe}
                  hasForbidden={hasForbidden}
                  onEditUserList={handleEditUserDataList}
                />
              );
            } else {
              if (sortRules.find((item) => item.id === rule.id) || rule.fixed) {
                return (
                  <RuleResult
                    rule={sortRules.find((item) => item.id === rule.id)!}
                    key={rule.id}
                    onSelect={handleSelectRule}
                    collectList={collectList}
                    popularLevel={originPopularLevel}
                    userListResult={userListResult}
                    ignored={processedRules.includes(rule.id)}
                    hasSafe={hasSafe}
                    hasForbidden={hasForbidden}
                    onEditUserList={handleEditUserDataList}
                  />
                );
              } else {
                return null;
              }
            }
          })}
        </div>
        <div>
          <SignTestnetPermission
            value={signPermission}
            onChange={(v) => setSignPermission(v)}
          />
          <Footer>
            <div className="action-buttons flex flex-col mt-4 items-center">
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
                <div
                  className={clsx('security-tip', connectBtnStatus.level)}
                  style={{
                    color: SecurityLevelTipColor[connectBtnStatus.level].bg,
                    backgroundColor:
                      SecurityLevelTipColor[connectBtnStatus.level].bg,
                  }}
                >
                  <img
                    src={SecurityLevelTipColor[connectBtnStatus.level].icon}
                    className="icon icon-level"
                  />
                  <span
                    style={{
                      color: SecurityLevelTipColor[connectBtnStatus.level].text,
                    }}
                  >
                    {connectBtnStatus.text}
                  </span>
                </div>
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
        </div>
        <RuleDrawer
          selectRule={selectRule}
          visible={ruleDrawerVisible}
          onIgnore={handleIgnoreRule}
          onUndo={handleUndoIgnore}
          onRuleEnableStatusChange={handleRuleEnableStatusChange}
          onClose={handleRuleDrawerClose}
        />
        <UserListDrawer
          origin={origin}
          logo={icon}
          onWhitelist={isInWhitelist}
          onBlacklist={isInBlacklist}
          visible={listDrawerVisible}
          onChange={handleUserListChange}
          onClose={() => setListDrawerVisible(false)}
        />
      </ConnectWrapper>
    </Spin>
  );
};

export default Connect;
