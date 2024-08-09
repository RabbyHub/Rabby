import React from 'react';
import styled from 'styled-components';
import { ReactComponent as RcArrowDown } from '@/ui/assets/bridge/down.svg';
import { useTranslation } from 'react-i18next';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { TokenWithChain } from '@/ui/component';
import { getTokenSymbol } from '@/ui/utils/token';
import { Drawer, DrawerProps, Tooltip } from 'antd';
import clsx from 'clsx';
import { formatUsdValue, useWallet } from '@/ui/utils';
import BigNumber from 'bignumber.js';
import { useAsync } from 'react-use';
import { CHAINS, CHAINS_ENUM } from '@debank/common';
import { TokenPairLoading } from './loading';
import MatchImage from 'ui/assets/match.svg';
import { SvgIconCross } from '@/ui/assets';

const TokenPairDrawer = (
  props: DrawerProps & {
    aggregatorIds: string[];
    chain: CHAINS_ENUM;
    onSelectTokenPair: (value: TokenPair) => void;
  }
) => {
  const { t } = useTranslation();
  const wallet = useWallet();
  const { value, loading } = useAsync(async () => {
    const currentAddress = await wallet.getCurrentAccount();
    if (currentAddress && props.visible) {
      return wallet.openapi.getBridgePairList({
        aggregator_ids: props.aggregatorIds,
        to_chain_id: CHAINS[props.chain].serverId,
        user_addr: currentAddress.address,
      });
    }
  }, [props.visible, props.chain, props.aggregatorIds]);

  return (
    <Drawer
      className="token-selector custom-popup is-support-darkmode"
      height={440}
      placement="bottom"
      {...props}
    >
      <div className="w-full h-full flex flex-col ">
        <div
          className={clsx(
            'mx-20 pb-8 flex justify-between items-end text-[12px] text-r-neutral-body',
            'border-b-[0.5px] border-solid border-rabby-neutral-line'
          )}
        >
          <span>{t('page.bridge.tokenPairDrawer.tokenPair')}</span>
          <span>{t('page.bridge.tokenPairDrawer.balance')}</span>
        </div>

        <div className="flex-1 overflow-auto flex flex-col ">
          {loading &&
            Array.from({ length: 6 }).map((_, i) => (
              <TokenPairLoading key={i} />
            ))}

          {!loading &&
            value?.map((tokenPair, i) => {
              return (
                <Tooltip
                  overlayClassName={clsx('rectangle')}
                  placement="top"
                  visible={!tokenPair.from_token_amount ? undefined : false}
                  trigger={['hover', 'click']}
                  mouseEnterDelay={3}
                  title={t('page.gasTopUp.InsufficientBalanceTips')}
                  align={{ targetOffset: [0, -30] }}
                >
                  <div
                    key={i}
                    onClick={() => {
                      if (tokenPair.from_token_amount) {
                        props.onSelectTokenPair({
                          from: {
                            ...tokenPair.from_token,
                            amount: tokenPair.from_token_amount,
                            raw_amount_hex_str:
                              tokenPair.from_token_raw_amount_hex_str,
                          },
                          to: tokenPair.to_token,
                        });
                      }
                    }}
                    className={clsx(
                      'px-20 min-h-[56px] cursor-pointer',
                      'flex items-center justify-between',
                      'border border-solid border-transparent rounded-md',
                      !tokenPair.from_token_amount
                        ? 'opacity-40 cursor-not-allowed'
                        : 'hover:border-rabby-blue-default hover:bg-rabby-blue-light1'
                    )}
                  >
                    <div className="flex items-center text-[15px] font-medium text-r-neutral-title1">
                      <TokenWithChain
                        width="24px"
                        height="24px"
                        token={tokenPair.from_token}
                      />
                      <span className="ml-12">
                        {getTokenSymbol(tokenPair.from_token)}
                      </span>
                      <span className="text-r-neutral-foot mx-6">→</span>
                      <span>{getTokenSymbol(tokenPair.to_token)}</span>
                    </div>

                    <div className="text-[15px] font-medium text-r-neutral-title1">
                      {/* {formatUsdValue(
                      new BigNumber(
                        tokenPair.from_token.raw_amount_hex_str || '0'
                      )
                        .dividedBy(10 ** tokenPair.from_token.decimals)
                        .times(tokenPair.from_token.price)
                        .toString()
                    )} */}
                      {formatUsdValue(
                        new BigNumber(tokenPair.from_token_amount || '0')
                          .times(tokenPair.from_token.price)
                          .toString()
                      )}
                    </div>
                  </div>
                </Tooltip>
              );
            })}

          {!loading && !value?.length && (
            <div className="h-full flex flex-col justify-center items-center gap-12">
              <img className="w-40 h-40" src={MatchImage} />
              <span className="text-14 text-r-neutral-foot">
                {t('page.bridge.tokenPairDrawer.noData')}
              </span>
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
};

const RenderWrapper = styled.div`
  height: 52px;
  background: var(--r-neutral-card-2, #f2f4f7);
  border-radius: 6px;
  padding: 0 12px;
  padding-right: 10px;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  color: var(--r-neutral-title1, #192945);

  &:hover {
    background: rgba(134, 151, 255, 0.2);
  }

  & > {
    .pair {
      display: flex;
      align-items: center;
      gap: 12px;

      .token {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 16px;
        font-weight: 500;
        color: var(--r-neutral-title1, #192945);

        .token-symbol {
          max-width: 90px;
          display: inline-block;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }
    }

    .down {
      margin-left: auto;
      width: 20px;
      height: 20px;
    }
  }
`;

type TokenPair = {
  from: TokenItem;
  to: TokenItem;
};

export const BridgeTokenPair = (props: {
  aggregatorIds: string[];
  chain: CHAINS_ENUM;
  value?: TokenPair;
  onChange: (value: TokenPair) => void;
}) => {
  const { value } = props;
  const { t } = useTranslation();
  const [visible, setVisible] = React.useState(false);
  const onSelectTokenPair = React.useCallback(
    (params: TokenPair) => {
      props.onChange(params);
      setVisible(false);
    },
    [props.onChange]
  );
  return (
    <>
      <RenderWrapper onClick={() => setVisible(true)}>
        {!value ? (
          <div>{t('page.bridge.tokenPairPlaceholder')}</div>
        ) : (
          <div className="pair">
            <div className="token">
              <TokenWithChain
                width="24px"
                height="24px"
                token={value?.from}
                className="flex items-center"
              />
              <span
                className="token-symbol"
                title={getTokenSymbol(value?.from)}
              >
                {getTokenSymbol(value?.from)}
              </span>
            </div>
            <span className="text-r-neutral-foot">→</span>

            <div className="token">
              <TokenWithChain
                width="24px"
                height="24px"
                token={value?.to}
                className="flex items-center"
              />
              <span className="token-symbol" title={getTokenSymbol(value?.to)}>
                {getTokenSymbol(value?.to)}
              </span>
            </div>
          </div>
        )}
        <RcArrowDown className="down" />
      </RenderWrapper>

      {/* modal */}
      <TokenPairDrawer
        onSelectTokenPair={onSelectTokenPair}
        aggregatorIds={props.aggregatorIds}
        chain={props.chain}
        visible={visible}
        closeIcon={
          <SvgIconCross className="w-14 fill-current text-r-neutral-foot mt-[3px]" />
        }
        onClose={() => setVisible(false)}
        title={t('page.bridge.tokenPairDrawer.title')}
      />
    </>
  );
};
