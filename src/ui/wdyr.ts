import React from 'react';
// import { useCurrentBalance } from 'ui/component/AddressList/AddressItem';

if (process.env.NODE_ENV === 'development') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const whyDidYouRender = require('@welldone-software/why-did-you-render');
  whyDidYouRender(React, {
    trackAllPureComponents: true,
    // trackExtraHooks: [useCurrentBalance],
  });
}
