import { useForm } from 'react-hook-form';
import { Input, Footer } from 'ui/component';
import { useWallet, useApproval } from 'ui/utils';

const ImportKey = () => {
  const {
    register,
    formState: { isValid },
    handleSubmit,
  } = useForm({ mode: 'onChange' });
  const wallet = useWallet();
  const [, handleApproval] = useApproval();

  const onSubmit = async ({ key }) => {
    try {
      await wallet.importKey(key);
      wallet.setup();

      handleApproval();
    } catch (err) {
      console.error('err', err);
    }
  };

  return (
    <>
      <h4 className="font-bold">Import Private Key</h4>
      <p className="text-xs mt-2">Please input your private key below</p>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="pt-8">
          <Input
            {...register('key', { required: true })}
            placeholder="Private key"
          />
        </div>
        <Footer.Nav nextDisabled={!isValid} />
      </form>
    </>
  );
};

export default ImportKey;
