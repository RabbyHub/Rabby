import React from 'react';
import { useEffect, useState, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { Input, Footer, Header, TiledSelect } from 'ui/component';
import { useWallet, useApproval } from 'ui/utils';

const VerifyMnemonics = ({ mnemonics, onBackClick }) => {
  const history = useHistory();

  const randomMnemonics = useMemo(
    () => mnemonics.split(' ').sort(() => -(Math.random() > 0.5)),
    [mnemonics]
  );

  const {
    control,
    formState: { isValid },
    handleSubmit,
  } = useForm({ mode: 'onChange' });

  const onSubmit = () => {
    history.push('/dashboard');
  };

  return (
    <>
      <Header
        title="Verify Mnemonics"
        subTitle="Please select the mnemonic words in order"
        className="mb-4"
      />
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="mt-4 mb-4">
          <Controller
            name="mnemonics"
            control={control}
            rules={{
              required: true,
              validate: (v) => v && v.join(' ') === mnemonics,
            }}
            render={({ field: { ref, ...props } }) => (
              <TiledSelect
                options={randomMnemonics}
                {...props}
                value={mnemonics.split(' ')}
              />
            )}
          />
        </div>
        <Footer.Nav nextDisabled={!isValid} onBackClick={onBackClick} />
      </form>
    </>
  );
};

const DisplayMnemonic = ({ mnemonics, onNextClick, onBackClick }) => (
  <>
    <Header
      title={'Back Up Your Mnemonics'}
      subTitle={'Back Up Your Mnemonics'}
      className="mb-4"
    />
    <div className="border bg-gray-100 font-bold text-gray-600 p-6">
      {mnemonics}
    </div>
    <Footer.Nav onNextClick={onNextClick} onBackClick={onBackClick} />
  </>
);

const CreateMnemonic = () => {
  const [showVerify, setShowVerify] = useState<boolean>(false);
  const [mnemonics, setMnemonics] = useState('');
  const history = useHistory();
  const wallet = useWallet();

  const getNewMnemonic = async () => {
    await wallet.createNewVaultAndKeychain();
    wallet.setup();

    const _mnemonics = await wallet.getCurrentMnemonics();

    setMnemonics(_mnemonics);
  };

  useEffect(() => {
    getNewMnemonic();
  }, []);

  const toggleVerify = () => {
    setShowVerify(!showVerify);
  };

  const handleBackClick = () => {
    wallet.clearKeyrings();
    history.goBack();
  };

  return showVerify ? (
    <VerifyMnemonics mnemonics={mnemonics} onBackClick={toggleVerify} />
  ) : (
    <DisplayMnemonic
      mnemonics={mnemonics}
      onNextClick={toggleVerify}
      onBackClick={handleBackClick}
    />
  );
};

export default CreateMnemonic;
