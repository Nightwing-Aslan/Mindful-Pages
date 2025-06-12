import { currentUser } from 'wix-users';
import wixData from 'wix-data';
import wixWindow from 'wix-window';
import wixLocation from 'wix-location';

$w.onReady(async () => {
    if (!currentUser.loggedIn) {
        wixLocation.to("/login");
        return;
    }
    
    await loadTradeOffers();
    
    $w('#refreshButton').onClick(async () => {
        $w('#loadingIndicator').show();
        await loadTradeOffers();
    });
});

async function loadTradeOffers() {
    try {
        // Get all offers for current user
        const offers = await wixData.query("TradeOffers")
            .eq("toUserId", currentUser.id)
            .descending("timestamp")
            .find()
            .then(({ items }) => items);
        
        // Update UI
        if (offers.length > 0) {
            $w('#offersRepeater').data = offers;
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
    // Set basic offer info
    $item('#fromUserName').text = `From: ${offer.fromUserName || "Another Trader"}`;
    $item('#timestamp').text = formatDate(offer.timestamp);
    $item('#offerMessage').text = offer.message;
    
    // Set book title only
    $item('#bookTitle').text = offer.bookTitle;
    
    // Set offer status
    $item('#offerStatus').text = offer.status === "pending" ? 
        "Pending your decision" : 
        `Offer ${offer.status}`;
    
    // Handle different offer states
    if (offer.status === "pending") {
        showPendingOffer($item, offer);
    } else if (offer.status === "declined") {
        showDeclinedOffer($item, offer);
    } else {
        showResolvedOffer($item, offer);
    }
});

function showPendingOffer($item, offer) {
    $item('#acceptButton').show();
    $item('#declineButton').show();
    $item('#rejectionControls').hide();
    $item('#counterRejectionControls').hide();
    $item('#finalStatus').hide();
    
    $item('#acceptButton').onClick(async () => {
        await updateOfferStatus(offer._id, "accepted");
        $item('#finalStatus').text("Offer Accepted").show();
        $item('#acceptButton').hide();
        $item('#declineButton').hide();
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
        
        await updateOfferStatus(offer._id, "declined", rejectionReason);
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
    
    // Show rejection reason if exists
    if (offer.rejectionReason) {
        $item('#rejectionReasonDisplay').text(offer.rejectionReason).show();
    }
    
    // Handle counter-rejection actions
    $item('#acceptRejection').onClick(async () => {
        await updateOfferStatus(offer._id, "rejection_accepted");
        $item('#finalStatus').text("Rejection Accepted").show();
        $item('#counterRejectionControls').hide();
    });
    
    $item('#counterRejection').onClick(() => {
        wixWindow.openLightbox("ContactUserLightbox", {
            userId: offer.fromUserId,
            message: `Regarding your offer for "${offer.bookTitle}": `
        });
    });
}

function showResolvedOffer($item, offer) {
    $item('#acceptButton').hide();
    $item('#declineButton').hide();
    $item('#rejectionControls').hide();
    $item('#counterRejectionControls').hide();
    $item('#finalStatus').show();
    
    $item('#finalStatus').text(
        offer.status === "accepted" ? "Offer Accepted" :
        offer.status === "rejection_accepted" ? "Rejection Accepted" :
        "Offer Resolved"
    );
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
        
        wixWindow.openLightbox("SuccessLightbox", {
            message: `Offer ${status.replace("_", " ")} successfully!`
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
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
