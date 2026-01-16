import React from 'react';
import { Modal, Button, message } from 'antd';
import clsx from 'clsx';
import { PerpsBlueBorderedButton } from '@/ui/views/Perps/components/BlueBorderedButton';
import { ReactComponent as ImgDeleteWarning } from '@/ui/assets/perps/ImgDeleteWarning.svg';
import { useTranslation } from 'react-i18next';

interface OpenDeleteAgentModalParams {
  isDarkTheme: boolean;
  onConfirm: () => Promise<void>;
}

export const openDeleteAgentModal = ({
  isDarkTheme,
  onConfirm,
}: OpenDeleteAgentModalParams) => {
  const { t } = useTranslation();
  const modal = Modal.info({
    width: 360,
    closable: false,
    maskClosable: true,
    centered: true,
    title: null,
    bodyStyle: {
      padding: 0,
    },
    className: clsx(
      'perps-bridge-swap-modal perps-close-all-position-modal',
      isDarkTheme
        ? 'perps-bridge-swap-modal-dark'
        : 'perps-bridge-swap-modal-light'
    ),
    content: (
      <>
        <div className="flex items-center justify-center flex-col gap-12 bg-r-neutral-bg2 rounded-lg p-20">
          <ImgDeleteWarning />
          <div className="text-15 font-medium text-r-neutral-title-1 text-center">
            {t('page.perps.deleteAgentModal')}
          </div>
          <div className="flex items-center justify-center w-full gap-12 mt-20">
            <PerpsBlueBorderedButton
              block
              onClick={() => {
                modal.destroy();
              }}
            >
              {t('page.manageAddress.cancel')}
            </PerpsBlueBorderedButton>
            <Button
              size="large"
              block
              type="primary"
              onClick={async () => {
                try {
                  await onConfirm();
                  message.success({
                    duration: 1.5,
                    content: t('page.perps.deleteAgentSuccess'),
                  });
                  modal.destroy();
                } catch (error) {
                  message.error({
                    duration: 1.5,
                    content: error.message || 'Delete agent failed',
                  });
                }
              }}
            >
              {t('page.manageAddress.confirm')}
            </Button>
          </div>
        </div>
      </>
    ),
  });
};
