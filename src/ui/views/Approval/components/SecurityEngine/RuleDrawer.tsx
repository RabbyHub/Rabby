import React, { useEffect, useMemo, useState } from 'react';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { Popup } from 'ui/component';
import {
  RuleConfig,
  Level,
} from '@rabby-wallet/rabby-security-engine/dist/rules';
import { SecurityEngineLevel } from 'consts';
import { useHover } from '@/ui/utils';
import { ReactComponent as IconError } from 'ui/assets/sign/security-engine/error-big.svg';
import IconQuestionMark from 'ui/assets/sign/tx/question-mark.svg';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { cn } from '@/ui/utils/cn';
import styles from './RuleDrawer.module.css';

interface Props {
  selectRule: {
    ruleConfig: RuleConfig;
    value?: number | string | boolean;
    level?: Level;
    ignored: boolean;
  } | null;
  visible: boolean;
  onRuleEnableStatusChange(id: string, value: boolean): Promise<void>;
  onIgnore(id: string): void;
  onUndo(id: string): void;
  onClose(update: boolean): void;
}

const RuleDrawer = ({
  visible,
  selectRule,
  onClose,
  onIgnore,
  onUndo,
}: Props) => {
  const [changed, setChanged] = useState(false);
  const { t } = useTranslation();

  const [isHovering, hoverProps, resetHovering] = useHover();
  const currentLevel = useMemo(() => {
    if (!selectRule || selectRule.ignored) return 'proceed';
    return selectRule.level;
  }, [selectRule]);

  const ignoreButtonDisabled = useMemo(() => {
    if (!selectRule) return true;
    if (selectRule.ignored) {
      return !isHovering;
    }
    return false;
  }, [selectRule, isHovering]);

  const ignoreButtonContent = useMemo(() => {
    if (!selectRule) return { color: null, text: '' };
    let text = '';
    let color: string | null = '#B4BDCC';
    if (selectRule.ignored) {
      if (isHovering) {
        text = t('page.securityEngine.undo');
        color = '#707280';
      } else {
        text = t('page.securityEngine.riskProcessed');
      }
    } else {
      text = t('page.securityEngine.ignoreAlert');
      color = null;
    }
    return {
      text,
      color,
    };
  }, [selectRule, isHovering, t]);

  const handleIgnore = () => {
    if (!selectRule) return;
    onIgnore(selectRule.ruleConfig.id);
  };

  const handleUndoIgnore = () => {
    if (!selectRule) return;
    onUndo(selectRule.ruleConfig.id);
  };

  const handleClose = () => {
    onClose(changed);
  };

  const reset = () => {
    setChanged(false);
    resetHovering();
  };

  useEffect(() => {
    if (!visible) {
      reset();
    }
  }, [visible]);

  const currentDescription = useMemo(() => {
    if (!selectRule) return '';
    const { ruleConfig, level } = selectRule;
    if (!level) return ruleConfig.valueDescription;
    return ruleConfig.descriptions?.[level] || ruleConfig.valueDescription;
  }, [selectRule]);

  const content = () => {
    if (!selectRule) return null;
    if (selectRule.level === Level.ERROR) {
      return (
        <div className="main">
          <div className="level-logo">
            <IconError className="w-32 h-32 text-r-neutral-line" />
          </div>
          <div>{t('page.securityEngine.unknownResult')}</div>
        </div>
      );
    } else {
      const valueTooltip = selectRule.ruleConfig.valueTooltip;
      return (
        <div className="main">
          {currentLevel && (
            <div className="level-logo">
              <img
                className="level-icon"
                src={SecurityEngineLevel[currentLevel].icon}
              />
              {selectRule.level && (
                <span className="level-text">
                  {SecurityEngineLevel[selectRule.level].text}
                </span>
              )}
            </div>
          )}
          <div className="relative">
            {currentDescription}
            {valueTooltip ? (
              <TooltipWithMagnetArrow
                inApproval
                className="rectangle w-[max-content]"
                title={valueTooltip}
              >
                <img src={IconQuestionMark} className="inline-block ml-[3px]" />
              </TooltipWithMagnetArrow>
            ) : null}
          </div>
        </div>
      );
    }
  };

  return (
    <Popup
      visible={visible}
      onClose={handleClose}
      height="auto"
      className="rule-detail-modal"
      closable
      title={t('page.securityEngine.ruleDetailTitle')}
      isSupportDarkMode
      bodyStyle={{ padding: 0, minHeight: '136px' }}
    >
      {selectRule && (
        <div
          className={cn(
            styles.ruleDrawerWrapper,
            selectRule.ignored ? 'proceed' : selectRule.level
          )}
        >
          {content()}
          {selectRule.level !== 'safe' && selectRule.level !== 'error' && (
            <div className="rule-threshold-footer">
              <div {...hoverProps}>
                <Button
                  type="primary"
                  className="button-ignore"
                  style={{
                    backgroundColor: ignoreButtonContent.color,
                  }}
                  onClick={selectRule.ignored ? handleUndoIgnore : handleIgnore}
                  disabled={ignoreButtonDisabled}
                >
                  {ignoreButtonContent.text}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Popup>
  );
};

export default RuleDrawer;
