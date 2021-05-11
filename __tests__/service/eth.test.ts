import { eth } from 'background/service';
import { jsonFile } from './eth.data';

describe('eth service test', () => {
  test('import JSON file', async () => {
    let simpleKeyring = eth.getKeyringByType('Simple Key Pair');
    expect(simpleKeyring).toBeUndefined();
    await eth.importJson(jsonFile.content, jsonFile.password);
    simpleKeyring = eth.getKeyringByType('Simple Key Pair');
    expect(simpleKeyring).toBeDefined();
  });
});
