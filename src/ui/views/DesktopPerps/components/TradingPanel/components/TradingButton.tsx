import React from 'react';
import { Button } from 'antd';
import { OrderSide } from '../../../types';

interface TradingButtonProps {
  loading: boolean;
  onClick: () => void;
  disabled: boolean;
  error?: string;
  isValid: boolean;
  orderSide: OrderSide;
  titleText: string;
}

export const TradingButton: React.FC<TradingButtonProps> = ({
  loading,
  onClick,
  disabled,
  error,
  isValid,
  orderSide,
  titleText,
}) => {
  return (
    <Button
      type="primary"
      block
      size="large"
      loading={loading}
      onClick={onClick}
      disabled={disabled}
      className={`w-full h-[40px] rounded-[8px] font-medium text-[13px] mt-20 border-transparent ${
        isValid && !error
          ? orderSide === OrderSide.BUY
            ? 'bg-rb-green-default text-rb-neutral-InvertHighlight'
            : 'bg-rb-red-default text-rb-neutral-InvertHighlight'
          : 'bg-rb-neutral-bg-2 text-rb-neutral-foot opacity-50 cursor-not-allowed'
      }`}
    >
      {error ? error : titleText}
    </Button>
  );
};
