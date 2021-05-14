import React from 'react';
import { useHistory } from 'react-router-dom';
import { useWallet } from 'ui/utils';
import { Button } from 'antd';
import { ArrowLink, StrayHeader } from 'ui/component';

const Settings = () => {
  const wallet = useWallet();
  const history = useHistory();

  const lockWallet = async () => {
    await wallet.lockWallet();
    history.push('/unlock');
  };

  return (
    <>
      <StrayHeader title={'Settings'} />
      <Button
        block
        className="rounded-full mb-4 text-base"
        onClick={lockWallet}
      >
        Lock wallet
      </Button>
      <ArrowLink className="mt-6 font-semibold" to="/settings/address">
        Address management
      </ArrowLink>
      <ArrowLink className="mt-5 font-semibold" to="/settings/sites">
        Connect sites
      </ArrowLink>
      <ArrowLink className="mt-5 font-semibold" to="/import">
        import
      </ArrowLink>
    </>
  );
};

export default Settings;
