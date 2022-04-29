import { TokenItem } from '@/background/service/openapi';
import { Input } from 'antd';
import clsx from 'clsx';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useDebounce } from 'react-use';
import { FixedSizeList } from 'react-window';
import { SvgIconLoading } from 'ui/assets';
import IconAddToken from 'ui/assets/addtokenplus.png';
import IconArrowUp from 'ui/assets/arrow-up.svg';
import IconRemoveToken from 'ui/assets/removetoken.png';
import IconClose from 'ui/assets/searchIconClose.png';
import IconSearch from 'ui/assets/tokenSearch.png';
import { AddressViewer, Empty, TokenWithChain } from 'ui/component';
import { splitNumberByStep } from 'ui/utils';
import { TokenDetailPopup } from './TokenDetailPopup';

const Row = (props) => {
  const { data, index, style, onTokenClick, isExpand, setIsExpand } = props;
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
            {'Small assets are hidden (<1%)'}
            <img src={IconArrowUp} className="rotate-180"></img>
          </div>
        ) : (
          <div className="flex justify-center items-center">
            {'Hide small assets (<1%)'}
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
        <div className="token-amount">
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
            token.symbol
          )}
        </div>
      </div>
      {isInitList ? (
        <div className="right">
          <div className="token-amount">
            ${splitNumberByStep((token.amount * token.price || 0)?.toFixed(2))}
          </div>
          <div className="token-name">
            @{splitNumberByStep((token.price || 0).toFixed(2))}
          </div>
        </div>
      ) : (
        <div className="right">
          {token.is_core ? (
            <span className="token-extra">Enabled by default</span>
          ) : (
            <img
              src={isAdded ? IconRemoveToken : IconAddToken}
              onClick={(e) => {
                e.stopPropagation();
                isAdded ? removeToken(token) : addToken(token);
              }}
              className="add-token-icon"
            />
          )}
        </div>
      )}
    </div>
  );
};
const useExpandList = (tokens) => {
  const [isExpand, setIsExpand] = useState(false);
  const total = useMemo(
    () => tokens.reduce((t, item) => (item.amount * item.price || 0) + t, 0),
    [tokens]
  );
  const filterPrice = total / 100;
  const isShowExpand = tokens.some(
    (item) => (item.amount * item.price || 0) < filterPrice
  );

  const filterList = useMemo(() => {
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
  }, [isExpand, tokens, isShowExpand]);

  return {
    isExpand,
    setIsExpand,
    filterList,
    filterPrice,
    isShowExpand,
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
  const { isExpand, setIsExpand, filterList } = useExpandList(tokens);
  const [detail, setDetail] = useState<{
    visible: boolean;
    current?: TokenItem | null;
  }>({
    visible: false,
    current: null,
  });

  const handleTokenClick = useCallback(
    (token) => {
      setDetail({
        visible: true,
        current: token,
      });
    },
    [setDetail]
  );
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
  const close = () => {
    setQuery(null);
    closeSearch();
  };
  useEffect(() => {
    if (showList && tokenAnimate.includes('fadeIn')) {
      fixedList.current?.scrollToItem(0);
      setIsExpand(false);
    }
  }, [tokenAnimate, showList]);
  if (!startAnimate) {
    return <></>;
  }
  return (
    <div className={clsx('tokenList', tokenAnimate)}>
      {startSearch && (
        <div className={clsx('search-wrapper', query && 'active')}>
          {' '}
          <Input
            size="large"
            prefix={<img src={IconSearch} className="w-[14px] h-[14px]" />}
            placeholder={t('Search token address')}
            value={query || ''}
            onChange={(e) => handleQueryChange(e.target.value)}
            autoFocus
          />
          <img src={IconClose} className="closeIcon" onClick={close} />
        </div>
      )}
      {emptyAdded && (
        <div className="no-added-token">
          You haven't added any custom tokens yet
        </div>
      )}
      {noSeachResult && <div className="no-added-token">No results</div>}
      {isloading && (
        <div className="loadingContainer">
          <SvgIconLoading className="icon icon-loading" fill="#FFFFFF" />
          <div className="loading-text">{t('Loading Tokens')}</div>
        </div>
      )}
      {showList && (
        <FixedSizeList
          height={468}
          width="100%"
          itemData={{
            list: startSearch
              ? query
                ? searchTokens
                : displayAddedToken
              : filterList,
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
                : displayAddedToken.length
              : filterList.length
          }
          itemSize={52}
          ref={fixedList}
          style={{ zIndex: 10, overflowX: 'hidden', paddingBottom: 50 }}
        >
          {(props) => (
            <Row
              {...props}
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
      <TokenDetailPopup
        visible={detail.visible}
        token={detail.current}
        onClose={() => {
          setDetail({
            visible: false,
            current: null,
          });
        }}
      ></TokenDetailPopup>
    </div>
  );
};

export default TokenList;
