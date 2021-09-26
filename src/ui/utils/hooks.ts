import { useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useWallet } from './WalletContext';
import { getUiType } from './index';

export const useApproval = () => {
  const wallet = useWallet();
  const history = useHistory();

  const getApproval = wallet.getApproval;

  const resolveApproval = async (data?: any, stay = false) => {
    const approval = await getApproval();

    if (approval) {
      wallet.resolveApproval(data);
    }
    if (stay) {
      return;
    }
    setTimeout(() => {
      history.replace('/');
    });
  };

  const rejectApproval = async (err?) => {
    const approval = await getApproval();
    if (approval) {
      await wallet.rejectApproval(err);
    }
    history.push('/');
  };

  useEffect(() => {
    if (!getUiType().isNotification) {
      return;
    }
    window.addEventListener('beforeunload', rejectApproval);

    return () => window.removeEventListener('beforeunload', rejectApproval);
  }, []);

  return [getApproval, resolveApproval, rejectApproval] as const;
};

export const useSelectOption = <T>({
  options,
  defaultValue = [],
  onChange,
  value,
}: {
  options: T[];
  defaultValue?: T[];
  onChange?: (arg: T[]) => void;
  value?: T[];
}) => {
  const isControlled = useRef(typeof value !== 'undefined').current;
  const [idxs, setChoosedIdxs] = useState(
    (isControlled ? value! : defaultValue).map((x) => options.indexOf(x))
  );

  useEffect(() => {
    if (!isControlled) {
      return;
    }

    // shallow compare
    if (value && idxs.some((x, i) => options[x] != value[i])) {
      setChoosedIdxs(value.map((x) => options.indexOf(x)));
    }
  }, [value]);

  const changeValue = (idxs: number[]) => {
    setChoosedIdxs([...idxs]);
    onChange && onChange(idxs.map((o) => options[o]));
  };

  const handleRemove = (i: number) => {
    idxs.splice(i, 1);
    changeValue(idxs);
  };

  const handleChoose = (i: number) => {
    if (idxs.includes(i)) {
      return;
    }

    idxs.push(i);
    changeValue(idxs);
  };

  const handleToggle = (i: number) => {
    const inIdxs = idxs.indexOf(i);
    if (inIdxs !== -1) {
      handleRemove(inIdxs);
    } else {
      handleChoose(i);
    }
  };

  const handleClear = () => {
    changeValue([]);
  };

  return [
    idxs.map((o) => options[o]),
    handleRemove,
    handleChoose,
    handleToggle,
    handleClear,
    idxs,
  ] as const;
};

export const useWalletRequest = (
  requestFn,
  {
    onSuccess,
    onError,
  }: {
    onSuccess?(arg: any): void;
    onError?(arg: any): void;
  }
) => {
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);
  const [loading, setLoading] = useState<boolean>(false);
  const [res, setRes] = useState<any>();
  const [err, setErr] = useState<any>();

  const run = async (...args) => {
    setLoading(true);
    try {
      const _res = await Promise.resolve(requestFn(...args));
      if (!mounted.current) {
        return;
      }
      setRes(_res);
      onSuccess && onSuccess(_res);
    } catch (err) {
      if (!mounted.current) {
        return;
      }
      setErr(err);
      onError && onError(err);
    } finally {
      if (mounted.current) {
        setLoading(false);
      }
    }
  };

  return [run, loading, res, err] as const;
};
