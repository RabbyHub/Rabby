import React, { useState, useRef, useCallback, useLayoutEffect } from 'react';

import styled from 'styled-components';
import { Button, DrawerProps, Form, Input } from 'antd';
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
  getContainer?: DrawerProps['getContainer'];
}

const FormInputItem = styled(Form.Item)`
  margin-bottom: 24px;

  &.ant-form-item-has-error {
    margin-bottom: 0;
  }
  .ant-input.ant-input-lg.popup-input {
    border: 1px solid var(--r-neutral-line, #d3d8e0) !important;
    background: transparent !important;
    &::placeholder {
      color: var(--r-neutral-foot, #6a7587) !important;
    }
    &:focus,
    &:hover {
      border-color: var(--r-blue-default, #7084ff) !important;
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
  getContainer,
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
      if (!getContainer) {
        inputRef.current?.focus();
      } else {
        // may chrome bug, when focus popup in wrong position ?
        setTimeout(() => {
          inputRef.current?.focus();
        }, 500);
      }
    });
  }, []);

  return (
    <Popup
      visible={visible}
      title={title}
      onCancel={handleCancel}
      height={260}
      isSupportDarkMode
      getContainer={getContainer}
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
            autoFocus={!getContainer}
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
