import { useCommonPopupView } from '@/ui/utils';
import React, { useState } from 'react';
import { ChainList } from './ChainList';
import { AssetListContainer } from './AssetListContainer';

export const AssetList = () => {
  const { setHeight } = useCommonPopupView();
  const [selectChainId, setSelectChainId] = useState<string | null>(null);
  const handleSelectChainChange = (id: string | null) => {
    setSelectChainId(id);
  };

  React.useEffect(() => {
    setHeight(494);
  }, []);

  return (
    <div>
      <ChainList onChange={handleSelectChainChange} />
      <AssetListContainer className="mt-16" selectChainId={selectChainId} />
    </div>
  );
};
