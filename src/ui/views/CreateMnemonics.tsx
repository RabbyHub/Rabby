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
        title: 'Verify Mnemonics',
        subTitle: 'Please select the mnemonic words in order',
      }}
      onSubmit={onSubmit}
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
      title: 'Back Up Your Mnemonics',
      subTitle: 'Back Up Your Mnemonics',
    }}
  >
    <div className="border bg-gray-100 font-bold text-gray-600 p-6">
      {mnemonics}
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
