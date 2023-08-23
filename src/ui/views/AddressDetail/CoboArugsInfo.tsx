import { NameAndAddress } from '@/ui/component';
import { useWallet } from '@/ui/utils';
import { copyAddress } from '@/ui/utils/clipboard';
import React from 'react';
import IconCopy from 'ui/assets/component/icon-copy.svg';
import IconInfo from 'ui/assets/address/info.svg';
import { SvgIconLoading } from 'ui/assets';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';

const ErrorAlert = styled.div`
  margin-top: 6px;
  border-radius: 2px;
  padding: 7px 8px;
  font-size: 12px;
  line-height: 14px;
  display: flex;
  position: relative;
  color: #fff;
  font-weight: 400;
  width: fit-content;

  &::before {
    content: '';
    position: absolute;
    width: 0;
    height: 0;
    border: 5px solid transparent;
    border-bottom: 8px solid currentColor;
    top: -10px;
    left: 10px;
  }
`;

export const CoboArgusInfo = ({ address }: { address: string }) => {
  const { t } = useTranslation();
  const wallet = useWallet();
  const [accountDetail, setAccountDetail] = React.useState<
    Awaited<ReturnType<typeof wallet['coboSafeGetAccountDetail']>>
  >();
  const [delegates, setDelegates] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    setIsLoading(true);
    wallet
      .coboSafeGetAccountDetail(address)
      .then((detail) => {
        setAccountDetail(detail);
        return wallet.coboSafeGetAllDelegates({
          coboSafeAddress: detail!.safeModuleAddress,
          chainServerId: detail!.networkId,
        });
      })
      .then((delegates) => {
        setDelegates(delegates);
        setIsLoading(false);
      });
  }, [address]);

  if (isLoading) {
    return (
      <div className="rabby-list-item">
        <div className="rabby-list-item-content ">
          <SvgIconLoading
            className="animate-spin w-[20px] h-[20px]"
            fill="#707280"
            viewBox="0 0 36 36"
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rabby-list-item">
        <div className="rabby-list-item-content">
          <div className="rabby-list-item-label">
            {t('page.addressDetail.safeModuleAddress')}
            <div className="rabby-list-item-desc flex gap-4 text-[12px]">
              {accountDetail?.safeModuleAddress}
              <img
                src={IconCopy}
                className="w-14 h-14 flex-shrink-0 cursor-pointer"
                onClick={() => {
                  if (accountDetail?.safeModuleAddress) {
                    copyAddress(accountDetail?.safeModuleAddress);
                  }
                }}
              />
            </div>
            {accountDetail?.isModuleEnabled ? null : (
              <ErrorAlert className="bg-red-forbidden before:border-b-red-forbidden">
                <img src={IconInfo} className="mr-6" />
                <span>{t('page.addressDetail.coboSafeErrorModule')}</span>
              </ErrorAlert>
            )}
          </div>
        </div>
      </div>

      <div className="rabby-list-item no-hover">
        <div className="rabby-list-item-content border-0 p-0 pt-14 min-h-0">
          <div className="rabby-list-item-label">
            {t('page.addressDetail.importedDelegatedAddress')}
          </div>
        </div>
      </div>
      {delegates.map((item) => (
        <div className="rabby-list-item">
          <div className="rabby-list-item-content py-0 min-h-[40px]">
            <NameAndAddress address={item} nameClass="max-143" />
          </div>
        </div>
      ))}
    </>
  );
};
