import { currentUser } from 'wix-users';
import wixData from 'wix-data';
import wixWindow from 'wix-window';
import wixLocation from 'wix-location';

$w.onReady(async () => {
    if (!currentUser.loggedIn) {
        wixLocation.to("/login");
        return;
    }
    
    // Add custom styles
    addNotificationsStyles();
    
    // Load notifications
    await loadTradeOffers();
    
    // Setup refresh button
    $w('#refreshButton').onClick(async () => {
        $w('#loadingIndicator').show();
        await loadTradeOffers();
    });
});

function addNotificationsStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* NOTIFICATIONS PAGE STYLES */
        .offer-card {
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            background-color: #fff;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            transition: all 0.3s;
        }
        
        .offer-card:hover {
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            transform: translateY(-2px);
        }
        
        .offer-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #eee;
        }
        
        .offer-book {
            display: flex;
            gap: 15px;
            margin-bottom: 15px;
            align-items: center;
        }
        
        .offer-cover {
            width: 80px;
            height: 120px;
            object-fit: cover;
            border-radius: 4px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .offer-details {
            flex: 1;
        }
        
        .offer-actions {
            display: flex;
            gap: 10px;
            margin-top: 15px;
        }
        
        .accepted {
            border-left: 4px solid #4CAF50;
        }
        
        .declined {
            border-left: 4px solid #f44336;
        }
        
        .empty-state {
            text-align: center;
            padding: 40px;
            color: #6c757d;
        }
        
        .empty-state-icon {
            font-size: 48px;
            margin-bottom: 15px;
            color: #ced4da;
        }
    `;
    document.head.appendChild(style);
}

async function loadTradeOffers() {
    try {
        // Fetch pending offers for current user
        const pendingOffers = await wixData.query("TradeOffers")
            .eq("toUserId", currentUser.id)
            .eq("status", "pending")
            .descending("timestamp")
            .find();
        
        // Fetch recent decisions (accepted/declined)
        const recentDecisions = await wixData.query("TradeOffers")
            .eq("toUserId", currentUser.id)
            .ne("status", "pending")
            .descending("timestamp")
            .limit(10)
            .find();
        
        // Combine offers
        const allOffers = [...pendingOffers.items, ...recentDecisions.items];
        
        // Get book details
        const bookIds = allOffers.map(offer => offer.bookId);
        const books = await wixData.query("books")
            .hasSome("_id", bookIds)
            .find()
            .then(({ items }) => items);
        
        // Create offer data with book details
        const offerData = allOffers.map(offer => {
            const book = books.find(b => b._id === offer.bookId) || {};
            return {
                ...offer,
                bookTitle: book.title || "Unknown Book",
                bookAuthor: book.author || "Unknown Author",
                bookCover: book.bookCover || "https://example.com/default-book.jpg"
            };
        });
        
        // Update UI
        if (offerData.length > 0) {
            $w('#offersRepeater').data = offerData;
            $w('#emptyState').hide();
            $w('#offersContainer').show();
        } else {
            $w('#emptyState').show();
            $w('#offersContainer').hide();
        }
        
    } catch (error) {
        wixWindow.openLightbox("ErrorLightbox", {
            message: "Error loading offers: " + error.message
        });
    } finally {
        $w('#loadingIndicator').hide();
    }
}

$w('#offersRepeater').onItemReady(($item, offer) => {
    // Add class based on status
    $item('#offerCard').className = `offer-card ${offer.status}`;
    
    // Set offer data
    $item('#fromUserName').text = `From: ${offer.fromUserName || "Another Trader"}`;
    $item('#timestamp').text = formatDate(offer.timestamp);
    $item('#offerMessage').text = offer.message;
    $item('#bookTitle').text = offer.bookTitle;
    $item('#bookAuthor').text = `by ${offer.bookAuthor}`;
    $item('#bookCover').src = offer.bookCover;
    
    // Set offer status text
    $item('#offerStatus').text = offer.status === "pending" ? 
        "Pending your decision" : 
        `Offer ${offer.status}`;
    
    // Action buttons
    if (offer.status === "pending") {
        $item('#acceptButton').show();
        $item('#declineButton').show();
        $item('#statusText').hide();
        
        $item('#acceptButton').onClick(async () => {
            await updateOfferStatus(offer._id, "accepted");
            $item('#offerCard').className = "offer-card accepted";
            $item('#acceptButton').hide();
            $item('#declineButton').hide();
            $item('#statusText').show().text = "Offer Accepted";
        });
        
        $item('#declineButton').onClick(async () => {
            await updateOfferStatus(offer._id, "declined");
            $item('#offerCard').className = "offer-card declined";
            $item('#acceptButton').hide();
            $item('#declineButton').hide();
            $item('#statusText').show().text = "Offer Declined";
        });
    } else {
        $item('#acceptButton').hide();
        $item('#declineButton').hide();
        $item('#statusText').show().text = `Offer ${offer.status}`;
    }
});

async function updateOfferStatus(offerId, status) {
    try {
        await wixData.update("TradeOffers", {
            _id: offerId,
            status: status
        });
        
        wixWindow.openLightbox("SuccessLightbox", {
            message: `Offer ${status} successfully!`
        });
        
    } catch (error) {
        wixWindow.openLightbox("ErrorLightbox", {
            message: `Error updating offer: ${error.message}`
        });
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
