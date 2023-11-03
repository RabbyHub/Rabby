import React, { useState, useRef, useEffect } from 'react';

import styled from 'styled-components';
import { Button, Form, Input, message } from 'antd';
import { useTranslation } from 'react-i18next';

import {
  WrappedComponentProps,
  wrapModalPromise,
} from '@/ui/component/Modal/WrapPromise';
import { Popup } from '@/ui/component';
import clsx from 'clsx';
import { copyTextToClipboard } from '@/ui/utils/clipboard';

import IconCopy, {
  ReactComponent as RcIconCopy,
} from 'ui/assets/send-token/modal/copy.svg';
import IconSuccess, {
  ReactComponent as RcIconSuccess,
} from 'ui/assets/success.svg';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';

const StyledPopup = styled(Popup)`
  .ant-drawer-body {
    padding-top: 8px;
  }
`;

const FormInputItem = styled(Form.Item)`
  margin-bottom: 12px;

  &.ant-form-item-has-error {
    margin-bottom: 4px;
  }

  .ant-form-item-label {
    padding-bottom: 8px;
  }

  label.ant-form-item-required {
    font-size: 12px;
    font-style: normal;
    font-weight: 400;
    line-height: normal;
    color: var(--r-neutral-foot, #babec5);
    height: initial;

    &::before {
      display: none !important;
    }
  }
`;

interface ConfirmAddToContactsModalProps extends WrappedComponentProps {
  onFinished: (result: { contactAddrAdded: string }) => void;
  initAddressNote?: string;
  addrToAdd: string;
  confirmText?: string;
  cancelText?: string;
  title?: string;
  description?: string;
  checklist?: string[];
}

function ModalConfirmAddToContacts({
  onFinished,
  onCancel,
  wallet,
  initAddressNote,
  addrToAdd,
  cancelText,
  confirmText = 'Confirm',
  title = 'Enter Password',
}: ConfirmAddToContactsModalProps) {
  const [visible, setVisible] = useState(false);
  const [form] = Form.useForm();
  const { t } = useTranslation();
  const inputRef = useRef<Input>(null);

  useEffect(() => {
    if (visible) {
      form.setFieldsValue({ addressNote: initAddressNote });
    }
  }, [initAddressNote, visible]);

  const handleSubmit = async ({ addressNote }: { addressNote: string }) => {
    try {
      await wallet.addWatchAddressOnly(addrToAdd);
      await wallet.updateAlianName(addrToAdd, addressNote);

      message.success({
        icon: (
          <img
            src={IconSuccess}
            className="icon icon-success w-[16px] h-[16px]"
          />
        ),
        // Added as contacts
        content: (
          <span className="text-white">
            {t('page.sendToken.AddToContactsModal.addedAsContacts')}
          </span>
        ),
        duration: 3,
      });

      onFinished({ contactAddrAdded: addrToAdd });
      setVisible(false);
    } catch (e: any) {
      form.setFields([
        {
          name: 'addressNote',
          errors: [e?.message || t('page.sendToken.AddToContactsModal.error')],
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
    <StyledPopup
      visible={visible}
      title={title}
      onCancel={handleCancel}
      height={266}
      isSupportDarkMode
    >
      <Form onFinish={handleSubmit} form={form}>
        <FormInputItem
          // Edit address note
          label={t('page.sendToken.AddToContactsModal.editAddressNote')}
          name="addressNote"
          // Please enter address note
          rules={[
            {
              required: true,
              message: t(
                'page.sendToken.AddToContactsModal.editAddr.validator__empty'
              ),
            },
          ]}
        >
          <Input
            className="popup-input"
            // Enter Address Note
            placeholder={t(
              'page.sendToken.AddToContactsModal.editAddr.placeholder'
            )}
            type="text"
            size="large"
            autoFocus
            ref={inputRef}
            spellCheck={false}
          />
        </FormInputItem>
        <div
          className={clsx(
            'text-r-neutral-title-1',
            'font-medium text-[14px] flex justify-start items-center'
          )}
        >
          {addrToAdd}
          <ThemeIcon
            onClick={() => {
              copyTextToClipboard(addrToAdd).then(() => {
                message.success({
                  icon: <i />,
                  content: (
                    <div>
                      <div className="flex gap-4 mb-4">
                        <img src={IconSuccess} alt="" />
                        {t('global.copied')}
                      </div>
                      <div className="text-white">{addrToAdd}</div>
                    </div>
                  ),
                  duration: 0.5,
                });
              });
            }}
            src={RcIconCopy}
            className="ml-[4px] w-[14px] h-[14px] cursor-pointer"
          />
        </div>
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
    </StyledPopup>
  );
}

export const confirmAddToContactsModalPromise = wrapModalPromise<ConfirmAddToContactsModalProps>(
  ModalConfirmAddToContacts
);
