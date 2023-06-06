import React from 'react';
import { Skeleton } from 'antd';
import { ActionWrapper, SignTitle } from '../Actions';
import { Col, Row, Table } from '../Actions/components/Table';

const RowLoading: React.FC<{
  itemCount?: number;
}> = ({ itemCount = 1 }) => {
  return (
    <Col>
      <Row isTitle>
        <Skeleton.Input active className="w-[60px] h-[15px] rounded" />
      </Row>
      <Row className="space-y-[8px]">
        <div className="space-x-[4px]">
          <Skeleton.Avatar active className="w-[16px] h-[16px]" />
          <Skeleton.Input active className="w-[113px] h-[15px] rounded" />
        </div>
        {Array.from({ length: itemCount }).map((_, index) => (
          <div key={index}>
            <Skeleton.Input active className="w-[113px] h-[15px] rounded" />
          </div>
        ))}
      </Row>
    </Col>
  );
};

const Loading = () => {
  return (
    <>
      <SignTitle>
        <div className="left relative">
          <Skeleton.Input active className="w-[220px] h-[22px] rounded" />
        </div>
        <div className="float-right view-raw">
          <Skeleton.Input active className="w-[73px] h-[22px] rounded" />
        </div>
      </SignTitle>
      <ActionWrapper>
        <div className="action-header">
          <div className="left">
            <Skeleton.Input active className="w-[60px] h-[22px] rounded" />
          </div>
          <div className="right">
            <Skeleton.Input active className="w-[70px] h-[22px] rounded" />
          </div>
        </div>
        <div className="container space-y-[13px]">
          <Table>
            <RowLoading itemCount={1} />
            <RowLoading itemCount={2} />
          </Table>

          <Table>
            <Col>
              <Row>
                <Skeleton.Input active className="w-[125px] h-[15px] rounded" />
              </Row>
            </Col>
            <RowLoading itemCount={0} />
          </Table>
        </div>
      </ActionWrapper>
    </>
  );
};

export default Loading;
