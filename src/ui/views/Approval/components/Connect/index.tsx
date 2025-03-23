import { ga4 } from '@/utils/ga4';
import { matomoRequestEvent } from '@/utils/matomo-request';
import { useMemoizedFn, useMount, useRequest } from 'ahooks';
import { CHAINS_ENUM } from 'consts';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import { sleep, useApproval, useWallet } from 'ui/utils';
import { ConnectContent } from './ConnectContent';
import { EIP6963ProviderInfo, SelectWallet } from './SelectWallet';
import qs from 'qs';

interface ConnectProps {
  params: any;
  onChainChange?(chain: CHAINS_ENUM): void;
  defaultChain?: CHAINS_ENUM;
}

const Connect = (props: ConnectProps) => {
  const {
    params: { icon, origin, name, $ctx },
  } = props;
  const { state } = useLocation<{
    showChainsModal?: boolean;
  }>();
  const { showChainsModal = false } = state ?? {};
  const [, , rejectApproval] = useApproval();
  const { t } = useTranslation();
  const wallet = useWallet();

  const history = useHistory();
  const location = useLocation();
  const query = useMemo(() => {
    return qs.parse(location.search, {
      ignoreQueryPrefix: true,
    });
  }, [location.search]);

  const [isShowSelectWallet, setIsShowSelectWallet] = useState(
    !!$ctx?.providers?.length && !query.ignoreOtherWallet
  );

  const handleSelectWallet = useMemoizedFn(
    async (info: EIP6963ProviderInfo) => {
      if (!info) {
        if (await wallet.isUnlocked()) {
          setIsShowSelectWallet(false);
        } else {
          history.replace(
            `/unlock?from=${encodeURIComponent(location.pathname)}`
          );
        }
        return;
      }
      await wallet.changeDappProvider({
        origin,
        icon,
        name,
        rdns: info.rdns,
      });
      matomoRequestEvent({
        category: 'Wallet Conflict',
        action: `OtherWallet_${info.name.trim().replace(/\s+/g, '')}`,
      });

      ga4.fireEvent(`OtherWallet_${info.name.trim().replace(/\s+/g, '')}`, {
        event_category: 'Wallet Conflict',
      });
      await sleep(150);
      rejectApproval();
    }
  );

  useMount(() => {
    if ($ctx?.providers?.length) {
      matomoRequestEvent({
        category: 'Wallet Conflict',
        action: 'OtherWallet_Show',
      });

      ga4.fireEvent('OtherWallet_Show', {
        event_category: 'Wallet Conflict',
      });
    }
  });

  return (
    <>
      {isShowSelectWallet ? (
        <SelectWallet
          onBack={() => {
            setIsShowSelectWallet(false);
          }}
          onSelect={handleSelectWallet}
          providers={$ctx?.providers || []}
        />
      ) : (
        <ConnectContent {...props} />
      )}
    </>
  );
};

export default Connect;
