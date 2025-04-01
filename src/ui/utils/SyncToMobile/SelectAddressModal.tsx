import { Modal } from '@/ui/component';
import { Button } from 'antd';
import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { useAccounts } from '@/ui/hooks/useAccounts';

interface Props {
  visible: boolean;
  onClose?: () => void;
  onConfirm?: () => void;
}

export const SelectAddressModal: React.FC<Props> = ({
  visible,
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation();
  const [count, setCount] = React.useState(0);

  const {
    sortedAccountsList,
    watchSortedAccountsList,
    fetchAllAccounts,
  } = useAccounts();

  React.useEffect(() => {
    fetchAllAccounts();
  }, []);

  console.log('sortedAccountsList1', sortedAccountsList);
  console.log('watchSortedAccountsList2', watchSortedAccountsList);

  return (
    <ModalStyled
      visible={visible}
      onCancel={onClose}
      onOk={onConfirm}
      width={400}
      destroyOnClose
      className="h-[600px]"
    >
      <h1
        className={clsx(
          'm-0',
          'text-r-neutral-title-1 text-[20px] font-medium leading-[24px]',
          'text-center',
          'py-[14px]'
        )}
      >
        {t('page.syncToMobile.selectAddress.title')}
      </h1>
      <section>list</section>
      <footer
        className={clsx(
          'flex justify-center items-center',
          'gap-x-[8px]',
          'mt-[24px] py-[16px] px-[20px]',
          'bg-r-neutral-bg2',
          'border-t-[0.5px] border-rabby-neutral-line'
        )}
      >
        <Button
          block
          className="h-[56px] text-[17px] rounded-[8px]"
          type="primary"
          onClick={onConfirm}
        >
          {t('global.confirm')} ({count})
        </Button>
      </footer>
    </ModalStyled>
  );
};

const ModalStyled = styled(Modal)`
  .ant-modal-body {
    padding: 0;
  }
  .ant-modal-content {
    border-radius: 16px;
  }
`;
