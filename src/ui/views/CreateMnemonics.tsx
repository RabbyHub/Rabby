import React, { useEffect, useState, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
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

  const handleBackClick = () => {
    wallet.removePreMnemonics();
    history.replace('/no-address');
  };

  return (
    <StrayPageWithButton
      header={{
        secondTitle: 'Back Up Your Mnemonic',
        subTitle: `Make sure you have backed up your mnemonics properly before clicking Next. Don't tell anyone the mnemonic.`,
      }}
      hasBack
      hasDivider
      onNextClick={onNextClick}
      onBackClick={handleBackClick}
    >
      <div
        className="h-[180px] rounded-lg flex bg-white text-center items-center text-20 font-medium p-40"
        style={{ wordSpacing: '8px' }}
      >
        {mnemonics}
      </div>
      <div className="mt-16 text-red-light text-13 text-center px-40 font-medium">
        Be sure to save the mnemonic phrase, it cannot be retrieved after loss！
      </div>
    </StrayPageWithButton>
  );
};

const VerifyMnemonics = ({ mnemonics, onBackClick }) => {
  const history = useHistory();
  const wallet = useWallet();

  const randomMnemonics = useMemo(
    () => mnemonics.split(' ').sort(() => -(Math.random() > 0.5)),
    [mnemonics]
  );

  const onSubmit = async () => {
    const accounts = await wallet.createKeyringWithMnemonics(mnemonics);

    history.replace({
      pathname: '/import/success',
      state: {
        accounts,
        title: 'Successfully created',
      },
    });
  };

  return (
    <StrayPageWithButton
      header={{
        secondTitle: 'Verify Mnemonic',
        subTitle: 'Please select the mnemonic words in order',
      }}
      onSubmit={onSubmit}
      hasBack
      hasDivider
      onBackClick={onBackClick}
    >
      <Form.Item
        name="mnemonics"
        rules={[
          { required: true },
          {
            validator(_, value: []) {
              if (!value || !value.length || value.join(' ') === mnemonics) {
                return Promise.resolve();
              }
              return Promise.reject(new Error('*Verification failed'));
            },
          },
        ]}
      >
        <TiledSelect options={randomMnemonics} />
      </Form.Item>
    </StrayPageWithButton>
  );
};

export default CreateMnemonic;
