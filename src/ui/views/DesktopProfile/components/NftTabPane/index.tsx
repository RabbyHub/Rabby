import { Switch } from 'antd';
import clsx from 'clsx';
import { range } from 'lodash';
import React from 'react';
import { NftDetailModal } from './components/NftDetailModal';
import { CancelListingModal } from './components/CancelListingModal';
import { CreateListingModal } from './components/CreateListingModal';

export const NftTabPane = () => {
  return (
    <div className="py-[16px] px-[20px]">
      <header className="flex items-center justify-between mb-[16px]">
        <div className={clsx('rounded-[10px] p-[2px] bg-rb-neutral-bg-0')}>
          <div
            className={clsx(
              'py-[6px] px-[12px] rounded-[8px] bg-rb-neutral-foot',
              'text-rb-neutral-InvertHighlight text-[12px] leading-[14px] font-medium'
            )}
          >
            All (152)
          </div>
        </div>
        <label className="flex items-center gap-[6px] cursor-pointer">
          <Switch />
          <div className="text-rb-neutral-title-1 text-[14px] leading-[17px]">
            Hide Low-Value NFTs
          </div>
        </label>
      </header>
      <main>
        <div className="flex items-center flex-wrap gap-[12px]">
          {range(0, 100).map((i) => (
            <div
              key={i}
              className={clsx(
                'rounded-[8px] border-[1px] border-solid border-rb-neutral-line p-[2px]',
                'hover:border-rabby-blue-default cursor-pointer'
              )}
            >
              <div className="w-[198px] h-[198px] rounded-[4px] bg-rb-neutral-bg-4 relative">
                <img
                  src="https://www.larvalabs.com/cryptopunks/cryptopunk275.png"
                  alt="chain"
                  className={clsx(
                    'absolute top-[8px] left-[8px] w-[24px] h-[24px] rounded-full',
                    'border-[1px] border-solid border-white'
                  )}
                />
                <div
                  className={clsx(
                    'absolute top-[8px] right-[8px] rounded-[4px] py-[3px] px-[10px]',
                    'text-r-neutral-title2 font-medium text-[15px] leading-[18px]',
                    'bg-[rgba(0,0,0,0.5)]'
                  )}
                >
                  x5
                </div>
              </div>
              <div
                className={clsx(
                  'pt-[8px] px-[4px] pb-[12px]',
                  'text-[15px] leading-[18px] font-medium text-dark-rb-neutral-InvertHighlight truncate'
                )}
              >
                CryptoPunk #275
              </div>
            </div>
          ))}
        </div>
      </main>
      <NftDetailModal visible={false} />
      <CancelListingModal visible={false} />
      <CreateListingModal visible={true} />
    </div>
  );
};
