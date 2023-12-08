import React, { useState } from 'react';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { useWallet, openInTab } from 'ui/utils';
import { Modal } from 'ui/component';
import {
  WrappedComponentProps,
  wrapModalPromise,
} from 'ui/component/Modal/WrapPromise';
import { query2obj, obj2query } from 'ui/utils/url';

const ConfirmOpenExternalModal = ({
  onFinished,
  onCancel,
  origin = 'https://debank.com',
  wallet,
}: WrappedComponentProps<{
  origin?: string;
}>) => {
  const [visible, setVisible] = useState(true);
  const { t } = useTranslation();

  const handleCancel = () => {
    setVisible(false);
    onCancel();
  };

  const handleConfirm = () => {
    wallet.setExternalLinkAck(true);
    setVisible(false);
    onFinished();
  };

  return (
    <Modal
      className="modal-bg-white external-link-modal"
      visible={visible}
      title={null}
      closable={false}
      onCancel={handleCancel}
      width={312}
    >
      <div className="flex flex-col items-center pt-12">
        <div className="text-15 font-medium mb-12">
          {t('You will be visiting') + ' ' + origin}
        </div>
        <div className="text-12 text-r-neutral-body mb-20 px-16 text-center">
          {t('debankExternalLinkAlert')}
        </div>
        <Button
          type="primary"
          htmlType="submit"
          className="w-[140px]"
          onClick={handleConfirm}
        >
          {t('OK')}
        </Button>
      </div>
    </Modal>
  );
};

const funConfirmOpenExternalModal = wrapModalPromise(ConfirmOpenExternalModal);

const useConfirmExternalModal = () => {
  const wallet = useWallet();

  return async (url: string) => {
    const origin = url.split('?')[0];
    const openUrl =
      origin +
      '?' +
      obj2query({
        ...query2obj(url),
        utm_source: 'rabby',
      });
    if (await wallet.getExternalLinkAck()) {
      openInTab(openUrl);
      return;
    }

    funConfirmOpenExternalModal({ wallet }).then(() => {
      openInTab(openUrl);
    });
  };
};

export default useConfirmExternalModal;
