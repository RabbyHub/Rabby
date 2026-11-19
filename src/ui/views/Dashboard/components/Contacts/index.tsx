import React, { useEffect, useMemo, useState } from 'react';
import { message } from 'antd';
import clsx from 'clsx';
import ClipboardJS from 'clipboard';
import { useTranslation } from 'react-i18next';
import { ContactBookItem } from 'background/service/contactBook';
import { PageHeader } from 'ui/component';
import { useWallet } from 'ui/utils';
import { ellipsis } from 'ui/utils/address';
import IconSuccess from 'ui/assets/success.svg';
import IconCopy from 'ui/assets/component/icon-copy.svg';
import styles from './index.module.css';

const ContactItem = ({ item }: { item: ContactBookItem }) => {
  const { t } = useTranslation();
  const handleClickCopy = () => {
    const clipboard = new ClipboardJS('.address', {
      text: function () {
        return item.address;
      },
    });
    clipboard.on('success', () => {
      message.success({
        duration: 3,
        icon: <i />,
        content: (
          <div>
            <div className="flex gap-4 mb-4">
              <img src={IconSuccess} alt="" />
              {t('global.copied')}
            </div>
            <div className="text-white">{item.address}</div>
          </div>
        ),
      });
      clipboard.destroy();
    });
  };
  return (
    <div className={styles.contactItem}>
      <p className="name text-r-neutral-title1">{item.name}</p>
      <p className="address" title={item.address}>
        {ellipsis(item.address)}
        <img
          className="icon icon-copy"
          src={IconCopy}
          onClick={handleClickCopy}
        />
      </p>
    </div>
  );
};

const Contacts = ({
  visible,
  onCancel,
}: {
  visible: boolean;
  onCancel(): void;
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [contacts, setContacts] = useState<ContactBookItem[]>([]);
  const { t } = useTranslation();
  const wallet = useWallet();

  const handleCancel = () => {
    setIsVisible(false);
    setTimeout(() => {
      onCancel();
    }, 500);
  };

  useEffect(() => {
    setTimeout(() => {
      setIsVisible(visible);
    }, 100);
  }, [visible]);

  const init = async () => {
    const list = await wallet.listContact(false);
    setContacts(list);
  };

  const NoData = useMemo(() => {
    if (contacts?.length) {
      return null;
    }
    return (
      <div className="mt-[80px] flex flex-col justify-center items-center">
        <img
          className="w-[100px] h-[100px]"
          src="/images/nodata-tx.png"
          alt={t('page.dashboard.contacts.noDataLabel')}
        />
        <p className="mt-[12px] text-14 text-r-neutral-body">
          {t('page.dashboard.contacts.noData')}
        </p>
      </div>
    );
  }, [contacts?.length]);

  useEffect(() => {
    init();
  }, []);

  return (
    <div
      className={clsx('openapi-modal flex flex-col', {
        show: isVisible,
        hidden: !visible,
      })}
    >
      <PageHeader forceShowBack onBack={handleCancel}>
        {t('page.dashboard.contacts.oldContactList')}
      </PageHeader>
      <div className="desc mb-20 text-r-neutral-body">
        {t('page.dashboard.contacts.oldContactListDescription')}
      </div>
      <div className="flex-1 overflow-auto">
        {contacts.map((contact) => (
          <ContactItem item={contact} key={contact.address} />
        ))}
        {NoData}
      </div>
    </div>
  );
};

export default Contacts;
