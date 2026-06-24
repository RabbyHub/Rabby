import React, { useCallback, useMemo } from 'react';
import { openInTab } from 'ui/utils/webapi';
import { getChain, getTxScanLink } from '@/utils';
import { ReactComponent as RcIconCopyCC } from 'ui/assets/icon-copy-cc.svg';
import { copyTextToClipboard } from '@/ui/utils/clipboard';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';

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
    if (info) {
      const link = getTxScanLink(info?.scanLink, id);
      openInTab(link);
    }
  }, [info]);
  const { t } = useTranslation();
  return (
    <div className="ui tx-id-container flex items-center">
      <span className="tx-id-chain">{info?.name || 'Unknown'}</span>
      <a className="tx-id" onClick={handleScanClick}>
        {ellipsis(id)}
      </a>
      <RcIconCopyCC
        className="cursor-pointer ml-[4px] text-r-neutral-foot"
        onClick={() => {
          copyTextToClipboard(id);
          message.success(t('global.copied'));
        }}
      />
    </div>
  );
});
