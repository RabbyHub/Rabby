import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { useCurrentAccount } from '../hooks/backgroundState/useAccount';
import { useCheckSeedPhraseBackup } from '../utils/useCheckSeedPhraseBackup';
import { useEnterPassphraseModal } from '../hooks/useEnterPassphraseModal';
import { useMemoizedFn } from 'ahooks';
import AuthenticationModal from './AuthenticationModal';
import { useWallet } from '../utils';
import React from 'react';
import { ReactComponent as RcIconInfoCC } from '@/ui/assets/dashboard/warning-cc.svg';
import { ReactComponent as RcIconArrowRightCC } from '@/ui/assets/dashboard/arrow-right-1-cc.svg';
import styled from 'styled-components';
import { UI_TYPE } from '@/constant/ui';
import { obj2query } from '../utils/url';
import browser from 'webextension-polyfill';

const AlertContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  background: var(--r-orange-light, #fff5e2);
  font-size: 13px;
  line-height: 16px;
  font-weight: 500;
  color: var(--r-orange-default, #ffb020);
  cursor: pointer;
`;

export const SeedPhraseBackupAlert: React.FC<{
  style?: React.CSSProperties;
  className?: string;
}> = ({ style, className }) => {
  const { t } = useTranslation();
  const history = useHistory();
  const wallet = useWallet();
  const currentAccount = useCurrentAccount();

  const { hasBackup } = useCheckSeedPhraseBackup(
    currentAccount?.address || '',
    {
      refreshOnWindowFocus: true,
    }
  );
  const invokeEnterPassphrase = useEnterPassphraseModal('address');
  const handleBackup = useMemoizedFn(async () => {
    let data = '';
    const address = currentAccount?.address;
    if (!address) {
      return;
    }
    if (UI_TYPE.isDesktop) {
      await wallet.setPageStateCache({
        path: '/dashboard',
        params: {
          action: 'address-backup',
          backupType: 'mneonics',
        },
        states: {
          action: 'address-backup',
        },
      });
      browser.action.openPopup();
      // history.push({
      //   pathname: `${history.location.pathname}`,
      //   search: `?${obj2query({
      //     action: 'address-backup',
      //     backupType: 'mneonics',
      //   })}`,
      //   state: {
      //     data: data,
      //   },
      // });
    } else {
      await AuthenticationModal({
        confirmText: t('global.confirm'),
        cancelText: t('global.Cancel'),
        title: t('page.addressDetail.backup-seed-phrase'),
        validationHandler: async (password: string) => {
          await invokeEnterPassphrase(address);

          data = await wallet.getMnemonics(password, address);
        },
        onFinished() {
          history.push({
            pathname: `/settings/address-backup/mneonics`,
            state: {
              data: data,
              goBack: true,
            },
          });
        },
        onCancel() {
          // do nothing
        },
        wallet,
      });
    }
  });

  if (hasBackup) {
    return null;
  }

  return (
    <AlertContainer style={style} className={className} onClick={handleBackup}>
      <RcIconInfoCC />
      <div className="truncate flex-1">
        {t('component.SeedPhraseBackupAlert.message')}
      </div>
      <RcIconArrowRightCC />
    </AlertContainer>
  );
};
