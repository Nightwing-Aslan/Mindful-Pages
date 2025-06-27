import { currentUser } from 'wix-users';
import wixLocation from 'wix-location';
import wixWindow from 'wix-window';
import wixData from 'wix-data';


let uploadedCoverUrl = "";

$w.onReady(async () => {
    if (!currentUser.loggedIn) {
        wixLocation.to("/login");
        return;
    }

    // Set up genre options
    const genres = [
        "Classics", "Memoirs", "Historical Fiction", "Novels", "Mysteries", 
        "Comedy", "Fantasy", "Science Fiction", "Non-Fiction", "History",
        "Dystopian", "Action & Adventure", "Thriller & Suspense", "Romance",
        "Literary Fiction", "Magic", "Graphic Novel", "Comics", "Coming of Age",
        "Young Adult", "Children's", "Short Story", "Memoir/Autobiography", "Food",
        "Art", "Science", "True Crime", "Humor", "Religion", "Parenting"
    ];
    
    // Configure SelectionTags
    $w('#selectionTags1').options = genres.map(genre => ({
        label: genre,
        value: genre
    }));
    
    $w('#createButton').disable();
    $w('#createButton').onClick(createListing);
    $w('#bookCoverUpload').onChange(handleCoverUpload);
    
    // List of required fields to validate
    const requiredFields = [
        '#bookTitle', 
        '#bookAuthor', 
        '#conditionSelect', 
        '#lookingFor', 
        '#locationInput',
        '#distanceSlider'
    ];
    
    // Add change handlers for all required fields
    $w(requiredFields.join(",")).onChange(validateForm);
    $w('#selectionTags1').onChange(validateForm);
    
    // Also validate when cover upload completes
    $w('#bookCoverUpload').onChange(() => {
        handleCoverUpload(event).then(validateForm);
    });
    
    // Initial validation check
    validateForm();
});

function validateForm() {
    const isFormValid = (
        $w('#bookTitle').value &&
        $w('#bookAuthor').value &&
        $w('#conditionSelect').value &&
        $w('#lookingFor').value &&
        $w('#locationInput').value &&
        $w('#distanceSlider').value &&
        $w('#selectionTags1').value.length > 0 &&
        uploadedCoverUrl
    );

    $w('#createButton').enable(isFormValid);
}

async function handleCoverUpload(event) {
    try {
        const [file] = event.target.files;
        if (!file) return;
        
        // Use Wix's native file upload
        const response = await fetch("/_functions/uploadFile", {
            method: "POST",
            body: file
        });
        
        if (response.ok) {
            uploadedCoverUrl = await response.text();
            $w('#coverPreview').src = uploadedCoverUrl;
        } else {
            throw new Error("Upload failed");
        }
    } catch (error) {
        console.error("Upload error:", error);
        wixWindow.openLightbox("ErrorLightbox", {
            message: "Failed to upload cover image"
        });
    }
}


async function createListing() {
    // Get form values
    const bookTitle = $w('#bookTitle').value;
    const bookAuthor = $w('#bookAuthor').value;
    const bookCondition = $w('#conditionSelect').value;
    const lookingFor = $w('#lookingFor').value;
    const location = $w('#locationInput').value;
    const maxDistance = parseInt($w('#distanceSlider').value);
    const personalDescription = $w('#personalDescription').value;
    const selectedGenres = $w('#selectionTags1').value;

    // Validate required fields
    const requiredFields = {
        "Book Title": bookTitle,
        "Author": bookAuthor,
        "Condition": bookCondition,
        "Looking For": lookingFor,
        "Location": location,
        "Genres": selectedGenres.length > 0
    };

    // Check for empty fields
    const missingFields = Object.entries(requiredFields)
        .filter(([_, value]) => !value)
        .map(([field]) => field);

    if (missingFields.length > 0) {
        wixWindow.openLightbox("ErrorLightbox", {
            message: `Please fill in all required fields: ${missingFields.join(", ")}`
        });
        return;
    }

    // Validate cover image
    if (!uploadedCoverUrl) {
        wixWindow.openLightbox("ErrorLightbox", {
            message: "Please upload a book cover image"
        });
        return;
    }

    // Create book listing
    try {
        await wixData.insert("books", {
            title: bookTitle,
            author: bookAuthor,
            condition: bookCondition,
            lookingFor,
            personalTradeDescription: personalDescription,
            location,
            maxDistance,
            genres: selectedGenres,
            status: "active",
            ownerUserId: currentUser.id,
            createdAt: new Date(),
            bookCover: uploadedCoverUrl
        });
        
        wixWindow.openLightbox("SuccessLightbox", {
            message: "Trade listing created successfully!"
        });
        
        setTimeout(() => wixLocation.to("/trading"), 3000);
    } catch (error) {
        wixWindow.openLightbox("ErrorLightbox", {
            message: "Error creating listing: " + error.message
        });
    }
}
