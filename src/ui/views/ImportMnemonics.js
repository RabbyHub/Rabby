import { useForm } from 'react-hook-form';
import { Input, Footer, Header } from 'ui/component';
import { useWallet, useApproval } from 'ui/utils';

const ImportMnemonic = () => {
  const {
    register,
    formState: { isValid },
    handleSubmit,
  } = useForm({ mode: 'onChange' });
  const wallet = useWallet();
  const [, resolveApproval] = useApproval();

  const onSubmit = async ({ mnemonics }) => {
    try {
      await wallet.importMnemonics(mnemonics.trim());
      wallet.setup();

      resolveApproval();
    } catch (err) {
      console.error('err', err);
    }
  };

  return (
    <>
      <Header
        title="Import Mnemonics"
        subTitle="Please input your mnemonics below"
      />
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="pt-8">
          <Input.Textarea
            {...register('mnemonics', { required: true })}
            placeholder="Mnemonics"
          />
        </div>
        <Footer.Nav nextDisabled={!isValid} />
      </form>
    </>
  );
};

export default ImportMnemonic;
