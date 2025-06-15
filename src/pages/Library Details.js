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
        // Get library details
        currentLibrary = await wixData.get("libraries", currentLibraryId);
        
        // Set library info
        $w('#libraryTitle').text = currentLibrary.name;
        $w('#libraryImage').src = currentLibrary.libraryPicture || "https://example.com/default-library.jpg";
        $w('#libraryDescription').text = currentLibrary.description;
        
        // Create star rating
        const rating = currentLibrary.star || 0;
        $w('#ratingStars').text = "★".repeat(Math.floor(rating)) + "☆".repeat(5 - Math.floor(rating));
        $w('#ratingValue').text = rating.toFixed(1);
        $w('#ratingCount').text = `${currentLibrary.ratingCount || 0} ratings`;
        
        // Load books
        await loadBooks();
        
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
        console.error("Error loading books:", error);
        $w('#errorText').text = "Error loading books";
        $w('#errorText').show();
    }
}

$w('#booksRepeater').onItemReady(($item, book) => {
    // Set book details
    $item('#bookTitle').text = book.title;
    $item('#bookAuthor').text = book.author;
    $item('#bookCover').src = book.bookCover || "https://example.com/default-book.jpg";
    $item('#bookCondition').text = `Condition: ${book.condition}`;
    
    // Handle click
    $item('#bookContainer').onClick(() => {
        wixLocation.to(`/book-details?bookId=${book._id}`);
    });
});
