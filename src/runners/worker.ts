import { Session } from "./session";
import type { Command } from "../projection/types";
// The dedicated worker is the only mutable simulation owner in the browser.
const session = new Session();
self.onmessage = (event: MessageEvent<Command>) =>
  self.postMessage(session.handle(event.data));
