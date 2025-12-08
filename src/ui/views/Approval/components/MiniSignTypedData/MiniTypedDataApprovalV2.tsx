import React, { useMemo } from 'react';
import {
  useTypedDataSignatureStore,
  typedDataSignatureStore,
} from '@/ui/component/MiniSignV2/state';
import { Modal, Popup } from '@/ui/component';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { CHAINS, INTERNAL_REQUEST_SESSION, KEYRING_CLASS } from '@/constant';
import { MiniApprovalPopupContainer } from '../Popup/MiniApprovalPopupContainer';
import { ReactComponent as LedgerSVG } from 'ui/assets/walletlogo/ledger.svg';
import { ReactComponent as OneKeySVG } from 'ui/assets/walletlogo/onekey.svg';
import { useTranslation } from 'react-i18next';
import { isLedgerLockError } from '@/ui/utils/ledger';
import { MiniFooterBar } from '../MiniSignTx/MiniFooterBar';
import { noop } from 'lodash';
import { PopupContainer } from '@/ui/hooks/usePopupContainer';
import clsx from 'clsx';

export const MiniTypedDataApprovalV2: React.FC<{
  isDesktop?: boolean;
}> = ({ isDesktop }) => {
  const { t } = useTranslation();
  const { isDarkTheme } = useThemeMode();

  const state = useTypedDataSignatureStore();
  const { status, request, error, progress } = state;

  const currentAccount = request?.config.account;
  const config = request?.config;

  const handleClose = () => typedDataSignatureStore.close();
  const handleAllow = () => typedDataSignatureStore.retry();

  const hdType =
    currentAccount?.type === KEYRING_CLASS.HARDWARE.LEDGER
      ? 'wired'
      : 'privatekey';

  const brandIcon =
    currentAccount?.type === KEYRING_CLASS.HARDWARE.LEDGER
      ? LedgerSVG
      : currentAccount?.type === KEYRING_CLASS.HARDWARE.ONEKEY
      ? OneKeySVG
      : null;

  const content = useMemo(() => {
    return t('page.signFooterBar.qrcode.txFailed');
  }, []);

  const description = useMemo(() => {
    let msg = error || '';

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
  }, [error, currentAccount?.type]);

  const total = progress?.total ?? request?.txs?.length;

  // mock mini sign task
  const task = {
    status: status ? (status === 'signing' ? 'active' : status) : 'idle',
    error: null,
    list: [],
    init: () => {},
    start: () => Promise.resolve(''),
    retry: () => Promise.resolve(''),
    stop: () => {},
    currentActiveIndex: progress?.current || 0,
    total: total,
  } as any;

  if (!request || !request.config.account) {
    return null;
  }

  if (request.config.mode !== 'UI') {
    if (status === 'idle') {
      return null;
    }
  }

  const showPopup =
    request.config.mode === 'UI' || status === 'signing' || !!error;

  if (isDesktop && !config?.getContainer) {
    const desktopPortalClassName = 'desktop-mini-signer-typed-data';
    const desktopMiniSignerGetContainer = `.${desktopPortalClassName}`;
    return (
      <>
        <Popup
          height={'fit-content'}
          visible={status === 'error' && !!error}
          bodyStyle={{ padding: 0 }}
          getContainer={desktopMiniSignerGetContainer}
          push={false}
        >
          <MiniApprovalPopupContainer
            hdType={hdType}
            brandIcon={brandIcon}
            status={'FAILED'}
            content={content}
            description={description}
            onCancel={handleClose}
            onRetry={async () => {
              await typedDataSignatureStore.retry();
            }}
          />
        </Popup>
        <Modal
          visible={showPopup}
          onClose={() => handleClose()}
          maskClosable={false}
          closable={false}
          bodyStyle={{ padding: 0, maxHeight: 600, height: 600 }}
          destroyOnClose={false}
          forceRender
          maskStyle={{
            background: 'rgba(0,0,0,0.3)',
            backdropFilter: 'blur(8px)',
          }}
          key={`typedDate-${currentAccount?.address}-${currentAccount?.type}`}
          width={400}
          centered
          content
          className="modal-support-darkmode"
        >
          <PopupContainer>
            <div className={clsx(desktopPortalClassName)}>
              <MiniFooterBar
                className="rounded-none h-[600px] flex flex-col"
                directSubmit
                hasShadow={false}
                origin={INTERNAL_REQUEST_SESSION.origin}
                originLogo={INTERNAL_REQUEST_SESSION.icon}
                // TODO: REMOVE chain
                chain={CHAINS.ETH}
                onCancel={handleClose}
                onSubmit={handleAllow}
                isTestnet={false}
                onIgnoreAllRules={noop}
                task={task as any}
                disabledProcess={false}
                account={currentAccount || undefined}
                getContainer={desktopMiniSignerGetContainer}
                Header={
                  <>
                    <div className={clsx('flex-1 flex flex-col')}>
                      {request.config.title ? (
                        <div className="flex-1 flex flex-col gap-[22px] mb-16">
                          {request.config.title}
                        </div>
                      ) : null}
                    </div>
                    <div className="mt-auto" />
                  </>
                }
              />
            </div>
          </PopupContainer>
        </Modal>
      </>
    );
  }

  return (
    <>
      <Popup
        height={'fit-content'}
        visible={status === 'error' && !!error}
        bodyStyle={{ padding: 0 }}
        getContainer={config?.getContainer}
        push={false}
      >
        <MiniApprovalPopupContainer
          hdType={hdType}
          brandIcon={brandIcon}
          status={'FAILED'}
          content={content}
          description={description}
          onCancel={handleClose}
          onRetry={async () => {
            await typedDataSignatureStore.retry();
          }}
        />
      </Popup>
      <Popup
        placement="bottom"
        height="fit-content"
        className="is-support-darkmode"
        visible={status === 'signing'}
        onClose={handleClose}
        maskClosable={false}
        closable={false}
        bodyStyle={{
          padding: 0,
          // maxHeight: 160,
        }}
        push={false}
        forceRender
        destroyOnClose={false}
        maskStyle={{
          backgroundColor: !isDarkTheme ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.6)',
        }}
        getContainer={request.config.getContainer}
        key={`${currentAccount?.address}-${currentAccount?.type}`}
      >
        <MiniFooterBar
          // directSubmit={directSubmit}
          directSubmit
          hasShadow={false}
          origin={INTERNAL_REQUEST_SESSION.origin}
          originLogo={INTERNAL_REQUEST_SESSION.icon}
          // TODO: REMOVE chain
          chain={CHAINS.ETH}
          onCancel={handleClose}
          onSubmit={handleAllow}
          isTestnet={false}
          onIgnoreAllRules={noop}
          task={task as any}
          disabledProcess={false}
          account={currentAccount || undefined}
        />
      </Popup>
    </>
  );
};
