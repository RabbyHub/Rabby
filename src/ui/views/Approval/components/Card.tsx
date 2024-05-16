import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import React from 'react';
import styled from 'styled-components';
import { ReactComponent as RcIconArrowRight } from 'ui/assets/approval/edit-arrow-right.svg';
import { Divide } from './Divide';

const CardDiv = styled.div<{
  hasHover: boolean;
}>`
  border-radius: 8px;
  background: var(--r-neutral-card1, #fff);
  border: 1px solid transparent;
  ${({ hasHover }) =>
    hasHover &&
    `cursor: pointer;
  &:hover {
    border-color: var(--r-blue-default, #7084ff);
  }`}
`;

export const Card: React.FC<
  {
    headline?: string;
    actionText?: string;
    onAction?: () => void;
    hasDivider?: boolean;
  } & React.HTMLAttributes<HTMLDivElement>
> = ({
  headline,
  actionText,
  onAction,
  hasDivider = true,
  children,
  ...props
}) => {
  return (
    <CardDiv hasHover={!!onAction || !!props.onClick} {...props}>
      {headline && (
        <>
          <CardTitle
            headline={headline}
            actionText={actionText}
            onAction={onAction}
          />
          {hasDivider && <Divide />}
        </>
      )}
      {children}
    </CardDiv>
  );
};

const CardTitleDiv = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
`;

const CardHeadlineDiv = styled.span`
  color: var(--r-neutral-title1, #192945);
  font-size: 13px;
  font-weight: 500;
  line-height: 16px;
`;

export const CardTitle: React.FC<{
  headline: string;
  actionText?: string;
  onAction?: () => void;
}> = ({ headline, actionText, onAction }) => {
  return (
    <CardTitleDiv onClick={onAction}>
      <CardHeadlineDiv>{headline}</CardHeadlineDiv>
      {!!onAction && (
        <div className="text-13 text-r-neutral-body cursor-pointer flex items-center">
          <span>{actionText}</span>
          <ThemeIcon className="icon" src={RcIconArrowRight} />
        </div>
      )}
    </CardTitleDiv>
  );
};
