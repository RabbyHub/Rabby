import React from 'react';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { Field, StrayPage } from 'ui/component';

import EntryImportAddressLogo from 'ui/assets/import/entry-import-address.svg';

import IconMnemonics from 'ui/assets/import/mnemonics.svg';
import IconPrivatekey from 'ui/assets/import/privatekey.svg';
import IconKeystore from 'ui/assets/import/keystore.svg';

import IconEntryRightIcon from 'ui/assets/import/entry-right-icon.svg';

import clsx from 'clsx';
import { connectStore } from '@/ui/store';
import IconBack from 'ui/assets/icon-back.svg';
import { openInternalPageInTab } from '@/ui/utils';

const ActionEntries = styled.div`
  border-radius: 6px;
  background-color: #fff;
  .action-item {
    border: 1px solid #ffffff;

    &:hover {
      border-color: var(--r-blue-default, #7084ff);
      background: var(--r-blue-light-1, #eef1ff);
    }

    .left-icon > img {
      width: 24px;
      height: 24px;
    }
  }
`;

const EntryImportAddress = () => {
  const { t } = useTranslation();
  const history = useHistory();

  return (
    <div className={clsx('import-watchmode', 'stray-page')}>
      <header className="create-new-header entry-import-address h-[234px] res">
        <div className="rabby-container flex justify-center items-center flex-col">
          <img
            className="absolute left-20 top-[16px] cursor-pointer"
            src={IconBack}
            alt="back"
            onClick={() => history.goBack()}
          />
          <img
            className="w-[128px] h-[128px] mb-28 mx-auto"
            src={EntryImportAddressLogo}
          />

          <p className="text-24 absolute bottom-[2px] text-white text-center font-bold">
            {t('page.newAddress.selectImportMethod')}
          </p>
        </div>
      </header>
      <div className="rabby-container pt-32">
        <ActionEntries className="import-action-entries mx-20">
          <Field
            className="w-[100%] action-item"
            leftIcon={<img src={IconMnemonics} className={clsx('icon')} />}
            rightIcon={
              <img src={IconEntryRightIcon} className="right-chevron-icon" />
            }
            onClick={() => openInternalPageInTab('import/mnemonics')}
          >
            {t('page.newAddress.importSeedPhrase')}
          </Field>

          <Field
            className="w-[100%] mt-0 action-item"
            leftIcon={<img src={IconPrivatekey} className={clsx('icon')} />}
            rightIcon={
              <img src={IconEntryRightIcon} className="right-chevron-icon" />
            }
            onClick={() => history.push('/import/key')}
          >
            {t('page.newAddress.importPrivateKey')}
          </Field>

          <Field
            className="w-[100%] mt-0 action-item"
            leftIcon={<img src={IconKeystore} className={clsx('icon')} />}
            rightIcon={
              <img src={IconEntryRightIcon} className="right-chevron-icon" />
            }
            onClick={() => history.push('/import/json')}
          >
            {t('page.newAddress.importKeystore')}
          </Field>
        </ActionEntries>
      </div>
    </div>
  );
};

export default connectStore()(EntryImportAddress);
