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
    
    // Setup search with unique IDs
    $w('#librarySearchInput').onInput(() => loadLibraries());
    $w('#librarySearchButton').onClick(() => loadLibraries()); // Unique button ID
    
    // Add library button
    $w('#addLibraryButton').onClick(() => {
        wixLocation.to("/add-library");
    });
    
    // Load libraries
    await loadLibraries();
});

async function loadLibraries() {
    try {
        const searchTerm = $w('#librarySearchInput').value.toLowerCase();
        
        // Get all libraries
        const libraries = await wixData.query("libraries")
            .ascending("name")
            .find()
            .then(({ items }) => items);
        
        // Apply search filter
        let filteredLibraries = libraries;
        if (searchTerm) {
            filteredLibraries = libraries.filter(library => 
                library.name.toLowerCase().includes(searchTerm) ||
                library.description.toLowerCase().includes(searchTerm) ||
                library.type.toLowerCase().includes(searchTerm) ||
                library.address.toLowerCase().includes(searchTerm) ||
                await hasMatchingBooks(library._id, searchTerm)
            );
        }
        
        // Update UI
        if (filteredLibraries.length > 0) {
            $w('#librariesRepeater').data = filteredLibraries;
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
}

async function hasMatchingBooks(libraryId, searchTerm) {
    const books = await wixData.query("books")
        .eq("libraryId", libraryId)
        .find()
        .then(({ items }) => items);
    
    return books.some(book => 
        book.title.toLowerCase().includes(searchTerm) ||
        book.author.toLowerCase().includes(searchTerm) ||
        (book.releaseYear && book.releaseYear.toString().includes(searchTerm)) ||
        book.description.toLowerCase().includes(searchTerm)
    );
}

$w('#librariesRepeater').onItemReady(($item, library) => {
    // Set library details
    $item('#libraryName').text = library.name;
    $item('#libraryType').text = library.type;
    $item('#libraryAddress').text = library.address;
    $item('#librarySummary').text = library.description || "No description available";
    
    // Display average rating
    if (library.averageRating > 0) {
        $item('#libraryRatingDisplay').text = `★ ${library.averageRating.toFixed(1)} (${library.ratingCount})`;
        } else {
            $item('#libraryRatingDisplay').text = "No ratings yet";
    }
    
    // Handle click
    $item('#libraryCard').onClick(() => {
        wixLocation.to(`/library-details?libraryId=${library._id}`);
    });
});
