import { Route, Routes } from "react-router";

import { ChatPage, StartPage } from "@pages/chat";
import { HistoryPage } from "@pages/history";
import { LeadPage } from "@pages/lead";
import { LeadSentPage } from "@pages/lead-sent";

import { AssistantLayout } from "./layouts/assistant";
import styles from "./styles/root.module.scss";

export const App = () => {
  return (
    <div className={styles.root}>
      <AssistantLayout>
        <Routes>
          <Route element={<StartPage isActive />} path="/" />
          <Route element={<ChatPage isActive />} path="/chats/:id" />
          <Route element={<HistoryPage isActive />} path="/history" />
          <Route element={<LeadPage />} path="/lead" />
          <Route element={<LeadSentPage />} path="/lead/sent" />
          <Route element={null} path="*" />
        </Routes>
      </AssistantLayout>
    </div>
  );
};
