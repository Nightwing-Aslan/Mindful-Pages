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
    
    // Set up genre options using SelectionTags (no custom container needed)
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
    
    // Set up event handlers
    $w('#createButton').onClick(createListing);
    $w('#bookCoverUpload').onChange(handleCoverUpload);
});

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
    
    // Get selected genres from SelectionTags
    const selectedGenres = $w('#selectionTags1').value;

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