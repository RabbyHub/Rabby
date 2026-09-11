import React from 'react';
import { Modal } from 'antd';
import { ExtensionUpdateCard } from './ExtensionUpdateCard';

export const ExtensionUpdateDialog = ({
  visible,
  version,
  changelog,
  onClose,
  onUpdate,
}: {
  visible: boolean;
  version: string;
  changelog: string;
  onClose: () => void;
  onUpdate: () => Promise<void>;
}) => (
  <Modal
    visible={visible}
    onCancel={onClose}
    centered
    width={360}
    footer={null}
    closable={false}
    destroyOnClose
    maskClosable
    maskStyle={{ background: 'rgba(0, 0, 0, 0.4)' }}
    className="extension-update-dialog"
  >
    <div className="popup-settings extension-update-dialog-content">
      <ExtensionUpdateCard
        version={version}
        changelog={changelog}
        onUpdate={onUpdate}
        onClose={onClose}
        variant="dialog"
      />
    </div>
  </Modal>
);
