import React, { useCallback } from 'react';

import { Collapse, Modal, ModalProps } from 'antd';
import styled from 'styled-components';

import { ContractApprovalItem, AssetApprovalSpender } from '@/utils/approval';
import { HandleClickTableRow } from './Table';
import { appIsDev } from '@/utils/env';
import { detectClientOS } from '@/ui/utils/os';

const ModalStyled = styled(Modal)`
  .ant-modal-header {
    border-bottom: none;
    padding-bottom: 8px;
  }

  pre.json-viewer {
    padding: 8px 12px;
    border-radius: 6px;
  }

  .data-block {
    padding-top: 12px;
  }

  .data-block + .data-block {
    margin-top: 12px;
  }
`;

export function ModalInspectContract({
  approvalContract,
  ...modalProps
}: React.PropsWithoutRef<
  ModalProps & {
    approvalContract?: ContractApprovalItem | null;
  }
>) {
  if (!approvalContract) return null;

  return (
    <ModalStyled
      className="modal-debug-row-item"
      width={600}
      title="Debug Row Item"
      {...modalProps}
      visible={!!approvalContract}
      bodyStyle={{
        height: '640px',
        maxHeight: '640px',
      }}
      destroyOnClose
      footer={null}
    >
      <div className="pb-[12px]">
        <Collapse defaultActiveKey={['approvalContract']}>
          <Collapse.Panel header="Approval Contract" key="approvalContract">
            <div className="data-block">
              <pre className="json-viewer">
                <code>{JSON.stringify(approvalContract, null, 2)}</code>
              </pre>
            </div>
          </Collapse.Panel>
        </Collapse>
      </div>
    </ModalStyled>
  );
}

export function ModalInspectSpender({
  spender,
  ...modalProps
}: React.PropsWithoutRef<
  ModalProps & {
    spender?: AssetApprovalSpender | null;
  }
>) {
  if (!spender) return null;

  return (
    <ModalStyled
      className="modal-debug-row-item"
      width={600}
      title="Debug Approval Spender"
      {...modalProps}
      visible={!!spender}
      bodyStyle={{
        height: '640px',
        maxHeight: '640px',
      }}
      destroyOnClose
      footer={null}
    >
      <div className="pb-[12px]">
        <Collapse defaultActiveKey={['spender']}>
          <Collapse.Panel header="Spender" key="spender">
            <div className="data-block">
              <pre className="json-viewer">
                <code>{JSON.stringify(spender, null, 2)}</code>
              </pre>
            </div>
          </Collapse.Panel>

          <Collapse.Panel
            header="Spender Host"
            key="spender-host"
            collapsible={!spender.$assetParent ? 'disabled' : 'header'}
          >
            <div className="data-block">
              <pre className="json-viewer">
                <code>{JSON.stringify(spender.$assetParent, null, 2)}</code>
              </pre>
            </div>
          </Collapse.Panel>

          <Collapse.Panel
            header="Spender Contract"
            key="spender-contract"
            collapsible={!spender.$assetContract ? 'disabled' : 'header'}
          >
            <div className="data-block">
              <pre className="json-viewer">
                <code>{JSON.stringify(spender.$assetContract, null, 2)}</code>
              </pre>
            </div>
          </Collapse.Panel>

          <Collapse.Panel
            header="Spender Token"
            key="spender-token"
            collapsible={!spender.$assetToken ? 'disabled' : 'header'}
          >
            <div className="data-block">
              <pre className="json-viewer">
                <code>{JSON.stringify(spender.$assetToken, null, 2)}</code>
              </pre>
            </div>
          </Collapse.Panel>
        </Collapse>
      </div>
    </ModalStyled>
  );
}

const IS_WINDOWS = detectClientOS() === 'win32';
export function useInspectRowItem<
  T extends ContractApprovalItem | AssetApprovalSpender
>(origOnClickRow?: HandleClickTableRow<T>) {
  // const [selectedRow, setSelectedRow] = useState<T | null>(null);
  const onClickRowInspection: HandleClickTableRow<T> = useCallback(
    (ctx) => {
      if (
        (IS_WINDOWS && ctx.event.ctrlKey && ctx.event.altKey) ||
        (!IS_WINDOWS &&
          (ctx.event.metaKey || ctx.event.ctrlKey) &&
          ctx.event.altKey)
      ) {
        console.debug(ctx.record);
      }

      // if (appIsDev) {
      //   if (ctx.event.ctrlKey) {
      //     setSelectedRow(ctx.record);
      //     return;
      //   }
      // }

      return origOnClickRow?.(ctx);
    },
    [origOnClickRow]
  );

  // const onModalCancel = useCallback(() => {
  //   setSelectedRow(null);
  // }, []);

  return {
    // selectedRow,
    // onModalCancel,
    onClickRowInspection: onClickRowInspection,
  };
}
