import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// CRA's template does not link a web manifest by default. Add the PWA metadata
// here so this app can be installed from the browser on supported devices.
const manifest = document.createElement("link");
manifest.rel = "manifest";
manifest.href = `${process.env.PUBLIC_URL || ""}/manifest.json`;
document.head.appendChild(manifest);

const themeColor = document.createElement("meta");
themeColor.name = "theme-color";
themeColor.content = "#0f172a";
document.head.appendChild(themeColor);

const appleWebApp = document.createElement("meta");
appleWebApp.name = "apple-mobile-web-app-capable";
appleWebApp.content = "yes";
document.head.appendChild(appleWebApp);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
