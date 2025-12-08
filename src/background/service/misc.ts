import { GasLevel } from './openapi';

class MiscService {
  currentGasLevel: GasLevel['level'] = 'normal';

  setCurrentGasLevel = (level?: GasLevel['level']) => {
    this.currentGasLevel = level || 'normal';
  };

  getCurrentGasLevel = () => this.currentGasLevel;
}

const miscService = new MiscService();

export default miscService;
