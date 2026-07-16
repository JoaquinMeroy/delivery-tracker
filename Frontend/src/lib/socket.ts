import { io, Socket } from "socket.io-client";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

// One shared socket for the whole app, created once.
export const socket: Socket = io(SERVER_URL, {
  autoConnect: false, // we connect explicitly from components that need it
});
