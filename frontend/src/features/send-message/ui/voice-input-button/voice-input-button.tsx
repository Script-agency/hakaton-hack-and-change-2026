import clsx from "clsx";
import { Mic, Square } from "lucide-react";

import styles from "./voice-input-button.module.scss";

interface VoiceInputButtonProps {
  isActive: boolean;
  isStopping: boolean;
  isSupported: boolean;
  disabled: boolean;
  onToggle: () => void;
}

export const VoiceInputButton = ({ isActive, isStopping, isSupported, disabled, onToggle }: VoiceInputButtonProps) => {
  const Icon = isActive ? Square : Mic;

  const label = !isSupported
    ? "Голосовой ввод недоступен в этом браузере"
    : isStopping
      ? "Завершаю диктовку"
      : disabled
        ? "Дождитесь ответа"
        : isActive
          ? "Остановить диктовку"
          : "Ввести сообщение голосом";

  return (
    <button
      aria-label={label}
      aria-pressed={isActive}
      className={clsx(styles.button, isActive && styles.active)}
      disabled={!isSupported || disabled || isStopping}
      onClick={onToggle}
      title={label}
      type="button"
    >
      <Icon aria-hidden="true" size={18} strokeWidth={2} />
    </button>
  );
};
