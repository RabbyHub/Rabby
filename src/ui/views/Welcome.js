import { useHistory, Link } from 'react-router-dom';
import { Button } from 'ui/component';

const Welcome = () => {
  const history = useHistory();

  return (
    <Link to="/start">welcome</Link>
  )

}

export default Welcome;
