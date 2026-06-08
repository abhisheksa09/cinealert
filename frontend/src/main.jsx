import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import CineAlert from "./CineAlert.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <CineAlert />
  </StrictMode>
);
