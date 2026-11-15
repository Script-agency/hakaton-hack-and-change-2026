import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { matchRoutes } from "react-router";
import { createServer } from "vite";

let server;
let navigation;

const event = (key, pathname, action = "PUSH") => ({
  location: { key, pathname, search: "", hash: "", state: null },
  action,
  isRoot: pathname === "/",
});

before(async () => {
  server = await createServer({
    configFile: false,
    root: fileURLToPath(new URL("..", import.meta.url)),
    server: { middlewareMode: true, ws: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  navigation = await server.ssrLoadModule("/src/app/navigation/lib/index.ts");
});

after(async () => {
  await server?.close();
});

const flow = () => {
  const root = navigation.createScreenStack(event("start", "/", "POP"));
  const history = navigation.updateScreenStack(root, event("history", "/history"));
  const chat = navigation.updateScreenStack(history, event("chat", "/chats/1"));

  return { root, history, chat };
};

const visibleKeys = (state) => navigation.getVisibleScreens(state).map((screen) => screen.key);

test("push preserves the previous screens beneath the incoming screen", () => {
  const { root, chat } = flow();
  assert.equal(root.movement, "none");
  assert.equal(chat.movement, "forward");
  assert.deepEqual(visibleKeys(chat), ["start", "history", "chat"]);
});

test("back reveals the same previous screen, and forward reopens the chat", () => {
  const { chat } = flow();
  const back = navigation.updateScreenStack(chat, event("history", "/history", "POP"));
  assert.equal(back.movement, "back");
  assert.deepEqual(visibleKeys(back), ["start", "history"]);
  assert.equal(back.entries[1], chat.entries[1]);
  const forward = navigation.updateScreenStack(back, event("chat", "/chats/1", "POP"));
  assert.equal(forward.movement, "forward");
  assert.deepEqual(visibleKeys(forward), ["start", "history", "chat"]);
});

test("session creation replaces the start location without remounting its screen", () => {
  const { root } = flow();
  const session = navigation.updateScreenStack(root, event("session", "/chats/5", "REPLACE"));
  assert.equal(session.movement, "none");
  assert.equal(session.entries.length, 1);
  assert.equal(session.entries[0].key, root.entries[0].key);
  assert.equal(session.entries[0].location.pathname, "/chats/5");
  assert.equal(session.entries[0].isRoot, true);
  const history = navigation.updateScreenStack(session, event("history", "/history"));
  const back = navigation.updateScreenStack(history, event("session", "/chats/5", "POP"));
  assert.deepEqual(visibleKeys(back), ["start"]);
  assert.equal(back.entries[back.index].location.pathname, "/chats/5");
});

test("new dialog resets the visible stack and subsequent back stops at the new start", () => {
  const { chat } = flow();
  const reset = navigation.updateScreenStack(chat, event("new-start", "/"));
  assert.equal(reset.movement, "none");
  assert.deepEqual(visibleKeys(reset), ["new-start"]);
  const history = navigation.updateScreenStack(reset, event("new-history", "/history"));
  assert.deepEqual(visibleKeys(history), ["new-start", "new-history"]);
  const back = navigation.updateScreenStack(history, event("new-start", "/", "POP"));
  assert.deepEqual(visibleKeys(back), ["new-start"]);
});

test("navigating after back drops the abandoned forward branch", () => {
  const { chat } = flow();
  const back = navigation.updateScreenStack(chat, event("history", "/history", "POP"));
  const other = navigation.updateScreenStack(back, event("other", "/chats/7"));
  assert.deepEqual(visibleKeys(other), ["start", "history", "other"]);
  assert.ok(!other.entries.some((screen) => screen.key === "chat"));
});

test("a history jump may pop several screens; an unknown location becomes a safe base", () => {
  const { chat } = flow();
  const back = navigation.updateScreenStack(chat, event("start", "/", "POP"));
  assert.equal(back.movement, "back");
  assert.deepEqual(visibleKeys(back), ["start"]);
  const unknown = navigation.updateScreenStack(chat, event("unknown", "/lead", "POP"));
  assert.equal(unknown.movement, "none");
  assert.deepEqual(visibleKeys(unknown), ["unknown"]);
});

test("rerendering at the same location preserves the stack object", () => {
  const { chat } = flow();
  assert.equal(navigation.updateScreenStack(chat, event("chat", "/chats/1")), chat);
});

test("reduced motion displays incoming and outgoing screens immediately without translation", () => {
  assert.equal(navigation.getScreenInitial(true, true), false);
  assert.equal(navigation.getScreenInitial(false, true), false);
  assert.equal(navigation.getScreenTransition(false).duration, 0);
  assert.deepEqual(navigation.getScreenExit(true, true), { x: 0, transition: { duration: 0 } });
  assert.deepEqual(navigation.getScreenExit(false, true), { x: 0, transition: { duration: 0 } });
});

test("push enters from the right, back exits right, and replace has no exit movement", () => {
  assert.deepEqual(navigation.getScreenInitial(true, false), { x: "100%" });
  assert.equal(navigation.getScreenInitial(false, false), false);
  assert.equal(navigation.getScreenExit(true, false).x, "100%");
  assert.equal(navigation.getScreenTransition(true).duration, 0.25);
  assert.deepEqual(navigation.getScreenExit(false, false), { x: 0, transition: { duration: 0 } });
});

test("selecting a history card reveals the session beneath the outgoing history screen", () => {
  const { history } = flow();
  const selection = event("selected", "/chats/6", "REPLACE");
  selection.location.state = { screenTransition: "reveal" };
  const chat = navigation.updateScreenStack(history, selection);

  assert.equal(chat.movement, "back");
  assert.equal(chat.entries.length, history.entries.length);
  assert.deepEqual(visibleKeys(chat), ["selected"]);
  assert.equal(chat.entries[chat.index].location.pathname, "/chats/6");
  assert.ok(!chat.entries.some((screen) => screen.location.pathname === "/history"));

  const reopened = navigation.updateScreenStack(chat, event("reopened-history", "/history"));
  assert.equal(reopened.movement, "forward");
  assert.deepEqual(visibleKeys(reopened), ["selected", "reopened-history"]);
  const back = navigation.updateScreenStack(reopened, event("selected", "/chats/6", "POP"));
  assert.deepEqual(visibleKeys(back), ["selected"]);
});

test("sent uses a bottom transition and reduced motion disables vertical movement", () => {
  const { root } = flow();
  const lead = navigation.updateScreenStack(root, { ...event("lead", "/lead"), direction: "right" });
  const sent = navigation.updateScreenStack(lead, { ...event("sent", "/lead/sent"), direction: "bottom" });
  assert.equal(lead.entries[lead.index].direction, "right");
  assert.equal(sent.entries[sent.index].direction, "bottom");
  assert.deepEqual(navigation.getScreenInitial(true, false, "bottom"), { y: "100%" });
  assert.equal(navigation.getScreenExit(true, false, "bottom").y, "100%");
  assert.equal(navigation.getScreenInitial(true, true, "bottom"), false);
  assert.deepEqual(navigation.getScreenExit(true, true, "bottom"), { y: 0, transition: { duration: 0 } });
  const back = navigation.updateScreenStack(sent, event("lead", "/lead", "POP"));
  assert.equal(back.movement, "back");
  assert.deepEqual(visibleKeys(back), ["start", "lead"]);
});

test("new chat from sent resets the stack without entering or exiting animations", () => {
  const { root } = flow();
  const lead = navigation.updateScreenStack(root, event("lead", "/lead"));
  const sent = navigation.updateScreenStack(lead, { ...event("sent", "/lead/sent"), direction: "bottom" });
  const start = navigation.updateScreenStack(sent, event("new-start", "/", "REPLACE"));
  assert.equal(start.movement, "none");
  assert.equal(start.entries[start.index].key, "new-start");
  assert.equal(navigation.getVisibleScreens(start).length, 1);
  assert.equal(start.entries[start.index].location.pathname, "/");
  assert.equal(start.entries[start.index].direction, "right");
  assert.deepEqual(navigation.getScreenExit(false, false, "bottom"), { y: 0, transition: { duration: 0 } });
});

test("pathless layout routes preserve stack metadata and sibling routes", () => {
  const routes = [
    {
      render: () => "chat-layout",
      children: [
        { path: "/", stack: "root", render: () => "start" },
        { path: "/chats/:id", stack: "screen", render: () => "chat" },
      ],
    },
    { path: "/history", stack: "screen", render: () => "history" },
    { path: "/lead/sent", stack: "screen", direction: "bottom", render: () => "sent" },
    { path: "*", stack: "screen", render: () => "fallback" },
  ];
  assert.equal(navigation.findScreenRoute(routes, "/").stack, "root");
  assert.equal(navigation.findScreenRoute(routes, "/chats/42").path, "/chats/:id");
  assert.equal(navigation.findScreenRoute(routes, "/history").path, "/history");
  assert.equal(navigation.findScreenRoute(routes, "/lead/sent").direction, "bottom");
  assert.equal(navigation.findScreenRoute(routes, "/unknown").path, "*");
  assert.equal(navigation.findScreenRoute([], "/"), undefined);
});

test("React Router receives the shared layout and matches nested chat parameters", () => {
  const onBack = () => {};
  const options = { isActive: false, onBack, onNewChat: () => {} };
  const received = [];
  const routes = [
    {
      render: (screen) => {
        received.push(screen);
        return "chat-layout";
      },
      children: [
        {
          path: "/",
          stack: "root",
          render: (screen) => {
            received.push(screen);
            return "start";
          },
        },
        {
          path: "/chats/:id",
          stack: "screen",
          render: (screen) => {
            received.push(screen);
            return "chat";
          },
        },
      ],
    },
  ];
  const objects = navigation.createScreenRouteObjects(routes, options);
  assert.ok(received.every((screen) => screen === options));
  const start = matchRoutes(objects, "/");
  assert.deepEqual(
    start.map(({ route }) => route.element),
    ["chat-layout", "start"]
  );
  const chat = matchRoutes(objects, "/chats/42");
  assert.deepEqual(
    chat.map(({ route }) => route.element),
    ["chat-layout", "chat"]
  );
  assert.equal(chat.at(-1).params.id, "42");
  assert.equal(objects[0].path, undefined);
});
