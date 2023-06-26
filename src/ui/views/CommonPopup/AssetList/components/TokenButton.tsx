import clsx from 'clsx';
import React from 'react';
import { ReactComponent as LowValueArrowSVG } from '@/ui/assets/dashboard/low-value-arrow.svg';
import { AbstractPortfolioToken } from '@/ui/utils/portfolio/types';
import { Popup } from '@/ui/component';
import { ReactComponent as EmptySVG } from '@/ui/assets/dashboard/empty.svg';
import { TokenTable } from './TokenTable';

export interface Props {
  label: string;
  onClickLink: () => void;
  tokens?: AbstractPortfolioToken[];
  linkText?: string;
  description?: string;
}

export const TokenButton: React.FC<Props> = ({
  label,
  tokens,
  onClickLink,
  linkText,
  description,
}) => {
  const [visible, setVisible] = React.useState(false);
  const len = tokens?.length ?? 0;

  const handleClickLink = React.useCallback(() => {
    setVisible(false);
    onClickLink();
  }, []);

  return (
    <div>
      <button
        onClick={() => setVisible(true)}
        className={clsx(
          'rounded-[2px] py-6 px-8',
          'text-12 bg-gray-bg text-black',
          'flex items-center',
          'gap-2',
          'hover:opacity-60'
        )}
      >
        <span>{len}</span>
        <span>{label}</span>
        <LowValueArrowSVG className="w-14 h-14" />
      </button>

      <Popup
        height={494}
        visible={visible}
        closable
        push={false}
        onClose={() => setVisible(false)}
        title={`${len} ${label}`}
      >
        <div className="text-black text-13 mb-[30px] text-center -m-8">
          The token in this list will not be added to total balance
        </div>
        {len > 0 ? (
          <div>
            <TokenTable list={tokens} />
          </div>
        ) : (
          <div className="space-y-24 text-13 text-center mt-[100px]">
            <EmptySVG className="w-[52px] h-[52px] m-auto" />
            <div className="text-gray-subTitle">{description}</div>
            <div
              onClick={handleClickLink}
              className="text-blue-light underline cursor-pointer"
            >
              {linkText}
            </div>
          </div>
        )}
      </Popup>
    </div>
  );
};
