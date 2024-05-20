import { Result } from '@rabby-wallet/rabby-security-engine';
import { Level } from '@rabby-wallet/rabby-security-engine/dist/rules';
import React from 'react';
import { SecurityListItemTag } from './SecurityListItemTag';
import { SubCol, SubRow } from './SubTable';

export interface Props {
  id: string;
  engineResult: Result;
  dangerText?: string | React.ReactNode;
  warningText?: string | React.ReactNode;
  safeText?: string | React.ReactNode;
  defaultText?: string | React.ReactNode;
  forbiddenText?: string | React.ReactNode;
  title?: string;
  noTitle?: boolean;
}

export const SecurityListItem: React.FC<Props> = ({
  id,
  engineResult,
  dangerText,
  warningText,
  safeText,
  defaultText,
  forbiddenText,
  title,
  noTitle = false,
}) => {
  if (!engineResult) {
    if (defaultText) {
      return (
        <li>
          <span>{defaultText}</span>
        </li>
      );
    }
    return null;
  }

  const displayTitle = title || engineResult.level;

  return (
    <SubCol>
      <SubRow isTitle>{noTitle ? '' : displayTitle}</SubRow>
      <SubRow>
        <div className="text-13 leading-[15px]">
          <span>
            {engineResult.level === Level.DANGER && dangerText}
            {engineResult.level === Level.WARNING && warningText}
            {engineResult.level === Level.SAFE && safeText}
            {engineResult.level === Level.FORBIDDEN && forbiddenText}
          </span>

          <SecurityListItemTag inSubTable id={id} engineResult={engineResult} />
        </div>
      </SubRow>
    </SubCol>
  );
};
