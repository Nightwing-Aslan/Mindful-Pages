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
    
    // Load libraries and books in parallel
    const [libraries, books] = await Promise.all([
        wixData.query("libraries")
            .eq("ownerUserId", currentUser.id)
            .find()
            .then(({ items }) => items),
        wixData.query("books")
            .eq("ownerUserId", currentUser.id)
            .limit(5) // Show only 5 recent books
            .descending("createdAt")
            .find()
            .then(({ items }) => items)
    ]);
    
    // Update libraries section
    if (libraries.length > 0) {
        $w('#librariesRepeater').data = libraries;
        $w('#librariesContainer').show();
        $w('#noLibrariesMessage').hide();
    } else {
        $w('#librariesContainer').hide();
        $w('#noLibrariesMessage').show();
    }
    
    // Update books section
    if (books.length > 0) {
        $w('#booksRepeater').data = books;
        $w('#booksContainer').show();
        $w('#noBooksMessage').hide();
    } else {
        $w('#booksContainer').hide();
        $w('#noBooksMessage').show();
    }
    
    // Setup buttons
    $w('#viewAllBooksButton').onClick(() => wixLocation.to("/my-books"));
    $w('#viewAllLibrariesButton').onClick(() => wixLocation.to("/my-libraries"));
    $w('#addLibraryButton').onClick(() => wixLocation.to("/add-library"));
    $w('#addBookButton').onClick(() => wixLocation.to("/add-book"));
    
    $w('#loadingIndicator').hide();
});

// Libraries repeater (same as My Libraries.js)
$w('#librariesRepeater').onItemReady(($item, library) => {
    $item('#libraryName').text = library.name;
    $item('#libraryType').text = library.type;
    $item('#privacyStatus').text = library.privacy === "public" ? "Public" : "Private";
    
    if (library.gallery && library.gallery.length > 0) {
        $item('#libraryImage').src = library.gallery[0].image;
    }
    
    $item('#editLibraryButton').onClick(() => {
        wixLocation.to(`/edit-library?libraryId=${library._id}`);
    });
});

// Books repeater (simplified version)
$w('#booksRepeater').onItemReady(($item, book) => {
    $item('#bookTitle').text = book.title;
    $item('#bookAuthor').text = `by ${book.author}`;
    $item('#editBookButton').onClick(() => {
        wixWindow.openLightbox("EditBookLightbox", {
            bookId: book._id
        });
    });
});
