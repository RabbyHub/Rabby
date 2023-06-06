import React, { useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { Chain } from 'background/service/openapi';
import { Result } from '@debank/rabby-security-engine';
import { ApproveNFTRequireData, ParsedActionData } from './utils';
import { formatAmount } from 'ui/utils/number';
import { useRabbyDispatch } from '@/ui/store';
import { Table, Col, Row } from './components/Table';
import { NameAndAddress } from '@/ui/component';
import * as Values from './components/Values';
import { ProtocolListItem } from './components/ProtocolListItem';
import { SecurityListItem } from './components/SecurityListItem';
import ViewMore from './components/ViewMore';

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
  li .name-and-address {
    justify-content: flex-start;
    .address {
      font-weight: 400;
      font-size: 12px;
      line-height: 14px;
      color: #999999;
    }
    img {
      width: 12px !important;
      height: 12px !important;
      margin-left: 4px !important;
    }
  }
`;

const ApproveNFTCollection = ({
  data,
  requireData,
  chain,
  engineResults,
}: {
  data: ParsedActionData['approveNFTCollection'];
  requireData: ApproveNFTRequireData;
  chain: Chain;
  engineResults: Result[];
}) => {
  const actionData = data!;
  const dispatch = useRabbyDispatch();

  const engineResultMap = useMemo(() => {
    const map: Record<string, Result> = {};
    engineResults.forEach((item) => {
      map[item.id] = item;
    });
    return map;
  }, [engineResults]);

  useEffect(() => {
    dispatch.securityEngine.init();
  }, []);

  return (
    <Wrapper>
      <Table>
        <Col>
          <Row isTitle>Approve collection</Row>
          <Row>
            {actionData?.collection?.name || '-'}
            <ul className="desc-list">
              <li>
                <div className="whitespace-nowrap overflow-hidden overflow-ellipsis">
                  {actionData?.collection?.name}
                </div>
              </li>
              <li>
                Floor price{' '}
                {actionData?.collection?.floor_price ? (
                  <>
                    {formatAmount(actionData?.collection?.floor_price)}
                    ETH
                  </>
                ) : (
                  '-'
                )}
              </li>
              <li>
                <NameAndAddress
                  address={actionData?.collection?.id}
                  chainEnum={chain?.enum}
                  openExternal
                />
              </li>
            </ul>
          </Row>
        </Col>

        <Col>
          <Row isTitle>Interact contract</Row>
          <Row>
            <div>
              <Values.Address address={actionData.spender} chain={chain} />
            </div>
            <ul className="desc-list">
              <ProtocolListItem protocol={requireData.protocol} />

              <SecurityListItem
                id="1053"
                engineResult={engineResultMap['1053']}
                dangerText="EOA address"
              />

              <SecurityListItem
                id="1056"
                engineResult={engineResultMap['1056']}
                warningText="Never Interacted before"
                defaultText="Interacted before"
              />

              <SecurityListItem
                id="1054"
                engineResult={engineResultMap['1054']}
                dangerText="Risk exposure <= $10,000"
                warningText="Risk exposure <= $100,000"
              />

              <SecurityListItem
                id="1055"
                engineResult={engineResultMap['1055']}
                warningText="Deployed time < 3 days"
              />

              <SecurityListItem
                id="1060"
                engineResult={engineResultMap['1060']}
                dangerText="Flagged by Rabby"
              />

              <li>
                <ViewMore
                  type="nftSpender"
                  data={{
                    ...requireData,
                    spender: actionData.spender,
                    chain,
                  }}
                />
              </li>
            </ul>
          </Row>
        </Col>
      </Table>
    </Wrapper>
  );
};

export default ApproveNFTCollection;
