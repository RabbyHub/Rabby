import React, { useEffect, useState } from 'react';
import './style.less';
import IconDefaultRabby from 'ui/assets/icon-default-rabby.svg';
import IconDefaultMetamask from 'ui/assets/icon-default-metamask.svg';
import IconRabby from 'ui/assets/dashboard/rabby.svg';
import IconMetamask from 'ui/assets/dashboard/icon-metamask.svg';
import { Checkbox, Popup } from '@/ui/component';
import { Button } from 'antd';
import { useWallet } from '@/ui/utils';

const DefaultWalletSetting = () => {
  const [visible, setVisible] = useState(false);
  const [isConflict, setIsConflict] = useState(false);
  const [isDefault, setIsDefault] = useState(true);
  const [needCheck, setNeedCheck] = useState(true);
  const wallet = useWallet();

  const init = () => {
    wallet.isDefaultWallet().then(setIsDefault);
    wallet.getHasOtherProvider().then(setIsConflict);
    wallet.getNeedSwitchWalletCheck().then(setNeedCheck);
  };

  const handleFlip = async (e) => {
    e.preventDefault();
    if (needCheck) {
      setVisible(true);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    await wallet.setIsDefaultWallet(!isDefault);
    setIsDefault(!isDefault);
    setVisible(false);
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
            className="w-[24px] h-[24px] mr-[8px]"
          />
          Rabby is in use and Metamask is banned
          <a href="#" onClick={handleFlip}>
            Flip
          </a>
        </div>
        <Popup
          visible={visible}
          className="rabby-default-wallet-setting-modal"
          height={348}
          onCancel={() => setVisible(false)}
          title={
            <div className="flex items-center justify-center gap-[8px]">
              <img src={IconMetamask} className="w-[24px] h-[24px]" alt="" />
              Flip to use MetaMask
            </div>
          }
        >
          <div className="desc">
            It has been detected that you also installed MetaMask. Your current
            default wallet is Rabby. Please confirm if you want to flip to use
            MetaMask as your default wallet.
          </div>
          <div className="checkbox">
            <Checkbox
              checked={!needCheck}
              width={'16px'}
              height={'16px'}
              onChange={(v) => {
                wallet.updateNeedSwitchWalletCheck(!v);
                setNeedCheck(!v);
              }}
            >
              Do not remind me again
            </Checkbox>
          </div>
          <div className="footer">
            <Button
              type="primary"
              ghost
              className="rabby-btn-ghost"
              block
              size="large"
              onClick={() => setVisible(false)}
            >
              Cancel
            </Button>
            <Button type="primary" block size="large" onClick={handleSubmit}>
              Confirm
            </Button>
          </div>
        </Popup>
      </>
    );
  }
  return (
    <>
      <div className="rabby-default-wallet-setting is-metamask">
        <img
          src={IconDefaultMetamask}
          alt=""
          className="w-[24px] h-[24px] mr-[8px]"
        />
        MetaMask is in use and Rabby is banned
        <a href="#" onClick={handleFlip}>
          Flip
        </a>
      </div>
      <Popup
        visible={visible}
        className="rabby-default-wallet-setting-modal is-flip-to-rabby"
        height={348}
        onCancel={() => setVisible(false)}
        title={
          <div className="flex items-center justify-center gap-[8px]">
            <img src={IconRabby} className="w-[24px] h-[24px]" alt="" />
            Flip to use Rabby
          </div>
        }
      >
        <div className="desc">
          It has been detected that you also installed MetaMask. Your current
          default wallet is MetaMask. Please confirm if you want to flip to use
          Rabby as your default wallet.
        </div>
        <div className="checkbox">
          <Checkbox
            checked={!needCheck}
            width={'16px'}
            height={'16px'}
            onChange={(v) => {
              wallet.updateNeedSwitchWalletCheck(!v);
              setNeedCheck(!v);
            }}
          >
            Do not remind me again
          </Checkbox>
        </div>
        <div className="footer">
          <Button
            type="primary"
            ghost
            className="rabby-btn-ghost"
            block
            size="large"
            onClick={() => setVisible(false)}
          >
            Cancel
          </Button>
          <Button type="primary" block size="large" onClick={handleSubmit}>
            Confirm
          </Button>
        </div>
      </Popup>
    </>
  );
};

export default DefaultWalletSetting;
