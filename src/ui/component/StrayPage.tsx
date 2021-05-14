import React, { ReactNode, FunctionComponent } from 'react';
import { Form, FormInstance } from 'antd';
import StrayHeader, { StrayHeaderProps } from './StrayHeader';
import StrayFooter, { StrayFooterNavProps } from './StrayFooter';

interface StrayPageProps {
  header: StrayHeaderProps;
  children?: ReactNode;
  footerRender?: FunctionComponent;
}

const StrayPage = ({ header, children, footerRender }: StrayPageProps) => (
  <div className="pt-28 px-20 bg-gray-bg h-full">
    <StrayHeader {...header} />
    {children}
    {footerRender && footerRender({})}
  </div>
);

interface StrayPageWithButtonProps {
  header: StrayHeaderProps;
  form?: FormInstance<any>;
  onSubmit?(values: any): any;
  children;
}

export const StrayPageWithButton = ({
  header,
  form,
  onSubmit,
  children,
  onNextClick,
  onBackClick,
  backDisabled,
  nextDisabled,
  hasBack,
  withDivider,
}: StrayPageWithButtonProps & StrayFooterNavProps) => (
  <StrayPage header={header}>
    <Form form={form} onFinish={onSubmit}>
      {children}
      <StrayFooter.Nav
        onNextClick={onNextClick}
        onBackClick={onBackClick}
        backDisabled={backDisabled}
        nextDisabled={nextDisabled}
        hasBack={hasBack}
        withDivider={withDivider}
      />
    </Form>
  </StrayPage>
);

export default StrayPage;
