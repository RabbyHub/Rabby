import React, { useImperativeHandle } from 'react';

import { ReactComponent as RcAddEntryCC } from './icons/add-entry-cc.svg';
import clsx from 'clsx';
import { AddCustomTokenPopup } from './CustomAssetList/AddCustomTokenPopup';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { TokenDetailPopup } from '@/ui/views/Dashboard/components/TokenDetailPopup';

export type AddTokenEntryInst = {
  startAddToken: () => void;
};
const AddTokenEntry = React.forwardRef<AddTokenEntryInst, { foo?: any }>(
  function AddTokenEntryPorto(_, ref) {
    const [isShowAddModal, setIsShowAddModal] = React.useState<boolean>(false);

    useImperativeHandle(ref, () => ({
      startAddToken: () => {
        setIsShowAddModal(true);
      },
    }));

    const [focusingToken, setFocusingToken] = React.useState<TokenItem | null>(
      null
    );

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
          onConfirm={(addedToken) => {
            setIsShowAddModal(false);
            setFocusingToken(addedToken?.token || null);
            // refreshAsync();
          }}
        />

        <TokenDetailPopup
          variant="add"
          token={focusingToken}
          visible={!!focusingToken}
          onClose={() => setFocusingToken(null)}
        />
      </>
    );
  }
);

export default AddTokenEntry;
