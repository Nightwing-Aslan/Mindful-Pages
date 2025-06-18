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
        $w('#libraryDescription').text = currentLibrary.description;
        
        // Set up slide deck gallery
        if (currentLibrary.gallery && currentLibrary.gallery.length > 0) {
            $w('#libraryGallery').items = currentLibrary.gallery.map(item => ({
                image: item.image,
                title: item.title,
                description: item.description
            }));
        } else {
            $w('#noGalleryMessage').show();
            $w('#libraryGallery').hide();
        }
        
        // Display average rating
        $w('#submitRating').onClick(submitRating);
        $w('#averageRating').text = currentLibrary.averageRating.toFixed(1);
        $w('#ratingCount').text = `${currentLibrary.ratingCount} ratings`;
        
        // Show add book button if owner
        if (currentLibrary.ownerUserId === currentUser.id) {
            $w('#addBookButton').show();
            $w('#addBookButton').onClick(() => {
                wixWindow.openLightbox("AddBookLightbox", {
                    libraryId: currentLibraryId
                });
            });
        } else {
            $w('#addBookButton').hide();
        }
        
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
    $item('#bookAuthor').text = `by ${book.author}`;
    $item('#releaseYear').text = book.releaseYear ? `(${book.releaseYear})` : '';
    $item('#bookDescription').text = book.description || "No description available";
    $item('#bookQuantity').text = `Available: ${book.quantity}`;
    
    // Show edit button for owner
    if (currentLibrary.ownerUserId === currentUser.id) {
        $item('#editBookButton').show();
        $item('#editBookButton').onClick(() => {
            wixWindow.openLightbox("EditBookLightbox", {
                bookId: book._id
            });
        });
    } else {
        $item('#editBookButton').hide();
    }
});
async function submitRating() {
    const ratingValue = parseFloat($w('#ratingInput').value);
    
    if (isNaN(ratingValue) || ratingValue < 0 || ratingValue > 5) {
        $w('#ratingError').text = "Please enter a valid rating (0-5)";
        $w('#ratingError').show();
        return;
    }
    
    try {
        // Save rating
        await wixData.insert("library_ratings", {
            libraryId: currentLibraryId,
            userId: currentUser.id,
            rating: ratingValue,
            timestamp: new Date()
        });
        
        // Recalculate average
        const ratings = await wixData.query("library_ratings")
            .eq("libraryId", currentLibraryId)
            .find()
            .then(({ items }) => items);
        
        const total = ratings.reduce((sum, r) => sum + r.rating, 0);
        const average = total / ratings.length;
        const ratingCount = ratings.length;
        
        // Update library
        await wixData.update("libraries", {
            _id: currentLibraryId,
            averageRating: average,
            ratingCount
        });
        
        // Update UI
        $w('#averageRating').text = average.toFixed(1);
        $w('#ratingCount').text = `${ratingCount} ratings`;
        $w('#ratingInput').value = "";
        $w('#ratingError').hide();
        
        wixWindow.openLightbox("SuccessLightbox", {
            message: "Rating submitted successfully!"
        });
        
    } catch (error) {
        $w('#ratingError').text = "Error submitting rating: " + error.message;
        $w('#ratingError').show();
    }
}
