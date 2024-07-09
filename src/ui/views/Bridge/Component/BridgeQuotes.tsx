import { Checkbox, Popup } from '@/ui/component';
import React, { useMemo } from 'react';
import { QuoteLoading } from './loading';
import { IconRefresh } from './IconRefresh';
import { SelectedBridgeQuote, useSetRefreshId } from '../hooks';
import BigNumber from 'bignumber.js';
import { CHAINS_ENUM } from '@/constant';
import { SvgIconCross } from 'ui/assets';
import { useTranslation } from 'react-i18next';
import { BridgeQuote, TokenItem } from '@/background/service/openapi';
import { BridgeQuoteItem } from './BridgeQuoteItem';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import MatchImage from 'ui/assets/match.svg';

interface QuotesProps {
  chain: CHAINS_ENUM;
  userAddress: string;
  loading: boolean;
  inSufficient: boolean;
  payToken: TokenItem;
  receiveToken: TokenItem;
  list?: BridgeQuote[];
  activeName?: string;
  visible: boolean;
  onClose: () => void;
  payAmount: string;
  setSelectedBridgeQuote: React.Dispatch<
    React.SetStateAction<SelectedBridgeQuote | undefined>
  >;
}

export const Quotes = ({
  list,
  activeName,
  inSufficient,
  ...other
}: QuotesProps) => {
  const { t } = useTranslation();
  const sortIncludeGasFee = useRabbySelector((s) => s.bridge.sortIncludeGasFee);

  const sortedList = useMemo(() => {
    return list?.sort((b, a) => {
      return new BigNumber(a.to_token_amount)
        .times(other.receiveToken.price || 1)
        .minus(sortIncludeGasFee ? a.gas_fee.usd_value : 0)
        .minus(
          new BigNumber(b.to_token_amount)
            .times(other.receiveToken.price || 1)
            .minus(sortIncludeGasFee ? b.gas_fee.usd_value : 0)
        )
        .toNumber();
    });
  }, [list, sortIncludeGasFee, other.receiveToken]);

  const bestQuoteUsd = useMemo(() => {
    const bestQuote = sortedList?.[0];
    if (!bestQuote) {
      return '0';
    }
    return new BigNumber(bestQuote.to_token_amount)
      .times(other.receiveToken.price || 1)
      .minus(sortIncludeGasFee ? bestQuote.gas_fee.usd_value : 0)
      .toString();
  }, [sortedList, other.receiveToken, sortIncludeGasFee]);

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex flex-col gap-12 flex-1">
        {sortedList?.map((item, idx) => {
          return (
            <BridgeQuoteItem
              {...item}
              sortIncludeGasFee={!!sortIncludeGasFee}
              isBestQuote={idx === 0}
              bestQuoteUsd={bestQuoteUsd}
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
          Array.from({ length: 5 }).map((_, idx) => <QuoteLoading key={idx} />)}

        {!other.loading && !sortedList?.length && (
          <div className="h-full flex flex-col justify-center items-center gap-12">
            <img className="w-40 h-40" src={MatchImage} />
            <span className="text-14 text-r-neutral-foot">
              {t('page.bridge.noData')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

const bodyStyle = {
  paddingTop: 0,
  paddingBottom: 0,
};

export const QuoteList = (props: QuotesProps) => {
  const { visible, onClose } = props;
  const refresh = useSetRefreshId();

  const refreshQuote = React.useCallback(() => {
    refresh((e) => e + 1);
  }, [refresh]);

  const { t } = useTranslation();

  const sortIncludeGasFee = useRabbySelector((s) => s.bridge.sortIncludeGasFee);

  const dispatch = useRabbyDispatch();

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
        <div className="flex items-center justify-between mb-[-2px] pb-10">
          <div className="flex items-center gap-6 text-left text-r-neutral-title-1 text-[16px] font-medium ">
            <div>{t('page.bridge.the-following-bridge-route-are-found')}</div>
            <div className="w-14 h-14 relative overflow-hidden">
              <div className="w-[26px] h-[26px] absolute left-1/2 top-1/2 translate-x-[-50%] translate-y-[-50%]">
                <IconRefresh onClick={refreshQuote} />
              </div>
            </div>
          </div>

          <Checkbox
            checked={!!sortIncludeGasFee}
            onChange={dispatch.bridge.setSwapSortIncludeGasFee}
            className="text-12 text-rabby-neutral-body"
            width="14px"
            height="14px"
            type="square"
            background="transparent"
            unCheckBackground="transparent"
            checkIcon={
              sortIncludeGasFee ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 14 14"
                >
                  <path
                    fill={'var(--r-blue-default)'}
                    d="M12.103.875H1.898a1.02 1.02 0 0 0-1.02 1.02V12.1c0 .564.456 1.02 1.02 1.02h10.205a1.02 1.02 0 0 0 1.02-1.02V1.895a1.02 1.02 0 0 0-1.02-1.02Z"
                  />
                  <path
                    stroke="#fff"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.05}
                    d="m4.2 7.348 2.1 2.45 4.2-4.9"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 14 14"
                >
                  <path
                    stroke="var(--r-neutral-foot)"
                    strokeLinejoin="round"
                    strokeWidth={0.75}
                    d="M12.103.875H1.898a1.02 1.02 0 0 0-1.02 1.02V12.1c0 .564.456 1.02 1.02 1.02h10.205a1.02 1.02 0 0 0 1.02-1.02V1.895a1.02 1.02 0 0 0-1.02-1.02Z"
                  />
                </svg>
              )
            }
          >
            <span className="ml-[-4px]">{t('page.swap.sort-with-gas')}</span>
          </Checkbox>
        </div>
      }
      height={516}
      onClose={onClose}
      closable={false}
      destroyOnClose
      className="isConnectView z-[999]"
      bodyStyle={bodyStyle}
      isSupportDarkMode
    >
      <Quotes {...props} />
    </Popup>
  );
};
