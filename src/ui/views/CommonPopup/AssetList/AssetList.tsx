import { useCommonPopupView } from '@/ui/utils';
import React, { useState } from 'react';
import { ChainList } from './ChainList';
import { TokenListView } from './TokenListView';

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
      <TokenListView className="mt-16" selectChainId={selectChainId} />
    </div>
  );
};
