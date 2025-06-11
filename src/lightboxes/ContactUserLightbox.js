import { currentUser } from 'wix-users';

$w.onReady(() => {
    $w('#sendMessage').onClick(sendMessage);
});

async function sendMessage() {
    const context = wixWindow.lightbox.getContext();
    const message = $w('#messageInput').value;
    
    if (!message) {
        $w('#errorText').text = "Please enter a message";
        $w('#errorText').show();
        return;
    }
    
    try {
        // In a real implementation, you would send this to a messaging system
        // For now, we'll just show a success message
        wixWindow.closeLightbox();
        wixWindow.openLightbox("SuccessLightbox", {
            message: "Message sent successfully!"
        });
        
    } catch (error) {
        $w('#errorText').text = "Error sending message: " + error.message;
        $w('#errorText').show();
    }
}
