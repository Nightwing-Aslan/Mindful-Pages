import wixWindow from 'wix-window';

$w.onReady(() => {
    $w('#tryAgainButton').onClick(() => {
        wixWindow.closeLightbox();
        wixLocation.to("/riddles");
    });
});
