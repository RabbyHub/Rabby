import React, { useState } from 'react';
import * as ReactDOM from 'react-dom';
import { Input, Form, Button } from 'antd';
import { Modal } from 'ui/component';
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
  const [form] = Form.useForm();
  const handleSubmit = async ({ password }: { password: string }) => {
    try {
      await wallet.verifyPassword(password);
      onFinished();
      setVisible(false);
    } catch (e) {
      form.setFields([
        {
          name: 'password',
          errors: [e?.message || 'Wrong password'],
        },
      ]);
    }
  };
  const handleCancel = () => {
    setVisible(false);
    onCancel();
  };

  return (
    <Modal visible={visible} title="Enter Password" onCancel={handleCancel}>
      <Form onFinish={handleSubmit} form={form}>
        <Form.Item
          name="password"
          rules={[{ required: true, message: 'Please input password' }]}
        >
          <Input placeholder="Password" type="password" size="large" />
        </Form.Item>
        <div className="flex justify-center pt-6">
          <Button
            type="primary"
            size="large"
            htmlType="submit"
            className="w-[200px]"
          >
            View
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
