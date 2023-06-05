import { Result } from '@debank/rabby-security-engine';
import { Level } from '@debank/rabby-security-engine/dist/rules';
import React from 'react';
import { SecurityListItemTag } from './SecurityListItemTag';

export interface Props {
  id: string;
  engineResult: Result;
  dangerText?: string;
  warningText?: string;
  safeText?: string;
}

export const SecurityListItem: React.FC<Props> = ({
  id,
  engineResult,
  dangerText,
  warningText,
  safeText,
}) => {
  if (!engineResult) return null;

  return (
    <li>
      <span>
        {engineResult.level === Level.DANGER && dangerText}
        {engineResult.level === Level.WARNING && warningText}
        {engineResult.level === Level.SAFE && safeText}
      </span>

      <SecurityListItemTag id={id} engineResult={engineResult} />
    </li>
  );
};
