import React from 'react';
import { Button } from 'antd';

interface FooterProps {
  state: number;
  onConfirm(): void;
  onCancel(): void;
}

const Footer = ({ onCancel, onConfirm }: FooterProps) => {
  return (
    <footer>
      <div className="risk-info"></div>
      <div className="action-buttons flex justify-between">
        <Button
          type="primary"
          size="large"
          className="w-[172px]"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="primary"
          size="large"
          className="w-[172px]"
          onClick={onConfirm}
        >
          Allow
        </Button>
      </div>
    </footer>
  );
};

export default Footer;
