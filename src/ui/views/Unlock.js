import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Input, Footer, Button } from 'ui/component';
import { useWallet, useApproval } from 'ui/utils';

const Unlock = () => {
  const {
    register,
    handleSubmit,
    formState: { isValid },
  } = useForm({ mode: 'onChange' });
  const wallet = useWallet();
  const [, handleApproval] = useApproval();
  const [error, setErr] = useState();

  const onSubmit = async ({ password }) => {
    try {
      await wallet.submitPassword(password);
      handleApproval();
    } catch (err) {
      setErr(err?.message || '密码错误');
    }
  };

  return (
    <>
      <h4 className="font-bold">Welcome back</h4>
      <p className="text-xs mt-2">input your password to unlock</p>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="pt-8">
          <Input {...register('password')} placeholder="Password" />
          <div className="text-red-500">{error}</div>
        </div>
        <Footer>
          <Button disabled={!isValid} block htmlType="submit">
            Unlock
          </Button>
        </Footer>
      </form>
    </>
  );
};

export default Unlock;
