import { currentUser } from 'wix-users';
import wixData from 'wix-data';

$w.onReady(async () => {
    if (!currentUser.loggedIn) {
        wixLocation.to("/login");
        return;
    }
    
    // Load trade offers for current user
    const offers = await wixData.query("TradeOffers")
        .eq("toUserId", currentUser.id)
        .eq("status", "pending")
        .find()
        .then(({ items }) => items);
    
    // Display offers
    $w('#offersRepeater').data = offers;
});

$w('#offersRepeater').onItemReady(($item, offer) => {
    $item('#bookTitle').text = offer.bookTitle;
    $item('#offerMessage').text = offer.message;
    $item('#fromUserName').text = `From: ${offer.fromUserName}`;
    
    $item('#acceptButton').onClick(async () => {
        await wixData.update("TradeOffers", {
            _id: offer._id,
            status: "accepted"
        });
        $item.remove();
    });
    
    $item('#declineButton').onClick(async () => {
        await wixData.update("TradeOffers", {
            _id: offer._id,
            status: "declined"
        });
        $item.remove();
    });
});
