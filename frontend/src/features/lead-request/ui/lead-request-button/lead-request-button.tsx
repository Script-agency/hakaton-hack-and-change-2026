import { useNavigate } from "react-router";

import { Button } from "@shared/ui";

import styles from "./lead-request-button.module.scss";

interface LeadRequestButtonProps {
  chatId: number;
  disabled: boolean;
}

export const LeadRequestButton = ({ chatId, disabled }: LeadRequestButtonProps) => {
  const navigate = useNavigate();

  return (
    <Button className={styles.button} disabled={disabled} onClick={() => void navigate(`/lead?chatId=${chatId}`)}>
      Связаться с менеджером
    </Button>
  );
};
