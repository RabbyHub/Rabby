import { useWallet } from '@/ui/utils';
import { message } from 'antd';
import React, { useEffect, useState } from 'react';
import IconDefaultMetamask from 'ui/assets/icon-default-metamask.svg';
import IconDefaultRabby from 'ui/assets/icon-default-rabby.svg';
import './style.less';

const DefaultWalletSetting = () => {
  const [isConflict, setIsConflict] = useState(false);
  const [isDefault, setIsDefault] = useState(true);
  const wallet = useWallet();

  const init = () => {
    wallet.isDefaultWallet().then(setIsDefault);
    wallet.getHasOtherProvider().then(setIsConflict);
  };

  const handleFlip = async (e: React.MouseEvent) => {
    e.preventDefault();
    handleSubmit();
  };

  const handleSubmit = async () => {
    await wallet.setIsDefaultWallet(!isDefault);
    setIsDefault(!isDefault);
    message.success({
      icon: <i />,
      content: (
        <span className="text-white">Refresh the web page to take effect</span>
      ),
      duration: 2,
    });
  };

  useEffect(() => {
    init();
  }, []);

  if (!isConflict) {
    return null;
  }
  if (isDefault) {
    return (
      <>
        <div className="rabby-default-wallet-setting">
          <img
            src={IconDefaultRabby}
            alt=""
            className="w-[20px] h-[20px] mr-[8px]"
          />
          Rabby is in use and Metamask is banned
          <a href="#" onClick={handleFlip}>
            Flip
          </a>
        </div>
      </>
    );
  }
  return (
    <>
      <div className="rabby-default-wallet-setting is-metamask">
        <img
          src={IconDefaultMetamask}
          alt=""
          className="w-[20px] h-[20px] mr-[8px]"
        />
        MetaMask is in use and Rabby is banned
        <a href="#" onClick={handleFlip}>
          Flip
        </a>
      </div>
    </>
  );
};

export default DefaultWalletSetting;
