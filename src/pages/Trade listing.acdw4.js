// API Reference: https://www.wix.com/velo/reference/api-overview/introduction
// “Hello, World!” Example: https://learn-code.wix.com/en/article/hello-world

import { currentUser } from 'wix-users';
import { create } from 'wix-media-backend';
import wixLocation from 'wix-location';
import wixWindow from 'wix-window';
import wixData from 'wix-data';

let uploadedCoverUrl = "";

$w.onReady(async () => {
    if (!currentUser.loggedIn) {
        wixLocation.to("/login");
        return;
    }
    
    // Set up genre selection
    const genres = [
        "Classics", "Memoirs", "Historical Fiction", "Novels", "Mysteries", 
        "Comedy", "Fantasy", "Science Fiction", "Non-Fiction", "History",
        "Dystopian", "Action & Adventure", "Thriller & Suspense", "Romance",
        "Literary Fiction", "Magic", "Graphic Novel", "Comics", "Coming of Age",
        "Young Adult", "Children's", "Short Story", "Memoir/Autobiography", "Food",
        "Art", "Science", "True Crime", "Humor", "Religion", "Parenting"
    ];
    
    renderGenreOptions(genres);
    
    // Set up event handlers
    $w('#createButton').onClick(createListing);
    $w('#bookCoverUpload').onChange(handleCoverUpload);
});

function renderGenreOptions(genres) {
    const $container = $w('#genreContainer');
    $container.innerHTML = "";
    
    genres.forEach(genre => {
        const genreOption = document.createElement("div");
        genreOption.className = "genre-option";
        genreOption.textContent = genre;
        genreOption.onclick = () => genreOption.classList.toggle("selected");
        $container.appendChild(genreOption);
    });
}

async function handleCoverUpload(event) {
    const files = event.target.files;
    if (files.length > 0) {
        const file = files[0];
        const uploadedFile = await create.file(file);
        uploadedCoverUrl = uploadedFile.fileUrl;
        $w('#coverPreview').src = uploadedCoverUrl;
    }
}

async function createListing() {
    // Get form values
    const bookTitle = $w('#bookTitle').value;
    const bookAuthor = $w('#bookAuthor').value;
    const bookCondition = $w('#conditionSelect').value;
    const conditionDescription = $w('#conditionDescription').value;
    const lookingFor = $w('#lookingFor').value;
    const location = $w('#locationInput').value;
    const maxDistance = parseInt($w('#distanceSlider').value);
    
    // Get selected genres
    const selectedGenres = [];
    $w('#genreContainer').querySelectorAll('.genre-option.selected').forEach(el => {
        selectedGenres.push(el.textContent);
    });
    
    // Create book listing
    try {
        const newBook = await wixData.insert("books", {
            title: bookTitle,
            author: bookAuthor,
            condition: bookCondition,
            conditionDescription,
            lookingFor,
            location,
            maxDistance,
            genres: selectedGenres,
            status: "active",
            ownerUserId: currentUser.id,
            createdAt: new Date(),
            bookCover: uploadedCoverUrl
        });
        
        // Update libraries with new listing
        const userLibrary = await wixData.query("libraries")
            .eq("ownerUserId", currentUser.id)
            .find()
            .then(({ items }) => items[0]);
        
        if (userLibrary) {
            const updatedListings = [...(userLibrary.bookListings || []), newBook._id];
            await wixData.update("libraries", {
                _id: userLibrary._id,
                bookListings: updatedListings
            });
        }
        
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
