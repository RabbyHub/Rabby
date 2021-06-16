import React, { ReactNode, FunctionComponent } from 'react';
import cx from 'clsx';
import { Form, FormInstance, FormProps } from 'antd';
import StrayHeader, { StrayHeaderProps } from '../StrayHeader';
import StrayFooter, { StrayFooterNavProps } from '../StrayFooter';
import Spin from '../Spin';

import './index.css';

interface StrayPageProps {
  header?: StrayHeaderProps;
  children?: ReactNode;
  footerRender?: FunctionComponent;
  className?: string;
  spinning?: boolean;
}

const StrayPage = ({
  header,
  children,
  footerRender,
  className,
  spinning = false,
}: StrayPageProps) => (
  <Spin
    spinning={spinning}
    size="large"
    className={cx(
      'stray-page relative flex flex-col bg-gray-bg',
      'sm:pt-28 sm:h-full',
      'lg:pt-[60px] lg:w-[993px] lg:max-h-full lg:mt-[150px] lg:rounded-md lg:mx-auto',
      className
    )}
  >
    <div className="sm:px-20 h-full flex flex-col">
      {header && <StrayHeader className="mb-60" {...header} />}
      {children && (
        <div className="lg:flex lg:items-center lg:flex-col flex-1 overflow-auto">
          {children}
        </div>
      )}
    </div>
    {footerRender && footerRender({})}
  </Spin>
);

interface StrayPageWithButtonProps {
  header?: StrayHeaderProps;
  form?: FormInstance<any>;
  formProps?: FormProps;
  initialValues?: any;
  onSubmit?(values: any): any;
  children;
  className?: string;
  spinning?: boolean;
}

export const StrayPageWithButton = ({
  header,
  form,
  formProps,
  onSubmit,
  children,
  onNextClick,
  onBackClick,
  backDisabled,
  nextDisabled,
  hasBack,
  hasDivider,
  initialValues,
  NextButtonContent,
  spinning,
}: StrayPageWithButtonProps & StrayFooterNavProps) => (
  <StrayPage header={header} spinning={spinning}>
    <Form
      className="overflow-y-auto max-h-full sm:pb-[99px] lg:pb-[120px]"
      autoComplete="off"
      {...formProps}
      onFinish={onSubmit}
      initialValues={initialValues}
      form={form}
    >
      {children}
      <StrayFooter.Nav
        onNextClick={onNextClick}
        onBackClick={onBackClick}
        backDisabled={backDisabled}
        nextDisabled={nextDisabled}
        hasBack={hasBack}
        hasDivider={hasDivider}
        NextButtonContent={NextButtonContent}
        className="lg:w-[500px] lg:left-2/4 lg:-translate-x-2/4 lg:transform lg:mb-[36px] z-10"
      />
    </Form>
  </StrayPage>
);

export default StrayPage;
