import React from 'react';
import { useTranslation } from 'react-i18next';
import { EncodeQRCode } from './EncodeQRCode';
import { useWallet } from '../WalletContext';

export interface Props {}

export const SyncToMobile: React.FC<Props> = ({ children }) => {
  const { t } = useTranslation();
  const wallet = useWallet();
  const [vault, setVault] = React.useState<string>();

  React.useEffect(() => {
    const fetchVault = async () => {
      const _vault = await wallet.getVault();

      setVault(_vault);
    };

    fetchVault();
  }, [wallet]);

  return <div>{vault && <EncodeQRCode input={vault} />}</div>;
};
