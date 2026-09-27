import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HeroUIProvider } from "@heroui/react";
import { ThemeProvider } from "@/contexts/ThemeContext";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <HeroUIProvider>
        <App />
      </HeroUIProvider>
    </ThemeProvider>
  </StrictMode>
);
