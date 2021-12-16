import React, { useRef, useState } from 'react';
import { Input } from 'antd';
import { FixedSizeList } from 'react-window';
import { useTranslation } from 'react-i18next';
import { useDebounce } from 'react-use';
import { TokenWithChain, AddressViewer } from 'ui/component';
import { splitNumberByStep } from 'ui/utils';
import { TokenItem } from 'background/service/openapi';
import IconSearch from 'ui/assets/tokenSearch.png';
import IconClose from 'ui/assets/searchIconClose.png';
import IconAddToken from 'ui/assets/addtokenplus.png';

const Row = (props) => {
  const { data, index, style } = props;
  const { list, startSearch } = data;
  const token = list[index];
  return (
    <div className="token-item" style={style}>
      <TokenWithChain token={token} hideConer />
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
      {!startSearch ? (
        <div className="right">
          <div className="token-amount">
            ${splitNumberByStep((token.amount * token.price || 0)?.toFixed(4))}
          </div>
          <div className="token-name">
            ${splitNumberByStep((token.price || 0).toFixed(4))}
          </div>
        </div>
      ) : (
        <div className="right">
          <img src={IconAddToken} className="add-token-icon" />
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
}) => {
  const { t } = useTranslation();
  const fixedList = useRef<FixedSizeList>();
  const [displayTokens, setDisplayTokens] = useState<TokenItem[]>([]);
  const [query, setQuery] = useState('');
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
  console.log(searchTokens, 'searchtoen .....');
  return (
    <div className="tokenList">
      {startSearch && (
        <div className="search-wrapper">
          {' '}
          <Input
            size="large"
            prefix={<img src={IconSearch} className="w-[14px] h-[14px]" />}
            placeholder={t('Search token address')}
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            autoFocus
          />
          <img src={IconClose} className="closeIcon" onClick={closeSearch} />
        </div>
      )}
      <FixedSizeList
        height={tokens.length > 12 ? 468 : tokens.length * 42}
        width="100%"
        itemData={{
          list: startSearch ? searchTokens : tokens,
          startSearch,
        }}
        itemCount={startSearch ? searchTokens.length : tokens.length}
        itemSize={42}
        ref={fixedList}
        style={{ zIndex: 10 }}
      >
        {Row}
      </FixedSizeList>
    </div>
  );
};

export default TokenList;
