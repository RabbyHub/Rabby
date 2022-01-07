import React, { useRef, useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { Input } from 'antd';
import { FixedSizeList } from 'react-window';
import { useTranslation } from 'react-i18next';
import { useDebounce } from 'react-use';
import { TokenWithChain, AddressViewer } from 'ui/component';
import { splitNumberByStep, useHover } from 'ui/utils';
import IconSearch from 'ui/assets/tokenSearch.png';
import IconClose from 'ui/assets/searchIconClose.png';
import IconAddToken from 'ui/assets/addtokenplus.png';
import IconRemoveToken from 'ui/assets/removetoken.png';
import { SvgIconLoading } from 'ui/assets';
import IconSendToken from 'ui/assets/dashboard/tokenlistsend.png';
import clsx from 'clsx';
const Row = (props) => {
  const { data, index, style } = props;
  const [isHovering, hoverProps] = useHover();
  const {
    list,
    startSearch,
    removeToken,
    addToken,
    query,
    addedToken,
    history,
  } = data;
  const isInitList = !startSearch && !query;
  const token = list[index];
  const isAdded =
    addedToken.length > 0 && addedToken.find((item) => item === token.id);
  const goToSend = () => {
    history.push(`/send-token?token=${token?.chain}:${token?.id}`);
  };
  return (
    <div
      className={clsx('token-item', isHovering && 'hover')}
      {...hoverProps}
      style={style}
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
        !isHovering ? (
          <div className="right">
            <div className="token-amount">
              $
              {splitNumberByStep((token.amount * token.price || 0)?.toFixed(2))}
            </div>
            <div className="token-name">
              @{splitNumberByStep((token.price || 0).toFixed(2))}
            </div>
          </div>
        ) : (
          <div className="right">
            <img
              src={IconSendToken}
              className={clsx('w-[36px] h-[36px]', isHovering && 'pointer')}
              onClick={goToSend}
            />
          </div>
        )
      ) : (
        <div className="right">
          <img
            src={isAdded ? IconRemoveToken : IconAddToken}
            onClick={() => (isAdded ? removeToken(token) : addToken(token))}
            className="add-token-icon"
          />
        </div>
      )}
    </div>
  );
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
  const history = useHistory();
  const fixedList = useRef<FixedSizeList>();
  const [query, setQuery] = useState<string | null>(null);
  const handleQueryChange = (value: string) => {
    setQuery(value);
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
  const close = () => {
    setQuery(null);
    closeSearch();
  };
  useEffect(() => {
    if (showList && tokenAnimate.includes('fadeIn')) {
      fixedList.current?.scrollToItem(0);
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
              : tokens,
            startSearch,
            addedToken,
            removeToken,
            addToken,
            query,
            history,
          }}
          itemCount={
            startSearch
              ? query
                ? searchTokens.length
                : displayAddedToken.length
              : tokens.length
          }
          itemSize={52}
          ref={fixedList}
          style={{ zIndex: 10, 'overflow-x': 'hidden', paddingBottom: 50 }}
        >
          {Row}
        </FixedSizeList>
      )}
      {!startSearch && !isloading && tokens.length === 0 && (
        <div className="no-data">
          <img className="w-[100px] h-[100px]" src="./images/nodata-tx.png" />
          <div className="loading-text">{t('No Tokens')}</div>
        </div>
      )}
    </div>
  );
};

export default TokenList;
