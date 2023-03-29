import clsx from 'clsx';
import React, { useRef, useState, useEffect } from 'react';
import { copyAddress } from '../utils/clipboard';
import { ReactComponent as RcIconCopyCheck } from 'ui/assets/copy-checked.svg';
import { ReactComponent as RcIconCopy } from 'ui/assets/component/icon-copy.svg';

export const CopyChecked = ({
  addr,
  className,
  copyClassName,
  checkedClassName,
}: {
  addr: string;
  className?: string;
  copyClassName?: string;
  checkedClassName?: string;
}) => {
  const timerRef = useRef<NodeJS.Timeout>();
  const [copied, setCopied] = useState(false);
  const handleCopy: React.MouseEventHandler = (e) => {
    e.stopPropagation();
    copyAddress(addr);
    setCopied(true);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);
  if (copied) {
    return (
      <RcIconCopyCheck
        viewBox="0 0 14 14"
        className={clsx(className, checkedClassName ?? 'text-[#00C087]')}
      />
    );
  }
  return (
    <RcIconCopy
      viewBox="0 0 16 16"
      onClick={handleCopy}
      className={clsx(className, copyClassName)}
    />
  );
};
