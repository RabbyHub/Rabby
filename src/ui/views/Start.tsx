import React from 'react';
import { useHistory, Link } from 'react-router-dom';
import { Button } from 'antd';
import { Header } from 'ui/component';

const Start = () => {
  const history = useHistory();

  return (
    <>
      <Header
        title={'Create or Import Account Number'}
        subTitle={
          'you can create a new account or import an existing one through seed pharse,private key or JSON file'
        }
        className="mb-4"
      />
      <Link to="/create">
        <Button block type="primary" className="mb-2 mt-4">
          Create
        </Button>
      </Link>
      <Link to="/import">
        <Button block type="primary">
          Import
        </Button>
      </Link>
    </>
  );
};

export default Start;
