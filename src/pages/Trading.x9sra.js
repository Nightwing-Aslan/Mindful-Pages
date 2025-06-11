import { currentUser } from 'wix-users';
import wixWindow from 'wix-window';
import wixLocation from 'wix-location';
import wixData from 'wix-data';

// Global variables
let selectedGenres = [];
let maxDistance = 50; // Default max distance

// Add CSS styles programmatically
function addTradingPageStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* TRADING PAGE STYLES */
        .genre-tag {
            display: inline-block;
            padding: 6px 12px;
            margin: 4px;
            background-color: #f0f0f0;
            border-radius: 20px;
            cursor: pointer;
            transition: all 0.3s;
            font-size: 14px;
        }
        
        .genre-tag.selected {
            background-color: #4CAF50;
            color: white;
            font-weight: bold;
        }
        
        .list-item {
            border: 1px solid #eee;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
            transition: box-shadow 0.3s;
        }
        
        .list-item:hover {
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        
        .personal-summary-container {
            margin-top: 15px;
            padding: 15px;
            background-color: #f9f9f9;
            border-radius: 8px;
            border-left: 4px solid #4CAF50;
        }
        
        .personal-summary-label {
            font-weight: bold;
            margin-bottom: 8px;
            color: #333;
        }
        
        .personal-summary-text {
            line-height: 1.5;
            color: #555;
        }
        
        .distance-slider-container {
            display: flex;
            align-items: center;
            gap: 15px;
            margin: 15px 0;
        }
        
        .filter-section {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        
        #noResults {
            text-align: center;
            padding: 30px;
            font-style: italic;
            color: #6c757d;
        }
    `;
    document.head.appendChild(style);
}

$w.onReady(async () => {
    // Add custom CSS
    addTradingPageStyles();
    
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
    
    renderGenreTags(genres);
    
    // Setup distance slider
    $w('#distanceSlider').value = maxDistance;
    $w('#distanceValue').text = `${maxDistance} miles`;
    
    // Add classes to UI elements
    $w('#filterContainer').className = 'filter-section';
    $w('#distanceContainer').className = 'distance-slider-container';
}

function renderGenreTags(genres) {
    const $container = $w('#genreFilter');
    $container.innerHTML = "";
    
    genres.forEach(genre => {
        const tag = document.createElement("div");
        tag.className = "genre-tag";
        tag.textContent = genre;
        tag.onclick = () => {
            tag.classList.toggle("selected");
            selectedGenres = [...$container.querySelectorAll('.genre-tag.selected')]
                .map(t => t.textContent);
            loadListings(); // Real-time filtering
        };
        $container.appendChild(tag);
    });
}

function setupEventHandlers() {
    // Real-time filtering
    $w('#searchInput').onInput(() => loadListings());
    $w('#applyFiltersButton').onClick(() => loadListings());
    
    // Distance slider
    $w('#distanceSlider').onInput((event) => {
        maxDistance = event.target.value;
        $w('#distanceValue').text = `${maxDistance} miles`;
        loadListings(); // Real-time filtering
    });
    
    // My Listings toggle
    $w('#myListingsToggle').onChange(() => loadListings());
}

async function loadListings() {
    $w('#loadingIndicator').show();
    $w('#listingsRepeater').hide();
    $w('#noResults').hide();
    
    try {
        let query = wixData.query("books")
            .eq("status", "active");
        
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
        query = query.le("maxDistance", parseInt(maxDistance));
        
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
    // Add class to item container
    $item('#repeaterItemContainer').className = 'list-item';
    
    // Set listing data
    $item('#listingTitle').text = itemData.title;
    $item('#listingAuthor').text = `by ${itemData.author}`;
    $item('#listingCover').src = itemData.bookCover || "https://example.com/default-book.jpg";
    $item('#listingLocation').text = `${itemData.location} (within ${itemData.maxDistance} miles)`;
    
    // Set details
    $item('#conditionText').text = `Condition: ${itemData.condition}`;
    $item('#conditionDescription').text = itemData.conditionDescription || "No additional details";
    $item('#lookingForText').text = `Looking for: ${itemData.lookingFor}`;
    
    // Personal summary handling
    const hasPersonalSummary = itemData.personalTradeDescription && 
                              itemData.personalTradeDescription.trim() !== "";
    
    if (hasPersonalSummary) {
        $item('#personalSummaryContainer').className = 'personal-summary-container';
        $item('#personalSummaryLabel').className = 'personal-summary-label';
        $item('#personalSummaryText').className = 'personal-summary-text';
        
        $item('#personalSummaryContainer').show();
        $item('#personalSummaryLabel').text = "Owner's Personal Summary";
        $item('#personalSummaryText').text = itemData.personalTradeDescription;
    } else {
        $item('#personalSummaryContainer').hide();
    }
    
    // Set genre tags
    const $tagsContainer = $item('#genreTags');
    $tagsContainer.innerHTML = "";
    (itemData.genres || []).forEach(genre => {
        const tag = document.createElement("span");
        tag.className = "genre-tag";
        tag.textContent = genre;
        $tagsContainer.appendChild(tag);
    });
    
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
        await markAsTraded(itemData._id);
        $item.remove();
    });
    
    // Show/hide traded button based on ownership
    $item('#tradedButton').toggle(itemData.ownerUserId === currentUser.id);
});

async function markAsTraded(bookId) {
    try {
        // Update book status
        await wixData.update("books", {
            _id: bookId,
            status: "traded"
        });
        
        // Create rating entry
        wixWindow.openLightbox("RatingLightbox", { bookId });
        
    } catch (error) {
        wixWindow.openLightbox("ErrorLightbox", {
            message: "Error updating listing: " + error.message
        });
    }
}
