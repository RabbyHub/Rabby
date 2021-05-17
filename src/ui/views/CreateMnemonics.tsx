import React from 'react';
import { useEffect, useState, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { Form } from 'antd';
import { StrayPageWithButton, TiledSelect } from 'ui/component';
import { useWallet } from 'ui/utils';

const CreateMnemonic = () => {
  const [showVerify, setShowVerify] = useState<boolean>(false);
  const [mnemonics, setMnemonics] = useState('');
  const wallet = useWallet();

  useEffect(() => {
    const _mnemonics = wallet.generateMnemonic();

    setMnemonics(_mnemonics);
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

const DisplayMnemonic = ({ mnemonics, onNextClick }) => (
  <StrayPageWithButton
    header={{
      secondTitle: 'Back Up Your Mnemonics',
      subTitle: `Make sure you have backed up your mnemonics properly before clicking Next. Don't tell anyone the mnemonic`,
    }}
    hasBack
    hasDivider
    onNextClick={onNextClick}
  >
    <div
      className="h-[180px] rounded-lg flex bg-white text-center items-center text-20 font-medium mt-32 p-40"
      style={{ wordSpacing: '8px' }}
    >
      {mnemonics}
    </div>
    <div className="mt-16 text-red text-12 text-center px-40">
      Be sure to save the mnemonic phrase, it cannot be retrieved after loss！
    </div>
  </StrayPageWithButton>
);

const VerifyMnemonics = ({ mnemonics, onBackClick }) => {
  const history = useHistory();
  const wallet = useWallet();

  const randomMnemonics = useMemo(
    () => mnemonics.split(' ').sort(() => -(Math.random() > 0.5)),
    [mnemonics]
  );

  const onSubmit = async () => {
    await wallet.importMnemonics(mnemonics);
    history.push('/dashboard');
  };

  return (
    <StrayPageWithButton
      header={{
        secondTitle: 'Verify Mnemonics',
        subTitle: 'Please select the mnemonic words in order',
      }}
      onSubmit={onSubmit}
      hasBack
      hasDivider
      onBackClick={onBackClick}
      initialValues={{
        mnemonics: mnemonics.split(' '),
      }}
    >
      <Form.Item
        name="mnemonics"
        rules={[
          { required: true },
          {
            validator(_, value: []) {
              if (!value || value.join(' ') === mnemonics) {
                return Promise.resolve();
              }
              return Promise.reject(new Error('*Verification failed'));
            },
          },
        ]}
      >
        <TiledSelect className="h-[165px]" options={randomMnemonics} />
      </Form.Item>
    </StrayPageWithButton>
  );
};

export default CreateMnemonic;
