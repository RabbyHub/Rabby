import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Chain } from 'background/service/openapi';
import { Result } from '@rabby-wallet/rabby-security-engine';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { isSameAddress } from '@/ui/utils';
import { ReactComponent as Warning2SVG } from '@/ui/assets/sign/tx/warning-2.svg';
import { ReactComponent as CertifiedSVG } from '@/ui/assets/sign/tx/certified.svg';
import { ProtocolListItem } from './Actions/components/ProtocolListItem';
import { SecurityListItem } from './Actions/components/SecurityListItem';
import ViewMore from './Actions/components/ViewMore';
import { ContractRequireData } from './TypedDataActions/utils';
import { Col, Row, Table } from './Actions/components/Table';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import * as Values from './Actions/components/Values';

type CommonActions = {
  desc: string;
  is_asset_changed: boolean;
  is_involving_privacy: boolean;
};

export const CommonAction = ({
  data,
  requireData,
  chain,
  engineResults,
}: {
  data: CommonActions;
  requireData?: ContractRequireData;
  chain?: Chain;
  engineResults: Result[];
}) => {
  const { t } = useTranslation();
  const actionData = data!;
  const dispatch = useRabbyDispatch();
  const { contractWhitelist } = useRabbySelector((state) => {
    return state.securityEngine.userData;
  });

  const isInWhitelist = useMemo(() => {
    return contractWhitelist.some(
      (item) =>
        item.chainId === chain?.serverId &&
        isSameAddress(item.address, requireData?.id ?? '')
    );
  }, [contractWhitelist, requireData]);

  const engineResultMap = useMemo(() => {
    const map: Record<string, Result> = {};
    engineResults.forEach((item) => {
      map[item.id] = item;
    });
    return map;
  }, [engineResults]);

  React.useEffect(() => {
    dispatch.securityEngine.init();
  }, []);

  const descTip = React.useMemo(() => {
    if (actionData.is_asset_changed && actionData.is_involving_privacy) {
      return t('page.signTx.common.descTipWarningBoth');
    } else if (actionData.is_asset_changed) {
      return t('page.signTx.common.descTipWarningAssets');
    } else if (actionData.is_involving_privacy) {
      return t('page.signTx.common.descTipWarningPrivacy');
    }
    return t('page.signTx.common.descTipSafe');
  }, []);

  return (
    <div>
      <Table>
        {requireData && chain ? (
          <Col>
            <Row className="w-[100px]" isTitle>
              {t('page.signTx.common.interactContract')}
            </Row>
            <Row>
              <div>
                <Values.Address address={requireData.id} chain={chain} />
              </div>
              <ul className="desc-list">
                <ProtocolListItem protocol={requireData.protocol} />
                <li>
                  <Values.Interacted value={requireData.hasInteraction} />
                </li>

                {isInWhitelist && <li>{t('page.signTx.markAsTrust')}</li>}

                <SecurityListItem
                  id="1135"
                  engineResult={engineResultMap['1135']}
                  forbiddenText={t('page.signTx.markAsBlock')}
                />

                <SecurityListItem
                  id="1137"
                  engineResult={engineResultMap['1137']}
                  warningText={t('page.signTx.markAsBlock')}
                />
                <li>
                  <ViewMore
                    type="contract"
                    data={{
                      hasInteraction: requireData.hasInteraction,
                      bornAt: requireData.bornAt,
                      protocol: requireData.protocol,
                      rank: requireData.rank,
                      address: requireData.id,
                      chain,
                    }}
                  />
                </li>
              </ul>
            </Row>
          </Col>
        ) : null}
        <Col>
          <Row className="w-[100px]" isTitle>
            {t('page.signTx.common.description')}
          </Row>
          <Row className="flex flex-row items-center gap-x-4 relative">
            <span>{actionData.desc}</span>
            <TooltipWithMagnetArrow
              className="rectangle w-[max-content]"
              title={descTip}
            >
              <div>
                {actionData.is_asset_changed ||
                actionData.is_involving_privacy ? (
                  <Warning2SVG />
                ) : null}
                {!actionData.is_asset_changed &&
                !actionData.is_involving_privacy ? (
                  <CertifiedSVG />
                ) : null}
              </div>
            </TooltipWithMagnetArrow>
          </Row>
        </Col>
      </Table>
    </div>
  );
};
