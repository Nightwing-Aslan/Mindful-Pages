import { currentUser } from 'wix-users';
import wixData from 'wix-data';
import wixLocation from 'wix-location';
import wixWindow from 'wix-window';

$w.onReady(async () => {
    if (!currentUser.loggedIn) {
        wixLocation.to("/login");
        return;
    }
    
    // Show loading indicator
    $w('#loadingIndicator').show();
    $w('#librariesContainer').hide();
    $w('#emptyState').hide();
    
    try {
        // Load user's libraries
        const libraries = await wixData.query("libraries")
            .eq("ownerUserId", currentUser.id)
            .find()
            .then(({ items }) => items);
        
        if (libraries.length > 0) {
            $w('#librariesRepeater').data = libraries;
            $w('#librariesContainer').show();
            $w('#emptyState').hide();
        } else {
            $w('#librariesContainer').hide();
            $w('#emptyState').show();
        }
        
    } catch (error) {
        wixWindow.openLightbox("ErrorLightbox", {
            message: "Error loading libraries: " + error.message
        });
    } finally {
        $w('#loadingIndicator').hide();
    }
    
    // Setup "Add Library" button
    $w('#addLibraryButton').onClick(() => {
        wixLocation.to("/add-library");
    });
});

$w('#librariesRepeater').onItemReady(($item, library) => {
    // Set library details
    $item('#libraryName').text = library.name;
    $item('#libraryType').text = library.type;
    
    // Set privacy status
    const isPublic = library.privacy === "public";
    $item('#privacyStatus').text = isPublic ? "Public" : "Private";
    
    // Set book count
    $item('#bookCount').text = `${library.bookCount || 0} books`;
    
    // Set library image
    if (library.gallery && library.gallery.length > 0) {
        $item('#libraryImage').src = library.gallery[0].image;
    } else {
        $item('#libraryImage').src = "https://example.com/default-library.jpg";
    }
    
    // Edit button handler
    $item('#editLibraryButton').onClick(() => {
        wixLocation.to(`/edit-library?libraryId=${library._id}`);
    });
    
    // Manage books button handler
    $item('#manageBooksButton').onClick(() => {
        wixLocation.to(`/manage-books?libraryId=${library._id}`);
    });
});