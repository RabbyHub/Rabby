import React, { useState, useRef } from 'react';
import { Button, Checkbox, Form, Select } from 'antd';
import { StrayFooter, StrayHeader } from 'ui/component';
import { useWallet } from 'ui/utils';
import { IconLedger, IconOnekey, IconTrezor } from 'ui/assets';

const { Option } = Select;

const defaultHdPaths = {
  trezor: "m/44'/60'/0'/0",
  ledger: "m/44'/60'/0'/0/0",
};

const AccountChoose = ({
  accounts,
  hardware,
  handleNextPage,
  handlePreviousPage,
}) => {
  const wallet = useWallet();

  const onSubmit = ({ accounts }) => {
    console.log(hardware, accounts);
    wallet.unlockHardwareAccount(hardware, accounts);
  };

  return (
    <Form onFinish={onSubmit}>
      <div>
        <Form.Item
          name="accounts"
          rules={[{ required: true, message: 'Please select account' }]}
        >
          <Checkbox.Group>
            {accounts.map((o) => (
              <div key={o.index} className="flex align-middle">
                <div className="w-[10px] mr-4">
                  <Checkbox value={o.index} />
                </div>
                <div className="w-[10px] mr-4">{o.index}</div>
                <div className="flex-1" key={o.index}>
                  {o.address}
                </div>
              </div>
            ))}
          </Checkbox.Group>
        </Form.Item>
        <Button className="mr-12" onClick={handlePreviousPage}>
          previous
        </Button>
        <Button onClick={handleNextPage}>next</Button>
      </div>
    </Form>
  );
};

const HARDWARES = [
  {
    icon: IconLedger,
    label: 'Ledger',
  },
  {
    icon: IconTrezor,
    label: 'Trezor',
  },
  {
    icon: IconOnekey,
    label: 'Onekey',
  },
];

const ImportHardware = () => {
  const keyringRef = useRef<any>();
  const [accounts, setAccounts] = useState();
  const [error, setError] = useState();
  const wallet = useWallet();
  const [form] = Form.useForm();

  const handleNextPage = async () => {
    const accounts = await keyringRef.current.getNextPage();
    setAccounts(accounts);
  };

  const handlePreviousPage = async () => {
    const accounts = await keyringRef.current.getPreviousPage();
    setAccounts(accounts);
  };

  const onSubmit = async ({ hardware }: { hardware: string }) => {
    try {
      const keyring = await wallet.connectHardware(hardware);
      const accounts = await keyring.getFirstPage();
      keyringRef.current = keyring;
      setAccounts(accounts);
    } catch (err) {
      setError(err);
    }
  };

  return (
    <div className="bg-gray-bg w-[993px] h-[519px] mt-[150px] rounded-md mx-auto pt-[60px]">
      <StrayHeader
        title="Connect Hardware Wallet"
        subTitle="Select a hardware wallet you'd ike to use"
        center
        className="mb-[60px]"
      />
      <div className="flex mb-[60px]">
        {HARDWARES.map((hardware) => (
          <div key={hardware.label}>
            <div className="rounded-full w-[128px] h-[128px] bg-white">
              <img src={hardware.icon} />
            </div>
            <div>{hardware.label}</div>
          </div>
        ))}
      </div>
      <div className="text-center text-gray-content text-14">
        If you are using a hardware wallet with a camera on it, you should use
        watch address instead.
      </div>
    </div>
  );
};

export default ImportHardware;
