import { useHistory } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Button, Header, Input } from 'ui/component';
import { useWallet } from 'ui/utils';

const CreatePassword = () => {
  const {
    register,
    handleSubmit,
    getValues,
    formState: { isValid, errors },
  } = useForm({ mode: 'onChange' });
  const history = useHistory();
  const wallet = useWallet();

  const onSubmit = ({ password }) => {
    wallet.setPassword(password.trim());
    history.push('/start');
  };

  return (
    <>
      <Header
        title="Create Password"
        subTitle="this password will be used to unlock your wallet"
      />
      <form onSubmit={handleSubmit(onSubmit)}>
        <Input
          className="mb-4"
          {...register('password', {
            required: true,
          })}
          placeholder="Password"
        />
        <Input
          className="mb-4"
          {...register('_password', {
            required: true,
            validate: (v) => v === getValues('password'),
          })}
          placeholder="Repeat Password"
        />
        <Button
          type="primary"
          htmlType="submit"
          block
          onClick={handleSubmit}
          disabled={!isValid}>
          Next
        </Button>
      </form>
    </>
  );
};

export default CreatePassword;
