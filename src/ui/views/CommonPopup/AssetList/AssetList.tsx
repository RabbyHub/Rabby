import { useCommonPopupView } from '@/ui/utils';
import React, { useState } from 'react';
import { ChainList } from './ChainList';
import { AssetListContainer } from './AssetListContainer';

export const AssetList = ({ visible }: { visible: boolean }) => {
  const { setHeight } = useCommonPopupView();
  const [selectChainId, setSelectChainId] = useState<string | null>(null);
  const handleSelectChainChange = (id: string | null) => {
    setSelectChainId(id);
  };

  React.useEffect(() => {
    setHeight(488);
  }, []);

  return (
    <div>
      <ChainList onChange={handleSelectChainChange} />
      <AssetListContainer
        className="mt-16"
        selectChainId={selectChainId}
        visible={visible}
      />
    </div>
  );
};
