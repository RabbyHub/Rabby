import React from 'react';
import { ReactComponent as RcIconBackTopCC } from '@/ui/assets/perps/IconBackTopCC.svg';
import clsx from 'clsx';
import styled from 'styled-components';

const FloatDiv = styled.div`
  bottom: 100px;
  right: 12px;
  fill: rgba(255, 255, 255, 0.6);
`;

interface BackToTopButtonProps {
  visible: boolean;
  onClick: () => void;
  className?: string;
}

export const BackToTopButton: React.FC<BackToTopButtonProps> = ({
  visible,
  onClick,
  className,
}) => {
  if (!visible) return null;

  return (
    <FloatDiv
      className={clsx(
        'fixed z-50 cursor-pointer transition-opacity duration-300',
        className
      )}
      onClick={onClick}
    >
      <div className="w-[48px] h-[48px] rounded-full bg-r-neutral-bg-1 shadow-lg flex items-center justify-center transition-colors">
        <RcIconBackTopCC className="text-r-neutral-body" />
      </div>
    </FloatDiv>
  );
};
