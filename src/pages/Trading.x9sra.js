import { currentUser } from 'wix-users';
import wixWindow from 'wix-window';
import wixLocation from 'wix-location';
import wixData from 'wix-data';

$w.onReady(async () => {
    if (!currentUser.loggedIn) {
        wixLocation.to("/login");
        return;
    }
    
    // Set up UI
    setupSearchAndFilters();
    loadListings();
});

function setupSearchAndFilters() {
    $w('#searchInput').onKeyPress(event => {
        if (event.key === "Enter") loadListings();
    });
    
    $w('#searchButton').onClick(() => loadListings());
    $w('#genreFilter').onChange(() => loadListings());
    $w('#distanceFilter').onChange(() => loadListings());
    $w('#myListingsToggle').onChange(() => loadListings());
}

async function loadListings() {
    $w('#loadingIndicator').show();
    
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
        const selectedGenre = $w('#genreFilter').value;
        if (selectedGenre && selectedGenre !== "all") {
            query = query.hasSome("genres", [selectedGenre]);
        }
        
        // Apply distance filter
        const maxDistance = $w('#distanceFilter').value;
        if (maxDistance && maxDistance !== "any") {
            query = query.le("maxDistance", parseInt(maxDistance));
        }
        
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
    }
}

$w('#listingsRepeater').onItemReady(($item, itemData) => {
    // Set listing data
    $item('#listingTitle').text = itemData.title;
    $item('#listingAuthor').text = `by ${itemData.author}`;
    $item('#listingCover').src = itemData.bookCover;
    $item('#listingLocation').text = `${itemData.location} (within ${itemData.maxDistance} miles)`;
    
    // Set details
    $item('#conditionText').text = `Condition: ${itemData.condition}`;
    $item('#conditionDescription').text = itemData.conditionDescription;
    $item('#lookingForText').text = `Looking for: ${itemData.lookingFor}`;
    
    // Set genre tags
    const $tagsContainer = $item('#genreTags');
    $tagsContainer.innerHTML = "";
    (itemData.genres || []).forEach(genre => {
        const tag = document.createElement("span");
        tag.className = "genre-tag";
        tag.textContent = genre;
        $tagsContainer.appendChild(tag);
    });
    
    // Handle "Read more" toggle
    $item('#readMoreButton').onClick(() => {
        $item('#detailsContent').toggle();
        $item('#readMoreButton').text = 
            $item('#detailsContent').visible ? "Read less" : "Read more";
    });
    
    // Handle contact button
    $item('#contactButton').onClick(() => {
        wixWindow.openLightbox("ContactUserLightbox", {
            ownerId: itemData.ownerUserId,
            bookId: itemData._id
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
