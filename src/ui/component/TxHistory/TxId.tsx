import React, { useCallback, useMemo } from 'react';
import { openInTab } from 'ui/utils/webapi';
import { getChain } from 'utils';

interface TxIdProps {
  id: string;
  chain: string;
}

const ellipsis = (text: string) => {
  return text.replace(/^(.{6})(.*)(.{4})$/, '$1...$3');
};

export const TxId = React.memo(({ chain, id }: TxIdProps) => {
  const info = useMemo(() => getChain(chain), [chain]);
  const handleScanClick = useCallback(() => {
    const link = info?.scanLink.replace(/_s_/, id);
    openInTab(link);
  }, [info]);
  return (
    <div className="ui tx-id-container">
      <span className="tx-id-chain">{info?.name || 'Unknown'}</span>
      <a className="tx-id" onClick={handleScanClick}>
        {ellipsis(id)}
      </a>
    </div>
  );
});
