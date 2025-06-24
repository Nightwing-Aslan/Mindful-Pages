import { currentUser } from 'wix-users';
import wixData from 'wix-data';
import wixWindow from 'wix-window';

$w.onReady(() => {
    const context = wixWindow.lightbox.getContext();
    $w('#bookTitle').text = context.bookTitle || "this book";
    $w('#sendMessage').onClick(sendMessage);
    $w('#cancelButton').onClick(() => wixWindow.lightbox.close());
});

async function sendMessage() {
    const context = wixWindow.lightbox.getContext();
    const message = $w('#messageInput').value.trim();
    
    if (!message) {
        $w('#errorText').text = "Please enter a message";
        $w('#errorText').show();
        return;
    }
    
    try {
        // Create message record
        await wixData.insert("TradeMessages", {
            fromUserId: currentUser.id,
            toUserId: context.ownerId,
            bookId: context.bookId,
            message: message,
            timestamp: new Date(),
            read: false
        });
        
        wixWindow.lightbox.close();
        
        // Show success message
        wixWindow.openLightbox("SuccessLightbox", {
            message: "Message sent successfully!"
        });
        
    } catch (error) {
        $w('#errorText').text = "Error sending message: " + error.message;
        $w('#errorText').show();
    }
}