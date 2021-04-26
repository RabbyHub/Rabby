import { useState, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Input, Footer, Button, Checkbox } from 'ui/component';
import { useWallet } from 'ui/utils';

const defaultHdPaths = {
  trezor: `m/44'/60'/0'/0`,
  ledger: `m/44'/60'/0'/0/0`,
};

const AccountChoose = ({ accounts, handleNextPage, handlePreviousPage }) => {
  const { control, handleSubmit } = useForm();
  const wallet = useWallet();

  const onSubmit = ({ accounts }) => {
    wallet.unlockHardwareAccount('trezor', accounts);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <Controller
          name="accounts"
          control={control}
          rules={{
            required: true,
          }}
          render={({ field: { ref, ...props } }) => (
            <Checkbox.Group {...props}>
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
          )}
        />
        <Button className="mr-12" onClick={handlePreviousPage}>
          previous
        </Button>
        <Button onClick={handleNextPage}>next</Button>
      </div>
      <Footer>
        <Button type="primary" htmlType="submit">
          confirm
        </Button>
      </Footer>
    </form>
  );
};

const ImportHardware = () => {
  const { register, handleSubmit } = useForm();
  const keyringRef = useRef();
  const [accounts, setAccounts] = useState();
  const [error, setError] = useState();
  const wallet = useWallet();

  const handleNextPage = async () => {
    const accounts = await keyringRef.current.getNextPage();
    setAccounts(accounts);
  };

  const handlePreviousPage = async () => {
    const accounts = await keyringRef.current.getPreviousPage();
    setAccounts(accounts);
  };

  const onSubmit = async () => {
    try {
      const keyring = await wallet.connectHardware('trezor');
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
      <form onSubmit={handleSubmit(onSubmit)}>
        <select
          className="rounded mr-4"
          {...register('hardware', {
            required: true,
          })}>
          <option>请选择</option>
          <option value="trezor">trezor</option>
        </select>
        {error && <div className="text-red-700 text-lg">{error}</div>}
        {!accounts && (
          <Button type="primary" htmlType="submit">
            connect
          </Button>
        )}
      </form>
      {accounts && (
        <AccountChoose
          accounts={accounts}
          handleNextPage={handleNextPage}
          handlePreviousPage={handlePreviousPage}
        />
      )}
    </>
  );
};

export default ImportHardware;
