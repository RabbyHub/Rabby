import React, { useEffect, useMemo, useState } from 'react';
import { message } from 'antd';
import clsx from 'clsx';
import styled from 'styled-components';
import ClipboardJS from 'clipboard';
import { useTranslation } from 'react-i18next';
import { ContactBookItem } from 'background/service/contactBook';
import { PageHeader } from 'ui/component';
import { useWallet } from 'ui/utils';
import { ellipsis } from 'ui/utils/address';
import IconSuccess from 'ui/assets/success.svg';
import IconCopy from 'ui/assets/component/icon-copy.svg';

const ContactItemWrapper = styled.div`
  padding: 11px 16px;
  background-color: #f5f6fa;
  border-radius: 6px;
  margin-bottom: 8px;
  .name {
    font-weight: 500;
    font-size: 15px;
    line-height: 18px;
    margin-bottom: 0;
  }
  .address {
    font-weight: 400;
    font-size: 12px;
    line-height: 14px;
    margin: 0;
    display: flex;
  }
  .icon-copy {
    width: 14px;
    height: 14px;
    margin-left: 4px;
    cursor: pointer;
  }
  &:nth-last-child(1) {
    margin-bottom: 0;
  }
`;

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
    <ContactItemWrapper>
      <p className="name text-r-neutral-title1">{item.name}</p>
      <p className="address" title={item.address}>
        {ellipsis(item.address)}
        <img
          className="icon icon-copy"
          src={IconCopy}
          onClick={handleClickCopy}
        />
      </p>
    </ContactItemWrapper>
  );
};

const ContractListElement = styled.div`
  flex: 1;
  overflow: auto;
`;

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
      <ContractListElement>
        {contacts.map((contact) => (
          <ContactItem item={contact} key={contact.address} />
        ))}
        {NoData}
      </ContractListElement>
    </div>
  );
};

export default Contacts;
