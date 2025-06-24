// API Reference: https://www.wix.com/velo/reference/api-overview/introduction
// “Hello, World!” Example: https://learn-code.wix.com/en/article/hello-world

import wixWindow from 'wix-window';

$w.onReady(() => {
    const context = wixWindow.lightbox.getContext();
    $w('#hintText').text = context.hint || "No hint available for this riddle.";
    $w('#closeButton').onClick(() => wixWindow.lightbox.close())
});