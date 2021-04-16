import { eth } from 'background/service';

export default ({
  data: {
    params: [data, from],
  },
}) => eth.signPersonalMessage({ data, from });
