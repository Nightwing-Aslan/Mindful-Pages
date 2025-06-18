import { currentUser } from 'wix-users';
import wixData from 'wix-data';
import wixLocation from 'wix-location';
import wixWindow from 'wix-window';

$w.onReady(() => {
    if (!currentUser.loggedIn) {
        wixLocation.to("/login");
        return;
    }
    
    // Setup library type options
    const libraryTypes = [
        "Bookstore", 
        "Public Library", 
        "Private Library", 
        "Small Business", 
        "Corporation"
    ];
    
    // Populate type dropdown
    $w('#libraryType').options = libraryTypes.map(type => ({
        label: type,
        value: type
    }));
    
    // Setup form submission
    $w('#createLibrary').onClick(createLibrary);
});

async function createLibrary() {
    // Get form values
    const name = $w('#libraryName').value;
    const description = $w('#libraryDescription').value;
    const location = $w('#libraryLocation').value; // Text input for location
    const type = $w('#libraryType').value;
    
    // Validation
    if (!name || !location || !type) {
        wixWindow.openLightbox("ErrorLightbox", {
            message: "Please fill all required fields"
        });
        return;
    }
    
    try {
        // Create library
        await wixData.insert("libraries", {
            name,
            description,
            location,
            type,
            ownerUserId: currentUser.id,
            createdAt: new Date(),
            ratingCount: 0,
            averageRating: 0
        });
        
        // Success
        wixWindow.openLightbox("SuccessLightbox", {
            message: "Library created successfully!",
            redirectUrl: "/libraries"
        });
        
    } catch (error) {
        wixWindow.openLightbox("ErrorLightbox", {
            message: "Error creating library: " + error.message
        });
    }
}
