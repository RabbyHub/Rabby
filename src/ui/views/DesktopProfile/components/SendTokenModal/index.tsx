import { Modal, ModalProps } from 'antd';
import React, { useMemo } from 'react';
import SendToken from '../../../SendToken';
import SendPoly from '../../../SendPoly';
import WhitelistInput from '../../../WhitelistInput';
import { useLocation } from 'react-router-dom';

export const SendTokenModal: React.FC<ModalProps> = (props) => {
  const location = useLocation();
  const sendPageType =
    new URLSearchParams(location.search).get('sendPageType') || 'sendPoly';

  const SendPage = useMemo(() => {
    if (sendPageType === 'sendToken') {
      return <SendToken />;
    } else if (sendPageType === 'sendPoly') {
      return <SendPoly />;
    } else if (sendPageType === 'whitelistInput') {
      return <WhitelistInput />;
    }
    // 默认返回 SendPoly 组件，避免返回 undefined
    return <SendPoly />;
  }, [sendPageType]);

  return (
    <Modal
      {...props}
      className="desktop-swap-token-modal"
      width={400}
      title={null}
      bodyStyle={{ background: 'transparent', maxHeight: 'unset', padding: 0 }}
      maskClosable={false}
      footer={null}
    >
      {SendPage}
    </Modal>
  );
};
