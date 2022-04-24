import clsx from 'clsx';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FixedSizeList } from 'react-window';
import { SvgIconLoading } from 'ui/assets';
import IconArrowUp from 'ui/assets/arrow-up.svg';
import IconOpenDeFi from 'ui/assets/dashboard/opendefi.png';
import { TokenWithChain } from 'ui/component';
import { openInTab, splitNumberByStep, useHover } from 'ui/utils';

const Row = (props) => {
  const { data, index, style, isExpand, setIsExpand } = props;
  const token = data[index];
  const [isHovering, hoverProps] = useHover();
  const handleGotoProfile = () => {
    openInTab(token?.site_url);
  };

  if (token.isShowExpand) {
    return (
      <div
        className="filter"
        style={style}
        onClick={() => setIsExpand((v) => !v)}
      >
        {!isExpand ? (
          <div className="flex justify-center items-center">
            {'Small deposits are hidden (<1%)'}
            <img src={IconArrowUp} className="rotate-180"></img>
          </div>
        ) : (
          <div className="flex justify-center items-center">
            {'Hide small deposits (<1%)'}
            <img src={IconArrowUp}></img>
          </div>
        )}
      </div>
    );
  }

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
        <div className="token-name opacity-100 text-13 font-medium flex">
          {token.name}
          {isHovering && (
            <img src={IconOpenDeFi} className="w-[14px] h-[14px] ml-8" />
          )}
        </div>
      </div>
      <div className="right">
        <div className="token-name opacity-100 font-medium text-13">
          ${splitNumberByStep((token.net_usd_value || 0).toFixed(2))}
        </div>
      </div>
    </div>
  );
};
const useExpandList = (assets) => {
  const [isExpand, setIsExpand] = useState(false);
  const total = useMemo(
    () => assets.reduce((t, item) => (item.net_usd_value || 0) + t, 0),
    [assets]
  );
  const filterPrice = total / 100;
  const isShowExpand = assets.some((item) => item.net_usd_value < filterPrice);

  const filterList = useMemo(() => {
    let result = isExpand
      ? assets
      : assets.filter((item) => item.net_usd_value >= filterPrice);
    if (isShowExpand) {
      result = result.concat([
        {
          isShowExpand: true,
        },
      ]);
    }
    return result;
  }, [isExpand, assets, isShowExpand]);

  return {
    isExpand,
    setIsExpand,
    filterList,
    filterPrice,
    isShowExpand,
  };
};
const AssetsList = ({
  assets,
  defiAnimate,
  startAnimate = false,
  isloading,
}) => {
  const { t } = useTranslation();
  const fixedList = useRef<FixedSizeList>();
  const { isExpand, setIsExpand, filterList } = useExpandList(assets);
  useEffect(() => {
    if (!isloading && assets.length > 0 && defiAnimate.includes('fadeIn')) {
      fixedList.current?.scrollToItem(0);
      setIsExpand(false);
    }
  }, [defiAnimate, isloading, assets]);
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
        <>
          <FixedSizeList
            height={468}
            width="100%"
            itemData={filterList}
            itemCount={filterList.length}
            itemSize={48}
            ref={fixedList}
            style={{ zIndex: 10, overflowX: 'hidden', paddingBottom: 50 }}
          >
            {(props) => (
              <Row {...props} isExpand={isExpand} setIsExpand={setIsExpand} />
            )}
          </FixedSizeList>
        </>
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
