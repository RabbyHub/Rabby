import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Drawer, Input, Button, Form, message } from 'antd';
import { useWallet } from 'ui/utils';
import { ContactBookItem } from 'background/service/contactBook';
import IconSuccess from 'ui/assets/success.svg';
import './style.less';

interface EditModalProps {
  address: string;
  visible: boolean;
  onOk(data: ContactBookItem | null, type: string): void;
  onCancel(): void;
  isEdit: boolean;
  accountType: string;
}

const EditModal = ({
  address,
  visible,
  onOk,
  onCancel,
  isEdit = true,
  accountType = 'others',
}: EditModalProps) => {
  const { t } = useTranslation();
  const wallet = useWallet();
  const [name, setName] = useState('');
  const inputRef = useRef<Input>(null);

  const handleConfirm = () => {
    if (!name) return;
    if (isEdit) {
      wallet.updateContact({
        address,
        name,
      });
      wallet.updateAlianName(address.toLowerCase(), name);
    } else {
      wallet.addContact({
        address,
        name,
      });
      message.success({
        icon: <img src={IconSuccess} className="icon icon-success" />,
        content: t('Added to Contact'),
        duration: 1,
      });
    }
    onOk({ address, name }, accountType);
  };

  const handleRemoveContact = () => {
    wallet.removeContact(address);
    onOk(null, accountType);
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
    if (isEdit) {
      const contact = await wallet.getContactByAddress(address);
      const alianName = await wallet.getAlianName(address);
      setName(contact.name || alianName);
    }
  };

  const handleVisibleChange = async () => {
    if (visible) {
      setTimeout(() => {
        console.log(inputRef);
        inputRef?.current?.focus();
      }, 200);
      if (isEdit) {
        const contact = await wallet.getContactByAddress(address);
        const alianName = await wallet.getAlianName(address);
        setName(contact?.name || alianName || '');
      } else {
        setName('');
      }
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
      className={
        isEdit && accountType === 'others'
          ? 'edit-contact-modal-with-remove'
          : 'edit-contact-modal'
      }
      title={isEdit ? t('Edit address memo') : t('Add address memo')}
      visible={visible}
      onClose={onCancel}
      placement="bottom"
      height={isEdit && accountType === 'others' ? '245px' : '215px'}
      destroyOnClose
    >
      <Form onFinish={handleConfirm}>
        <Input
          autoFocus
          allowClear
          value={name}
          style={{ background: '#F5F6FA' }}
          onChange={(e) => handleNameChange(e.target.value)}
          ref={inputRef}
        />
      </Form>
      <div className="flex justify-center">
        <Button
          type="primary"
          className="mt-32 w-[200px]"
          onClick={handleConfirm}
          size="large"
          disabled={!name}
        >
          {t('Confirm')}
        </Button>
      </div>
      {isEdit && accountType === 'others' && (
        <div className="remove-btn">
          <Button type="link" onClick={handleRemoveContact}>
            {t('Remove from Contacts')}
          </Button>
        </div>
      )}
    </Drawer>
  );
};

export default EditModal;
