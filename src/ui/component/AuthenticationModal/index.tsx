import React, { useState } from 'react';
import * as ReactDOM from 'react-dom';
import { Modal, Input, Form, Button } from 'antd';
import { WalletController } from 'background/controller/wallet';

interface AuthenticationModalProps {
  onFinished(): void;
  onCancel(): void;
  wallet: WalletController;
}

const AuthenticationModal = ({
  onFinished,
  onCancel,
  wallet,
}: AuthenticationModalProps) => {
  const [visible, setVisible] = useState(true);
  const [error, setError] = useState<string>('');
  const handleSubmit = async ({ password }: { password: string }) => {
    try {
      await wallet.verifyPassword(password);
      onFinished();
      setVisible(false);
    } catch (e) {
      setError(e.message);
    }
  };
  const handleCancel = () => {
    setVisible(false);
    onCancel();
  };

  return (
    <Modal
      centered
      visible={visible}
      footer={null}
      title="Enter Password"
      onCancel={handleCancel}
    >
      <Form onFinish={handleSubmit}>
        <Form.Item
          name="password"
          rules={[{ required: true, message: 'Please input password' }]}
          validateStatus={error ? 'error' : undefined}
          help={error}
        >
          <Input placeholder="Password" type="password" size="large" />
        </Form.Item>
        <div className="flex justify-center">
          <Button
            type="primary"
            size="large"
            htmlType="submit"
            className="w-[200px]"
          >
            Confirm
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default (wallet: WalletController) => {
  const div = document.createElement('div');
  document.body.appendChild(div);
  return new Promise((resolve, reject) => {
    const handleCancel = () => {
      setTimeout(() => {
        ReactDOM.unmountComponentAtNode(div);
        div.parentElement?.removeChild(div);
      }, 1000);
      reject();
    };
    ReactDOM.render(
      <AuthenticationModal
        onFinished={resolve as () => void}
        onCancel={handleCancel}
        wallet={wallet}
      />,
      div
    );
  });
};
