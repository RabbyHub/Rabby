import { useMemoizedFn, useRequest } from 'ahooks';
import { CHAINS_ENUM } from 'consts';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import { sleep, bindApproval, useApproval, useWallet } from 'ui/utils';
import { ConnectContent } from './ConnectContent';
import { EIP6963ProviderInfo, SelectWallet } from './SelectWallet';
import qs from 'qs';
import { PerpsInviteContent } from './PerpsInviteContent';

interface ConnectProps {
  params: any;
  onChainChange?(chain: CHAINS_ENUM): void;
  defaultChain?: CHAINS_ENUM;
  approvalId?: string;
}

const Connect = (props: ConnectProps) => {
  const {
    params: { icon, origin, name, $ctx },
    approvalId,
  } = props;
  const { state } = useLocation<{
    showChainsModal?: boolean;
  }>();
  const { showChainsModal = false } = state ?? {};
  const [, , rejectApproval] = useApproval(bindApproval(approvalId, 'Connect'));
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

  const [isShowHyperliquidInvite, setIsShowHyperliquidInvite] = useState(false);

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
      await sleep(150);
      rejectApproval();
    }
  );

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
      ) : isShowHyperliquidInvite ? (
        <PerpsInviteContent {...props} />
      ) : (
        <ConnectContent
          {...props}
          onPerpsInvite={(address) => {
            wallet.setPerpsInviteConfig(address, {
              lastConnectedAt: Date.now(),
            });
            setIsShowHyperliquidInvite(true);
          }}
        />
      )}
    </>
  );
};

export default Connect;
