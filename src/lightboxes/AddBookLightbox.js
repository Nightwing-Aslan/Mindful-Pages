import { currentUser } from 'wix-users';
import wixData from 'wix-data';
import wixWindow from 'wix-window';

$w.onReady(() => {
    $w('#createBook').onClick(createBook);
    $w('#cancelButton').onClick(() => wixWindow.closeLightbox());
});

async function createBook() {
    const context = wixWindow.lightbox.getContext();
    const libraryId = context.libraryId;
    
    // Get form values
    const title = $w('#bookTitle').value;
    const author = $w('#bookAuthor').value;
    const releaseDate = $w('#releaseDate').value;
    const description = $w('#bookDescription').value;
    const quantity = parseInt($w('#bookQuantity').value) || 1;
    
    // Validation
    if (!title || !author) {
        $w('#errorText').text = "Title and author are required";
        $w('#errorText').show();
        return;
    }
    
    try {
        // Create book
        await wixData.insert("books", {
            title,
            author,
            releaseDate,
            description,
            quantity,
            libraryId,
            ownerUserId: currentUser.id,
            createdAt: new Date()
        });
        
        // Close lightbox and refresh
        wixWindow.closeLightbox();
        wixWindow.openLightbox("SuccessLightbox", {
            message: "Book added successfully!"
        });
        
    } catch (error) {
        $w('#errorText').text = "Error adding book: " + error.message;
        $w('#errorText').show();
    }
}
