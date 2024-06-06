import React, { useState, useRef, useCallback, useLayoutEffect } from 'react';

import styled from 'styled-components';
import { Button, Form, Input } from 'antd';
import { useTranslation } from 'react-i18next';

import {
  WrappedComponentProps,
  wrapModalPromise,
} from '@/ui/component/Modal/WrapPromise';
import { Field, Popup, Checkbox } from '@/ui/component';
import clsx from 'clsx';

import IconCheckboxChecked from 'ui/assets/send-token/modal/checkbox-checked.svg';
import IconCheckboxUnchecked from 'ui/assets/send-token/modal/checkbox-unchecked.svg';

interface ConfirmAllowTransferModalProps extends WrappedComponentProps {
  toAddr: string;
  showAddToWhitelist?: boolean;
  onFinished: (result: { confirmedToAddToWhitelist: boolean }) => void;
  confirmText?: string;
  cancelText?: string;
  title?: string;
  description?: string;
  checklist?: string[];
}

const FormInputItem = styled(Form.Item)`
  margin-bottom: 24px;

  &.ant-form-item-has-error {
    margin-bottom: 0;
  }
  .ant-input {
    &:focus {
      border-color: var(--r-blue-default, #7084ff);
    }
  }
`;

function ModalConfirmAllowTransfer({
  toAddr = '',
  showAddToWhitelist = false,
  onFinished,
  onCancel,
  wallet,
  cancelText,
  confirmText = 'Confirm',
  title = 'Enter Password',
}: ConfirmAllowTransferModalProps) {
  const [visible, setVisible] = useState(false);
  const [form] = Form.useForm();
  const { t } = useTranslation();
  const inputRef = useRef<Input>(null);

  const [confirmToAddToWhitelist, setConfirmToAddToWhitelist] = useState(false);

  const handleSubmit = async ({ password }: { password: string }) => {
    try {
      await wallet.verifyPassword(password);

      if (toAddr && confirmToAddToWhitelist) {
        await wallet.addWhitelist(password, toAddr);
      }
      onFinished({
        confirmedToAddToWhitelist: confirmToAddToWhitelist,
      });
      setVisible(false);
    } catch (e: any) {
      form.setFields([
        {
          name: 'password',
          errors: [e?.message || t('page.sendToken.allowTransferModal.error')],
        },
      ]);
    }
  };

  const handleCancel = useCallback(() => {
    setVisible(false);
    onCancel();
  }, [setVisible, onCancel]);

  useLayoutEffect(() => {
    setTimeout(() => {
      setVisible(true);
      inputRef.current?.focus();
    });
  }, []);

  return (
    <Popup
      visible={visible}
      title={title}
      onCancel={handleCancel}
      height={260}
      isSupportDarkMode
    >
      <Form onFinish={handleSubmit} form={form}>
        <FormInputItem
          name="password"
          // Please input password
          rules={[
            {
              required: true,
              message: t('page.sendToken.allowTransferModal.validator__empty'),
            },
          ]}
        >
          <Input
            className="popup-input"
            // Enter the Password to Confirm
            placeholder={t('page.sendToken.allowTransferModal.placeholder')}
            type="password"
            size="large"
            autoFocus
            ref={inputRef}
            spellCheck={false}
          />
        </FormInputItem>
        <p
          onClick={() => setConfirmToAddToWhitelist((prev) => !prev)}
          className={clsx(
            'text-center text-[12px] cursor-pointer text-r-neutral-foot',
            !showAddToWhitelist && 'hidden'
          )}
        >
          <img
            src={
              confirmToAddToWhitelist
                ? IconCheckboxChecked
                : IconCheckboxUnchecked
            }
            className="icon icon-check inline-block relative -top-1 mr-[4px]"
          />
          {/* Add to whitelist */}
          {t('page.sendToken.allowTransferModal.addWhitelist')}
        </p>
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
            disabled={false}
          >
            {confirmText}
          </Button>
        </div>
      </Form>
    </Popup>
  );
}

export const confirmAllowTransferToPromise = wrapModalPromise<ConfirmAllowTransferModalProps>(
  ModalConfirmAllowTransfer
);
