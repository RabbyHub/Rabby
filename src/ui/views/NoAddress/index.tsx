import React from 'react';
import { AddAddressOptions, BlueHeader } from 'ui/component';
// import './style.less';
import { useTranslation } from 'react-i18next';
import {
  PageBody,
  PageContainer,
  PageHeader,
  PageHeading,
} from 'ui/component/PageContainer';

const NoAddress = () => {
  const { t } = useTranslation();

  return (
    <>
      <PageContainer>
        <PageHeader showBackButton={false}>
          <PageHeading center>{t('page.newAddress.title')}</PageHeading>
        </PageHeader>

        <PageBody>
          <AddAddressOptions />
        </PageBody>
      </PageContainer>

      {/*<div className="no-address">
        <BlueHeader
          fixed
          showBackIcon={false}
          className="mx-[-20px]"
          fillClassName="mb-[20px]"
        >
          {t('page.newAddress.title')}
        </BlueHeader>
        <AddAddressOptions />
      </div>*/}
    </>
  );
};

export default NoAddress;
