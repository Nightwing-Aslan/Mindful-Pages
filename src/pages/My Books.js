import { currentUser } from 'wix-users';
import wixData from 'wix-data';
import wixLocation from 'wix-location';
import wixWindow from 'wix-window';

$w.onReady(async () => {
    if (!currentUser.loggedIn) {
        wixLocation.to("/login");
        return;
    }
    
    // Show loading indicator
    $w('#loadingIndicator').show();
    $w('#booksContainer').hide();
    $w('#emptyState').hide();
    
    try {
        // Load user's books
        const books = await wixData.query("books")
            .eq("ownerUserId", currentUser.id)
            .find()
            .then(({ items }) => items);
        
        if (books.length > 0) {
            $w('#booksRepeater').data = books;
            $w('#booksContainer').show();
            $w('#emptyState').hide();
        } else {
            $w('#booksContainer').hide();
            $w('#emptyState').show();
        }
        
    } catch (error) {
        wixWindow.openLightbox("ErrorLightbox", {
            message: "Error loading books: " + error.message
        });
    } finally {
        $w('#loadingIndicator').hide();
    }
});

$w('#booksRepeater').onItemReady(($item, book) => {
    // Set book details
    $item('#bookTitle').text = book.title;
    $item('#bookAuthor').text = `by ${book.author}`;
    $item('#releaseYear').text = book.releaseYear ? `(${book.releaseYear})` : '';
    $item('#bookQuantity').text = `Available: ${book.quantity}`;
    
    // Set library name if available
    if (book.libraryName) {
        $item('#libraryName').text = `In: ${book.libraryName}`;
        $item('#libraryName').show();
    } else {
        $item('#libraryName').hide();
    }
    
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
                $item.remove();
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
