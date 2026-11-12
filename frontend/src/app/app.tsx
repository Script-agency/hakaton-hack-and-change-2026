import { Route, Routes } from "react-router";

import { HistoryPage } from "@pages/history";
import { HomePage } from "@pages/home";
import { LeadPage } from "@pages/lead";
import { LeadSentPage } from "@pages/lead-sent";

import { AssistantLayout } from "./layouts/assistant";
import styles from "./styles/root.module.scss";

export const App = () => {
  return (
    <div className={styles.root}>
      <AssistantLayout>
        <Routes>
          <Route element={<HomePage />} path="/" />
          <Route element={<HistoryPage />} path="/history" />
          <Route element={<LeadPage />} path="/lead" />
          <Route element={<LeadSentPage />} path="/lead/sent" />
          <Route element={null} path="*" />
        </Routes>
      </AssistantLayout>
    </div>
  );
};
