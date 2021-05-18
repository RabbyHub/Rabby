import { useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useWallet } from './WalletContext';
import { isNotification } from './index';

export const useApproval = () => {
  const wallet = useWallet();
  const approval = wallet.getApproval();
  const history = useHistory();

  const resolveApproval = () => {
    if (approval) {
      wallet.resolveApproval();
    }
    setTimeout(() => {
      history.push('/');
    });
  };

  const rejectApproval = async (err?) => {
    if (approval) {
      await wallet.rejectApproval(err);
    }
    history.push('/');
  };

  useEffect(() => {
    if (!isNotification()) {
      return;
    }
    window.addEventListener('beforeunload', rejectApproval);

    return () => window.removeEventListener('beforeunload', rejectApproval);
  }, []);

  return [approval, resolveApproval, rejectApproval] as const;
};

export const usePopupOpen = () => {
  const wallet = useWallet();

  useEffect(() => {
    if (isNotification()) {
      return;
    }

    wallet.setPopupOpen(true);

    const beforeunload = () => {
      wallet.setPopupOpen(false);
    };

    window.addEventListener('beforeunload', beforeunload);
  }, []);
};

export const useSelectOption = (onChange?, value?, defaultValue?) => {
  const isControlled = useRef(typeof value !== 'undefined').current;
  const [_value, setValue] = useState(
    (isControlled ? value : defaultValue) || []
  );

  useEffect(() => {
    if (!isControlled) {
      return;
    }

    // shallow compare
    if (value && _value.some((x, i) => x !== value[i])) {
      setValue(value);
    }
  }, [value]);

  const handleRemove = (idx: number) => {
    _value.splice(idx, 1);
    setValue((_value) => [..._value]);
    onChange && onChange(_value);
  };

  const handleChoose = (op: string) => {
    if (_value.includes(op)) {
      return;
    }

    _value.push(op);
    setValue((_value) => [..._value]);
    onChange && onChange(_value);
  };

  const handleToggle = (op: string) => {
    const opIndex = _value.indexOf(op);
    if (opIndex > -1) {
      handleRemove(opIndex);
      return;
    }

    _value.push(op);
    setValue((_value) => [..._value]);
    onChange && onChange(_value);
  };

  return [_value, handleRemove, handleChoose, handleToggle];
};
