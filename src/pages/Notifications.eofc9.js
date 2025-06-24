import { currentUser } from 'wix-users';
import wixData from 'wix-data';
import wixWindow from 'wix-window';
import wixLocation from 'wix-location';

// ... existing imports ...

$w.onReady(async () => {
    if (!currentUser.loggedIn) {
        wixLocation.to("/login");
        return;
    }
    
    // Initialize UI state
    $w('#offersContainer').hide();
    $w('#emptyState').hide();
    $w('#loadingIndicator').show();
    
    await loadTradeOffers();
    
    $w('#refreshButton').onClick(async () => {
        $w('#loadingIndicator').show();
        await loadTradeOffers();
    });
});

async function loadTradeOffers() {
    try {
        const offers = await wixData.query("TradeOffers")
            .eq("toUserId", currentUser.id)
            .descending("timestamp")
            .find()
            .then(({ items }) => items);
        
        if (offers.length > 0) {
            $w('#offersRepeater').data = offers;
            $w('#offersContainer').show();
            $w('#emptyState').hide();
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
    // Set offer details
    $item('#fromUserName').text = `From: ${offer.fromUserName || "Another Trader"}`;
    $item('#timestamp').text = formatDate(offer.timestamp);
    $item('#offerMessage').text = offer.message;
    $item('#bookTitle').text = offer.bookTitle;
    
    // Status-based UI
    if (offer.bookStatus === "traded") {
        showBookTraded($item, offer);
    } else if (offer.status === "pending") {
        showPendingOffer($item, offer);
    } else if (offer.status === "declined") {
        showDeclinedOffer($item, offer);
    } else {
        showResolvedOffer($item, offer);
    }
});

function showBookTraded($item, offer) {
    $item('#acceptButton').hide();
    $item('#declineButton').hide();
    $item('#rejectionControls').hide();
    $item('#counterRejectionControls').hide();
    $item('#finalStatus').show();
    
    $item('#finalStatus').text("Book already traded");
    $item('#statusNote').text("This book has been traded to another user").show();
}

function showPendingOffer($item, offer) {
    $item('#acceptButton').show();
    $item('#declineButton').show();
    $item('#rejectionControls').hide();
    $item('#counterRejectionControls').hide();
    $item('#finalStatus').hide();
    $item('#statusNote').hide();
    
    $item('#acceptButton').onClick(async () => {
        // Accept the offer
        await acceptOffer(offer);
        $item('#finalStatus').text("Offer Accepted").show();
        $item('#acceptButton').hide();
        $item('#declineButton').hide();
        
        // Reject all other offers for this book
        await rejectOtherOffers(offer.bookId);
    });
    
    $item('#declineButton').onClick(() => {
        $item('#rejectionControls').show();
        $item('#declineButton').hide();
    });
    
    // Setup rejection submission
    $item('#submitRejection').onClick(async () => {
        const rejectionReason = $item('#rejectionReason').value;
        if (!rejectionReason) {
            $item('#rejectionError').text("Please enter a reason").show();
            return;
        }
        
        await declineOffer(offer, rejectionReason);
        $item('#rejectionControls').hide();
        $item('#counterRejectionControls').show();
    });
}

function showDeclinedOffer($item, offer) {
    $item('#acceptButton').hide();
    $item('#declineButton').hide();
    $item('#rejectionControls').hide();
    $item('#counterRejectionControls').show();
    $item('#finalStatus').hide();
    $item('#statusNote').hide();
    
    // Show rejection reason if exists
    if (offer.rejectionReason) {
        $item('#rejectionReasonDisplay').text(`Rejection reason: ${offer.rejectionReason}`).show();
    }
    
    // Handle counter-rejection actions
    $item('#acceptRejection').onClick(async () => {
        await updateOfferStatus(offer._id, "rejection_accepted");
        $item('#finalStatus').text("Rejection Accepted").show();
        $item('#counterRejectionControls').hide();
    });
    
    $item('#counterRejection').onClick(() => {
        $item('#counterRejectionControls').hide();
        $item('#rejectionControls').show();
        $item('#rejectionReason').value = "";
        $item('#rejectionError').hide();
    });
}

function showResolvedOffer($item, offer) {
    $item('#acceptButton').hide();
    $item('#declineButton').hide();
    $item('#rejectionControls').hide();
    $item('#counterRejectionControls').hide();
    $item('#finalStatus').show();
    $item('#statusNote').hide();
    
    $item('#finalStatus').text(
        offer.status === "accepted" ? "Offer Accepted" :
        offer.status === "rejection_accepted" ? "Rejection Accepted" :
        "Offer Resolved"
    );
}

async function acceptOffer(offer) {
    try {
        // Update book status to traded
        await wixData.update("books", {
            _id: offer.bookId,
            status: "traded"
        });
        
        // Update offer status
        await updateOfferStatus(offer._id, "accepted");
        
    } catch (error) {
        wixWindow.openLightbox("ErrorLightbox", {
            message: `Error accepting offer: ${error.message}`
        });
    }
}

async function declineOffer(offer, rejectionReason) {
    try {
        await updateOfferStatus(offer._id, "declined", rejectionReason);
        
        // Notify the sender
        await wixData.insert("Notifications", {
            userId: offer.fromUserId,
            message: `Your offer for "${offer.bookTitle}" was declined. Reason: ${rejectionReason}`,
            timestamp: new Date(),
            read: false
        });
        
    } catch (error) {
        wixWindow.openLightbox("ErrorLightbox", {
            message: `Error declining offer: ${error.message}`
        });
    }
}

async function rejectOtherOffers(bookId) {
    try {
        // Get all pending offers for this book
        const offers = await wixData.query("TradeOffers")
            .eq("bookId", bookId)
            .eq("status", "pending")
            .find()
            .then(({ items }) => items);
        
        // Update all other offers
        const updatePromises = offers.map(offer => 
            updateOfferStatus(offer._id, "declined", "Book has been traded to someone else")
        );
        
        await Promise.all(updatePromises);
        
        // Notify all other offerers
        const notificationPromises = offers.map(offer => 
            wixData.insert("Notifications", {
                userId: offer.fromUserId,
                message: `The book "${offer.bookTitle}" has been traded to someone else`,
                timestamp: new Date(),
                read: false
            })
        );
        
        await Promise.all(notificationPromises);
        
    } catch (error) {
        console.error("Error rejecting other offers:", error);
    }
}

async function updateOfferStatus(offerId, status, rejectionReason = "") {
    try {
        const updateData = { status };
        if (rejectionReason) {
            updateData.rejectionReason = rejectionReason;
        }
        
        await wixData.update("TradeOffers", {
            _id: offerId,
            ...updateData
        });
        
    } catch (error) {
        throw new Error(`Failed to update offer status: ${error.message}`);
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}