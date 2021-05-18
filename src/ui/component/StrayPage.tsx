import React, { ReactNode, FunctionComponent } from 'react';
import cx from 'clsx';
import { Form, FormInstance } from 'antd';
import StrayHeader, { StrayHeaderProps } from './StrayHeader';
import StrayFooter, { StrayFooterNavProps } from './StrayFooter';

interface StrayPageProps {
  header?: StrayHeaderProps;
  children?: ReactNode;
  footerRender?: FunctionComponent;
  className?: string;
}

const StrayPage = ({
  header,
  children,
  footerRender,
  className,
}: StrayPageProps) => (
  <div className={cx('pt-28 px-20 bg-gray-bg h-full flex flex-col', className)}>
    {header && <StrayHeader {...header} />}
    {children}
    {footerRender && footerRender({})}
  </div>
);

interface StrayPageWithButtonProps {
  header?: StrayHeaderProps;
  form?: FormInstance<any>;
  initialValues?: any;
  onSubmit?(values: any): any;
  children;
  className?: string;
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
  hasDivider,
  initialValues,
  className,
  NextButtonText,
}: StrayPageWithButtonProps & StrayFooterNavProps) => (
  <StrayPage header={header} className={className}>
    <Form
      className="flex-1 overflow-auto"
      form={form}
      onFinish={onSubmit}
      initialValues={initialValues}
    >
      {children}
      <StrayFooter.Nav
        onNextClick={onNextClick}
        onBackClick={onBackClick}
        backDisabled={backDisabled}
        nextDisabled={nextDisabled}
        hasBack={hasBack}
        hasDivider={hasDivider}
        NextButtonText={NextButtonText}
      />
    </Form>
  </StrayPage>
);

export default StrayPage;
