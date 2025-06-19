import { currentUser } from 'wix-users';
import wixData from 'wix-data';
import wixLocation from 'wix-location';
import wixWindow from 'wix-window';

$w.onReady(async () => {
    if (!currentUser.loggedIn) {
        wixLocation.to("/login");
        return;
    }
    
    // Load user's libraries
    const libraries = await wixData.query("libraries")
        .eq("ownerUserId", currentUser.id)
        .find()
        .then(({ items }) => items);
    
    // Populate library dropdown
    $w('#librarySelect').options = libraries.map(lib => ({
        label: lib.name,
        value: lib._id
    }));
    
    // Add "No Library" option
    $w('#librarySelect').options.unshift({
        label: "Personal Collection (No Library)",
        value: ""
    });
    
    // Setup privacy toggle
    $w('#privacyToggle').onChange(() => {
        $w('#privacyStatus').text = $w('#privacyToggle').checked ? "Public" : "Private";
    });
    
    // Set default privacy to private
    $w('#privacyToggle').checked = false;
    $w('#privacyStatus').text = "Private";
    
    // Setup form submission
    $w('#createBook').onClick(createBook);
});

async function createBook() {
    // Get form values
    const title = $w('#bookTitle').value;
    const author = $w('#bookAuthor').value;
    const releaseYear = parseInt($w('#releaseYear').value);
    const description = $w('#bookDescription').value;
    const quantity = parseInt($w('#bookQuantity').value) || 1;
    const libraryId = $w('#librarySelect').value;
    const privacy = $w('#privacyToggle').checked ? "public" : "private";
    
    // Validation
    if (!title || !author) {
        wixWindow.openLightbox("ErrorLightbox", {
            message: "Title and author are required"
        });
        return;
    }
    
    try {
        // Create book
        await wixData.insert("books", {
            title,
            author,
            releaseYear,
            description,
            quantity,
            libraryId,
            privacy,
            ownerUserId: currentUser.id,
            createdAt: new Date()
        });
        
        // Success
        wixWindow.openLightbox("SuccessLightbox", {
            message: "Book added successfully!",
            redirectUrl: "/dashboard"
        });
        
    } catch (error) {
        wixWindow.openLightbox("ErrorLightbox", {
            message: "Error adding book: " + error.message
        });
    }
}
