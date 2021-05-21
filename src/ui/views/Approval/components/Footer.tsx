import React from 'react';
import { Button } from 'antd';
import { APPROVAL_STATE } from 'consts';

interface FooterProps {
  state: number;
  onConfirm(): void;
  onCancel(): void;
}

const Footer = ({ state, onCancel, onConfirm }: FooterProps) => {
  const ConnectFooter = (
    <footer className="connect-footer">
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
  const SignTextFooter = (
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
  switch (state) {
    case APPROVAL_STATE.CONNECT:
      return ConnectFooter;
    case APPROVAL_STATE.APPROVAL:
      return SignTextFooter;
    default:
      return <></>;
  }
};

export default Footer;
