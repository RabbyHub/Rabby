import React, { useState } from 'react';
import { Button } from 'antd';
import styled from 'styled-components';
import { PageHeader, Checkbox, Modal } from 'ui/component';
import AccountItem from './AccountItem';
import { IDisplayedAccountWithBalance } from 'ui/models/accountToDisplay';
import { isSameAddress } from 'ui/utils';
import { useTranslation } from 'react-i18next';

const EditWhitelistWrapper = styled.div`
  position: fixed;
  left: 0;
  top: 0;
  width: 100vw;
  height: 100vh;
  background: var(--r-neutral-bg-1, #3d4251);
  z-index: 100;
  padding: 0 12px 80px 20px;
  display: flex;
  flex-direction: column;
  .page-header {
    margin-bottom: 12px;
  }
`;

const ListScrollWrapper = styled.div`
  flex: 1;
  overflow: auto;
`;

const ListFooterWrapper = styled.div`
  height: 80px;
  padding: 20px 0;
  display: flex;
  justify-content: center;
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
`;

const AccountItemSelector = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  &:nth-last-child(1) {
    margin-bottom: 0;
  }
`;

interface Props {
  onCancel(): void;
  onConfirm(list: string[]): void;
  whitelist: string[];
  accountsList: IDisplayedAccountWithBalance[];
}

const EditWhitelist = ({
  onCancel,
  onConfirm,
  whitelist,
  accountsList,
}: Props) => {
  const [checkedList, setCheckedList] = useState<string[]>(whitelist);
  const [hasAnyChange, setHasAnyChange] = useState(false);

  const { t } = useTranslation();

  const handleClickBack = () => {
    if (hasAnyChange) {
      const modal = Modal.info({
        closable: false,
        className: 'page-receive-modal edit-whitelist-back-modal',
        content: (
          <div>
            <h1 className="text-gray-title text-center mb-12">
              {t('component.Contact.EditWhitelist.backModalTitle')}
            </h1>
            <p className="text-gray-subTitle text-center text-15 mb-[52px]">
              {t('component.Contact.EditWhitelist.backModalContent')}
            </p>
            <div className="footer">
              <Button
                type="primary"
                block
                onClick={() => {
                  modal.destroy();
                }}
              >
                {t('global.Cancel')}
              </Button>
              <Button
                type="primary"
                className="rabby-btn-ghost"
                ghost
                block
                onClick={() => {
                  modal.destroy();
                  onCancel();
                }}
              >
                {t('global.Confirm')}
              </Button>
            </div>
          </div>
        ),
      });
    } else {
      onCancel();
    }
  };

  const handleCheckAddress = (checked: boolean, address: string) => {
    setHasAnyChange(true);
    if (checked) {
      setCheckedList([...checkedList, address]);
    } else {
      setCheckedList(
        checkedList.filter((item) => !isSameAddress(item, address))
      );
    }
  };

  const handleSaveWhitelist = () => {
    onConfirm(checkedList);
  };

  return (
    <EditWhitelistWrapper>
      <PageHeader onBack={handleClickBack}>
        {t('component.Contact.EditWhitelist.title')}
      </PageHeader>
      <p className="text-r-neutral-body text-14 mb-20 text-center">
        {t('component.Contact.EditWhitelist.tip')}
      </p>
      <ListScrollWrapper>
        {accountsList.map((account) => (
          <AccountItemSelector>
            <Checkbox
              width="20px"
              height="20px"
              className="mr-12"
              background="#27C193"
              checked={
                !!checkedList.find((item) =>
                  isSameAddress(account.address, item)
                )
              }
              onChange={(checked) =>
                handleCheckAddress(checked, account.address)
              }
            />
            <AccountItem account={account} />
          </AccountItemSelector>
        ))}
      </ListScrollWrapper>
      <ListFooterWrapper>
        <Button
          type="primary"
          size="large"
          className="w-[215px] h-[40px] text-15"
          onClick={handleSaveWhitelist}
        >
          {t('component.Contact.EditWhitelist.save', {
            count: checkedList.length,
          })}
        </Button>
      </ListFooterWrapper>
    </EditWhitelistWrapper>
  );
};

export default EditWhitelist;
