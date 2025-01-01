import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Drawer, Input, Button, Form } from 'antd';
import { useWallet } from 'ui/utils';
import { UIContactBookItem } from 'background/service/contactBook';
import { Divide } from '@/ui/views/Approval/components/Divide';
import clsx from 'clsx';
import './style.less';

interface EditModalProps {
  address: string;
  visible: boolean;
  onOk(data: UIContactBookItem): void;
  onCancel(): void;
  isEdit: boolean;
}

const EditModal = ({ address, visible, onOk, onCancel }: EditModalProps) => {
  const { t } = useTranslation();
  const wallet = useWallet();
  const [name, setName] = useState<string | undefined>('');
  const inputRef = useRef<Input>(null);

  const handleConfirm = () => {
    if (!name) return;
    wallet.updateAlianName(address.toLowerCase(), name);
    onOk({ address, name });
  };

  const strLength = (str) => {
    let len = 0;
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i);
      if ((c >= 0x0001 && c <= 0x007e) || (0xff60 <= c && c <= 0xff9f)) {
        len++;
      } else {
        len += 2;
      }
    }
    return len;
  };

  const handleNameChange = (value: string) => {
    if (strLength(value) > 24) {
      return;
    }
    setName(value);
  };

  const init = async () => {
    if (address) {
      const alianName = await wallet.getAlianName(address);
      setName(alianName);
    }
  };

  const handleVisibleChange = async () => {
    if (visible) {
      setTimeout(() => {
        inputRef?.current?.focus();
      }, 200);
      const alianName = await wallet.getAlianName(address);
      setName(alianName || '');
    }
  };

  useEffect(() => {
    handleVisibleChange();
  }, [visible]);

  useEffect(() => {
    init();
  }, []);
  return (
    <Drawer
      className="edit-contact-modal-with-remove custom-popup is-support-darkmode"
      title={t('component.Contact.EditModal.title')}
      visible={visible}
      onClose={onCancel}
      placement="bottom"
      height="224px"
      destroyOnClose
    >
      <Form onFinish={handleConfirm} className="mt-[8px] mb-[28px]">
        <Input
          autoFocus
          allowClear
          value={name}
          // style={{ background: '#F5F6FA' }}
          onChange={(e) => handleNameChange(e.target.value)}
          ref={inputRef}
        />
      </Form>
      <Divide className="bg-r-neutral-line absolute left-0" />
      <div className="text-center flex gap-x-16 pt-20">
        <Button
          size="large"
          type="ghost"
          onClick={onCancel}
          className={clsx(
            'w-[200px]',
            'text-blue-light',
            'border-blue-light',
            'hover:bg-[#8697FF1A] active:bg-[#0000001A]',
            'before:content-none'
          )}
        >
          {t('global.Cancel')}
        </Button>
        <Button
          type="primary"
          className="w-[200px]"
          onClick={handleConfirm}
          size="large"
          disabled={!name}
        >
          {t('global.Confirm')}
        </Button>
      </div>
    </Drawer>
  );
};

export default EditModal;
