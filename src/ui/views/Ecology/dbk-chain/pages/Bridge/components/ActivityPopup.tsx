import { Popup } from '@/ui/component';
import { findChain } from '@/utils/chain';
import React from 'react';
import { Virtuoso } from 'react-virtuoso';

const ActivityItem = () => {
  const fromChain = findChain({ id: 1 });
  const targetChain = findChain({ id: 56 });
  return (
    <div className="mb-[20px] p-[16px] rounded-[8px] border-[1px] border-rabby-neutral-line hover:border-rabby-orange-DBK">
      <div className="flex items-center justify-between mb-[8px]">
        <div className="text-[15px] leading-[18px] font-bold text-r-neutral-title-1">
          Deposit
        </div>
        <div className="text-[15px] leading-[18px] font-bold text-r-neutral-title-1">
          0.001 ETH
        </div>
      </div>
      <div className="flex gap-[8px] items-center">
        <div className="flex gap-[6px]">
          <img src={fromChain?.logo} alt="" className="w-[16px] h-[16px]" />
          <div className="text-[13px] leading-[16px] text-r-neutral-body font-semibold">
            {fromChain?.name}
          </div>
        </div>
        <div className="flex gap-[6px]">
          <img src={targetChain?.logo} alt="" className="w-[16px] h-[16px]" />
          <div className="text-[13px] leading-[16px] text-r-neutral-body font-semibold">
            {targetChain?.name}
          </div>
        </div>
      </div>
      <div></div>
    </div>
  );
};

export const ActivityPopup = () => {
  return (
    <Popup title="Activities" visible height={540} closable>
      <div className="flex flex-col h-full">
        <Virtuoso
          style={{
            height: '100%',
          }}
          data={[1, 2]}
          itemContent={(_, item) => {
            return (
              <ActivityItem
              // data={item}
              // projectDict={item.projectDict}
              // cateDict={item.cateDict}
              // tokenDict={item.tokenDict || item.tokenUUIDDict || {}}
              // key={item.id}
              // onViewInputData={setFocusingHistoryItem}
              />
            );
          }}
          // endReached={loadMore}
          components={{
            Footer: () => {
              // if (loadingMore) {
              //   return <Loading count={4} active />;
              // }
              return null;
            },
          }}
        ></Virtuoso>
      </div>
    </Popup>
  );
};
