import React, { useMemo } from 'react';
import styled from 'styled-components';
import { Result } from '@debank/rabby-security-engine';
import { UserData } from '@debank/rabby-security-engine/dist/rules';
import SecurityLevel from '../SecurityEngine/SecurityLevel';
import IconWhitelist from 'ui/assets/sign/security-engine/whitelist.svg';
import IconBlacklist from 'ui/assets/sign/security-engine/blacklist.svg';
import IconNotlist from 'ui/assets/sign/security-engine/no-list.svg';
import IconEditList from 'ui/assets/sign/connect/list-edit.svg';

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

interface Props {
  origin: string;
  logo: string;
  userData: UserData;
  ruleResult?: Result;
}

const UserDataList = ({ origin, logo, userData, ruleResult }: Props) => {
  const isInBlacklist = useMemo(() => {
    return userData.originBlacklist.includes(origin.toLowerCase());
  }, [origin, userData]);

  const isInWhitelist = useMemo(() => {
    return userData.originWhitelist.includes(origin.toLowerCase());
  }, [origin, userData]);

  return (
    <div>
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
        <img src={IconEditList} className="icon-edit-list" />
        {ruleResult && <SecurityLevel level={ruleResult.level} />}
      </UserDataListWrapper>
    </div>
  );
};

export default UserDataList;
