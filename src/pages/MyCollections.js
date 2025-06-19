// File: MyCollections.js
import { currentUser } from 'wix-users';
import wixData from 'wix-data';
import wixLocation from 'wix-location';

$w.onReady(async () => {
    if (!currentUser.loggedIn) {
        wixLocation.to("/login");
        return;
    }
    
    // Show loading indicator
    $w('#loadingIndicator').show();
    
    // Load user's books and libraries in parallel
    const [books, libraries] = await Promise.all([
        wixData.query("books")
            .eq("ownerUserId", currentUser.id)
            .find(),
        wixData.query("libraries")
            .eq("ownerUserId", currentUser.id)
            .find()
    ]);
    
    // Update UI
    $w('#booksRepeater').data = books.items;
    $w('#librariesRepeater').data = libraries.items;
    $w('#loadingIndicator').hide();
});

// Books repeater
$w('#booksRepeater').onItemReady(($item, book) => {
    $item('#bookTitle').text = book.title;
    $item('#bookAuthor').text = `by ${book.author}`;
    
    // Edit button for books
    $item('#editBookButton').onClick(() => {
        wixWindow.openLightbox("EditBookLightbox", { bookId: book._id });
    });
});

// Libraries repeater
$w('#librariesRepeater').onItemReady(($item, library) => {
    $item('#libraryName').text = library.name;
    $item('#libraryType').text = library.type;
    
    // Edit button for libraries
    $item('#editLibraryButton').onClick(() => {
        wixLocation.to(`/edit-library?libraryId=${library._id}`);
    });
    
    // View button for public access
    $item('#viewLibraryButton').onClick(() => {
        wixLocation.to(`/library-details?libraryId=${library._id}`);
    });
});
