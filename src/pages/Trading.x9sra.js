import { currentUser } from 'wix-users';
import wixWindow from 'wix-window';
import wixLocation from 'wix-location';
import wixData from 'wix-data';

// Global variables
let selectedGenres = [];
let maxDistance = 50;
let userAddress = "";

$w.onReady(async () => {
    if (!currentUser.loggedIn) {
        wixLocation.to("/login");
        return;
    }
    
    // Initialize UI
    initializeFilters();
    setupEventHandlers();
    loadListings();
});

function initializeFilters() {
    // Setup genre tags
    const genres = [
        "Classics", "Memoirs", "Historical Fiction", "Novels", "Mysteries", 
        "Comedy", "Fantasy", "Science Fiction", "Non-Fiction", "History",
        "Dystopian", "Action & Adventure", "Thriller & Suspense", "Romance",
        "Literary Fiction", "Magic", "Graphic Novel", "Comics", "Coming of Age",
        "Young Adult", "Children's", "Short Story", "Memoir/Autobiography", "Food",
        "Art", "Science", "True Crime", "Humor", "Religion", "Parenting"
    ];
    
    // Set SelectionTags options
    $w('#genreFilter').options = genres.map(genre => ({
        label: genre,
        value: genre
    }));
    
    // Setup distance slider
    $w('#distanceSlider').value = maxDistance;
    $w('#distanceValue').text = `${maxDistance} miles`;
    $w('#distanceSlider').onChange((event) => {
        maxDistance = event.target.value;
        $w('#distanceValue').text = `${maxDistance} miles`;
        loadListings();
    });
    
    // Get initial selected genres
    selectedGenres = $w('#genreFilter').value;
}

function setupEventHandlers() {
    // Real-time filtering
    $w('#searchInput').onInput(() => loadListings());
    
    // Genre filter change
    $w('#genreFilter').onChange(() => {
        selectedGenres = $w('#genreFilter').value;
        loadListings();
    });
    
    // Address input handler - simplified
    $w('#addressInput').onChange((event) => {
        // Get the address string safely
        userAddress = event.target.value.address || event.target.value || "";
        loadListings();
    });
    
    // My Listings toggle
    $w('#myListingsToggle').onChange(() => loadListings());
}

async function loadListings() {
    $w('#loadingIndicator').show();
    $w('#listingsRepeater').hide();
    $w('#noResults').hide();
    
    try {
        let query = wixData.query("books");
        
        // Only show active listings
        query = query.ne("status", "traded");
        
        // Filter by ownership
        if ($w('#myListingsToggle').checked) {
            query = query.eq("ownerUserId", currentUser.id);
        } else {
            query = query.ne("ownerUserId", currentUser.id);
        }
        
        // Apply search filter
        const searchTerm = $w('#searchInput').value;
        if (searchTerm) {
            query = query.contains("title", searchTerm)
                .or(query.contains("author", searchTerm))
                .or(query.contains("lookingFor", searchTerm));
        }
        
        // Apply genre filter
        if (selectedGenres.length > 0) {
            query = query.hasSome("genres", selectedGenres);
        }
        
        // Apply distance filter
        if (userAddress) {
            query = query.le("maxDistance", parseInt(maxDistance));
        }
        
        // Execute query
        const { items } = await query.descending("createdAt").find();
        
        // Update UI
        if (items.length > 0) {
            $w('#listingsRepeater').data = items;
            $w('#listingsRepeater').show();
        } else {
            $w('#noResults').show();
        }
        
    } catch (error) {
        wixWindow.openLightbox("ErrorLightbox", {
            message: "Error loading listings: " + error.message
        });
    } finally {
        $w('#loadingIndicator').hide();
    }
}

$w('#listingsRepeater').onItemReady(($item, itemData) => {
    // Set listing data
    $item('#listingTitle').text = itemData.title;
    $item('#listingAuthor').text = `by ${itemData.author}`;
    $item('#listingCover').src = itemData.bookCover || "https://example.com/default-book.jpg";
    $item('#listingLocation').text = `${itemData.location}`;
    
    // Set distance willing text
    $item('#distanceWillingText').text = `Willing to travel: ${itemData.maxDistance} miles`;
    
    $item('#lookingForText').text = `Looking for: ${itemData.lookingFor}`;
    
    // Personal summary handling
    if (itemData.personalTradeDescription?.trim()) {
        $item('#personalSummaryContainer').show();
        $item('#personalSummaryText').text = itemData.personalTradeDescription;
    } else {
        $item('#personalSummaryContainer').hide();
    }
    
    // SIMPLIFIED GENRE TAGS - just use text
    $item('#genreTagsText').text = itemData.genres.slice(0, 3).join(", ") + 
        (itemData.genres.length > 3 ? ` +${itemData.genres.length - 3} more` : "");
    
    // Handle contact button
    $item('#contactButton').onClick(() => {
        wixWindow.openLightbox("ContactUserLightbox", {
            ownerId: itemData.ownerUserId,
            bookId: itemData._id,
            bookTitle: itemData.title
        });
    });
    
    // Handle mark as traded button
    $item('#tradedButton').onClick(async () => {
        const confirmed = await wixWindow.openLightbox("ConfirmTradeLightbox");
        if (confirmed) {
            try {
                await wixData.remove("books", itemData._id);
                await wixData.insert("TradeHistory", {
                    bookId: itemData._id,
                    tradedBy: currentUser.id,
                    tradedAt: new Date()
                });
                // Hide the entire item container
                $item('#repeaterItemContainer').hide();
                loadListings();
            } catch (error) {
                wixWindow.openLightbox("ErrorLightbox", {
                    message: "Error removing listing: " + error.message
                });
            }
        }
    });
    
    // Show/hide traded button
    if (itemData.ownerUserId === currentUser.id) {
        $item('#tradedButton').show();
    } else {
        $item('#tradedButton').hide();
    }
});