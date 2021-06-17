import React, { useState } from 'react';
import * as ReactDOM from 'react-dom';
import { Input, Form, Button } from 'antd';
import { Modal } from 'ui/component';
import { WalletController } from 'background/controller/wallet';

interface AuthenticationModalProps {
  onFinished(): void;
  onCancel(): void;
  validationHandler?(password: string): Promise<void>;
  wallet: WalletController;
}

const AuthenticationModal = ({
  validationHandler,
  onFinished,
  onCancel,
  wallet,
}: AuthenticationModalProps) => {
  const [visible, setVisible] = useState(true);
  const [form] = Form.useForm();
  const handleSubmit = async ({ password }: { password: string }) => {
    try {
      if (validationHandler) {
        await validationHandler(password);
      } else {
        await wallet.verifyPassword(password);
      }
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

export default ({
  wallet,
  validationHandler,
}: {
  wallet: WalletController;
  validationHandler?(password: string): Promise<void>;
}) => {
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
        validationHandler={validationHandler}
        onFinished={resolve as () => void}
        onCancel={handleCancel}
        wallet={wallet}
      />,
      div
    );
  });
};
