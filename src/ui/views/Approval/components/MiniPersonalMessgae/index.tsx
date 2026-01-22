import {
  KEYRING_TYPE,
  INTERNAL_REQUEST_SESSION,
  KEYRING_CLASS,
} from '@/constant';
import { useEnterPassphraseModal } from '@/ui/hooks/useEnterPassphraseModal';
import { CHAINS } from '@debank/common';
import { useMemoizedFn } from 'ahooks';
import { DrawerProps } from 'antd';
import { noop } from 'lodash';
import React, { useEffect, useMemo } from 'react';
import { MiniFooterBar } from '../MiniSignTx/MiniFooterBar';

import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { Popup } from '@/ui/component';
import { MiniApprovalPopupContainer } from '../Popup/MiniApprovalPopupContainer';
import { ReactComponent as LedgerSVG } from 'ui/assets/walletlogo/ledger.svg';
import { ReactComponent as OneKeySVG } from 'ui/assets/walletlogo/onekey.svg';
import { useTranslation } from 'react-i18next';
import { isLedgerLockError } from '@/ui/utils/ledger';
import {
  BatchSignPersonalMessageTaskType,
  MiniPersonalMessage,
  useBatchSignPersonalMessageTask,
} from './useBatchPersonalMessageTask';
import { Account } from '@/background/service/preference';

export const MiniSignPersonalMessage = ({
  txs,
  onReject,
  onResolve,
  onStatusChange,
  directSubmit,
  getContainer,
  account,
}: {
  txs: MiniPersonalMessage[];
  onReject?: () => void;
  onResolve?: (hash: string[]) => void;
  onStatusChange?: (status: BatchSignPersonalMessageTaskType['status']) => void;
  getContainer?: DrawerProps['getContainer'];
  directSubmit?: boolean;
  account?: Account;
}) => {
  const { t } = useTranslation();
  const _currentAccount = useCurrentAccount();
  const currentAccount = account || _currentAccount;

  const task = useBatchSignPersonalMessageTask({});

  const invokeEnterPassphrase = useEnterPassphraseModal('address');

  const handleAllow = useMemoizedFn(async () => {
    if (currentAccount?.type === KEYRING_TYPE.HdKeyring) {
      await invokeEnterPassphrase(currentAccount.address);
    }

    if (!txs?.length) {
      return;
    }
    const hash = await task.start();
    onResolve?.(hash);
  });

  const brandIcon = useMemo(() => {
    switch (currentAccount?.type) {
      case KEYRING_CLASS.HARDWARE.LEDGER: {
        return LedgerSVG;
      }
      case KEYRING_CLASS.HARDWARE.ONEKEY: {
        return OneKeySVG;
      }
      default: {
        return null;
      }
    }
  }, [currentAccount?.type]);

  useEffect(() => {
    task.init(
      txs.map((item) => ({
        tx: item,
        status: 'idle',
        options: {
          account,
        },
      }))
    );
  }, []);
  useEffect(() => {
    onStatusChange?.(task.status);
  }, [task.status]);

  const content = useMemo(() => {
    return t('page.signFooterBar.qrcode.txFailed');
  }, [task?.error]);

  const desc = useMemo(() => {
    let msg = task.error;

    const getLedgerError = (description: string) => {
      if (isLedgerLockError(description)) {
        return t('page.signFooterBar.ledger.unlockAlert');
      } else if (
        description.includes('0x6e00') ||
        description.includes('0x6b00')
      ) {
        return t('page.signFooterBar.ledger.updateFirmwareAlert');
      } else if (description.includes('0x6985')) {
        return t('page.signFooterBar.ledger.txRejectedByLedger');
      }

      return description;
    };
    if (currentAccount?.type === KEYRING_CLASS.HARDWARE.LEDGER) {
      msg = getLedgerError(msg);
    }
    return msg;
  }, [task.error, currentAccount?.type]);

  return (
    <>
      <Popup
        height={'fit-content'}
        visible={!!task.error}
        bodyStyle={{ padding: 0 }}
        getContainer={getContainer}
        push={false}
      >
        <MiniApprovalPopupContainer
          hdType={
            currentAccount!.type === KEYRING_CLASS.HARDWARE.LEDGER
              ? 'wired'
              : 'privatekey'
          }
          brandIcon={brandIcon}
          status={'FAILED'}
          content={content}
          description={desc}
          onCancel={onReject}
          onRetry={async () => {
            const hash = await task.retry();
            onResolve?.(hash);
          }}
        />
      </Popup>
      <MiniFooterBar
        account={currentAccount || undefined}
        directSubmit={directSubmit}
        hasShadow={false}
        origin={INTERNAL_REQUEST_SESSION.origin}
        originLogo={INTERNAL_REQUEST_SESSION.icon}
        // TODO: REMOVE chain
        chain={CHAINS.ETH}
        onCancel={() => onReject?.()}
        onSubmit={handleAllow}
        isTestnet={false}
        onIgnoreAllRules={noop}
        task={task as any}
        disabledProcess={false}
      />
    </>
  );
};
