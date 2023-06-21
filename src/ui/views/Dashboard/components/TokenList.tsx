import { TokenItem } from '@/background/service/openapi';
import { Input, message, Skeleton } from 'antd';
import clsx from 'clsx';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { matomoRequestEvent } from '@/utils/matomo-request';
import { useTranslation } from 'react-i18next';
import { useDebounce } from 'react-use';
import { FixedSizeList } from 'react-window';
import IconArrowRight from 'ui/assets/arrow-right.svg';
import IconArrowUp from 'ui/assets/arrow-up.svg';
import IconSearch from 'ui/assets/tokenSearch.png';
import { AddressViewer, Empty, TokenWithChain } from 'ui/component';
import { splitNumberByStep } from 'ui/utils';
import { TokenDetailPopup } from './TokenDetailPopup';
import { getTokenSymbol } from '@/ui/utils/token';

const Row = (props) => {
  const {
    data,
    index,
    style,
    onTokenClick,
    isExpand,
    setIsExpand,
    totalHidden,
  } = props;
  const { list, startSearch, removeToken, addToken, query, addedToken } = data;
  const isInitList = !startSearch && !query;
  const token = list[index];
  const isAdded =
    addedToken.length > 0 && addedToken.find((item) => item === token.id);

  const handleTokenClick = useCallback(() => {
    onTokenClick && onTokenClick(token);
  }, [onTokenClick, token]);

  if (token.isShowExpand) {
    return (
      <div
        className="filter"
        style={style}
        onClick={() => setIsExpand((v) => !v)}
      >
        {!isExpand ? (
          <div className="flex justify-center items-center">
            {`$${splitNumberByStep(totalHidden.toFixed(0))} assets are hidden`}
            <img src={IconArrowUp} className="rotate-180"></img>
          </div>
        ) : (
          <div className="flex justify-center items-center">
            {'Hide small assets'}
            <img src={IconArrowUp}></img>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={clsx('token-item', 'cursor-pointer')}
      style={style}
      onClick={handleTokenClick}
    >
      <TokenWithChain token={token} hideConer width={'24px'} height={'24px'} />
      <div className="middle">
        <div
          className="token-amount truncate max-w-[140px]"
          title={
            startSearch
              ? token?.name
              : splitNumberByStep(token.amount?.toFixed(4))
          }
        >
          {startSearch
            ? token?.name
            : splitNumberByStep(token.amount?.toFixed(4))}
        </div>
        <div className="token-name">
          {startSearch ? (
            <AddressViewer
              address={token?.id}
              showArrow={false}
              className={'text-12 text-white opacity-80'}
            />
          ) : (
            getTokenSymbol(token)
          )}
        </div>
      </div>
      {isInitList ? (
        <div className="right max-w-[140px] text-right pl-[8px]">
          <div
            className="token-amount truncate"
            title={splitNumberByStep(
              (token.amount * token.price || 0)?.toFixed(2)
            )}
          >
            ${splitNumberByStep((token.amount * token.price || 0)?.toFixed(2))}
          </div>
          <div className="token-name w-auto">
            @{splitNumberByStep((token.price || 0).toFixed(2))}
          </div>
        </div>
      ) : (
        <div className="right">
          <img className="w-[16px] h-[16px]" src={IconArrowRight} />
        </div>
      )}
    </div>
  );
};

const calcFilterPrice = (tokens) => {
  const total = tokens.reduce(
    (t, item) => (item.amount * item.price || 0) + t,
    0
  );
  return Math.min(total * 0.001, 1000);
};
const calcIsShowExpand = (tokens) => {
  const filterPrice = calcFilterPrice(tokens);
  if (tokens.length < 15) {
    return false;
  }
  if (
    tokens.filter((item) => (item.amount * item.price || 0) < filterPrice)
      .length < 3
  ) {
    return false;
  }
  return true;
};
const useExpandList = (tokens) => {
  const [isExpand, setIsExpand] = useState(false);
  const filterPrice = useMemo(() => calcFilterPrice(tokens), [tokens]);
  const isShowExpand = useMemo(() => calcIsShowExpand(tokens), [tokens]);

  const totalHidden = useMemo(
    () =>
      tokens.reduce((t, item) => {
        const price = item.amount * item.price || 0;
        if (price < filterPrice) {
          return t + price;
        }
        return t;
      }, 0),
    [tokens, filterPrice]
  );
  const filterList = useMemo(() => {
    if (!isShowExpand) {
      return tokens;
    }
    let result = isExpand
      ? tokens
      : tokens.filter((item) => (item.amount * item.price || 0) >= filterPrice);
    if (isShowExpand) {
      result = result.concat([
        {
          isShowExpand: true,
        },
      ]);
    }
    return result;
  }, [isExpand, tokens, isShowExpand, filterPrice]);

  return {
    isExpand,
    setIsExpand,
    filterList,
    filterPrice,
    isShowExpand,
    totalHidden,
  };
};
const TokenList = ({
  tokens,
  startSearch,
  closeSearch,
  onSearch,
  searchTokens,
  addedToken,
  removeToken,
  addToken,
  tokenAnimate,
  startAnimate,
  isloading,
}) => {
  const { t } = useTranslation();
  const fixedList = useRef<FixedSizeList>();
  const [query, setQuery] = useState<string | null>(null);
  const handleQueryChange = (value: string) => {
    setQuery(value);
  };
  const { isExpand, setIsExpand, filterList, totalHidden } = useExpandList(
    tokens
  );
  const [detail, setDetail] = useState<{
    visible: boolean;
    current?: TokenItem | null;
    varaint?: 'add';
  }>({
    visible: false,
    current: null,
  });

  const handleTokenClick = (token) => {
    const isAdded =
      addedToken.length > 0 && addedToken.find((item) => item === token.id);
    setDetail({
      visible: true,
      current: token,
      varaint: !isAdded && startSearch ? 'add' : undefined,
    });
    matomoRequestEvent({
      category: 'ViewAssets',
      action: 'viewTokenDetail',
      label: token?.id,
    });
  };

  useDebounce(
    () => {
      if (query) onSearch(query);
    },
    150,
    [query]
  );
  const emptyAdded = startSearch && !query && addedToken.length === 0;
  const noSeachResult = startSearch && query && searchTokens.length <= 0;
  const displayAddedToken = addedToken
    .map((item) => tokens.find((token) => token?.id === item))
    .filter(Boolean);
  const showList =
    (!startSearch && !isloading && tokens.length > 0) ||
    (startSearch && (searchTokens.length > 0 || displayAddedToken.length > 0));
  useEffect(() => {
    if (showList && tokenAnimate.includes('fadeIn')) {
      fixedList.current?.scrollToItem(0);
      setIsExpand(false);
    }
  }, [tokenAnimate, showList]);
  useEffect(() => {
    if (!startSearch) {
      setQuery(null);
      closeSearch();
    }
  }, [startSearch]);
  if (!startAnimate) {
    return <></>;
  }
  return (
    <div
      className={clsx(
        'tokenList',
        tokenAnimate,
        isloading && 'bg-transparent shadow-none backdrop-filter-none'
      )}
    >
      {startSearch && (
        <div className={clsx('search-wrapper', query && 'active')}>
          <Input
            size="large"
            prefix={<img src={IconSearch} className="w-[14px] h-[14px]" />}
            placeholder={t('Search token address')}
            value={query || ''}
            onChange={(e) => handleQueryChange(e.target.value)}
            autoFocus
          />
        </div>
      )}
      {noSeachResult && <div className="no-added-token">No results</div>}
      {isloading && (
        <div className="loadingContainer m-0 w-full">
          {Array(8)
            .fill(0)
            .map((_, i) => (
              <div key={i}>
                <div className="flex justify-between mb-2 mt-20">
                  <Skeleton.Input
                    active
                    style={{
                      width: 139,
                      height: 15,
                    }}
                  />
                  <Skeleton.Input
                    active
                    style={{
                      width: 90,
                      height: 15,
                    }}
                  />
                </div>
                <div className="flex justify-between">
                  <Skeleton.Input
                    active
                    style={{
                      width: 59,
                      height: 14,
                    }}
                  />
                  <Skeleton.Input
                    active
                    style={{
                      width: 59,
                      height: 14,
                    }}
                  />
                </div>
              </div>
            ))}
        </div>
      )}
      {showList && (
        <FixedSizeList
          height={468}
          width="100%"
          itemData={{
            list: startSearch ? (query ? searchTokens : []) : filterList,
            startSearch,
            addedToken,
            removeToken,
            addToken,
            query,
          }}
          itemCount={
            startSearch
              ? query
                ? searchTokens.length
                : [].length
              : filterList.length
          }
          itemSize={52}
          ref={fixedList}
          style={{ zIndex: 10, overflowX: 'hidden', paddingBottom: 50 }}
        >
          {(props) => (
            <Row
              {...props}
              totalHidden={totalHidden}
              isExpand={isExpand}
              setIsExpand={setIsExpand}
              onTokenClick={handleTokenClick}
            ></Row>
          )}
        </FixedSizeList>
      )}
      {!startSearch && !isloading && tokens.length === 0 && (
        <Empty
          desc={
            <span className="text-white opacity-80">
              {t('No token assets')}
            </span>
          }
          className="pt-[120px] w-full"
        ></Empty>
      )}
      {/* <TokenDetailPopup
        visible={detail.visible}
        token={detail.current}
        addToken={async (token) => {
          await addToken(token);
          message.success('Added successfully');
          setDetail({
            visible: false,
            current: null,
          });
        }}
        removeToken={async (token) => {
          await removeToken(token);
          message.success('Removed successfully');
          setDetail({
            visible: false,
            current: null,
          });
        }}
        variant={detail.varaint}
        onClose={() => {
          setDetail({
            visible: false,
            current: null,
          });
        }}
      ></TokenDetailPopup> */}
    </div>
  );
};

export default TokenList;
