import sinon from 'sinon';

export default {
  encrypt: sinon.stub().callsFake(function (_password, dataObj) {
    return dataObj;
  }),

  decrypt(_password, _text) {
    return _text;
  },
};
