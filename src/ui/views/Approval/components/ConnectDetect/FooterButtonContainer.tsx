import { Button } from 'antd';
import React from 'react';

interface Props {
  onCancel(): void;
  text?: string;
}

export const FooterButtonContainer: React.FC<Props> = ({
  onCancel,
  text = 'Cancel connection',
}) => {
  return (
    <div className="py-20 text-center flex-shrink-0 h-80">
      <Button className="h-40 w-[180px]" type="primary" onClick={onCancel}>
        {text}
      </Button>
    </div>
  );
};
