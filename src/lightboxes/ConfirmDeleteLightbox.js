import wixWindow from 'wix-window';

$w.onReady(() => {
    $w('#confirmButton').onClick(() => wixWindow.closeLightbox(true));
    $w('#cancelButton').onClick(() => wixWindow.closeLightbox(false));
});
