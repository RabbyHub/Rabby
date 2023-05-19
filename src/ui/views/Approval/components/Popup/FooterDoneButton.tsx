import { useCommonPopupView } from '@/ui/utils';
import { Button } from 'antd';
import React from 'react';
import { useInterval } from 'react-use';

export interface Props {
  onDone: () => void;
}

export const FooterDoneButton: React.FC<Props> = ({ onDone }) => {
  const [counter, setCounter] = React.useState(0.5);
  const { visible } = useCommonPopupView();

  useInterval(() => {
    setCounter(counter - 1);
  }, 500);

  React.useEffect(() => {
    if (counter <= 0) {
      onDone();
    }
  }, [counter]);

  React.useEffect(() => {
    if (!visible) {
      onDone();
    }
  }, [visible]);

  return (
    <div>
      <Button
        className="w-[180px] h-[40px] bg-green border-green shadow-none"
        type="primary"
        onClick={onDone}
      >
        Done {counter < 0 ? '' : `(${counter}s)`}
      </Button>
    </div>
  );
};
