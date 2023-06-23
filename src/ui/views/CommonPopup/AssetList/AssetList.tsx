import { useCommonPopupView } from '@/ui/utils';
import React from 'react';
import { ChainList } from './ChainList';
import { TokenListView } from './TokenListView';

export const AssetList = () => {
  const { setHeight } = useCommonPopupView();

  React.useEffect(() => {
    setHeight(494);
  }, []);

  return (
    <div>
      <ChainList />
      <TokenListView className="mt-16" />
    </div>
  );
};
