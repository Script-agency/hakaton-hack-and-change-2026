import { ChatPage } from "@pages/chat";
import { HistoryPage } from "@pages/history";
import { LeadPage } from "@pages/lead";
import { LeadSentPage } from "@pages/lead-sent";

import { AssistantLayout } from "./layouts/assistant";
import { ChatLayout } from "./layouts/chat";
import { HistoryLayout } from "./layouts/history";
import { LeadLayout } from "./layouts/lead";
import { ScreenStack, type ScreenRoute } from "./navigation";
import styles from "./styles/root.module.scss";

const screenRoutes: ScreenRoute[] = [
  {
    render: ({ onBack }) => <ChatLayout onBack={onBack} />,
    children: [
      { path: "/", stack: "root", render: ({ isActive }) => <ChatPage isActive={isActive} /> },
      {
        path: "/chats/:id",
        stack: "screen",
        render: ({ isActive }) => <ChatPage isActive={isActive} />,
      },
    ],
  },
  {
    render: ({ onBack }) => <HistoryLayout onBack={onBack} />,
    children: [{ path: "/history", stack: "screen", render: ({ isActive }) => <HistoryPage isActive={isActive} /> }],
  },
  {
    render: ({ onBack }) => <LeadLayout onBack={onBack} />,
    children: [
      {
        path: "/lead",
        stack: "screen",
        direction: "right",
        render: ({ isActive }) => <LeadPage isActive={isActive} />,
      },
    ],
  },
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
