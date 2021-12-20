import clsx from 'clsx';
import React, { useRef } from 'react';
import { FixedSizeList } from 'react-window';
import { TokenWithChain } from 'ui/component';
import { splitNumberByStep, useHover } from 'ui/utils';
import useConfirmExternalModal from './ConfirmOpenExternalModal';

const Row = (props) => {
  const { data, index, style } = props;
  const token = data[index];
  const [isHovering, hoverProps] = useHover();
  const _openInTab = useConfirmExternalModal();
  const handleGotoProfile = () => {
    _openInTab(token?.site_url);
  };

  return (
    <div
      className={clsx('token-item pointer', isHovering && 'hover')}
      style={style}
      {...hoverProps}
      onClick={handleGotoProfile}
    >
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
const AssetsList = ({ assets, defiAnimate }) => {
  const fixedList = useRef<FixedSizeList>();

  return (
    <div className={clsx('tokenList', defiAnimate)}>
      <FixedSizeList
        height={468}
        width="100%"
        itemData={assets}
        itemCount={assets.length}
        itemSize={48}
        ref={fixedList}
        style={{ zIndex: 10, 'overflow-x': 'hidden' }}
      >
        {Row}
      </FixedSizeList>
    </div>
  );
};

export default AssetsList;
