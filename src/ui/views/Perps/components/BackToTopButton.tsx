import React from 'react';
import { ReactComponent as RcIconBackTopCC } from '@/ui/assets/perps/IconBackTopCC.svg';
import clsx from 'clsx';
import styled from 'styled-components';

const FloatDiv = styled.div`
  bottom: 120px;
  right: 12px;
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
      <div className="w-[58px] h-[58px] rounded-full bg-r-neutral-bg-1 shadow-lg flex items-center justify-center transition-colors">
        <RcIconBackTopCC className="text-r-neutral-body" />
      </div>
    </FloatDiv>
  );
};
