import { Route, Routes } from "react-router";

import { HomePage } from "@pages/home";

import styles from "./styles/root.module.scss";

export const App = () => {
  return (
    <div className={styles.root}>
      <Routes>
        <Route element={<HomePage />} path="/" />
        <Route element={null} path="*" />
      </Routes>
    </div>
  );
};
