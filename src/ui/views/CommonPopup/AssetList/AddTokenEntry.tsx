import React from 'react';

import { ReactComponent as RcAddEntryCC } from './icons/add-entry-cc.svg';
import clsx from 'clsx';
import { AddCustomTokenPopup } from './CustomAssetList/AddCustomTokenPopup';

export default function AddTokenEntry({
  onConfirm,
}: {
  onConfirm: React.ComponentProps<typeof AddCustomTokenPopup>['onConfirm'];
}) {
  const [isShowAddModal, setIsShowAddModal] = React.useState<boolean>(false);

  return (
    <>
      <div
        className={clsx(
          'flex flex-row justify-start items-center',
          'px-[14px] py-[8px] bg-r-neutral-card2 rounded-[6px] cursor-pointer',
          'text-r-neutral-body text-[13px] text-center',
          'whitespace-nowrap'
        )}
        onClick={() => {
          setIsShowAddModal(true);
        }}
      >
        <RcAddEntryCC className="text-r-neutral-body w-[14px] h-[14px] mr-[4px]" />
        <span>Add Tokens</span>
      </div>

      <AddCustomTokenPopup
        visible={isShowAddModal}
        onClose={() => {
          setIsShowAddModal(false);
        }}
        onConfirm={() => {
          setIsShowAddModal(false);
          // refreshAsync();
          onConfirm?.();
        }}
      />
    </>
  );
}
