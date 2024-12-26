import React from 'react';
import styled from 'styled-components';
import { ReactComponent as IconBackCC } from '@/ui/assets/new-user-import/back-cc.svg';
import { ReactComponent as IconDotCC } from '@/ui/assets/new-user-import/dot-cc.svg';
import clsx from 'clsx';

const StyedBg = styled.div`
  background: var(--r-blue-default, #7084ff);
  overflow-x: auto;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const StyledCard = styled.div`
  width: 400px;
  min-height: 520px;
  border-radius: 16px;
  background-color: var(--r-neutral-bg1, #fff);
  box-shadow: 0px 40px 80px 0px rgba(43, 57, 143, 0.4);
  padding: 20px;
  padding-top: 0px;
  .header {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--r-neutral-title1, #192945);
    text-align: center;
    font-size: 20px;
    font-style: normal;
    font-weight: 500;
    line-height: normal;
    position: relative;
    min-height: 20px;
    .back-icon {
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      cursor: pointer;
      color: var(--r-neutral-body, #3e495e);
      border-radius: 8px;
      padding: 6px;
    }
    .back-icon:hover {
      background: var(--r-neutral-card2, #f2f4f7);
    }
  }

  input.ant-input::placeholder {
    color: var(--r-neutral-foot, #6a7587);
  }

  button.ant-btn.ant-btn-primary.ant-btn-loading {
    border-color: #5a6acc;
    background: #5a6acc;
  }
`;

const Step = ({ step }: { step: 1 | 2 }) => {
  return (
    <div className="flex items-center justify-center gap-4">
      <IconDotCC className="text-rabby-blue-default" viewBox="0 0 8 8" />
      <div
        className={clsx(
          'w-[56px] h-[1px]',
          step === 2 ? 'bg-rabby-blue-default' : 'bg-rabby-blue-light2'
        )}
      />
      <IconDotCC
        className={clsx(
          step === 2 ? 'text-rabby-blue-default' : 'text-rabby-blue-light2'
        )}
        viewBox="0 0 8 8"
      />
    </div>
  );
};

export const Card = ({
  title,
  step,
  children,
  onBack,
  className,
  headerClassName,
  headerBlock,
  cardStyle,
}: React.PropsWithChildren<{
  title?: React.ReactNode;
  step?: 1 | 2;
  onBack?: () => void;
  className?: string;
  headerClassName?: string;
  headerBlock?: boolean;
  cardStyle?: React.CSSProperties;
}>) => {
  return (
    <StyedBg>
      <StyledCard className={className} style={cardStyle}>
        <div
          className={clsx(
            headerBlock ? 'block' : !onBack && !title && !onBack && 'hidden',
            'header',
            headerClassName,
            step && 'mt-18',
            title && 'mt-16',
            !step && !title && onBack && 'mt-18'
          )}
        >
          {!!onBack && (
            <div className="back-icon" onClick={onBack}>
              <IconBackCC className="w-20 h-20" viewBox="0 0 20 20" />
            </div>
          )}
          {!!title && <div>{title}</div>}
          {!!step && <Step step={step} />}
        </div>
        {children}
      </StyledCard>
    </StyedBg>
  );
};
