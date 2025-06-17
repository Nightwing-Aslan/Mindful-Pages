import wixData from 'wix-data';
import wixLocation from 'wix-location';
import wixWindow from 'wix-window';

let currentLibraryId = null;
let currentLibrary = null;

$w.onReady(async () => {
    // Get library ID from URL
    const query = wixLocation.query;
    currentLibraryId = query.libraryId;
    
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
    
    // Show loading
    $w('#loadingIndicator').show();
    setupRatingSystem();
    
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
function setupRatingSystem() {
    // Initialize stars
    for (let i = 1; i <= 5; i++) {
        $w(`#star${i}`).onClick(() => submitRating(i));
    }
    
    // Display current rating
    updateRatingDisplay();
}

function updateRatingDisplay() {
    const rating = currentLibrary.averageRating || 0;
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 1; i <= 5; i++) {
        if (i <= fullStars) {
            $w(`#star${i}`).text = "★";
            $w(`#star${i}`).style.color = "#FFD700"; // Gold
        } else if (i === fullStars + 1 && hasHalfStar) {
            $w(`#star${i}`).text = "½";
            $w(`#star${i}`).style.color = "#FFD700";
        } else {
            $w(`#star${i}`).text = "☆";
            $w(`#star${i}`).style.color = "#CCCCCC"; // Gray
        }
    }
}

async function submitRating(ratingValue) {
    try {
        // Save rating
        await wixData.insert("library ratings", {
            libraryId: currentLibraryId,
            userId: currentUser.id,
            rating: ratingValue,
            timestamp: new Date()
        });
        
        // Recalculate average
        const allRatings = await wixData.query("library ratings")
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
        
        // Refresh display
        currentLibrary.averageRating = averageRating;
        updateRatingDisplay();
        
    } catch (error) {
        console.error("Error submitting rating:", error);
    }
}

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
