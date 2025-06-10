import { currentUser } from 'wix-users';
import wixData from 'wix-data';

$w.onReady(() => {
    $w('#submitRating').onClick(submitRating);
});

async function submitRating() {
    const context = wixWindow.lightbox.getContext();
    const rating = parseInt($w('#ratingInput').value);
    const comment = $w('#commentInput').value;
    
    if (!rating) {
        $w('#errorText').text = "Please select a rating";
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
            tradeId: context.bookId
        });
        
        wixWindow.closeLightbox();
        
    } catch (error) {
        $w('#errorText').text = "Error submitting rating: " + error.message;
        $w('#errorText').show();
    }
}
