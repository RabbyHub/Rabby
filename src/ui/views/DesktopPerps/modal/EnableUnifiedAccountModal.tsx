import React, { useState } from 'react';
import { Modal, Button } from 'antd';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { SvgIconCross } from 'ui/assets';
import { PopupContainer } from '@/ui/hooks/usePopupContainer';
import { ReactComponent as RcIconTips } from 'ui/assets/perps/IconTips.svg';

interface EnableUnifiedAccountModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<boolean | void>;
}

export const EnableUnifiedAccountModal: React.FC<EnableUnifiedAccountModalProps> = ({
  visible,
  onCancel,
  onConfirm,
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const ok = await onConfirm();
      if (ok !== false) {
        onCancel();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      onCancel={loading ? undefined : onCancel}
      footer={null}
      width={400}
      centered
      bodyStyle={{ padding: 0, height: '360px', maxHeight: '360px' }}
      maskStyle={{
        zIndex: 1000,
        backdropFilter: 'blur(8px)',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
      }}
      closeIcon={
        <SvgIconCross className="w-14 fill-current text-r-neutral-title-1" />
      }
      closable={!loading}
      maskClosable={!loading}
      keyboard={!loading}
      className="modal-support-darkmode desktop-perps-enable-unified-modal"
    >
      <PopupContainer>
        <div className="bg-r-neutral-bg-2 h-[360px] flex flex-col relative overflow-hidden">
          <div className="px-20 pt-16 flex-1 pb-20 flex flex-col">
            <h3 className="text-[20px] font-medium text-r-neutral-title-1 text-center mb-12">
              {t('page.perps.EnableUnifiedAccount.title')}
            </h3>

            <div className="text-13 text-r-neutral-body leading-[20px] mb-16">
              {t('page.perps.EnableUnifiedAccount.desc')}
            </div>

            <div
              className={clsx(
                'flex gap-8 rounded-[8px] bg-r-orange-light/20 p-12',
                'border border-solid border-r-orange-default/40'
              )}
            >
              <RcIconTips className="w-20 h-20 shrink-0 mt-2" />
              <div className="text-13 text-r-neutral-title-1 leading-[20px]">
                <div className="font-medium mb-4">
                  {t('page.perps.EnableUnifiedAccount.important')}
                </div>
                <div className="text-r-neutral-body">
                  {t('page.perps.EnableUnifiedAccount.importantTips')}
                </div>
              </div>
            </div>

            <div className="flex-1" />

            <div className="flex gap-12">
              <Button
                size="large"
                className="flex-1 h-[44px] rounded-[8px]"
                onClick={onCancel}
                disabled={loading}
              >
                {t('page.perps.EnableUnifiedAccount.cancel')}
              </Button>
              <Button
                size="large"
                type="primary"
                className="flex-1 h-[44px] rounded-[8px]"
                loading={loading}
                onClick={handleConfirm}
              >
                {t('page.perps.EnableUnifiedAccount.confirm')}
              </Button>
            </div>
          </div>
        </div>
      </PopupContainer>
    </Modal>
  );
};

export default EnableUnifiedAccountModal;
