import { currentUser } from 'wix-users';
import wixData from 'wix-data';
import wixLocation from 'wix-location';
import wixWindow from 'wix-window';

let currentLibrary = null;

$w.onReady(async () => {
    // Get library ID from URL
    const query = wixLocation.query;
    const libraryId = query.libraryId;
    
    if (!libraryId) {
        wixWindow.openLightbox("ErrorLightbox", {
            message: "No library specified"
        });
        return;
    }
    
    // Show loading
    $w('#loadingIndicator').show();
    
    try {
        // Load library details
        currentLibrary = await wixData.get("libraries", libraryId);
        
        // Verify ownership
        if (currentLibrary.ownerUserId !== currentUser.id) {
            wixWindow.openLightbox("ErrorLightbox", {
                message: "You don't own this library"
            });
            return;
        }
        
        // Populate form
        $w('#libraryName').value = currentLibrary.name;
        $w('#libraryDescription').value = currentLibrary.description;
        $w('#libraryAddress').value = currentLibrary.address;
        
        // Set privacy switch
        $w('#privacySwitch').checked = currentLibrary.privacy === "public";
        
        // Set type dropdown
        $w('#libraryType').value = currentLibrary.type;
        
        // Setup gallery preview
        if (currentLibrary.gallery && currentLibrary.gallery.length > 0) {
            $w('#galleryPreview').data = currentLibrary.gallery.map(item => ({
                image: item.image
            }));
        }
        
        // Setup form submission
        $w('#updateLibrary').onClick(updateLibrary);
        
    } catch (error) {
        wixWindow.openLightbox("ErrorLightbox", {
            message: "Error loading library: " + error.message
        });
    } finally {
        $w('#loadingIndicator').hide();
    }
});

async function updateLibrary() {
    // Get form values
    const name = $w('#libraryName').value;
    const description = $w('#libraryDescription').value;
    const address = $w('#libraryAddress').value;
    const type = $w('#libraryType').value;
    const privacy = $w('#privacySwitch').checked ? "public" : "private";
    
    // Validation
    if (!name || !address || !type) {
        wixWindow.openLightbox("ErrorLightbox", {
            message: "Please fill all required fields"
        });
        return;
    }
    
    try {
        // Update library
        await wixData.update("libraries", {
            _id: currentLibrary._id,
            name,
            description,
            address,
            type,
            privacy
        });
        
        // Success
        wixWindow.openLightbox("SuccessLightbox", {
            message: "Library updated successfully!",
            redirectUrl: "/my-libraries"
        });
        
    } catch (error) {
        wixWindow.openLightbox("ErrorLightbox", {
            message: "Error updating library: " + error.message
        });
    }
}