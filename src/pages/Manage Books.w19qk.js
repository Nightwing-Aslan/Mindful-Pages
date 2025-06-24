import { currentUser } from 'wix-users';
import wixData from 'wix-data';
import wixLocation from 'wix-location';
import wixWindow from 'wix-window';

let currentLibraryId = null;
let currentLibrary = null;

$w.onReady(async () => {
    // Get library ID from URL
    const query = wixLocation.query;
    currentLibraryId = query.libraryId;
    
    if (!currentLibraryId) {
        wixWindow.openLightbox("ErrorLightbox", {
            message: "No library specified"
        });
        return;
    }
    
    // Show loading
    $w('#loadingIndicator').show();
    
    try {
        // Load library details
        currentLibrary = await wixData.get("libraries", currentLibraryId);
        
        // Verify ownership
        if (currentLibrary.ownerUserId !== currentUser.id) {
            wixWindow.openLightbox("ErrorLightbox", {
                message: "You don't own this library"
            });
            return;
        }
        
        // Set library info
        $w('#libraryName').text = currentLibrary.name;
        
        // Load books
        await loadBooks();
        
        // Setup add book button
        $w('#addBookButton').onClick(() => {
            wixWindow.openLightbox("AddBookLightbox", {
                libraryId: currentLibraryId
            });
        });
        
    } catch (error) {
        wixWindow.openLightbox("ErrorLightbox", {
            message: "Error loading library: " + error.message
        });
    } finally {
        $w('#loadingIndicator').hide();
    }
});

async function loadBooks() {
    try {
        // Get books for this library
        const books = await wixData.query("books")
            .eq("libraryId", currentLibraryId)
            .find()
            .then(({ items }) => items);
        
        // Update UI
        if (books.length > 0) {
            $w('#booksRepeater').data = books;
            $w('#booksContainer').show();
            $w('#noBooksMessage').hide();
        } else {
            $w('#booksContainer').hide();
            $w('#noBooksMessage').show();
        }
        
    } catch (error) {
        $w('#errorText').text = "Error loading books";
        $w('#errorText').show();
    }
}

$w('#booksRepeater').onItemReady(($item, book) => {
    // Set book details
    $item('#bookTitle').text = book.title;
    $item('#bookAuthor').text = `by ${book.author}`;
    $item('#releaseYear').text = book.releaseYear ? `(${book.releaseYear})` : '';
    $item('#bookQuantity').text = `Available: ${book.quantity}`;
    
    // Edit button handler
    $item('#editBookButton').onClick(() => {
        wixWindow.openLightbox("EditBookLightbox", {
            bookId: book._id
        });
    });
    
    // Delete button handler
    $item('#deleteBookButton').onClick(async () => {
        const confirm = await wixWindow.openLightbox("ConfirmDeleteLightbox");
        if (confirm) {
            try {
                await wixData.remove("books", book._id);
                $item('#booksContainer').hide(); // Or use your container ID
                wixWindow.openLightbox("SuccessLightbox", {
                    message: "Book deleted successfully!"
                });
            } catch (error) {
                wixWindow.openLightbox("ErrorLightbox", {
                    message: "Error deleting book: " + error.message
                });
            }
        }
    });
});