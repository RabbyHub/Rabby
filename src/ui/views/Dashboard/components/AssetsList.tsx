import clsx from 'clsx';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FixedSizeList } from 'react-window';
import { matomoRequestEvent } from '@/utils/matomo-request';
import IconArrowUp from 'ui/assets/arrow-up.svg';
import IconOpenDeFi from 'ui/assets/dashboard/opendefi.png';
import { Empty, TokenWithChain } from 'ui/component';
import { openInTab, splitNumberByStep, useHover } from 'ui/utils';
import { getKRCategoryByType } from '@/utils/transaction';
import { connectStore, useRabbySelector } from '@/ui/store';
import { Skeleton } from 'antd';

const _Row = (props) => {
  const { data, index, style, isExpand, setIsExpand, totalHidden } = props;
  const token = data[index];
  const [isHovering, hoverProps] = useHover();
  const currentAccount = useRabbySelector((s) => s.account.currentAccount);
  const handleGotoProfile = () => {
    matomoRequestEvent({
      category: 'ViewAssets',
      action: 'viewDefiDetail',
      label: [
        getKRCategoryByType(currentAccount?.type),
        currentAccount?.brandName,
        token?.id,
      ].join('|'),
      transport: 'beacon',
    });
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
            {`$${splitNumberByStep(
              totalHidden.toFixed(0)
            )} deposits are hidden`}
            <img src={IconArrowUp} className="rotate-180"></img>
          </div>
        ) : (
          <div className="flex justify-center items-center">
            {'Hide small deposits'}
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
        <div
          className="token-name opacity-100 font-medium text-13 max-w-[140px] truncate"
          title={splitNumberByStep((token.net_usd_value || 0).toFixed(2))}
        >
          ${splitNumberByStep((token.net_usd_value || 0).toFixed(2))}
        </div>
      </div>
    </div>
  );
};

const Row = connectStore()(_Row);

const calcFilterPrice = (assets) => {
  const total = assets.reduce((t, item) => (item.net_usd_value || 0) + t, 0);
  return Math.min(total * 0.001, 1000);
};
const calcIsShowExpand = (assets) => {
  const filterPrice = calcFilterPrice(assets);
  if (assets.length < 15) {
    return false;
  }
  if (
    assets.filter((item) => (item.net_usd_value || 0) < filterPrice).length < 3
  ) {
    return false;
  }
  return true;
};

const useExpandList = (assets) => {
  const [isExpand, setIsExpand] = useState(false);
  const total = useMemo(
    () => assets.reduce((t, item) => (item.net_usd_value || 0) + t, 0),
    [assets]
  );
  const filterPrice = useMemo(() => calcFilterPrice(assets), [assets]);
  const isShowExpand = useMemo(() => calcIsShowExpand(assets), [assets]);
  const totalHidden = useMemo(
    () =>
      assets.reduce((t, item) => {
        const price = item.net_usd_value || 0;
        if (price < filterPrice) {
          return t + price;
        }
        return t;
      }, 0),
    [assets, filterPrice]
  );

  const filterList = useMemo(() => {
    if (!isShowExpand) {
      return assets;
    }
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
  }, [isExpand, assets, isShowExpand, filterPrice]);

  return {
    isExpand,
    setIsExpand,
    filterList,
    filterPrice,
    isShowExpand,
    totalHidden,
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
  const { isExpand, setIsExpand, filterList, totalHidden } = useExpandList(
    assets
  );
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
    <div
      className={clsx(
        'tokenList',
        isloading && 'bg-transparent shadow-none backdrop-filter-none',
        defiAnimate
      )}
    >
      {isloading && (
        <div className="loadingContainer">
          {Array(8)
            .fill(1)
            .map((_, i) => (
              <Skeleton.Input
                key={i}
                active
                style={{
                  width: 360,
                  height: 32,
                  marginTop: 16,
                }}
              />
            ))}
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
              <Row
                {...props}
                isExpand={isExpand}
                setIsExpand={setIsExpand}
                totalHidden={totalHidden}
              />
            )}
          </FixedSizeList>
        </>
      ) : (
        <Empty
          desc={
            <span className="text-white opacity-80">
              {t('No assets found in supported DeFi protocols')}
            </span>
          }
          className="pt-[120px] w-full"
        ></Empty>
      )}
    </div>
  );
};

export default AssetsList;
