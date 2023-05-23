import { Button } from 'antd';
import clsx from 'clsx';
import React from 'react';

export interface Props {
  onClick: () => void;
  text: string;
}

export const FooterButton: React.FC<Props> = ({ onClick, text }) => {
  const [loading, setLoading] = React.useState(false);
  const handleClick = React.useCallback(() => {
    onClick();
    setLoading(true);
  }, []);

  return (
    <div>
      <Button
        className={clsx('w-[180px] h-[40px]', 'active:before:bg-[#00000033]')}
        type="primary"
        onClick={handleClick}
        loading={loading}
      >
        {text}
      </Button>
    </div>
  );
};
