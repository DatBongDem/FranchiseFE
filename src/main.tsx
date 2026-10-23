import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/global.css";
import "./styles/billing.css";
import "./styles/revenue.css";
import "./styles/shrinkage.css";
import "./styles/store-bills.css";
import "./styles/cancel-order.css";
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
