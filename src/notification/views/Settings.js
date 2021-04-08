import { useState } from 'react';
import { Icon, Button, ArrowLink, Header } from 'popup/component';

const Settings = () => {
  return <>
    <Header title={'Settings'} />
    <Button block className="rounded-full mb-4 text-base">Lock wallet</Button>
    <ArrowLink
      className="mt-6 font-semibold"
      to="/settings/address"
    >Address management</ArrowLink>
    <ArrowLink
      className="mt-5 font-semibold"
      to="/settings/sites"
    >Connect sites</ArrowLink>
  </>
}

export default Settings;
