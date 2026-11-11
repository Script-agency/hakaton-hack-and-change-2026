import { Route, Routes } from "react-router";

import { HomePage } from "@pages/home";

import { AssistantLayout } from "./layouts/assistant";
import styles from "./styles/root.module.scss";

export const App = () => {
  return (
    <div className={styles.root}>
      <AssistantLayout>
        <Routes>
          <Route element={<HomePage />} path="/" />
          <Route element={null} path="*" />
        </Routes>
      </AssistantLayout>
    </div>
  );
};
