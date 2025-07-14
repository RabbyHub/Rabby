import React from 'react';
import { AddAddressOptions, BlueHeader } from 'ui/component';
import './style.less';
import { useTranslation } from 'react-i18next';
import {
  PageBody,
  PageContainer,
  PageHeader,
  PageHeading,
} from 'ui/component/PageContainer';

const AddAddress = () => {
  const { t } = useTranslation();

  return (
    <>
      <PageContainer>
        <PageHeader>
          <PageHeading>{t('page.newAddress.title')}</PageHeading>
        </PageHeader>

        <PageBody>
          <AddAddressOptions />
        </PageBody>
      </PageContainer>

      {/*<div className="add-address">
        <BlueHeader
          fixed
          className="mx-[-20px] h-[48px]"
          fillClassName="mb-[20px] h-[48px]"
        >
          {t('page.newAddress.title')}
        </BlueHeader>
        <AddAddressOptions />
      </div>*/}
    </>
  );
};

export default AddAddress;
