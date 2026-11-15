import { useNavigate } from "react-router";

import { Button } from "@shared/ui";

import styles from "./lead-page-unavailable.module.scss";

interface LeadPageUnavailableProps {
  chatId: number | undefined;
}

export const LeadPageUnavailable = ({ chatId }: LeadPageUnavailableProps) => {
  const navigate = useNavigate();

  return (
    <div className={styles.unavailable} role="status">
      <p>
        {chatId === undefined
          ? "Откройте переписку, чтобы оставить заявку."
          : "Заявка доступна после завершения консультации и подготовки резюме."}
      </p>
      <Button onClick={() => void navigate(chatId === undefined ? "/" : `/chats/${chatId}`)}>
        Перейти к переписке
      </Button>
    </div>
  );
};
