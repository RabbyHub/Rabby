import React from 'react';
import { CHAINS_ENUM } from 'consts';
import { BalanceChange as IBalanceChange } from 'background/service/openapi';
import { formatAmount } from 'ui/utils/number';
import useBalanceChange from '@/ui/hooks/useBalanceChange';
import { Table, Col, Row } from '../Actions/components/Table';
import LogoWithText from '../Actions/components/LogoWithText';
import * as Values from '../Actions/components/Values';

const NFTBalanceChange = ({
  data,
  type,
}: {
  data: IBalanceChange;
  type: 'receive' | 'send';
}) => {
  const {
    hasReceives,
    receiveNftList,
    hasTransferedOut,
    sendNftList,
  } = React.useMemo(() => {
    const sendNftList = data.send_nft_list.slice(0);
    const countSendNft = sendNftList.reduce(
      (accu, item) => accu + (item.amount || 0),
      0
    );
    const hasTransferedOut = sendNftList.length > 0;

    const receiveNftList = data.receive_nft_list.slice(0);
    const countReceives = receiveNftList.reduce(
      (accu, item) => accu + (item.amount || 0),
      0
    );
    const hasReceives = receiveNftList.length > 0;

    return {
      hasReceives,
      countReceives,
      receiveNftList,
      hasTransferedOut,
      countSendNft,
      sendNftList,
    };
  }, [data]);

  if (type === 'receive' && hasReceives) {
    return (
      <Col>
        <Row isTitle>NFT in</Row>
        <Row>
          {receiveNftList.map((item) => (
            <div className="mb-0 last:mb-0">
              <div className="flex">
                <span className="flex-1 overflow-hidden whitespace-nowrap overflow-ellipsis">
                  + {item.amount} {item.name}
                </span>
                <Values.TokenLabel
                  isFake={item.collection?.is_verified === false}
                  isScam={
                    !item.collection?.is_verified === false &&
                    !!item.collection?.is_suspicious
                  }
                />
              </div>
              <ul className="desc-list">
                <li>
                  Floor price{' '}
                  {item.collection?.floor_price
                    ? `${formatAmount(item.collection.floor_price)} ETH`
                    : '-'}
                </li>
              </ul>
            </div>
          ))}
        </Row>
      </Col>
    );
  }
  if (type === 'send' && hasTransferedOut) {
    return (
      <Col>
        <Row isTitle>NFT out</Row>
        <Row>
          {sendNftList.map((item) => (
            <div className="mb-10 last:mb-0">
              <div className="flex">
                <span className="flex-1 overflow-hidden whitespace-nowrap overflow-ellipsis">
                  - {item.amount} {item.name}
                </span>
                <Values.TokenLabel
                  isFake={item.collection?.is_verified === false}
                  isScam={
                    !item.collection?.is_verified === false &&
                    !!item.collection?.is_suspicious
                  }
                />
              </div>
              <ul className="desc-list">
                <li>
                  Floor price{' '}
                  {item.collection?.floor_price
                    ? `${formatAmount(item.collection?.floor_price)} ETH`
                    : '-'}
                </li>
              </ul>
            </div>
          ))}
        </Row>
      </Col>
    );
  }
  return null;
};

const BalanceChange = ({
  data,
  version,
}: {
  data: IBalanceChange;
  isSupport?: boolean;
  isGnosis?: boolean;
  chainEnum?: CHAINS_ENUM;
  version: 'v0' | 'v1' | 'v2';
}) => {
  const isSuccess = data.success;

  const { hasTokenChange, hasNFTChange } = useBalanceChange({
    balance_change: data,
  });

  const hasChange = hasNFTChange || hasTokenChange;

  const { receiveTokenList, sendTokenList } = React.useMemo(() => {
    const receiveTokenList = data.receive_token_list;
    const sendTokenList = data.send_token_list;

    return {
      receiveTokenList,
      sendTokenList,
    };
  }, [data]);

  if (version === 'v0') {
    return (
      <div className="token-balance-change">
        <div className="token-balance-change-content">
          <div className="token-balance-change-content-header">
            Unsupported Transaction Simulation
          </div>
        </div>
      </div>
    );
  }

  if (version === 'v1' && data.error) {
    return (
      <div className="token-balance-change">
        <div className="token-balance-change-content">
          <div className="token-balance-change-content-header">
            Transaction Simulation {isSuccess ? 'Results' : 'Failed'}
          </div>
          <Table>
            <Col>
              <Row>
                <span className="text-14 text-gray-common font-normal">
                  Fail to fetch balance change
                </span>
              </Row>
            </Col>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <div className="token-balance-change">
      <div className="token-balance-change-content">
        <Table>
          <Col>
            <Row>
              <span className="text-14 text-gray-common font-normal">
                Transaction Simulation {isSuccess ? 'Results' : 'Failed'}
              </span>
            </Row>
          </Col>
          {!hasChange && isSuccess && (
            <Col>
              <Row>
                <span className="text-14 text-gray-common font-normal">
                  No balance change
                </span>
              </Row>
            </Col>
          )}
          {data.error && (
            <Col>
              <Row>
                <span className="text-14 text-gray-common font-normal">
                  {data.error.msg} #{data.error.code}
                </span>
              </Row>
            </Col>
          )}
          {sendTokenList && sendTokenList.length > 0 && (
            <Col>
              <Row isTitle>Token out</Row>
              <Row>
                {sendTokenList.map((token) => (
                  <div className="mb-8 last:mb-0">
                    <LogoWithText
                      logo={token.logo_url}
                      text={`- ${formatAmount(token.amount)} ${token.symbol}`}
                      key={token.id}
                      icon={
                        <Values.TokenLabel
                          isFake={token.is_verified === false}
                          isScam={
                            !token.is_verified === false &&
                            !!token.is_suspicious
                          }
                        />
                      }
                    />
                  </div>
                ))}
              </Row>
            </Col>
          )}
          {receiveTokenList && receiveTokenList.length > 0 && (
            <Col>
              <Row isTitle>Token in</Row>
              <Row>
                {receiveTokenList.map((token) => (
                  <div className="mb-8 last:mb-0">
                    <LogoWithText
                      logo={token.logo_url}
                      text={`+ ${formatAmount(token.amount)} ${token.symbol}`}
                      key={token.id}
                      icon={
                        <Values.TokenLabel
                          isFake={token.is_verified === false}
                          isScam={
                            !token.is_verified === false &&
                            !!token.is_suspicious
                          }
                        />
                      }
                    />
                  </div>
                ))}
              </Row>
            </Col>
          )}
          <NFTBalanceChange type="send" data={data}></NFTBalanceChange>
          <NFTBalanceChange type="receive" data={data}></NFTBalanceChange>
        </Table>
      </div>
    </div>
  );
};

export default BalanceChange;
