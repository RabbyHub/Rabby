import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { useRabbySelector } from '@/ui/store';
import { useCommonPopupView } from '@/ui/utils';
import clsx from 'clsx';
import { sortBy } from 'lodash';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

const COUNT = 5;

export const TestnetChainList = ({
  onChange,
}: {
  onChange(id: string | null): void;
}) => {
  const { data, visible } = useCommonPopupView();
  const chainList = useRabbySelector((store) =>
    sortBy(store.chains.testnetList, (item) => item.name)
  );
  const [showMore, setShowMore] = React.useState(false);
  const [activeChainId, setActiveChainId] = React.useState<string | null>(null);
  const { t } = useTranslation();

  const handleSelectChain = (id?: string) => {
    if (!id || activeChainId === id) {
      setActiveChainId(null);
      onChange(null);
    } else {
      setActiveChainId(id);
      onChange(id);
    }
  };

  const renderChainList = useMemo(() => {
    return showMore ? chainList : chainList.slice(0, COUNT);
  }, [showMore, chainList]);

  React.useEffect(() => {
    if (!visible) {
      setShowMore(false);
      handleSelectChain();
    }
  }, [visible]);

  const moreLen = chainList.length - COUNT;

  // if (balanceLoading) {
  //   return (
  //     <Skeleton.Input
  //       active
  //       className="block rounded-[6px] w-[360px] h-[68px] bg-r-neutral-card-2"
  //     />
  //   );
  // }

  return (
    <div
      className={clsx(
        'bg-r-neutral-card-2 rounded-[6px] p-[12px]',
        'flex gap-12 flex-wrap'
      )}
    >
      {renderChainList.map((item) => {
        const inactive =
          activeChainId !== null && activeChainId !== String(item.id);
        return (
          <div
            key={item.id}
            className={clsx('flex items-center gap-[6px] cursor-pointer', {
              'opacity-30': inactive,
            })}
            onClick={() => {
              handleSelectChain(item.network);
            }}
          >
            <img
              className={clsx('w-16 h-16 rounded-full')}
              src={item.logo}
              alt={item.name}
            />
            <div className="text-r-neutral-title1 text-[13px] leading-[16px] font-medium">
              {item.name}
            </div>
          </div>
        );
      })}
      {!showMore && moreLen > COUNT ? (
        <div
          className={clsx(
            'cursor-pointer text-12 underline text-r-neutral-foot leading-[20px]',
            {
              hidden: moreLen === 0,
            }
          )}
          onClick={() => {
            setShowMore(true);
          }}
        >
          {moreLen > 1
            ? t('page.dashboard.assets.unfoldChainPlural', { moreLen })
            : t('page.dashboard.assets.unfoldChain')}
        </div>
      ) : null}
    </div>
  );
};
