import React, { useRef, useState } from 'react';
import { Input } from 'antd';
import { FixedSizeList } from 'react-window';
import { useTranslation } from 'react-i18next';
import { useDebounce } from 'react-use';
import { TokenWithChain, AddressViewer } from 'ui/component';
import { splitNumberByStep } from 'ui/utils';
import IconSearch from 'ui/assets/tokenSearch.png';
import IconClose from 'ui/assets/searchIconClose.png';
import IconAddToken from 'ui/assets/addtokenplus.png';
import IconRemoveToken from 'ui/assets/removetoken.png';
import clsx from 'clsx';
const Row = (props) => {
  const { data, index, style } = props;
  const { list, startSearch, removeToken, addToken, query, addedToken } = data;
  const isInitList = !startSearch && !query;
  const token = list[index];
  const isAdded =
    addedToken.length > 0 && addedToken.find((item) => item === token.id);
  return (
    <div className="token-item" style={style}>
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
            ${splitNumberByStep((token.amount * token.price || 0)?.toFixed(4))}
          </div>
          <div className="token-name">
            @{splitNumberByStep((token.price || 0).toFixed(4))}
          </div>
        </div>
      ) : (
        <div className="right">
          <img
            src={isAdded ? IconRemoveToken : IconAddToken}
            onClick={() =>
              isAdded ? removeToken(token?.id) : addToken(token?.id)
            }
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
}) => {
  const { t } = useTranslation();
  const fixedList = useRef<FixedSizeList>();
  const [query, setQuery] = useState<string | null>(null);
  const handleQueryChange = (value: string) => {
    setQuery(value);
  };
  useDebounce(
    () => {
      onSearch(query);
    },
    150,
    [query]
  );

  const emptyAdded = startSearch && !query && addedToken.length === 0;
  const noSeachResult = startSearch && query && searchTokens.length <= 0;
  const displayAddedToken = addedToken
    .map((item) => tokens.find((token) => token?.id === item))
    .filter(Boolean);
  const close = () => {
    setQuery(null);
    closeSearch();
  };
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
      {!emptyAdded && !noSeachResult && (
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
    </div>
  );
};

export default TokenList;
