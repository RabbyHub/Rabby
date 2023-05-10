import { Button } from 'antd';
import React from 'react';

export interface Props {
  onClick: () => void;
  text: string;
}

export const FooterButton: React.FC<Props> = ({ onClick, text }) => {
  return (
    <div>
      <Button className="w-[180px] h-[40px]" type="primary" onClick={onClick}>
        {text}
      </Button>
    </div>
  );
};
