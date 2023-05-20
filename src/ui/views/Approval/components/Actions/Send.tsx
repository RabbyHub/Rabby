import React, { useMemo } from 'react';
import styled from 'styled-components';
import BigNumber from 'bignumber.js';
import { Chain } from 'background/service/openapi';
import { Result } from '@debank/rabby-security-engine';
import { ParsedActionData, SendRequireData } from './utils';
import { formatUsdValue } from 'ui/utils/number';
import { ellipsis } from 'ui/utils/address';
import { ellipsisTokenSymbol } from 'ui/utils/token';
import { getTimeSpan } from 'ui/utils/time';
import { isSameAddress, useAlias, useWallet } from '@/ui/utils';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { Table, Col, Row } from './components/Table';
import AddressMemo from './components/AddressMemo';
import userDataDrawer from './components/UserListDrawer';
import LogoWithText from './components/LogoWithText';
import IconEdit from 'ui/assets/editpen.svg';

const Wrapper = styled.div`
  .header {
    margin-top: 15px;
  }
  .icon-edit-alias {
    width: 13px;
    height: 13px;
    cursor: pointer;
  }
  .icon-scam-token {
    margin-left: 4px;
    width: 13px;
  }
  .icon-fake-token {
    margin-left: 4px;
    width: 13px;
  }
`;

const Send = ({
  data,
  requireData,
  chain,
  engineResults,
}: {
  data: ParsedActionData['send'];
  requireData: SendRequireData;
  chain: Chain;
  engineResults: Result[];
}) => {
  const actionData = data!;
  const dispatch = useRabbyDispatch();
  const wallet = useWallet();
  const {
    userData,
    rules,
    processedRules,
    transferWhitelist,
    transferWhiteEnable,
  } = useRabbySelector((s) => ({
    userData: s.securityEngine.userData,
    rules: s.securityEngine.rules,
    processedRules: s.securityEngine.currentTx.processedRules,
    transferWhitelist: s.whitelist.whitelist,
    transferWhiteEnable: s.whitelist.enabled,
  }));

  const receiverInWhitelist = useMemo(() => {
    return userData.addressWhitelist.includes(actionData.to.toLowerCase());
  }, [userData, actionData]);
  const receiverInBlacklist = useMemo(() => {
    return userData.addressBlacklist.includes(actionData.to.toLowerCase());
  }, [userData, actionData]);

  const receiverType = useMemo(() => {
    if (requireData.contract) {
      return 'Contract';
    }
    if (requireData.eoa) {
      return 'EOA';
    }
    if (requireData.cex) {
      return 'EOA';
    }
  }, [requireData]);

  const contractOnCurrentChain = useMemo(() => {
    if (!requireData.contract || !requireData.contract[chain.serverId])
      return null;
    return requireData.contract[chain.serverId];
  }, [requireData, chain]);

  const timeSpan = useMemo(() => {
    let bornAt = 0;
    if (requireData.contract) {
      if (contractOnCurrentChain) {
        bornAt = contractOnCurrentChain.create_at;
      } else {
        return '-';
      }
    }
    if (requireData.cex) bornAt = requireData.cex.bornAt;
    if (requireData.eoa) bornAt = requireData.eoa.bornAt;
    const { d, h, m } = getTimeSpan(Math.floor(Date.now() / 1000) - bornAt);
    if (d > 0) {
      return `${d} Day${d > 1 ? 's' : ''} ago`;
    }
    if (h > 0) {
      return `${h} Hour${h > 1 ? 's' : ''} ago`;
    }
    if (m > 1) {
      return `${m} Minutes ago`;
    }
    return '1 Minute ago';
  }, [requireData]);

  const handleEditReceiverMark = () => {
    userDataDrawer({
      address: actionData.to,
      onWhitelist: receiverInWhitelist,
      onBlacklist: receiverInBlacklist,
      async onChange({ onWhitelist, onBlacklist }) {
        if (onWhitelist && !receiverInWhitelist) {
          await wallet.addAddressWhitelist(actionData.to);
        }
        if (onBlacklist && !receiverInBlacklist) {
          await wallet.addAddressBlacklist(actionData.to);
        }
        if (
          !onBlacklist &&
          !onWhitelist &&
          (receiverInBlacklist || receiverInWhitelist)
        ) {
          await wallet.removeAddressBlacklist(actionData.to);
          await wallet.removeAddressWhitelist(actionData.to);
        }
        dispatch.securityEngine.init();
      },
    });
  };

  return (
    <Wrapper>
      <Table>
        <Col>
          <Row isTitle>Send Token</Row>
          <Row>
            <LogoWithText
              logo={actionData.token.logo_url}
              text={ellipsisTokenSymbol(actionData.token.symbol)}
            />
            <ul className="desc-list">
              <li>
                {formatUsdValue(
                  new BigNumber(actionData.token.price)
                    .times(actionData.token.amount)
                    .toFixed()
                )}{' '}
                @ {formatUsdValue(actionData.token.price)}
              </li>
            </ul>
          </Row>
        </Col>
      </Table>
      <div className="header">
        <div className="left">{ellipsis(actionData.to)}</div>
        <div className="right">send to</div>
      </div>
      <Table>
        {requireData.cex && (
          <Col>
            <Row isTitle>CEX</Row>
            <Row>
              <LogoWithText
                logo={requireData.cex.logo}
                text={requireData.cex.name}
              />
              {!requireData.cex.isDeposit ||
                (!requireData.cex.supportToken && (
                  <ul className="desc-list">
                    {!requireData.cex.isDeposit && <li>Non top up address</li>}
                    {!requireData.cex.supportToken && (
                      <li>
                        {ellipsisTokenSymbol(actionData.token.symbol)} not
                        supported
                      </li>
                    )}
                  </ul>
                ))}
            </Row>
          </Col>
        )}
        <Col>
          <Row isTitle>Type</Row>
          <Row>
            {receiverType}
            {contractOnCurrentChain && (
              <ul className="desc-list">
                {contractOnCurrentChain.multisig && <li>MultiSig: Safe</li>}
              </ul>
            )}
          </Row>
        </Col>
        <Col>
          <Row isTitle>
            {requireData.contract ? 'Deployed' : 'First on-chain'}
          </Row>
          <Row>{timeSpan}</Row>
        </Col>
        <Col>
          <Row isTitle>Balance</Row>
          <Row>{formatUsdValue(requireData.usd_value)}</Row>
        </Col>
        <Col>
          <Row isTitle>Transacted before</Row>
          <Row>{requireData.hasTransfer ? 'Yes' : 'No'}</Row>
        </Col>
        {transferWhiteEnable && (
          <Col>
            <Row isTitle>Whitelist</Row>
            <Row>
              {transferWhitelist.includes(actionData.to.toLowerCase())
                ? 'On my whitelist'
                : 'Not on my whitelist'}
            </Row>
          </Col>
        )}
        <Col>
          <Row isTitle>Address note</Row>
          <Row>
            <AddressMemo address={actionData.to} />
          </Row>
        </Col>
        <Col>
          <Row isTitle>My mark</Row>
          <Row>
            <div className="flex">
              <span className="mr-6">
                {receiverInWhitelist && 'Trusted'}
                {receiverInBlacklist && 'Blocked'}
                {!receiverInBlacklist && !receiverInWhitelist && 'No mark'}
              </span>
              <img
                src={IconEdit}
                className="icon-edit-alias icon"
                onClick={handleEditReceiverMark}
              />
            </div>
          </Row>
        </Col>
      </Table>
    </Wrapper>
  );
};

export default Send;
