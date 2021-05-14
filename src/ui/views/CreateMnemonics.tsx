import React from 'react';
import { useEffect, useState, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { Form } from 'antd';
import { StrayPageWithButton, TiledSelect } from 'ui/component';
import { useWallet, useApproval } from 'ui/utils';

const VerifyMnemonics = ({ mnemonics, onBackClick }) => {
  const history = useHistory();

  const randomMnemonics = useMemo(
    () => mnemonics.split(' ').sort(() => -(Math.random() > 0.5)),
    [mnemonics]
  );

  const onSubmit = () => {
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
      withDivider
    >
      <Form.Item name="mnemonics" rules={[{ required: true }]}>
        <TiledSelect options={randomMnemonics} />
      </Form.Item>
    </StrayPageWithButton>
  );
};

const DisplayMnemonic = ({ mnemonics, onNextClick, onBackClick }) => (
  <StrayPageWithButton
    header={{
      secondTitle: 'Back Up Your Mnemonics',
      subTitle: `Make sure you have backed up your mnemonics properly before clicking Next. Don't tell anyone the mnemonic`,
    }}
    hasBack
    withDivider
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

const CreateMnemonic = () => {
  const [showVerify, setShowVerify] = useState<boolean>(false);
  const [mnemonics, setMnemonics] = useState('');
  const history = useHistory();
  const wallet = useWallet();

  const getNewMnemonic = async () => {
    await wallet.createNewVaultInMnenomic();
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
