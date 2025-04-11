import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { Switch } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import IconAlertInfo from '@/ui/assets/tokenDetail/IconWarning.svg';
import IconDanger from '@/ui/assets/swap/IconDanger.svg';

interface Props {
  token: TokenItem;
}
export const ScamTokenTips = ({ token }: Props) => {
  const { t } = useTranslation();
  const isScam = token.is_scam || token.low_credit_score;
  const isNotVerified = token.is_verified === false;

  if (isNotVerified) {
    return (
      <div className="flex flex-row bg-r-red-light rounded-[8px] px-12 py-8 items-center justify-center border-[0.5px] border-rabby-red-default">
        <img src={IconDanger} className="w-14 h-14 mr-[4px]" />
        <div className="text-r-red-default text-13">
          {t('page.dashboard.tokenDetail.verifyScamTips')}
        </div>
      </div>
    );
  }

  if (isScam) {
    return (
      <div className="flex flex-row bg-r-orange-light rounded-[8px] px-12 py-8 items-center justify-center border-orange-default">
        <img src={IconAlertInfo} className="w-14 h-14 mr-[4px]" />
        <div className="text-r-orange-default text-13">
          {t('page.dashboard.tokenDetail.maybeScamTips')}
        </div>
      </div>
    );
  }

  return null;
};
