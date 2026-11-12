import { ChatPage, StartPage } from "@pages/chat";
import { HistoryPage } from "@pages/history";
import { LeadPage } from "@pages/lead";
import { LeadSentPage } from "@pages/lead-sent";

import { AssistantLayout } from "./layouts/assistant";
import { ScreenStack, type ScreenRoute } from "./navigation";
import styles from "./styles/root.module.scss";

const screenRoutes: ScreenRoute[] = [
  { path: "/", stack: "root", render: ({ isActive }) => <StartPage isActive={isActive} /> },
  {
    path: "/chats/:id",
    stack: "screen",
    render: ({ isActive, onBack }) => <ChatPage isActive={isActive} onBack={onBack} />,
  },
  {
    path: "/history",
    stack: "screen",
    render: ({ isActive, onBack }) => <HistoryPage isActive={isActive} onBack={onBack} />,
  },
  { path: "/lead", stack: "screen", direction: "right", render: ({ onBack }) => <LeadPage onBack={onBack} /> },
  {
    path: "/lead/sent",
    stack: "screen",
    direction: "bottom",
    render: ({ onNewChat }) => <LeadSentPage onNewChat={onNewChat} />,
  },
  { path: "*", stack: "screen", render: () => null },
];

export const App = () => {
  return (
    <div className={styles.root}>
      <AssistantLayout>
        <ScreenStack routes={screenRoutes} />
      </AssistantLayout>
    </div>
  );
};
