/**
This script is run whenever the devtools are open.
In here, we can create our panel.
*/

function handleShown() {
  browserShim.log("panel is being shown");
}

function handleHidden() {
  browserShim.log("panel is being hidden");
}

browserShim.log("Installing panel");

function onPanelCreated(newPanel) {
  newPanel.onShown.addListener(handleShown);
  newPanel.onHidden.addListener(handleHidden);
}

const panelSpec = [
  "CoPilot",
  "/icons/favicon.ico",
  "/devtools/panel/panel.html"
];


if (typeof browser === "undefined") {
  chrome.devtools.panels.create(...panelSpec, onPanelCreated);
} else {
  browser.devtools.panels.create(...panelSpec).then(onPanelCreated);
}
