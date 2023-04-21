import {
  defaultRules,
  UserData,
  RuleConfig,
  Threshold,
  ContextActionData,
} from '@debank/rabby-security-engine/dist/rules';
import Engine from '@debank/rabby-security-engine';
import { createPersistStore } from 'background/utils';
import openapiService from './openapi';

interface SecurityEngineStore {
  userData: UserData;
  rules: UserRuleConfig[];
}

interface UserRuleConfig {
  id: string;
  enable: boolean;
  customThreshold: Threshold;
}

function mergeRules(rules: RuleConfig[], userConfig: UserRuleConfig[]) {
  // Merge default rules with user local config
  return rules.map((rule) => {
    const target = userConfig.find((item) => item.id === rule.id);
    if (target) {
      return {
        ...rule,
        ...target,
      };
    }
    return rule;
  });
}

function getRuleConfigFromRules(rules: RuleConfig[]): UserRuleConfig[] {
  return rules.map((rule) => ({
    id: rule.id,
    enable: rule.enable,
    customThreshold: rule.customThreshold,
  }));
}

class SecurityEngineService {
  store: SecurityEngineStore = {
    userData: {
      originBlacklist: [],
      originWhitelist: [],
    },
    rules: [],
  };

  rules: RuleConfig[] = [];

  engine: Engine | null = null;

  init = async () => {
    const storage = await createPersistStore<SecurityEngineStore>({
      name: 'securityEngine',
      template: {
        userData: {
          originBlacklist: [],
          originWhitelist: [],
        },
        rules: getRuleConfigFromRules(defaultRules),
      },
    });
    this.rules = mergeRules(defaultRules, storage.rules);
    this.store = storage || this.store;
    this.engine = new Engine(this.rules, openapiService);
  };

  execute = async (actionData: ContextActionData) => {
    if (!this.engine) throw new Error('Security Engine not init');
    const results = await this.engine.run({
      ...actionData,
      userData: this.store.userData,
    });
    return results;
  };

  getRules = () => {
    return this.rules;
  };

  getUserData = () => {
    return this.store.userData;
  };

  updateUserData = (data: UserData) => {
    this.store.userData = data;
  };

  getOriginWhitelist = () => {
    return this.store.userData.originWhitelist;
  };

  addOriginWhitelist = (origin: string) => {
    if (this.store.userData.originWhitelist.includes(origin)) return;

    this.store.userData = {
      ...this.store.userData,
      originWhitelist: [
        ...this.store.userData.originWhitelist,
        origin.toLowerCase(),
      ],
    };
  };

  removeOriginWhitelist = (origin: string) => {
    if (!this.store.userData.originWhitelist.includes(origin.toLowerCase())) {
      return;
    }

    this.store.userData = {
      ...this.store.userData,
      originWhitelist: this.store.userData.originWhitelist.filter((item) => {
        return item.toLowerCase() !== origin.toLowerCase();
      }),
    };
  };

  getOriginBlacklist = () => {
    return this.store.userData.originBlacklist;
  };

  addOriginBlacklist = (origin: string) => {
    if (this.store.userData.originBlacklist.includes(origin)) return;

    this.store.userData = {
      ...this.store.userData,
      originBlacklist: [
        ...this.store.userData.originBlacklist,
        origin.toLowerCase(),
      ],
    };
  };

  removeOriginBlacklist = (origin: string) => {
    if (!this.store.userData.originBlacklist.includes(origin.toLowerCase())) {
      return;
    }

    this.store.userData = {
      ...this.store.userData,
      originBlacklist: this.store.userData.originBlacklist.filter((item) => {
        return item.toLowerCase() !== origin.toLowerCase();
      }),
    };
  };

  enableRule = (id: string) => {
    this.store.rules = this.store.rules.map((rule) => {
      if (rule.id === id) {
        return {
          ...rule,
          enable: true,
        };
      } else {
        return rule;
      }
    });
    this.reloadRules(this.store.rules);
  };

  disableRule = (id: string) => {
    this.store.rules = this.store.rules.map((rule) => {
      if (rule.id === id) {
        return {
          ...rule,
          enable: false,
        };
      } else {
        return rule;
      }
    });
    this.reloadRules(this.store.rules);
  };

  reloadRules = (rules: UserRuleConfig[]) => {
    this.rules = mergeRules(defaultRules, rules);
    this.engine?.reloadRules(this.rules);
  };
}

export default new SecurityEngineService();
