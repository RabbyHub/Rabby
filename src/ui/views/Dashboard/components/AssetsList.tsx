import clsx from 'clsx';
import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FixedSizeList } from 'react-window';
import { TokenWithChain } from 'ui/component';
import { splitNumberByStep, useHover, openInTab } from 'ui/utils';
import { SvgIconLoading } from 'ui/assets';

const Row = (props) => {
  const { data, index, style } = props;
  const token = data[index];
  const [isHovering, hoverProps] = useHover();
  const handleGotoProfile = () => {
    openInTab(token?.site_url);
  };

  return (
    <div
      className={clsx('token-item pointer', isHovering && 'hover')}
      style={style}
      {...hoverProps}
      onClick={handleGotoProfile}
    >
      <TokenWithChain
        token={token}
        height={'24px'}
        width={'24px'}
        noRound
        hideConer
      />
      <div className="middle">
        <div className="token-name text-13 font-medium">{token.name}</div>
      </div>
      <div className="right">
        <div className="token-name font-medium text-13">
          ${splitNumberByStep((token.asset_usd_value || 0).toFixed(4))}
        </div>
      </div>
    </div>
  );
};
const AssetsList = ({
  assets,
  defiAnimate,
  startAnimate = false,
  isloading,
}) => {
  const { t } = useTranslation();
  const fixedList = useRef<FixedSizeList>();
  if (!startAnimate) {
    return <></>;
  }
  return (
    <div className={clsx('tokenList', defiAnimate)}>
      {isloading && (
        <div className="loadingContainer">
          <SvgIconLoading className="icon icon-loading" fill="#FFFFFF" />
          <div className="loading-text">{t('Loading Protocols')}</div>
        </div>
      )}
      {!isloading && assets.length > 0 ? (
        <FixedSizeList
          height={468}
          width="100%"
          itemData={assets}
          itemCount={assets.length}
          itemSize={48}
          ref={fixedList}
          style={{ zIndex: 10, 'overflow-x': 'hidden', paddingBottom: 50 }}
        >
          {Row}
        </FixedSizeList>
      ) : (
        <div className="no-data">
          <img className="w-[100px] h-[100px]" src="./images/nodata-tx.png" />
          <div className="loading-text">{t('No Protocols')}</div>
        </div>
      )}
    </div>
  );
};

export default AssetsList;
