import clsx from 'clsx';
import React, { ReactNode } from 'react';
import './style.less';
import { Flex, Heading, Text } from '@radix-ui/themes';
import { LucideBookOpen, LucideFolderOpen } from 'lucide-react';

interface EmptyProps {
  className?: string;
  style?: React.CSSProperties;
  children?: ReactNode;
  title?: ReactNode;
  desc?: ReactNode;
}

const Empty = ({ className, style, children, title, desc }: EmptyProps) => {
  return (
    <>
      <Flex
        direction={'column'}
        align={'center'}
        justify={'center'}
        gap={'4'}
        py={'8'}
      >
        <LucideBookOpen size={32} />
        <Flex
          direction={'column'}
          align={'center'}
          justify={'center'}
          gap={'2'}
        >
          <Heading align={'center'} size={'6'} wrap={'balance'}>
            {title}
          </Heading>
          <Text align={'center'} size={'3'} wrap={'pretty'}>
            {children ? children : desc}
          </Text>
        </Flex>
      </Flex>

      {/*<div className={clsx('rabby-empty', className)} style={style}>
        <img className="rabby-empty-image" src="./images/nodata-tx.png" />
        <div className="rabby-empty-content">
          {title && <div className="rabby-empty-title">{title}</div>}
          <div className="rabby-empty-desc">{children ? children : desc}</div>
        </div>
      </div>*/}
    </>
  );
};

export default Empty;
