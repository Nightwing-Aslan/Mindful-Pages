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
        $w('#libraryAddress').text = currentLibrary.address;
        $w('#libraryType').text = currentLibrary.type;
        
        // Display average rating
        $w('#averageRating').text = currentLibrary.averageRating.toFixed(1);
        $w('#ratingCount').text = `${currentLibrary.ratingCount} ratings`;
        
        // Setup slide deck gallery
        setupGallery();
        
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
        
        // Setup rating system
        setupRatingSystem();
        
    } catch (error) {
        wixWindow.openLightbox("ErrorLightbox", {
            message: "Error loading library: " + error.message
        });
    } finally {
        $w('#loadingIndicator').hide();
    }
});

function setupGallery() {
    // Get gallery items from library data
    const galleryItems = currentLibrary.gallery || [];
    
    if (galleryItems.length > 0) {
        // Set slide deck gallery items
        $w('#libraryGallery').items = galleryItems.map(item => ({
            image: item.image,
            title: item.title,
            description: item.description
        }));
        $w('#noGalleryMessage').hide();
    } else {
        $w('#libraryGallery').hide();
        $w('#noGalleryMessage').show();
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
    
    for (let i = 1; i <= 5; i++) {
        if (i <= fullStars) {
            $w(`#star${i}`).text = "★";
            $w(`#star${i}`).style.color = "#FFD700"; // Gold
        } else {
            $w(`#star${i}`).text = "☆";
            $w(`#star${i}`).style.color = "#CCCCCC"; // Gray
        }
    }
}

async function submitRating(ratingValue) {
    try {
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
        updateRatingDisplay();
        
    } catch (error) {
        console.error("Error submitting rating:", error);
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
