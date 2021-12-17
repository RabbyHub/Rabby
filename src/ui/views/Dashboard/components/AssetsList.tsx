import React, { useRef } from 'react';
import { FixedSizeList } from 'react-window';
import { TokenWithChain } from 'ui/component';
import { splitNumberByStep } from 'ui/utils';

const Row = (props) => {
  const { data, index, style } = props;
  const token = data[index];
  return (
    <div className="token-item" style={style}>
      <TokenWithChain token={token} height={'24px'} width={'24px'} noRound />
      <div className="middle">
        <div className="token-name text-13">{token.name}</div>
      </div>
      <div className="right">
        <div className="token-name">
          ${splitNumberByStep((token.asset_usd_value || 0).toFixed(4))}
        </div>
      </div>
    </div>
  );
};
const AssetsList = ({ assets }) => {
  const fixedList = useRef<FixedSizeList>();
  return (
    <div className="tokenList">
      <FixedSizeList
        height={468}
        width="100%"
        itemData={assets}
        itemCount={assets.length}
        itemSize={48}
        ref={fixedList}
        style={{ zIndex: 10 }}
      >
        {Row}
      </FixedSizeList>
    </div>
  );
};

export default AssetsList;
