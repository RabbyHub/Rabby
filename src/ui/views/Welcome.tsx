import React from 'react';
import { useHistory, Link } from 'react-router-dom';

const Welcome = () => {
  const history = useHistory();

  return <Link to="/start">welcome</Link>;
};

export default Welcome;
