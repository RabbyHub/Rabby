import React from 'react';
import { useHistory } from 'react-router-dom';
import { Navbar, StrayPageWithButton } from 'ui/component';
import { useMedia } from 'react-use';
import clsx from 'clsx';

const NarvalPendingPermissions = () => {
  const history = useHistory();
  const isWide = useMedia('(min-width: 401px)');

  const onBack = async () => {
    history.replace({
      pathname: '/import/narval/',
    });
  };

  return (
    <StrayPageWithButton
      custom={isWide}
      hasBack={false}
      hasDivider
      noPadding
      className={clsx(isWide && 'rabby-stray-page')}
      NextButtonContent="Back"
      onNextClick={onBack}
      onBackClick={onBack}
      backDisabled={false}
    >
      <Navbar onBack={onBack}>Pending Permissions</Navbar>
      <div className="rabby-container widget-has-ant-input">
        <div className="px-20 pt-24">
          <div className="flex flex-col gap-4">
            <p>
              You don't have permissions to access the accounts of this client.
            </p>
            <p>
              It means someone needs to give your address permissions to access
              the accounts.
            </p>
            <p>
              Please contact your organization administration or try again
              later.
            </p>
          </div>
        </div>
      </div>
    </StrayPageWithButton>
  );
};

export default NarvalPendingPermissions;
