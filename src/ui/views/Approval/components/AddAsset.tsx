import { Button } from 'antd';
import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import IconWarning from 'ui/assets/icon-subtract.svg';
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

const AddAsset = ({ params }: { params: AddAssetProps }) => {
  const [, , rejectApproval] = useApproval();
  const { t } = useTranslation();

  return (
    <>
      <div className="approval-add-asset">
        <>
          <img
            src={IconWarning}
            className="w-[84px] h-[84px] mb-[39px] mx-auto"
          />
          <div className="text-gray-title text-[16px] leading-[24px] w-[320px] mx-auto font-medium text-center">
            {t('Rabby does not support adding tokens in this way for now')}
          </div>
        </>
      </div>
      <footer className="connect-footer p-[20px]">
        <div className={clsx(['action-buttons flex mt-4', 'justify-center'])}>
          <Button
            type="primary"
            size="large"
            className="w-[200px]"
            onClick={() =>
              rejectApproval(
                'Rabby does not support adding tokens in this way for now'
              )
            }
          >
            {t('OK')}
          </Button>
        </div>
      </footer>
    </>
  );
};

export default AddAsset;
