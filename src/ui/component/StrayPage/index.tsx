import React, { ReactNode, FunctionComponent } from 'react';
import cx from 'clsx';
import { Form, FormInstance } from 'antd';
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
      'stray-page relative flex flex-col',
      'sm:pt-28 sm:h-full sm:bg-gray-bg',
      'lg:pt-[60px] lg:bg-gray-bg lg:w-[993px] lg:max-h-full lg:mt-[150px] lg:rounded-md lg:mx-auto',
      className
    )}
  >
    <div className="sm:px-20 max-h-full overflow-auto">
      {header && <StrayHeader {...header} />}
      {children && (
        <div className="lg:flex lg:items-center lg:flex-col">{children}</div>
      )}
    </div>
    {footerRender && footerRender({})}
  </Spin>
);

interface StrayPageWithButtonProps {
  header?: StrayHeaderProps;
  form?: FormInstance<any>;
  initialValues?: any;
  onSubmit?(values: any): any;
  children;
  className?: string;
  spinning?: boolean;
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
  spinning,
}: StrayPageWithButtonProps & StrayFooterNavProps) => (
  <StrayPage header={header} className={className} spinning={spinning}>
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
        className="lg:w-[500px] lg:left-2/4 lg:-translate-x-2/4 lg:transform lg:mb-[36px] z-10"
      />
    </Form>
  </StrayPage>
);

export default StrayPage;
