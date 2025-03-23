import { ExplainTxResponse } from '@/background/service/openapi';
import { Tabs } from 'antd';
import React from 'react';
import { Popup } from 'ui/component';
const { TabPane } = Tabs;
interface ContentProps {
  abi?: ExplainTxResponse['abi_str'];
  raw: Record<string, string | number>;
}

const stringify = (val: any) => {
  try {
    return JSON.stringify(val, null, 4);
  } catch (e) {
    console.error(e);
  }
};

const Content = ({ abi, raw }: ContentProps) => {
  return (
    <Tabs defaultActiveKey="raw">
      {raw && (
        <TabPane tab="DATA" key="raw">
          {stringify(raw)}
        </TabPane>
      )}
      {abi && (
        <TabPane tab="ABI" key="abi">
          {abi}
        </TabPane>
      )}
      {raw?.data && raw?.data !== '0x' && (
        <TabPane tab="HEX" key="hex">
          {raw?.data}
        </TabPane>
      )}
    </Tabs>
  );
};

const ViewRawModal = () => {
  return null;
};

ViewRawModal.open = ({ raw, abi }: ContentProps) => {
  Popup.info({
    isNew: true,
    closable: true,
    height: 520,
    content: <Content raw={raw} abi={abi} />,
    className: 'view-raw-detail',
  });
};

export default ViewRawModal;
