import eth from 'background/eth';

export default ({ data: { params: [data, from] } }) => eth.signPersonalMessage({ data, from });
