import { Modal, ModalProps } from 'antd';
import React, { useMemo } from 'react';
import SendToken from '../../../SendToken';
import WhitelistInput from '../../../WhitelistInput';
import { useLocation } from 'react-router-dom';
import SendNFT from '@/ui/views/SendNFT';
import { ReactComponent as RcIconClose } from '@/ui/assets/dapp-search/cc-close.svg';

export const SendNftModal: React.FC<ModalProps> = (props) => {
  const location = useLocation();
  const sendPageType =
    new URLSearchParams(location.search).get('sendPageType') || 'sendNft';

  const SendPage = useMemo(() => {
    if (sendPageType === 'sendNft') {
      return <SendNFT />;
    } else if (sendPageType === 'sendPoly') {
      return <SendToken />;
    } else if (sendPageType === 'whitelistInput') {
      return <WhitelistInput />;
    }
    return <SendNFT />;
  }, [sendPageType]);

  return (
    <Modal
      {...props}
      className="modal-support-darkmode"
      width={400}
      title={null}
      bodyStyle={{ background: 'transparent', maxHeight: 'unset', padding: 0 }}
      footer={null}
      zIndex={1000}
      maskStyle={{ zIndex: 1000 }}
      closeIcon={
        <RcIconClose viewBox="0 0 14 14" className="h-[20px] w-[20px]" />
      }
      destroyOnClose
    >
      {SendPage}
    </Modal>
  );
};
