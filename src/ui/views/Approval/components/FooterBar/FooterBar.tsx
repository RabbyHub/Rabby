import React, { useMemo } from 'react';
import { INTERNAL_REQUEST_ORIGIN } from 'consts';
import { AccountInfo } from './AccountInfo';
import { useWallet } from '@/ui/utils';
import { Account } from '@/background/service/preference';
import { ActionGroup, Props as ActionGroupProps } from './ActionGroup';
import clsx from 'clsx';
import styled from 'styled-components';
import { Chain } from '@debank/common';
import { SecurityEngineLevel } from 'consts';
import { Level } from '@debank/rabby-security-engine/dist/rules';

interface Props extends Omit<ActionGroupProps, 'account'> {
  chain?: Chain;
  gnosisAccount?: Account;
  securityLevel?: Level;
  origin?: string;
  hasUnProcessSecurityResult?: boolean;
}

const Wrapper = styled.section`
  padding: 20px;
  box-shadow: 0px -8px 24px rgba(0, 0, 0, 0.1);
  border-radius: 16px 16px 0px 0px;
  .request-origin {
    font-weight: 500;
    font-size: 13px;
    line-height: 15px;
    color: #666;
    padding: 0 20px 15px 0;
    position: relative;
    margin-bottom: 18px;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
    .origin {
      color: #333;
    }
    &::after {
      content: '';
      position: absolute;
      left: 0;
      bottom: 0;
      width: 100vw;
      margin-left: -20px;
      height: 1px;
      background-color: rgba(0, 0, 0, 0.05);
    }
  }
  .security-level-tip {
    margin-top: 10px;
    border-radius: 4px;
    padding: 6px 13px 6px 8px;
    font-weight: 500;
    font-size: 13px;
    line-height: 15px;
    display: inline-flex;
    .icon-level {
      width: 14px;
      height: 14px;
      margin-right: 6px;
    }
  }
`;

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

export const FooterBar: React.FC<Props> = ({
  origin,
  gnosisAccount,
  securityLevel,
  hasUnProcessSecurityResult,
  ...props
}) => {
  const [account, setAccount] = React.useState<Account>();
  const wallet = useWallet();

  const displayOirigin = useMemo(() => {
    if (origin === INTERNAL_REQUEST_ORIGIN) {
      return 'Rabby Wallet';
    }
    return origin;
  }, [origin]);

  const init = async () => {
    const currentAccount =
      gnosisAccount || (await wallet.syncGetCurrentAccount());
    if (currentAccount) setAccount(currentAccount);
  };

  React.useEffect(() => {
    init();
  }, []);

  if (!account) {
    return null;
  }

  return (
    <Wrapper className={clsx('bg-white')}>
      {origin && (
        <div className="request-origin">
          Request from <span className="origin">{displayOirigin}</span>
        </div>
      )}
      <AccountInfo chain={props.chain} account={account} />
      <ActionGroup account={account} {...props} />
      {securityLevel && hasUnProcessSecurityResult && (
        <div
          className="security-level-tip"
          style={{
            color: SecurityLevelTipColor[securityLevel].text,
            backgroundColor: SecurityLevelTipColor[securityLevel].bg,
          }}
        >
          <img
            src={SecurityLevelTipColor[securityLevel].icon}
            className="icon icon-level"
          />
          {securityLevel === Level.FORBIDDEN
            ? 'Found forbidden risks. Unable to sign'
            : 'Please process the alert before signing'}
        </div>
      )}
    </Wrapper>
  );
};
