import clsx from 'clsx';
import React from 'react';
import { ReactComponent as LowValueArrowSVG } from '@/ui/assets/dashboard/low-value-arrow.svg';
import { AbstractPortfolioToken } from '@/ui/utils/portfolio/types';
import { Popup } from '@/ui/component';
import { ReactComponent as EmptySVG } from '@/ui/assets/dashboard/empty.svg';
import { TokenTable } from './TokenTable';
import { useCommonPopupView } from '@/ui/utils';
import { useTranslation } from 'react-i18next';
import { Button } from 'antd';

interface TokenButtonPopupProps {
  visible?: boolean;
  onClose?: () => void;
  label: string;
  onClickButton?: () => void;
  tokens?: AbstractPortfolioToken[];
  onClickLink?: () => void;
  linkText?: string;
  buttonText?: string;
  description?: string;
  hiddenSubTitle?: boolean;
}

export function SpecialTokenListPopup({
  visible,
  onClose,
  label,
  tokens,
  onClickLink,
  linkText,
  onClickButton,
  buttonText,
  description,
  hiddenSubTitle,
}: TokenButtonPopupProps) {
  const { t } = useTranslation();
  const len = tokens?.length ?? 0;

  return (
    <Popup
      height={494}
      visible={visible}
      closable
      push={false}
      onClose={onClose}
      title={`${len} ${label}`}
      isSupportDarkMode
    >
      {!hiddenSubTitle && (
        <div className="text-r-neutral-foot text-13 mb-[30px] text-center -m-8">
          {t('page.dashboard.assets.tokenButton.subTitle')}
        </div>
      )}
      <TokenTable
        list={tokens}
        EmptyComponent={
          <div className="space-y-24 text-13 text-center mt-[100px]">
            <EmptySVG className="w-[52px] h-[52px] m-auto" />
            <div className="text-r-neutral-body">{description}</div>
            {linkText && (
              <div
                onClick={onClickLink}
                className="text-r-blue-default underline cursor-pointer"
              >
                {linkText}
              </div>
            )}
            {buttonText && (
              <Button
                onClick={onClickButton}
                type="primary"
                className="w-[200px] h-[44px]"
              >
                {buttonText}
              </Button>
            )}
          </div>
        }
      />
    </Popup>
  );
}

export type Props = TokenButtonPopupProps;

export const TokenButton: React.FC<Props> = ({
  label,
  tokens,
  onClickLink,
  linkText,
  onClickButton,
  buttonText,
  description,
  hiddenSubTitle,
}) => {
  const { visible: commonPopupVisible } = useCommonPopupView();
  const [visible, setVisible] = React.useState(false);
  const len = tokens?.length ?? 0;

  const handleClickLink = React.useCallback(() => {
    setVisible(false);
    onClickLink?.();
  }, [onClickLink]);

  const handleClickButton = React.useCallback(() => {
    setVisible(false);
    onClickButton?.();
  }, [onClickButton]);

  React.useEffect(() => {
    if (!commonPopupVisible) {
      setVisible(false);
    }
  }, [commonPopupVisible]);

  return (
    <div>
      <button
        onClick={() => setVisible(true)}
        className={clsx(
          'rounded-[2px] py-6 px-8',
          'text-12 bg-r-neutral-card-2 text-r-neutral-foot',
          'flex items-center',
          'gap-2',
          'hover:opacity-60'
        )}
      >
        <span>{len}</span>
        <span>{label}</span>
        <LowValueArrowSVG className="w-14 h-14" />
      </button>

      <SpecialTokenListPopup
        visible={visible}
        onClose={() => setVisible(false)}
        label={label}
        tokens={tokens}
        onClickLink={handleClickLink}
        linkText={linkText}
        onClickButton={handleClickButton}
        buttonText={buttonText}
        description={description}
        hiddenSubTitle={hiddenSubTitle}
      />
    </div>
  );
};
