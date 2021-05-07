import React, { useState, useRef } from 'react';
import { Button, Checkbox, Form, Select } from 'antd';
import { Footer } from '../component';
import { useWallet } from '../utils';

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
      <Footer>
        <Button type="primary" htmlType="submit">
          Confirm
        </Button>
      </Footer>
    </Form>
  );
};

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
    <>
      <h4 className="font-bold">Connect hardware</h4>
      <p className="text-xs mt-2">Please select your hardware</p>
      <Form onFinish={onSubmit} form={form}>
        <Form.Item name="hardware">
          <Select>
            <Option value="trezor">trezor</Option>
            <Option value="ledger">ledger</Option>
          </Select>
        </Form.Item>
        {!accounts && error && (
          <div className="text-red-700 text-lg">{error}</div>
        )}
        {!accounts && (
          <Button type="primary" htmlType="submit">
            Connect
          </Button>
        )}
      </Form>
      {accounts && (
        <AccountChoose
          hardware={form.getFieldValue('hardware')}
          accounts={accounts}
          handleNextPage={handleNextPage}
          handlePreviousPage={handlePreviousPage}
        />
      )}
    </>
  );
};

export default ImportHardware;
