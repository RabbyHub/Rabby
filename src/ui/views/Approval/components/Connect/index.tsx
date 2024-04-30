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
import IconSuccess from 'ui/assets/success.svg';
import { ChainSelector, FallbackSiteLogo, Spin } from 'ui/component';
import { useApproval, useCommonPopupView, useWallet } from 'ui/utils';
import { useSecurityEngine } from 'ui/utils/securityEngine';
import RuleDrawer from '../SecurityEngine/RuleDrawer';
import RuleResult from './RuleResult';
import UserListDrawer from './UserListDrawer';

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
      color: var(--r-neutral-title-1, #192945);
    }
    .chain-selector {
      height: 32px;
      border-radius: 8px;
      background: var(--r-neutral-bg-1, #fff);
      color: var(--r-neutral-title-1, #192945);
      font-size: 13px;
      border: 0.5px solid var(--r-neutral-line, rgba(255, 255, 255, 0.1));
      border: 1px solid var(--r-neutral-line, rgba(255, 255, 255, 0.1));
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
        background: var(--r-blue-light-1, #eef1ff);
      }
    }
    .connect-card {
      background: var(--r-neutral-card-2, rgba(255, 255, 255, 0.06));
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
        color: var(--r-neutral-title-1, #192945);
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
  border-top: 1px solid var(--r-neutral-card-2, rgba(255, 255, 255, 0.06));
  width: 100%;
  background: var(--r-neutral-card-1, #fff);
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
`;

const RuleDesc = [
  {
    id: '1004',
    desc: i18n.t('page.connect.listedBy'),
    fixed: true,
  },
  {
    id: '1005',
    desc: i18n.t('page.connect.sitePopularity'),
    fixed: true,
  },
  {
    id: '1006',
    desc: i18n.t('page.connect.myMark'),
    fixed: false,
  },
  {
    id: '1001',
    desc: i18n.t('page.connect.flagByRabby'),
    fixed: false,
  },
  {
    id: '1002',
    desc: i18n.t('page.connect.flagByMM'),
    fixed: false,
  },
  {
    id: '1003',
    desc: i18n.t('page.connect.flagByScamSniffer'),
    fixed: false,
  },
  {
    id: '1070',
    desc: i18n.t('page.connect.verifiedByRabby'),
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
    let cancelBtnText = t('global.Cancel');
    let level: Level = Level.SAFE;
    resultsWithoutDisable.forEach((result) => {
      if (result.level === Level.SAFE) {
        safeCount++;
      } else if (
        result.level === Level.FORBIDDEN &&
        !processedRules.includes(result.id)
      ) {
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
      text = t('page.connect.foundForbiddenRisk');
      cancelBtnText = t('global.closeButton');
      level = Level.FORBIDDEN;
    } else if (needProcessCount > 0) {
      if (safeCount > 0) {
        disabled = false;
        text = '';
        level = Level.SAFE;
      } else {
        disabled = true;
        text = t('page.signFooterBar.processRiskAlert');
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
              <div className="text-white">
                {t('page.connect.markAsTrustToast')}
              </div>
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
              <div className="text-white">
                {t('page.connect.markAsBlockToast')}
              </div>
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
              <div className="text-white">
                {t('page.connect.markRemovedToast')}
              </div>
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
        let targetChain: Chain | null | undefined;
        for (let i = 0; i < recommendChains.length; i++) {
          targetChain = findChain({
            serverId: recommendChains[i].id,
          });
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
      if (!isShowTestnet && findChain({ enum: site.chain })?.isTestnet) {
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

  const onIgnoreAllRules = () => {
    setProcessedRules(engineResults.map((item) => item.id));
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

  const activeCancelPopup = () => {
    setData({
      onCancel: handleCancel,
      displayBlockedRequestApproval,
    });
    activePopup('CancelConnect');
  };

  return (
    <Spin spinning={isLoading}>
      <ConnectWrapper>
        <div className="approval-connect">
          <div className="flex justify-between items-center mb-20">
            <div className="approval-title">{t('page.connect.title')}</div>
            <ChainSelector
              title={
                <div>
                  <div className="chain-selector-tips">
                    {t('page.connect.selectChainToConnect')}
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
                    desc: t('page.connect.markRuleText'),
                    result: userListResult || null,
                  }}
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
                {t('page.connect.connectBtn')}
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
                    className="flex-1"
                    style={{
                      color: SecurityLevelTipColor[connectBtnStatus.level].text,
                    }}
                  >
                    {connectBtnStatus.text}
                  </span>
                  <span
                    className="underline text-13 font-medium cursor-pointer"
                    style={{
                      color: SecurityLevelTipColor[connectBtnStatus.level].text,
                    }}
                    onClick={onIgnoreAllRules}
                  >
                    {t('page.connect.ignoreAll')}
                  </span>
                </div>
              )}
              <Button
                type="primary"
                ghost
                className={clsx(
                  'rabby-btn-ghost',
                  'flex items-center justify-center gap-2'
                )}
                size="large"
                onClick={
                  displayBlockedRequestApproval
                    ? activeCancelPopup
                    : handleCancel
                }
              >
                {connectBtnStatus.cancelBtnText}
                {displayBlockedRequestApproval && (
                  <ArrowDownSVG className="w-16" />
                )}
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
