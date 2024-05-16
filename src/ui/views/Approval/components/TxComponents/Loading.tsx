import React from 'react';
import { Skeleton } from 'antd';
import { ActionWrapper } from '../ActionWrapper';
import { Card } from '../Card';
import { Divide } from '../Divide';
import { Col, Row, Table } from '../Actions/components/Table';
import { SubCol, SubRow, SubTable } from '../Actions/components/SubTable';

const Loading = () => {
  return (
    <ActionWrapper>
      <Card>
        <div className="space-x-[8px] mx-auto flex items-center justify-center py-10">
          <Skeleton.Avatar active className="w-[24px] h-[24px]" />
          <Skeleton.Input active className="w-[140px] h-[16px] rounded" />
        </div>

        <Divide />

        <div className="px-16 pt-16">
          <Skeleton.Input active className="w-[100px] h-[16px] rounded mb-8" />

          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="space-x-[8px] py-10 flex items-center">
              <Skeleton.Avatar active className="w-[24px] h-[24px]" />
              <Skeleton.Input active className="w-[140px] h-[16px] rounded" />
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="px-16 py-12">
          <Skeleton.Input active className="w-[100px] h-[16px] rounded" />
        </div>
        <Divide />
        <Table className="p-12">
          {Array.from({ length: 5 }).map((_, index) => (
            <Col key={index}>
              <Row isTitle>
                <Skeleton.Input active className="w-[80px] h-[16px] rounded" />
              </Row>
              <Row>
                <Skeleton.Input active className="w-[100px] h-[16px] rounded" />
              </Row>
            </Col>
          ))}
          <SubTable>
            {Array.from({ length: 2 }).map((_, index) => (
              <SubCol key={index}>
                <SubRow isTitle>
                  <Skeleton.Input
                    active
                    className="w-[80px] h-[16px] rounded"
                  />
                </SubRow>
                <SubRow>
                  <Skeleton.Input
                    active
                    className="w-[80px] h-[16px] rounded"
                  />
                </SubRow>
              </SubCol>
            ))}
          </SubTable>
        </Table>
      </Card>

      <Card className="pt-12 pb-16 px-16">
        <Skeleton.Input active className="w-[100px] h-[16px] rounded" />
      </Card>

      <Card className="pt-12 pb-16 px-16">
        <Skeleton.Input active className="w-[100px] h-[16px] rounded" />
      </Card>
    </ActionWrapper>
  );
};

export default Loading;
