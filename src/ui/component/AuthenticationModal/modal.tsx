import { Button, Form, Input, Modal } from 'antd';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { ReactComponent as RcIconClose } from 'ui/assets/swap/modal-close.svg';
import { WrappedComponentProps, wrapModalPromise } from '../Modal/WrapPromise';

interface AuthenticationModalProps extends WrappedComponentProps {
  title?: string;
}

const PasswordFormItem = styled(Form.Item)`
  .ant-form-item-control {
    position: relative;
    overflow: visible;
  }

  .ant-form-item-explain {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    width: 100%;
  }
`;

const AuthenticationModal: React.FC<AuthenticationModalProps> = ({
  onFinished,
  onCancel,
  wallet,
  title,
}) => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const inputRef = useRef<Input>(null);

  useEffect(() => {
    inputRef.current?.focus?.();
  }, []);

  const closeAndReject = useCallback(() => {
    setVisible(false);
    onCancel();
  }, [onCancel]);

  const handleSubmit = useCallback(
    async ({ password }: { password: string }) => {
      try {
        setSubmitting(true);
        await wallet.verifyPassword(password);
        setVisible(false);
        onFinished();
      } catch (error) {
        if ((error as { errorFields?: unknown }).errorFields) {
          return;
        }
        form.setFields([
          {
            name: 'password',
            errors: [
              (error as { message?: string })?.message ||
                t('component.AuthenticationModal.passwordError'),
            ],
          },
        ]);
      } finally {
        setSubmitting(false);
      }
    },
    [form, onFinished, t, wallet]
  );

  return (
    <Modal
      visible={visible}
      centered
      width={400}
      onCancel={closeAndReject}
      destroyOnClose
      maskClosable={true}
      footer={null}
      closable={false}
      className="custom-popup is-support-darkmode authentication-modal"
    >
      <div className="mb-16 flex items-center">
        <div className="text-[20px] font-medium leading-[24px] text-r-neutral-title-1 text-center flex-1">
          {title || 'Enter Password'}
        </div>
        <button
          type="button"
          className="flex h-[20px] w-[20px] items-center justify-center rounded-full border-none bg-transparent p-0 text-r-neutral-foot transition-colors hover:text-r-neutral-title-1"
          onClick={closeAndReject}
        >
          <RcIconClose className="w-full h-full" />
        </button>
      </div>
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <PasswordFormItem
          name="password"
          rules={[
            {
              required: true,
              message: t('component.AuthenticationModal.passwordRequired'),
            },
          ]}
        >
          <Input
            ref={inputRef}
            spellCheck={false}
            autoFocus
            type="password"
            className="bg-r-neutral-card1 border-rabby-blue-default placeholder-r-neutral-foot h-[56px] text-15 rounded-[8px]"
            placeholder={t('component.AuthenticationModal.passwordPlaceholder')}
          />
        </PasswordFormItem>
        <Form.Item
          className="mt-[64px] mb-0"
          shouldUpdate={(prev, curr) => prev.password !== curr.password}
        >
          {() => (
            <Button
              type="primary"
              size="large"
              htmlType="submit"
              loading={submitting}
              disabled={!form.getFieldValue('password')?.trim?.()}
              className="w-full h-[48]"
            >
              {t('global.confirm')}
            </Button>
          )}
        </Form.Item>
      </Form>
    </Modal>
  );
};

const AuthenticationModalPromise = wrapModalPromise<AuthenticationModalProps>(
  AuthenticationModal
);

export default AuthenticationModalPromise;
