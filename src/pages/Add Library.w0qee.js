import { currentUser } from 'wix-users';
import wixData from 'wix-data';
import wixLocation from 'wix-location';
import wixWindow from 'wix-window';


let uploadedGallery = [];

$w.onReady(() => {
    if (!currentUser.loggedIn) {
        wixLocation.to("/login");
        return;
    }
    
    // Setup library type dropdown
    $w('#libraryType').options = [
        "Bookstore", 
        "Public Library", 
        "Private Library", 
        "Small Business", 
        "Corporation"
    ].map(type => ({ label: type, value: type }));
    
    // Setup gallery upload  
    // Setup form submission
    $w('#createLibrary').onClick(createLibrary);
    
    // Setup gallery preview
    $w('#galleryPreview').onItemReady(($item, itemData) => {
        $item('#galleryImage').src = itemData.image;
        $item('#removeImage').onClick(() => removeImage(itemData.id));
    });

});

async function createLibrary() {
    // Get form values
    const name = $w('#libraryName').value;
    const description = $w('#libraryDescription').value;
    const address = $w('#libraryAddress').value;
    const type = $w('#libraryType').value;
    
    // Validate unique name
    const existingLib = await wixData.query("libraries")
        .eq("name", name)
        .find();
        
    if (existingLib.items.length > 0) {
        wixWindow.openLightbox("ErrorLightbox", {
            message: "Library name already exists"
        });
        return;
    }
    
    // Get gallery images (NEW)
    const gallery = $w('#galleryUpload').value.map(media => ({
        title: "",
        description: "",
    }));
    
    // Create library
    await wixData.insert("libraries", {
        name,
        description,
        address,
        type,
        privacy: "public", // Default public
        gallery, // Media gallery array
        ownerUserId: currentUser.id
    });
    
    wixLocation.to("/my-libraries"); // Redirect
}
function removeImage(imageId) {
    uploadedGallery = uploadedGallery.filter(img => img.id !== imageId);
    $w('#galleryPreview').data = uploadedGallery;
    
    if (uploadedGallery.length === 0) {
        $w('#uploadStatus').hide();
    }
}

async function createLibrary() {
    // Get form values
    const name = $w('#libraryName').value;
    const description = $w('#libraryDescription').value;
    const address = $w('#libraryAddress').value;
    const type = $w('#libraryType').value;
    const privacy = "public"; // Always public
    const existing = await wixData.query("libraries")
        .eq("name", name)
        .find();
    if (existing.items.length > 0) {
        wixWindow.openLightbox("ErrorLightbox", {
          message: "Library name already exists"
        });
        return;
    }
    // Basic validation
    if (!name || !address || !type) {
        wixWindow.openLightbox("ErrorLightbox", {
            message: "Please fill all required fields"
        });
        return;
    }
    
    try {
        // Create library with gallery and privacy
        const newLibrary = await wixData.insert("libraries", {
            name,
            description,
            address,
            type,
            privacy,
            gallery: uploadedGallery.map(img => ({ 
                image: img.image,
                title: "",
                description: ""
            })),
            ownerUserId: currentUser.id,
            createdAt: new Date(),
            ratingCount: 0,
            averageRating: 0
        });
        
        // Success
        wixWindow.openLightbox("SuccessLightbox", {
            message: "Library created successfully!",
            redirectUrl: "/dashboard"
        });
        
    } catch (error) {
        wixWindow.openLightbox("ErrorLightbox", {
            message: "Error creating library: " + error.message
        });
    }
}