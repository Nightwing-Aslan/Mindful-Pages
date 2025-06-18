import { currentUser } from 'wix-users';
import wixData from 'wix-data';
import wixLocation from 'wix-location';
import wixWindow from 'wix-window';
import { create } from 'wix-media-backend';

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
    $w('#galleryUpload').onChange(handleGalleryUpload);
    
    // Setup form submission
    $w('#createLibrary').onClick(createLibrary);
    
    // Setup gallery preview
    $w('#galleryPreview').onItemReady(($item, itemData) => {
        $item('#galleryImage').src = itemData.image;
        $item('#removeImage').onClick(() => removeImage(itemData.id));
    });
});

async function handleGalleryUpload(event) {
    const files = event.target.files;
    if (files.length === 0) return;
    
    try {
        $w('#galleryUpload').disable();
        $w('#uploadStatus').text = `Uploading ${files.length} image(s)...`;
        $w('#uploadStatus').show();
        
        // Upload all files
        const uploadPromises = Array.from(files).map(file => 
            create.file(file).then(uploadedFile => ({
                id: Date.now() + Math.random().toString(36).substr(2, 9),
                image: uploadedFile.fileUrl
            }))
        );
        
        const newImages = await Promise.all(uploadPromises);
        uploadedGallery = [...uploadedGallery, ...newImages];
        
        // Update gallery preview
        $w('#galleryPreview').data = uploadedGallery;
        $w('#uploadStatus').text = "Upload completed!";
        
    } catch (error) {
        $w('#uploadStatus').text = "Upload failed: " + error.message;
    } finally {
        $w('#galleryUpload').enable();
    }
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
    
    // Basic validation
    if (!name || !address || !type) {
        wixWindow.openLightbox("ErrorLightbox", {
            message: "Please fill all required fields"
        });
        return;
    }
    
    try {
        // Create library with gallery
        const newLibrary = await wixData.insert("libraries", {
            name,
            description,
            address,
            type,
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
            redirectUrl: `/library-details?libraryId=${newLibrary._id}`
        });
        
    } catch (error) {
        wixWindow.openLightbox("ErrorLightbox", {
            message: "Error creating library: " + error.message
        });
    }
}
