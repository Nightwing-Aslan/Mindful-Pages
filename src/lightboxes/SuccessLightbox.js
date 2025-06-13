import wixWindow from 'wix-window';

$w.onReady(() => {
    const context = wixWindow.lightbox.getContext();
    $w('#successMessage').text = context.message || "Operation completed successfully!";
    
    $w('#okButton').onClick(() => {
        wixWindow.closeLightbox();
    });
});
