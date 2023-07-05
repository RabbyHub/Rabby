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
import LessPalette from '@/ui/style/var-defs';

import IconCheckboxChecked from 'ui/assets/send-token/modal/checkbox-checked.svg';
import IconCheckboxUnchecked from 'ui/assets/send-token/modal/checkbox-unchecked.svg';

interface ConfirmAddToWhitelistModalProps extends WrappedComponentProps {
  toAddr?: string;
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
`;

function ModalConfirmAddToContacts({
  toAddr = '',
  onFinished,
  onCancel,
  wallet,
  cancelText,
  confirmText = 'Confirm',
  title = 'Enter Password',
}: ConfirmAddToWhitelistModalProps) {
  const [visible, setVisible] = useState(false);
  const [form] = Form.useForm();
  const { t } = useTranslation();
  const inputRef = useRef<Input>(null);

  const [confirmToAddToWhitelist, setConfirmToAddToWhitelist] = useState(false);

  const handleSubmit = async ({ password }: { password: string }) => {
    try {
      await wallet.verifyPassword(password);

      if (confirmToAddToWhitelist) {
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
          errors: [e?.message || t('incorrect password')],
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
    <Popup visible={visible} title={title} onCancel={handleCancel} height={260}>
      <Form onFinish={handleSubmit} form={form}>
        <FormInputItem
          name="password"
          rules={[{ required: true, message: t('Please input password') }]}
        >
          <Input
            className="popup-input"
            placeholder={t('Enter the Password to Confirm')}
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
            'text-center text-[12px] cursor-pointer',
            `text-[${LessPalette['@color-body']}]`
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
          Add to whitelist
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

export const confirmAddToWhitelistModalPromise = wrapModalPromise<ConfirmAddToWhitelistModalProps>(
  ModalConfirmAddToContacts
);
