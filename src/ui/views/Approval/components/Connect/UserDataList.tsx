import React, { useState, useMemo } from 'react';
import styled from 'styled-components';
import { Result } from '@debank/rabby-security-engine';
import { RuleConfig, UserData } from '@debank/rabby-security-engine/dist/rules';
import { useWallet } from 'ui/utils';
import UserListDrawer from './UserListDrawer';
import RuleDrawer from '../SecurityEngine/RuleDrawer';
import SecurityLevel from '../SecurityEngine/SecurityLevel';
import IconWhitelist from 'ui/assets/sign/security-engine/whitelist.svg';
import IconBlacklist from 'ui/assets/sign/security-engine/blacklist.svg';
import IconNotlist from 'ui/assets/sign/security-engine/no-list.svg';
import IconEditList from 'ui/assets/sign/connect/list-edit.svg';
import { ReactComponent as SvgIconArrowRight } from 'ui/assets/sign/arrow-right.svg';

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
  margin-right: 8px;
  .icon-list-status {
    width: 16px;
    height: 16px;
    margin-right: 6px;
  }
  .icon-edit-list {
    width: 16px;
    height: 16px;
    margin-left: 6px;
    cursor: pointer;
  }
`;

const SecurityLevelWrapper = styled.div`
  display: flex;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  align-items: center;
  .icon-arrow-right {
    path {
      stroke: currentColor;
    }
  }
  &.safe {
    color: #27c193;
    background: linear-gradient(
        0deg,
        rgba(39, 193, 147, 0.1),
        rgba(39, 193, 147, 0.1)
      ),
      #ffffff;
    border: 0.522914px solid rgba(39, 193, 147, 0.2);
  }
  &.forbidden {
    color: #af160e;
    background: linear-gradient(
        0deg,
        rgba(175, 22, 14, 0.1),
        rgba(175, 22, 14, 0.1)
      ),
      #ffffff;
    border: 0.522914px solid rgba(175, 22, 14, 0.2);
  }
  &.danger {
    color: #ec5151;
    background: linear-gradient(
        0deg,
        rgba(236, 81, 81, 0.1),
        rgba(236, 81, 81, 0.1)
      ),
      #ffffff;
    border: 0.522914px solid rgba(255, 176, 32, 0.2);
  }
  &.warning {
    color: #ffb020;
    background: linear-gradient(
        0deg,
        rgba(255, 176, 32, 0.1),
        rgba(255, 176, 32, 0.1)
      ),
      #ffffff;
    border: 0.522914px solid rgba(255, 176, 32, 0.2);
  }
`;

interface Props {
  origin: string;
  logo: string;
  userData: UserData;
  rules: RuleConfig[];
  onChange(): void;
  onUpdateSecurityEngine(): void;
  ruleResult?: Result;
}

const UserDataList = ({
  origin,
  logo,
  userData,
  ruleResult,
  rules,
  onChange,
  onUpdateSecurityEngine,
}: Props) => {
  const wallet = useWallet();

  const isInBlacklist = useMemo(() => {
    return userData.originBlacklist.includes(origin.toLowerCase());
  }, [origin, userData]);

  const isInWhitelist = useMemo(() => {
    return userData.originWhitelist.includes(origin.toLowerCase());
  }, [origin, userData]);

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
    } else if (onBlacklist) {
      await wallet.addOriginBlacklist(origin);
    } else {
      await wallet.removeOriginBlacklist(origin);
      await wallet.removeOriginWhitelist(origin);
    }
    setChanged(true);
    onChange();
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
      ignored: false,
    });
    setRuleDrawerVisible(true);
  };

  const handleDrawerClose = () => {
    setListDrawerVisible(false);
    if (changed) {
      onUpdateSecurityEngine();
    }
  };

  const handleIgnoreRule = () => {
    // TODO
  };

  const handleRuleEnableStatusChange = () => {
    // TODO
  };

  return (
    <div className="flex">
      <UserDataListWrapper>
        {!isInBlacklist && !isInWhitelist && (
          <>
            <img className="icon-list-status" src={IconNotlist} />
            Not in any list
          </>
        )}
        {isInBlacklist && (
          <>
            <img className="icon-list-status" src={IconBlacklist} />
            In your blacklist
          </>
        )}
        {isInWhitelist && (
          <>
            <img className="icon-list-status" src={IconWhitelist} />
            In your whitelist
          </>
        )}
        <img
          src={IconEditList}
          className="icon-edit-list"
          onClick={() => setListDrawerVisible(true)}
        />
      </UserDataListWrapper>
      {ruleResult && (
        <SecurityLevelWrapper
          className={ruleResult.level}
          onClick={handleClickRuleResult}
        >
          <SecurityLevel level={ruleResult.level} />
          <SvgIconArrowRight className="icon-arrow-right" />
        </SecurityLevelWrapper>
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
        onRuleEnableStatusChange={handleRuleEnableStatusChange}
        onClose={() => setRuleDrawerVisible(false)}
      />
    </div>
  );
};

export default UserDataList;
