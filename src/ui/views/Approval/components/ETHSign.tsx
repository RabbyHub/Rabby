import { Button } from 'antd';
import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import IconWarning from 'ui/assets/warning.svg';
import { useApproval } from 'ui/utils';

interface AddAssetProps {
  data: {
    type: string;
    options: {
      address: string;
      symbol: string;
      decimals: number;
      image: string;
    };
  };
  session: {
    origin: string;
    icon: string;
    name: string;
  };
}

const ETHSign = ({ params }: { params: AddAssetProps }) => {
  const [, , rejectApproval] = useApproval();
  const { t } = useTranslation();

  return (
    <>
      <div className="approval-add-asset">
        <>
          <img
            src={IconWarning}
            className="w-[68px] h-[68px] mt-[32px] mb-[20px] mx-auto"
          />
          <div className="text-r-neutral-body text-[20px] leading-[26px] w-[344px] mx-auto font-medium text-center">
            {t('page.ethSign.alert')}
          </div>
        </>
      </div>
      <footer className="connect-footer p-[20px]">
        <div className={clsx(['action-buttons flex mt-4', 'justify-center'])}>
          <Button
            type="primary"
            size="large"
            className="w-[200px]"
            onClick={() => rejectApproval()}
          >
            {t('global.ok')}
          </Button>
        </div>
      </footer>
    </>
  );
};

export default ETHSign;
