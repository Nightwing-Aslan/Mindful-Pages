import wixData from 'wix-data';
import wixLocation from 'wix-location';
import wixWindow from 'wix-window';
import { currentUser } from 'wix-users';

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
        
        // Set up the gallery - using Wix Slide Deck Gallery
        if (currentLibrary.gallery && currentLibrary.gallery.length > 0) {
            $w('#libraryGallery').items = currentLibrary.gallery.map(item => ({
                media: item.image,
                title: item.title || "",
                description: item.description || ""
            }));
            $w('#noGalleryMessage').hide();
        } else {
            $w('#noGalleryMessage').show();
        }
        
        // Set up star rating input - using Wix Star Rating element
        $w('#starRating').value = currentLibrary.averageRating || 0;
        
        // Display average rating
        $w('#averageRating').text = currentLibrary.averageRating?.toFixed(1) || "0.0";
        $w('#ratingCount').text = `${currentLibrary.ratingCount || 0} ratings`;
        if (currentLibrary.gallery && currentLibrary.gallery.length > 0) {
        
            $w('#libraryGallery').items = currentLibrary.gallery.map(img => ({
                media: img.url,
                title: img.title || "",
                description: img.description || ""
            }));
        }
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
        
        // Setup rating submission
        $w('#submitRating').onClick(submitRating);
        
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

async function submitRating() {
    try {
        const ratingValue = $w('#starRating').value;
        
        if (!ratingValue || ratingValue < 1 || ratingValue > 5) {
            $w('#ratingError').text = "Please select a rating between 1-5 stars";
            $w('#ratingError').show();
            return;
        }
        
        // Save rating
        await wixData.insert("library_ratings", {
            libraryId: currentLibraryId,
            userId: currentUser.id,
            rating: ratingValue,
            timestamp: new Date()
        });
        
        // Recalculate average
        const allRatings = await wixData.query("library_ratings")
            .eq("libraryId", currentLibraryId)
            .find()
            .then(({ items }) => items);
        
        const totalRating = allRatings.reduce((sum, item) => sum + item.rating, 0);
        const averageRating = totalRating / allRatings.length;
        const ratingCount = allRatings.length;
        
        // Update library
        await wixData.update("libraries", {
            _id: currentLibraryId,
            averageRating,
            ratingCount
        });
        
        // Update UI
        currentLibrary.averageRating = averageRating;
        currentLibrary.ratingCount = ratingCount;
        $w('#averageRating').text = averageRating.toFixed(1);
        $w('#ratingCount').text = `${ratingCount} ratings`;
        $w('#ratingError').hide();
        
        wixWindow.openLightbox("SuccessLightbox", {
            message: "Rating submitted successfully!"
        });
        
    } catch (error) {
        $w('#ratingError').text = "Error submitting rating: " + error.message;
        $w('#ratingError').show();
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