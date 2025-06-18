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
    
    // Setup address input
    $w('#libraryAddressInput').onInput(() => {
        $w('#libraryAddress').value = $w('#libraryAddressInput').value;
    });
    
    // Setup form submission
    $w('#createLibrary').onClick(createLibrary);
});

async function createLibrary() {
    // Get form values
    const name = $w('#libraryName').value;
    const description = $w('#libraryDescription').value;
    const address = $w('#libraryAddress').value; // From hidden field
    const type = $w('#libraryType').value;
    
    // Validation
    if (!name || !address || !type) {
        wixWindow.openLightbox("ErrorLightbox", {
            message: "Please fill all required fields"
        });
        return;
    }
    
    try {
        // Create library
        const newLibrary = await wixData.insert("libraries", {
            name,
            description,
            address,
            type,
            ownerUserId: currentUser.id,
            createdAt: new Date(),
            ratingCount: 0,
            averageRating: 0
        });
        
        // Success
        wixWindow.openLightbox("SuccessLightbox", {
            message: "Library created successfully!",
            redirectUrl: `/library-details?libraryId=${newLibrary._id}`
        });
        
    } catch (error) {
        wixWindow.openLightbox("ErrorLightbox", {
            message: "Error creating library: " + error.message
        });
    }
}
