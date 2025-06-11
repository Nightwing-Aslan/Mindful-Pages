import { currentUser } from 'wix-users';
import wixWindow from 'wix-window';
import wixLocation from 'wix-location';
import wixData from 'wix-data';

let selectedGenres = [];
let maxDistance = 50; // Default max distance

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
    
    renderGenreTags(genres);
    
    // Setup distance slider
    $w('#distanceSlider').value = maxDistance;
    $w('#distanceValue').text = `${maxDistance} miles`;
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
    $w('#applyFiltersButton').onClick(() => loadListings()); // Renamed search button
    
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
        $w('#listingsRepeater').data = items;
        $w('#noResults').toggle(!items.length);
        
    } catch (error) {
        wixWindow.openLightbox("ErrorLightbox", {
            message: "Error loading listings: " + error.message
        });
    } finally {
        $w('#loadingIndicator').hide();
        $w('#listingsRepeater').show();
    }
}

$w('#listingsRepeater').onItemReady(($item, itemData) => {
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
    $item('#personalSummaryContainer').toggle(hasPersonalSummary);
    
    if (hasPersonalSummary) {
        $item('#personalSummaryLabel').text = "Owner's Personal Summary";
        $item('#personalSummaryText').text = itemData.personalTradeDescription;
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
