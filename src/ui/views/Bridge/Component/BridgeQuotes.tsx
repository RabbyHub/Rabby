import { Popup } from '@/ui/component';
import React, { useMemo } from 'react';
import { QuoteLoading } from './loading';
import { IconRefresh } from './IconRefresh';
import { SelectedBridgeQuote, useSetRefreshId } from '../hooks';
import BigNumber from 'bignumber.js';
import { SvgIconCross } from 'ui/assets';
import { useTranslation } from 'react-i18next';
import { TokenItem } from '@/background/service/openapi';
import { BridgeQuoteItem, bridgeQuoteScore } from './BridgeQuoteItem';
import { ReactComponent as RCIconCCEmpty } from 'ui/assets/bridge/empty-cc.svg';
import { DrawerProps } from 'antd';

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
      <div className="flex flex-col gap-12 flex-1 pb-12 px-20">
        {sortedList?.map((item, idx) => {
          return (
            <BridgeQuoteItem
              key={item.aggregator.id + item.bridge_id}
              {...item}
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

  const refreshQuote = React.useCallback(() => {
    refresh((e) => e + 1);
  }, [refresh]);

  const { t } = useTranslation();

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
        <div className="mb-[-2px] pb-10">
          <div className="relative pr-24 text-left text-r-neutral-title-1 text-[16px] font-medium">
            <div>{t('page.bridge.the-following-bridge-route-are-found')}</div>
            <div className="absolute right-0 top-1/2 translate-y-[-50%] flex items-center gap-2 text-r-blue-default">
              <div className="w-14 h-14 relative overflow-hidden mr-4">
                <div className="w-[14px] h-[14px] absolute left-1/2 top-1/2 translate-x-[-50%] translate-y-[-50%]">
                  <IconRefresh
                    spinning={props.loading}
                    onClick={refreshQuote}
                  />
                </div>
              </div>
              <span
                className="text-[16px] font-medium cursor-pointer"
                onClick={refreshQuote}
              >
                {t('global.refresh')}
              </span>
            </div>
          </div>
          <div className="mt-8 text-12 leading-[18px] text-r-neutral-foot text-left">
            {t('page.bridge.best-subtitle')}
          </div>
        </div>
      }
      height={462}
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
