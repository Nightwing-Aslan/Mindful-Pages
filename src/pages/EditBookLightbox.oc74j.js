import { currentUser } from 'wix-users';
import wixData from 'wix-data';
import wixWindow from 'wix-window';

let currentBook = null;

$w.onReady(async () => {
    const context = wixWindow.lightbox.getContext();
    const bookId = context.bookId;
    
    try {
        // Load book data
        currentBook = await wixData.get("books", bookId);
        
        // Populate form
        $w('#bookTitle').text = currentBook.title;
        $w('#bookAuthor').text = currentBook.author;
        $w('#releaseYear').text = currentBook.releaseYear ? `(${currentBook.releaseYear})` : '';
        $w('#bookDescription').value = currentBook.description || '';
        $w('#bookQuantity').value = currentBook.quantity || 1;
        
        // Setup buttons
        $w('#updateBook').onClick(updateBook);
        $w('#cancelButton').onClick(() => wixWindow.lightbox.close());
        
    } catch (error) {
        $w('#errorText').text = "Error loading book: " + error.message;
        $w('#errorText').show();
    }
});

async function updateBook() {
    try {
        // Get updated values
        const quantity = parseInt($w('#bookQuantity').value) || 1;
        const description = $w('#bookDescription').value;
        
        // Update book
        await wixData.update("books", {
            _id: currentBook._id,
            quantity,
            description
        });
        
        // Close lightbox and refresh
        wixWindow.lightbox.close();
        wixWindow.openLightbox("SuccessLightbox", {
            message: "Book updated successfully!"
        });
        
    } catch (error) {
        $w('#errorText').text = "Error updating book: " + error.message;
        $w('#errorText').show();
    }
}