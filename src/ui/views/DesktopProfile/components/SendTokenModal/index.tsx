import { Modal, ModalProps } from 'antd';
import React, { useMemo } from 'react';
import SendToken from '../../../SendToken';
import SendPoly from '../../../SendPoly';
import WhitelistInput from '../../../WhitelistInput';
import { useLocation } from 'react-router-dom';
import { ModalCloseIcon } from '../TokenDetailModal';
import SelectToAddress from '@/ui/views/SelectToAddress';
import SendNFT from '@/ui/views/SendNFT';
import { DesktopSelectAccountList } from '@/ui/component/DesktopSelectAccountList';

export const SendTokenModal: React.FC<ModalProps> = (props) => {
  const location = useLocation();
  const sendPageType =
    new URLSearchParams(location.search).get('sendPageType') || 'sendToken';

  const SendPage = useMemo(() => {
    if (sendPageType === 'sendToken') {
      return <SendToken />;
    } else if (sendPageType === 'sendNft') {
      return <SendNFT />;
    } else if (sendPageType === 'selectToAddress') {
      return <SelectToAddress />;
    } else if (sendPageType === 'whitelistInput') {
      return <WhitelistInput />;
    }
    // 默认返回 SendPoly 组件，避免返回 undefined
    return <SendPoly />;
  }, [sendPageType]);

  return (
    <Modal
      {...props}
      className="desktop-swap-token-modal modal-support-darkmode"
      width={400}
      title={null}
      bodyStyle={{ background: 'transparent', maxHeight: 'unset', padding: 0 }}
      maskClosable={true}
      closeIcon={ModalCloseIcon}
      footer={null}
      zIndex={1000}
      destroyOnClose
      maskStyle={{
        zIndex: 1000,
        backdropFilter: 'blur(8px)',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
      }}
    >
      <div className="h-full w-full rounded-[20px] overflow-hidden">
        {SendPage}
      </div>
      <div className="absolute top-0 left-[100%] pl-[20px]">
        <DesktopSelectAccountList isInModal />
      </div>
    </Modal>
  );
};
