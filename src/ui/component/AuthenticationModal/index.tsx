import { Button, Form, Input } from 'antd';
import { WalletController } from 'background/controller/wallet';
import clsx from 'clsx';
import React, { useEffect, useRef, useState } from 'react';
import * as ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Popup } from 'ui/component';

interface AuthenticationModalProps {
  onFinished(): void;
  onCancel(): void;
  validationHandler?(password: string): Promise<void>;
  confirmText?: string;
  cancelText?: string;
  title?: string;
  wallet: WalletController;
}

const AuthenticationModal = ({
  validationHandler,
  onFinished,
  onCancel,
  wallet,
  cancelText,
  confirmText = 'Confirm',
  title = 'Enter Password',
}: AuthenticationModalProps) => {
  const [visible, setVisible] = useState(false);
  const [form] = Form.useForm();
  const { t } = useTranslation();
  const inputRef = useRef<Input>(null);
  const handleSubmit = async ({ password }: { password: string }) => {
    try {
      if (validationHandler) {
        await validationHandler(password);
      } else {
        await wallet.verifyPassword(password);
      }
      onFinished();
      setVisible(false);
    } catch (e: any) {
      form.setFields([
        {
          name: 'password',
          errors: [e?.message || t('incorrect password')],
        },
      ]);
    }
  };
  const handleCancel = () => {
    setVisible(false);
    onCancel();
  };

  useEffect(() => {
    setTimeout(() => {
      setVisible(true);
      inputRef.current?.focus();
    });
  }, []);

  return (
    <Popup visible={visible} title={title} onCancel={handleCancel} height={260}>
      <Form onFinish={handleSubmit} form={form}>
        <Form.Item
          name="password"
          rules={[{ required: true, message: t('Please input password') }]}
        >
          <Input
            className="popup-input"
            placeholder={t('Password')}
            type="password"
            size="large"
            autoFocus
            ref={inputRef}
            spellCheck={false}
          />
        </Form.Item>
        <div
          className={clsx(
            'flex pt-6 popup-footer px-20',
            cancelText ? 'justify-between' : 'justify-center'
          )}
        >
          {cancelText && (
            <Button
              size="large"
              type="primary"
              className="w-[172px] rabby-btn-ghost"
              ghost
              onClick={handleCancel}
            >
              {cancelText}
            </Button>
          )}
          <Button
            type="primary"
            size="large"
            htmlType="submit"
            className={clsx(cancelText ? 'w-[172px]' : 'w-[200px]')}
          >
            {confirmText}
          </Button>
        </div>
      </Form>
    </Popup>
  );
};

export const wrapModalPromise = (Component) => (props?) => {
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
      <Component
        onFinished={resolve as () => void}
        onCancel={handleCancel}
        {...props}
      />,
      div
    );
  });
};

const AuthenticationModalPromise = wrapModalPromise(AuthenticationModal);

export default AuthenticationModalPromise;
