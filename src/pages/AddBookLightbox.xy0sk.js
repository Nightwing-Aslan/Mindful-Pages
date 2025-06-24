import { currentUser } from 'wix-users';
import wixData from 'wix-data';
import wixWindow from 'wix-window';

$w.onReady(() => {
    $w('#createBook').onClick(createBook);
    $w('#cancelButton').onClick(() => wixWindow.lightbox.close());
});

async function createBook() {
    const context = wixWindow.lightbox.getContext();
    const libraryId = context.libraryId;
    
    // Get form values
    const title = $w('#bookTitle').value;
    const author = $w('#bookAuthor').value;
    const releaseYear = parseInt($w('#releaseYear').value); // Year only
    const description = $w('#bookDescription').value;
    const quantity = parseInt($w('#bookQuantity').value) || 1;
    
    // Validation
    if (!title || !author) {
        $w('#errorText').text = "Title and author are required";
        $w('#errorText').show();
        return;
    }
    
    if (isNaN(releaseYear) || releaseYear < 0 || releaseYear > new Date().getFullYear()) {
        $w('#errorText').text = "Please enter a valid release year";
        $w('#errorText').show();
        return;
    }
    
    try {
        // Create book
        await wixData.insert("books", {
            title,
            author,
            releaseYear,
            description,
            quantity,
            libraryId,
            ownerUserId: currentUser.id,
            createdAt: new Date()
        });
        
        // Close lightbox and refresh
        wixWindow.lightbox.close();
        wixWindow.openLightbox("SuccessLightbox", {
            message: "Book added successfully!"
        });
        
    } catch (error) {
        $w('#errorText').text = "Error adding book: " + error.message;
        $w('#errorText').show();
    }
}