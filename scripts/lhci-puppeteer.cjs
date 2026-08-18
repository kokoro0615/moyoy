"use strict";

// Presence of this hook makes LHCI use PuppeteerManager. That avoids
// chrome-launcher's Win32 temp-path conversion when Linux Chromium runs in WSL.
module.exports = () => undefined;
