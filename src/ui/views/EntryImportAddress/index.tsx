import React from 'react';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Field, StrayPage } from 'ui/component';

import EntryImportAddressLogo from 'ui/assets/import/entry-import-address.svg';
import ArrowLeftWhiteBack from 'ui/assets/import/arrow-left-white.svg';

import IconMnemonics from 'ui/assets/import/mnemonics.svg';
import IconPrivatekey from 'ui/assets/import/privatekey.svg';
import IconKeystore from 'ui/assets/import/keystore.svg';

import IconEntryRightIcon from 'ui/assets/import/entry-right-icon.svg';

import { useMedia } from 'react-use';
import clsx from 'clsx';
import { connectStore } from '@/ui/store';

import './index.less';

const EntryImportAddress = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const isWide = useMedia('(min-width: 401px)');

  return (
    <StrayPage
      noPadding
      className={clsx('import-watchmode', isWide && 'rabby-stray-page')}
    >
      <header className="create-new-header entry-import-address h-[234px] res">
        <div className="rabby-container flex justify-center items-center flex-col">
          <img
            className="w-[128px] h-[128px] mb-28 mx-auto"
            src={EntryImportAddressLogo}
          />
          <div
            className="absolute left-20 top-20 w-20 h-20 cusor-pointer"
            onClick={() => history.goBack()}
          >
            <img
              className="back-btn w-[7.5px] h-[15px] leading-[20px] inline-block"
              src={ArrowLeftWhiteBack}
            />
          </div>

          <p className="text-24 absolute bottom-[2px] text-white text-center font-bold">
            {t('Select Import Method')}
          </p>
          <img
            src="/images/entry-import-mask.png"
            className="mask left-[64%] top-[10%]"
          />
        </div>
      </header>
      <div className="rabby-container pt-32">
        <div className="import-action-entries px-20">
          <Field
            className="w-[100%] mb-12"
            leftIcon={<img src={IconMnemonics} className={clsx('icon')} />}
            rightIcon={
              <img src={IconEntryRightIcon} className="right-chevron-icon" />
            }
            onClick={() => history.push('/import/mnemonics')}
            unselect
          >
            {t('Import Seed Phrase')}
          </Field>

          <Field
            className="w-[100%] mb-12"
            leftIcon={<img src={IconPrivatekey} className={clsx('icon')} />}
            rightIcon={
              <img src={IconEntryRightIcon} className="right-chevron-icon" />
            }
            onClick={() => history.push('/import/key')}
            unselect
          >
            {t('Import Private Key')}
          </Field>

          <Field
            className="w-[100%] mb-12"
            leftIcon={<img src={IconKeystore} className={clsx('icon')} />}
            rightIcon={
              <img src={IconEntryRightIcon} className="right-chevron-icon" />
            }
            onClick={() => history.push('/import/json')}
            unselect
          >
            {t('Import Keystore')}
          </Field>
        </div>
      </div>
    </StrayPage>
  );
};

export default connectStore()(EntryImportAddress);
