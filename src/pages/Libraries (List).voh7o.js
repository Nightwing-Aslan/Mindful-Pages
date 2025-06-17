// API Reference: https://www.wix.com/velo/reference/api-overview/introduction
// “Hello, World!” Example: https://learn-code.wix.com/en/article/hello-world

import { currentUser } from 'wix-users';
import wixData from 'wix-data';
import wixLocation from 'wix-location';

$w.onReady(async () => {
    // Check if user is logged in
    if (!currentUser.loggedIn) {
        wixLocation.to("/login");
        return;
    }
    
    // Show loading indicator
    $w('#loadingIndicator').show();
    $w('#librariesRepeater').hide();
    $w('#noResults').hide();
    
    try {
        // Get user location (simplified - in real app, get from user profile)
        const userLocation = await getUserLocation();
        
        // Get libraries sorted by distance
        const libraries = await wixData.query("libraries")
            .ascending("distanceFromUser")
            .find()
            .then(({ items }) => items);
        
        // Update UI
        if (libraries.length > 0) {
            $w('#librariesRepeater').data = libraries;
            $w('#librariesRepeater').show();
            $w('#noResults').hide();
        } else {
            $w('#noResults').show();
            $w('#librariesRepeater').hide();
        }
        
    } catch (error) {
        console.error("Error loading libraries:", error);
        $w('#errorText').text = "Error loading libraries. Please try again.";
        $w('#errorText').show();
    } finally {
        $w('#loadingIndicator').hide();
    }
    $w('#searchInput').onInput(() => loadLibraries());
    $w('#searchButton').onClick(() => loadLibraries());
    
    // Add library button
    $w('#addLibraryButton').onClick(() => {
        wixLocation.to("/add-library");
    });
    
});

// Simplified location function - replace with your actual implementation
async function getUserLocation() {
    return "London"; // Example
}
async function loadLibraries() {
    try {
        const searchTerm = $w('#searchInput').value.toLowerCase();
        
        // Get libraries
        let libraries = await wixData.query("libraries")
            .ascending("distanceFromUser")
            .find()
            .then(({ items }) => items);
        
        // Apply search filter
        if (searchTerm) {
            libraries = libraries.filter(library => 
                library.name.toLowerCase().includes(searchTerm) ||
                library.description.toLowerCase().includes(searchTerm) ||
                library.city.toLowerCase().includes(searchTerm) ||
                library.type.toLowerCase().includes(searchTerm) ||
                await hasMatchingBooks(library._id, searchTerm)
            );
        }        
    } catch (error) {
    }
}

async function hasMatchingBooks(libraryId, searchTerm) {
    const books = await wixData.query("books")
        .eq("libraryId", libraryId)
        .find()
        .then(({ items }) => items);
    
    return books.some(book => 
        book.title.toLowerCase().includes(searchTerm) ||
        book.author.toLowerCase().includes(searchTerm)
    );
}
$w('#librariesRepeater').onItemReady(($item, library) => {
    // Set library details
    $item('#libraryName').text = library.name;
    $item('#libraryCity').text = library.city;
    $item('#distance').text = `${library.distanceFromUser} miles`;
    $item('#libraryImage').src = library.libraryPicture || "https://example.com/default-library.jpg";
    
    // Create star rating
    const rating = library.star || 0;
    $item('#ratingStars').text = "★".repeat(Math.floor(rating)) + "☆".repeat(5 - Math.floor(rating));
    $item('#ratingValue').text = rating.toFixed(1);
    
    // Handle "Read More" button
    $item('#readMoreButton').onClick(() => {
        wixLocation.to(`/library-details?libraryId=${library._id}`);
    });
});
