import { currentUser } from 'wix-users';
import wixData from 'wix-data';
import wixWindow from 'wix-window';

$w.onReady(() => {
    // Get context passed to lightbox
    const context = wixWindow.lightbox.getContext();
    
    // Validate context - only show if we have a valid book ID
    if (!context || !context.bookId) {
        // Close immediately if missing required context
        wixWindow.lightbox.close();
        return;
    }
    
    // Only set up UI if we have valid context
    $w('#submitRating').onClick(submitRating);
    $w('#cancelButton').onClick(() => wixWindow.lightbox.close());
    
    // Show loading state until we have book data
    $w('#loader').show();
    $w('#content').hide();
    
    // Load book details
    wixData.get("books", context.bookId)
        .then(book => {
            $w('#bookTitle').text = `Rate your trade for: ${book.title}`;
            $w('#loader').hide();
            $w('#content').show();
        })
        .catch(error => {
            $w('#errorText').text = "Error loading book details: " + error.message;
            $w('#errorText').show();
            $w('#loader').hide();
        });
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
