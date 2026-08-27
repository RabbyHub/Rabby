import { Popup } from '@/ui/component';
import React, { useMemo } from 'react';
import { QuoteLoading } from './loading';
import { SelectedBridgeQuote, useSetRefreshId } from '../hooks';
import BigNumber from 'bignumber.js';
import { SvgIconCross } from 'ui/assets';
import { useTranslation } from 'react-i18next';
import { TokenItem } from '@/background/service/openapi';
import { BridgeQuoteItem, bridgeQuoteScore } from './BridgeQuoteItem';
import { ReactComponent as RCIconCCEmpty } from 'ui/assets/bridge/empty-cc.svg';
import { DrawerProps } from 'antd';
import { useRabbySelector } from '@/ui/store';
import clsx from 'clsx';
import { ReactComponent as RcIconRefreshCC } from '@/ui/assets/swap/quote-refresh-cc.svg';

interface QuotesProps {
  userAddress: string;
  loading: boolean;
  inSufficient: boolean;
  payToken: TokenItem;
  receiveToken: TokenItem;
  list?: SelectedBridgeQuote[];
  activeName?: string;
  visible: boolean;
  onClose: () => void;
  payAmount: string;
  setSelectedBridgeQuote: (quote?: SelectedBridgeQuote) => void;
  getContainer?: DrawerProps['getContainer'];
}

export const Quotes = ({
  list,
  activeName,
  inSufficient,
  ...other
}: QuotesProps) => {
  const { t } = useTranslation();

  const sortedList = useMemo(() => {
    return list?.sort((b, a) => {
      return new BigNumber(a.to_token_amount)
        .times(other.receiveToken.price || 1)
        .minus(a.gas_fee.usd_value)
        .minus(
          new BigNumber(b.to_token_amount)
            .times(other.receiveToken.price || 1)
            .minus(b.gas_fee.usd_value)
        )
        .toNumber();
    });
  }, [list, other.receiveToken]);

  const bestIndex = useMemo(() => {
    if (!sortedList?.length) {
      return 0;
    }

    let bestIdx = 0;
    let bestScore = bridgeQuoteScore(sortedList[0], other.receiveToken);
    for (let i = 1; i < sortedList.length; i += 1) {
      const score = bridgeQuoteScore(sortedList[i], other.receiveToken);
      if (score.gt(bestScore)) {
        bestScore = score;
        bestIdx = i;
      }
    }

    return bestIdx;
  }, [sortedList, other.receiveToken]);

  const bestAmountUsd = useMemo(() => {
    const bestQuote = sortedList?.[0];
    if (!bestQuote) {
      return '0';
    }
    return new BigNumber(bestQuote.to_token_amount)
      .times(other.receiveToken.price || 1)
      .minus(bestQuote.gas_fee.usd_value)
      .toString();
  }, [sortedList, other.receiveToken]);

  return (
    <div className="flex flex-col h-full w-full ">
      <div className="flex flex-col gap-12 flex-1 px-20 pb-20">
        {sortedList?.map((item, idx) => {
          return (
            <BridgeQuoteItem
              key={item.aggregator.id + item.bridge_id}
              {...item}
              active={activeName === `${item.aggregator.id}-${item.bridge_id}`}
              isBestQuote={idx === bestIndex}
              isTopAmount={idx === 0}
              bestQuoteUsd={bestAmountUsd}
              payToken={other.payToken}
              receiveToken={other.receiveToken}
              setSelectedBridgeQuote={other.setSelectedBridgeQuote}
              payAmount={other.payAmount}
              inSufficient={inSufficient}
            />
          );
        })}
        {other.loading &&
          !sortedList?.length &&
          Array.from({ length: 4 }).map((_, idx) => <QuoteLoading key={idx} />)}

        {!other.loading && !sortedList?.length && (
          <div className="h-full flex flex-col justify-center items-center gap-12 mb-20">
            <RCIconCCEmpty className="w-40 h-40 text-rabby-neutral-foot" />
            <span className="text-14 text-r-neutral-foot">
              {t('page.bridge.no-route-found')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

const bodyStyle = {
  padding: 0,
};

export const QuoteList = (props: QuotesProps) => {
  const { visible, onClose, getContainer } = props;
  const refresh = useSetRefreshId();
  const aggregatorsList = useRabbySelector((s) => s.bridge.aggregatorsList);

  const refreshQuote = React.useCallback(() => {
    refresh((e) => e + 1);
  }, [refresh]);

  const { t } = useTranslation();

  const height = useMemo(() => {
    const min = 333;
    const max = 548;
    const itemCount = Math.max(props.list?.length || 0, aggregatorsList.length);
    const h = 45 + 24 + itemCount * 88;

    if (h < min) {
      return min;
    }
    if (h > max) {
      return max;
    }
    return h;
  }, [aggregatorsList.length, props.list?.length]);

  return (
    <Popup
      closeIcon={
        <SvgIconCross className="w-14 fill-current text-r-neutral-foot pt-[2px]" />
      }
      headerStyle={{
        paddingTop: 16,
      }}
      visible={visible}
      title={
        <div className="flex flex-col gap-12 pb-16">
          <div className="flex items-center justify-between text-left">
            <div className="text-[16px] font-medium text-r-neutral-title-1">
              {t('page.bridge.the-following-bridge-route-are-found')}
            </div>
            <div
              className="flex cursor-pointer items-center gap-4 text-r-blue-default"
              onClick={refreshQuote}
            >
              <div className="h-14 w-14 overflow-hidden">
                <RcIconRefreshCC
                  className={clsx('h-14 w-14', props.loading && 'animate-spin')}
                />
              </div>
              <span className="text-13 font-medium">{t('global.refresh')}</span>
            </div>
          </div>
          <div className="text-left text-12 leading-normal text-r-neutral-foot">
            {t('page.bridge.best-subtitle')}
          </div>
        </div>
      }
      height={height}
      onClose={onClose}
      closable={false}
      destroyOnClose
      className="isConnectView z-[999]"
      bodyStyle={bodyStyle}
      isSupportDarkMode
      getContainer={getContainer}
    >
      <Quotes {...props} />
    </Popup>
  );
};
