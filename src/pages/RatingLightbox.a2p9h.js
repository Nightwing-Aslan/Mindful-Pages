import { currentUser } from 'wix-users';
import wixData from 'wix-data';
import wixWindow from 'wix-window';

$w.onReady(() => {
    $w('#submitRating').onClick(submitRating);
    $w('#cancelButton').onClick(() => wixWindow.lightbox.close());
});

async function submitRating() {
    const context = wixWindow.lightbox.getContext();
    const rating = parseInt($w('#ratingInput').value);
    const comment = $w('#commentInput').value;
    
    // Validation
    if (!rating || rating < 1 || rating > 5) {
        $w('#errorText').text = "Please select a valid rating (1-5)";
        $w('#errorText').show();
        return;
    }
    
    try {
        // Get book details
        const book = await wixData.get("books", context.bookId);
        
        // Create rating
        await wixData.insert("trader ratings", {
            fromUserId: currentUser.id,
            toUserId: book.ownerUserId,
            rating: rating,
            comment: comment,
            timestamp: new Date(),
            tradeId: context.bookId,
            bookTitle: book.title
        });
        
        wixWindow.lightbox.close();
        
        // Show success message
        wixWindow.openLightbox("SuccessLightbox", {
            message: "Rating submitted successfully!"
        });
        
    } catch (error) {
        $w('#errorText').text = "Error submitting rating: " + error.message;
        $w('#errorText').show();
    }
}