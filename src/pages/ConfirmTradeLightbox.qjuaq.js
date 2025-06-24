import wixWindow from 'wix-window';

$w.onReady(() => {
    $w('#confirmButton').onClick(() => wixWindow.lightbox.close(true));
    $w('#cancelButton').onClick(() => wixWindow.lightbox.close(false));
});