import React from 'react';
import { Button, Modal } from 'antd';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Close from '@/ui/assets/settings/update/close.svg';

export const FirstNoticeDialog = ({
  visible,
  version,
  updateContent,
  onClose,
}: {
  visible: boolean;
  version: string;
  updateContent: string;
  onClose: () => void;
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      title={
        <>
          <div className="first-notice-title">
            {t('page.dashboard.home.firstNotice.title')}
          </div>
          <div className="first-notice-version">v{version}</div>
        </>
      }
      className="first-notice"
      onCancel={onClose}
      centered
      width={360}
      closeIcon={<img src={Close} width={16} height={16} alt="" />}
      destroyOnClose
      maskStyle={{ background: 'rgba(0, 0, 0, 0.4)' }}
      footer={
        <Button
          type="primary"
          className="first-notice-button"
          block
          onClick={onClose}
        >
          {t('page.dashboard.home.firstNotice.gotIt')}
        </Button>
      }
    >
      <ReactMarkdown className="first-notice-notes" remarkPlugins={[remarkGfm]}>
        {updateContent}
      </ReactMarkdown>
    </Modal>
  );
};
