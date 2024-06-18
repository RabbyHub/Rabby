import { Result } from '@rabby-wallet/rabby-security-engine';
import { Level } from '@rabby-wallet/rabby-security-engine/dist/rules';
import React from 'react';
import { SecurityListItemTag } from './SecurityListItemTag';
import { SubCol, SubRow } from './SubTable';
import { capitalize } from 'lodash';

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
  tip?: string;
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
  tip,
}) => {
  const displayTitle =
    title || (engineResult?.level ? capitalize(engineResult.level) : '');
  const hasTitle = !!(noTitle ? '' : displayTitle);

  if (!engineResult && !defaultText) {
    return null;
  }

  return (
    <SubCol nested={!hasTitle}>
      <SubRow tip={tip} isTitle>
        {noTitle ? '' : displayTitle}
      </SubRow>
      <SubRow>
        {engineResult ? (
          <div className="text-14 leading-[16px]">
            <span>
              {engineResult.level === Level.DANGER && dangerText}
              {engineResult.level === Level.WARNING && warningText}
              {engineResult.level === Level.SAFE && safeText}
              {engineResult.level === Level.FORBIDDEN && forbiddenText}
            </span>

            <SecurityListItemTag
              inSubTable
              id={id}
              engineResult={engineResult}
            />
          </div>
        ) : (
          <span>{defaultText}</span>
        )}
      </SubRow>
    </SubCol>
  );
};
