import React from 'react';
import { Button } from 'antd';
import styled from 'styled-components';
import LessPalette from '@/ui/style/var-defs';
import { useWallet } from '@/ui/utils';

const Overlay = styled.div`
  width: 100vw;
  height: 100vh;
  background-color: rgb(45, 48, 51, 0.2);
  z-index: 999;
  position: fixed;
  top: 0;
  left: 0;
`;

const Inner = styled.div`
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  top: 160px;
  width: 360px;
  background: #fff;
  box-shadow: 0px 20px 20px rgba(45, 48, 51, 0.16);
  border-radius: 6px;
  padding: 40px 16px 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const TextContent = styled.p`
  font-weight: 500;
  font-size: 15px;
  line-height: 22px;
  margin: 0 0 36px 0;
  text-align: center;
  color: ${LessPalette['@color-title']};
`;

const NumberText = styled.span`
  color: ${LessPalette['@primary-color']};
`;

const PendingApproval = ({ count }: { count: number }) => {
  const wallet = useWallet();

  const handleActiveApproval = async () => {
    await wallet.activeFirstApproval();
    window.close();
  };

  return (
    <Overlay>
      <Inner>
        <TextContent>
          <NumberText>{count}</NumberText> transactions need to sign
        </TextContent>
        <Button
          className="w-[200px] h-[40px] rounded"
          type="primary"
          onClick={handleActiveApproval}
        >
          View first one
        </Button>
      </Inner>
    </Overlay>
  );
};

export default PendingApproval;
