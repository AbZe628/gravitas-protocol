import { createRoot } from "react-dom/client";
import App from "./App";
import { quietenWalletRejections } from "./lib/walletErrors";
import "./index.css";

/*
 * Installed before the tree mounts, because wagmi attempts its reconnect during
 * the first render and the rejection arrives before any component could listen
 * for it.
 */
quietenWalletRejections();

createRoot(document.getElementById("root")!).render(<App />);
