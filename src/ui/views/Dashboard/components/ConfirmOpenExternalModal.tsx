import React, { useState } from 'react';
import { Button } from 'antd';
import { useWallet, openInTab } from 'ui/utils';
import { Modal, Checkbox, FallbackSiteLogo } from 'ui/component';
import { IconDebank } from 'ui/assets';
import { wrapModalPromise } from 'ui/component/AuthenticationModal';
import { WalletController } from 'background/controller/wallet';
import { query2obj, obj2query } from 'ui/utils/url';

const ConfirmOpenExternalModal = ({
  onFinished,
  onCancel,
  origin = 'https://debank.com',
  icon = IconDebank,
  wallet,
}: {
  onFinished(): void;
  onCancel(): void;
  wallet: WalletController;
  origin?: string;
  icon?: string;
}) => {
  const [visible, setVisible] = useState(true);
  const [checked, setChecked] = useState(false);

  const handleCancel = () => {
    setVisible(false);
    onCancel();
  };

  const handleConfirm = () => {
    if (checked) {
      wallet.setExternalLinkAck(true);
    }
    setVisible(false);
    onFinished();
  };

  return (
    <Modal
      className="modal-bg-white"
      visible={visible}
      title={null}
      closable={false}
      onCancel={handleCancel}
      classN
    >
      <div className="flex flex-col items-center pt-12 pb-8">
        <div className="text-15 font-medium mb-32">
          You will be visiting a third party website
        </div>
        <FallbackSiteLogo
          url={icon}
          origin={origin}
          width="48px"
          className="mb-12"
        />
        <div className="text-13 text-gray-subTitle mb-40">{origin}</div>
        <Checkbox checked={checked} onChange={setChecked} className="mb-20">
          <div className="text-14 text-gray-content">
            Don't remind me anymore
          </div>
        </Checkbox>
        <Button
          type="primary"
          size="large"
          htmlType="submit"
          className="w-[200px]"
          onClick={handleConfirm}
        >
          Ok
        </Button>
      </div>
    </Modal>
  );
};

const funConfirmOpenExternalModal = wrapModalPromise(ConfirmOpenExternalModal);

const useConfirmExternalModal = () => {
  const wallet = useWallet();

  return (url) => {
    const origin = url.split('?')[0];
    const openUrl =
      origin +
      '?' +
      obj2query({
        ...query2obj(url),
        utm_source: 'rabby',
      });
    if (wallet.getExternalLinkAck()) {
      openInTab(openUrl);
      return;
    }

    funConfirmOpenExternalModal({ wallet }).then(() => {
      openInTab(openUrl);
    });
  };
};

export default useConfirmExternalModal;
