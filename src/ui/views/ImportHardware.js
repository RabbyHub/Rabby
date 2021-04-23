import { useForm } from 'react-hook-form';
import { Input, Footer, Button } from 'ui/component';
import { useWallet, useApproval } from 'ui/utils';

const defaultHdPaths = {
  trezor: `m/44'/60'/0'/0`,
  ledger: `m/44'/60'/0'/0/0`,
};

const ImportHardware = () => {
  const { register, handleSubmit } = useForm();
  const wallet = useWallet();

  const onSubmit = ({ hardware }) => {
    wallet.connectHardware(hardware);
  };

  return (
    <>
      <h4 className="font-bold">Connect hardware</h4>
      <p className="text-xs mt-2">Please select your hardware</p>
      <form onSubmit={handleSubmit(onSubmit)}>
        <select className="rounded mr-4" {...register('hardware')}>
          <option>请选择</option>
          <option value="trezor">trezor</option>
        </select>
        <Button type="primary" htmlType="submit">
          connect
        </Button>
      </form>
    </>
  );
};

export default ImportHardware;
