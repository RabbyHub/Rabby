import React from 'react';
import { CHAINS_ENUM } from 'consts';
import { BalanceChange as IBalanceChange } from 'background/service/openapi';
import { formatAmount } from 'ui/utils/number';
import useBalanceChange from '@/ui/hooks/useBalanceChange';
import { Table, Col, Row } from '../Actions/components/Table';
import LogoWithText from '../Actions/components/LogoWithText';
import * as Values from '../Actions/components/Values';
import IconAlert from 'ui/assets/sign/tx/alert.svg';
import BigNumber from 'bignumber.js';
import { formatUsdValue } from 'ui/utils/number';
import { getTokenSymbol } from '@/ui/utils/token';

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
        <div className="flex-1 overflow-hidden">
          {receiveNftList.map((item) => (
            <Row
              className="has-bottom-border"
              key={`${item.id}-${item.inner_id}`}
            >
              <div className="flex">
                <span
                  className="flex-1 overflow-hidden whitespace-nowrap overflow-ellipsis"
                  title={item.collection ? item.collection.name : item.name}
                >
                  <span className="text-green">+ {item.amount}</span>{' '}
                  {item.collection ? item.collection.name : item.name}
                </span>
                <Values.TokenLabel
                  isFake={item.collection?.is_verified === false}
                  isScam={
                    item.collection?.is_verified !== false &&
                    !!item.collection?.is_suspicious
                  }
                />
              </div>
            </Row>
          ))}
        </div>
      </Col>
    );
  }
  if (type === 'send' && hasTransferedOut) {
    return (
      <Col>
        <Row isTitle>NFT out</Row>
        <div className="flex-1 overflow-hidden">
          {sendNftList.map((item) => (
            <Row
              className="has-bottom-border"
              key={`${item.id}-${item.inner_id}`}
            >
              <div className="flex">
                <span
                  className="flex-1 overflow-hidden whitespace-nowrap overflow-ellipsis"
                  title={item.collection ? item.collection.name : item.name}
                >
                  <span className="text-red-forbidden">- {item.amount}</span>{' '}
                  {item.collection ? item.collection.name : item.name}
                </span>
                <Values.TokenLabel
                  isFake={item.collection?.is_verified === false}
                  isScam={
                    item.collection?.is_verified !== false &&
                    !!item.collection?.is_suspicious
                  }
                />
              </div>
            </Row>
          ))}
        </div>
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
          <Table>
            <Col>
              <Row>
                <span className="text-14 text-gray-subTitle font-normal">
                  Transaction Simulation Not Supported
                </span>
              </Row>
            </Col>
          </Table>
        </div>
      </div>
    );
  }

  if (version === 'v1' && data.error) {
    return (
      <div className="token-balance-change">
        <div className="token-balance-change-content">
          <Table>
            <Col>
              <Row>
                <span className="text-15 text-gray-title font-medium">
                  Transaction Simulation {isSuccess ? 'Results' : 'Failed'}
                </span>
              </Row>
            </Col>
            <Col>
              <Row>
                <span className="text-15 text-gray-title font-medium">
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
      <p className="text-16 text-gray-title font-medium mb-12">
        Transaction Simulation {isSuccess ? 'Results' : 'Failed'}
      </p>
      <div className="token-balance-change-content">
        <Table>
          {!hasChange && isSuccess && (
            <Col>
              <Row>
                <span className="text-15 font-medium text-gray-title">
                  No balance change
                </span>
              </Row>
            </Col>
          )}
          {data.error && (
            <Col>
              <Row className="text-14 font-medium flex">
                <img src={IconAlert} className="w-[15px] mr-6" />
                {data.error.msg} #{data.error.code}
              </Row>
            </Col>
          )}
          {sendTokenList && sendTokenList.length > 0 && (
            <Col>
              <Row isTitle>Token out</Row>
              <div className="flex-1 overflow-hidden">
                {sendTokenList.map((token) => (
                  <Row className="has-bottom-border" key={token.id}>
                    <LogoWithText
                      logo={token.logo_url}
                      text={
                        <>
                          <span className="text-red-forbidden">
                            - {formatAmount(token.amount)}
                          </span>{' '}
                          {getTokenSymbol(token)}
                        </>
                      }
                      key={token.id}
                      logoRadius="100%"
                      icon={
                        <Values.TokenLabel
                          isFake={token.is_verified === false}
                          isScam={
                            token.is_verified !== false && !!token.is_suspicious
                          }
                        />
                      }
                    />
                    <ul className="desc-list">
                      <li>
                        ≈{' '}
                        {formatUsdValue(
                          new BigNumber(token.amount)
                            .times(token.price)
                            .toFixed()
                        )}
                      </li>
                    </ul>
                  </Row>
                ))}
              </div>
            </Col>
          )}
          {receiveTokenList && receiveTokenList.length > 0 && (
            <Col>
              <Row isTitle>Token in</Row>
              <div className="flex-1 overflow-hidden">
                {receiveTokenList.map((token) => (
                  <Row className="has-bottom-border" key={token.id}>
                    <LogoWithText
                      logo={token.logo_url}
                      text={
                        <>
                          <span className="text-green">
                            + {formatAmount(token.amount)}
                          </span>{' '}
                          {getTokenSymbol(token)}
                        </>
                      }
                      key={token.id}
                      logoRadius="100%"
                      icon={
                        <Values.TokenLabel
                          isFake={token.is_verified === false}
                          isScam={
                            token.is_verified !== false && !!token.is_suspicious
                          }
                        />
                      }
                    />
                    <ul className="desc-list">
                      <li>
                        ≈{' '}
                        {formatUsdValue(
                          new BigNumber(token.amount)
                            .times(token.price)
                            .toFixed()
                        )}
                      </li>
                    </ul>
                  </Row>
                ))}
              </div>
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
