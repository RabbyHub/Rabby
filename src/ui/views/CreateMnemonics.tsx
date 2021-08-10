import React, { useEffect, useState, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Form } from 'antd';
import { StrayPageWithButton, TiledSelect } from 'ui/component';
import { useWallet } from 'ui/utils';

const CreateMnemonic = () => {
  const [showVerify, setShowVerify] = useState<boolean>(false);
  const [mnemonics, setMnemonics] = useState('');
  const wallet = useWallet();

  const init = async () => {
    const _mnemonics =
      (await wallet.getPreMnemonics()) || (await wallet.generatePreMnemonic());

    setMnemonics(_mnemonics);
  };

  useEffect(() => {
    init();
  }, []);

  const toggleVerify = () => {
    setShowVerify(!showVerify);
  };

  return showVerify ? (
    <VerifyMnemonics mnemonics={mnemonics} onBackClick={toggleVerify} />
  ) : (
    <DisplayMnemonic mnemonics={mnemonics} onNextClick={toggleVerify} />
  );
};

const DisplayMnemonic = ({ mnemonics, onNextClick }) => {
  const wallet = useWallet();
  const history = useHistory();
  const { t } = useTranslation();

  const handleBackClick = () => {
    wallet.removePreMnemonics();
    history.replace('/');
  };

  return (
    <StrayPageWithButton
      hasBack
      hasDivider
      onNextClick={onNextClick}
      onBackClick={handleBackClick}
      noPadding
    >
      <header className="create-new-header create-password-header h-[180px]">
        <img
          className="rabby-logo"
          src="/images/logo-gray.png"
          alt="rabby logo"
        />
        <p className="text-24 mb-4 mt-32 text-white text-center font-bold">
          {t('Back Up Your Mnemonic')}
        </p>
        <p className="text-14 mb-0 mt-4 text-white opacity-80 text-center">
          {t('backupMnemonicTip')}
        </p>
      </header>
      <div className="px-20 pt-60">
        <div
          className="h-[180px] rounded-lg flex bg-white text-center items-center text-20 font-medium p-40"
          style={{ wordSpacing: '8px' }}
        >
          {mnemonics}
        </div>
        <div className="mt-16 text-red-light text-13 text-center px-40 font-medium">
          {t('backupMnemonicAlert')}
        </div>
      </div>
    </StrayPageWithButton>
  );
};

const VerifyMnemonics = ({
  mnemonics,
  onBackClick,
}: {
  mnemonics: string;
  onBackClick(): void;
}) => {
  const history = useHistory();
  const wallet = useWallet();
  const { t } = useTranslation();
  const [errMsg, setErrMsg] = useState('');

  const randomMnemonics = useMemo(
    () => mnemonics.split(' ').sort(() => Math.random() - 0.5),
    [mnemonics]
  );

  const onSubmit = async (values: { mnemonics: string[] }) => {
    if (!values.mnemonics || values.mnemonics.length <= 0) {
      setErrMsg(t('Please select words'));
      return;
    }
    if (values.mnemonics.join(' ') !== mnemonics) {
      setErrMsg(t('Verification failed'));
      return;
    }
    const accounts = await wallet.createKeyringWithMnemonics(mnemonics);

    history.replace({
      pathname: '/import/success',
      state: {
        accounts,
        title: t('Successfully created'),
      },
    });
  };

  return (
    <StrayPageWithButton
      formProps={{
        validateTrigger: 'onBlur',
      }}
      onSubmit={onSubmit}
      hasBack
      hasDivider
      onBackClick={onBackClick}
      noPadding
    >
      <header className="create-new-header create-password-header h-[160px]">
        <img
          className="rabby-logo"
          src="/images/logo-gray.png"
          alt="rabby logo"
        />
        <p className="text-24 mb-4 mt-32 text-white text-center font-bold">
          {t('Verify Mnemonic')}
        </p>
        <p className="text-14 mb-0 mt-4 text-white opacity-80 text-center">
          {t('Please select the mnemonic words in order')}
        </p>
      </header>
      <div className="pt-20 px-20 w-screen">
        <Form.Item name="mnemonics">
          <TiledSelect
            options={randomMnemonics}
            errMsg={errMsg}
            correctValue={mnemonics.split(' ')}
            onClear={() => setErrMsg('')}
          />
        </Form.Item>
      </div>
    </StrayPageWithButton>
  );
};

export default CreateMnemonic;
