import { message } from 'antd';
import React, { useState, useMemo, useEffect } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Result } from '@rabby-wallet/rabby-security-engine';
import {
  RuleConfig,
  UserData,
  Level,
} from '@rabby-wallet/rabby-security-engine/dist/rules';
import { useWallet } from 'ui/utils';
import UserListDrawer from './UserListDrawer';
import RuleDrawer from '../SecurityEngine/RuleDrawer';
import SecurityLevelTag from '../SecurityEngine/SecurityLevelTag';
import IconWhitelist from 'ui/assets/sign/security-engine/whitelist.svg';
import IconBlacklist from 'ui/assets/sign/security-engine/blacklist.svg';
import IconEditList from 'ui/assets/sign/connect/list-edit.svg';
import IconSuccess from 'ui/assets/success.svg';
import clsx from 'clsx';

const UserDataListWrapper = styled.div`
  display: flex;
  padding: 10px 8px;
  font-size: 13px;
  line-height: 15px;
  color: #4b4d59;
  box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.04);
  border-radius: 4px;
  align-items: center;
  background-color: #fff;
  cursor: pointer;
  .icon-list-status {
    width: 16px;
    height: 16px;
    margin-right: 6px;
  }
  .icon-edit-list {
    width: 16px;
    height: 16px;
    margin-left: 6px;
  }
`;

interface Props {
  origin: string;
  logo: string;
  userData: UserData;
  rules: RuleConfig[];
  processedRules: string[];
  hasSafe: boolean;
  hasForbidden: boolean;
  onChange(): void;
  onUpdateSecurityEngine(): void;
  onIgnore(id: string): void;
  onUndo(id: string): void;
  onRuleEnableStatusChange(id: string, value: boolean): void;
  ruleResult?: Result;
}

const UserDataList = ({
  origin,
  logo,
  userData,
  ruleResult,
  rules,
  processedRules,
  hasSafe,
  hasForbidden,
  onChange,
  onUpdateSecurityEngine,
  onIgnore,
  onUndo,
  onRuleEnableStatusChange,
}: Props) => {
  const wallet = useWallet();
  const { t } = useTranslation();
  const isInBlacklist = useMemo(() => {
    return userData.originBlacklist.includes(origin.toLowerCase());
  }, [origin, userData]);

  const isInWhitelist = useMemo(() => {
    return userData.originWhitelist.includes(origin.toLowerCase());
  }, [origin, userData]);

  const ignored = useMemo(() => {
    if (!ruleResult) return false;
    return processedRules.includes(ruleResult.id);
  }, [processedRules, ruleResult]);

  const translucent = useMemo(() => {
    if (!ruleResult) return false;
    if (ruleResult.level === Level.FORBIDDEN) {
      return false;
    } else if (ruleResult.level === Level.SAFE) {
      return hasForbidden;
    } else if (
      ruleResult.level === Level.ERROR ||
      !ruleResult.enable ||
      ignored
    ) {
      return !hasForbidden;
    } else {
      if (hasForbidden) {
        return false;
      } else {
        return hasSafe;
      }
    }
  }, [hasSafe, hasForbidden, ruleResult, ignored]);

  const [listDrawerVisible, setListDrawerVisible] = useState(false);
  const [ruleDrawerVisible, setRuleDrawerVisible] = useState(false);
  const [changed, setChanged] = useState(false);
  const [selectRule, setSelectRule] = useState<{
    ruleConfig: RuleConfig;
    value: number | string | boolean;
    level: Result['level'];
    ignored: boolean;
  } | null>(null);

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
                {t('page.connect.addedToWhitelist')}
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
                {t('page.connect.addedToBlacklist')}
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
                {t('page.connect.removedFromAll')}
              </div>
            </div>
          </div>
        ),
      });
    }
    setListDrawerVisible(false);
    onChange();
    onUpdateSecurityEngine();
  };

  const handleClickRuleResult = () => {
    if (!ruleResult) return;
    const { id } = ruleResult;
    const config = rules.find((rule) => rule.id === id);
    if (!config) return;
    setSelectRule({
      ruleConfig: config,
      value: ruleResult.value,
      level: ruleResult.level,
      ignored,
    });
    setRuleDrawerVisible(true);
  };

  const handleDrawerClose = () => {
    setListDrawerVisible(false);
  };

  const handleRuleDrawerClose = () => {
    setRuleDrawerVisible(false);
  };

  const handleIgnoreRule = (id: string) => {
    onIgnore(id);
    setRuleDrawerVisible(false);
  };

  const handleUndoIgnore = (id: string) => {
    onUndo(id);
    setRuleDrawerVisible(false);
  };

  const handleRuleEnableStatusChange = async (id: string, value: boolean) => {
    onRuleEnableStatusChange(id, value);
    setChanged(true);
    onUpdateSecurityEngine();
  };

  const reset = () => {
    setChanged(false);
    setSelectRule(null);
  };

  useEffect(() => {
    if (!listDrawerVisible) {
      reset();
    }
  }, [listDrawerVisible]);

  useEffect(() => {
    if (!ruleDrawerVisible) {
      reset();
    }
  }, [ruleDrawerVisible]);

  return (
    <div className="flex">
      <UserDataListWrapper
        className={clsx({
          'pl-12': !isInBlacklist && !isInWhitelist,
        })}
        onClick={() => setListDrawerVisible(true)}
      >
        {!isInBlacklist && !isInWhitelist && t('page.connect.notOnAnyList')}
        {isInBlacklist && (
          <>
            <img className="icon-list-status" src={IconBlacklist} />
            {t('page.connect.onYourBlacklist')}
          </>
        )}
        {isInWhitelist && (
          <>
            <img className="icon-list-status" src={IconWhitelist} />
            {t('page.connect.onYourWhitelist')}
          </>
        )}
        <img src={IconEditList} className="icon-edit-list" />
      </UserDataListWrapper>
      {ruleResult && (isInBlacklist || isInWhitelist) && (
        <SecurityLevelTag
          level={ignored ? 'proceed' : ruleResult.level}
          onClick={handleClickRuleResult}
          translucent={translucent}
        />
      )}
      <UserListDrawer
        origin={origin}
        logo={logo}
        onWhitelist={isInWhitelist}
        onBlacklist={isInBlacklist}
        visible={listDrawerVisible}
        onChange={handleUserListChange}
        onClose={handleDrawerClose}
      />
      <RuleDrawer
        selectRule={selectRule}
        visible={ruleDrawerVisible}
        onIgnore={handleIgnoreRule}
        onUndo={handleUndoIgnore}
        onRuleEnableStatusChange={handleRuleEnableStatusChange}
        onClose={handleRuleDrawerClose}
      />
    </div>
  );
};

export default UserDataList;
