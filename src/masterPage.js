import { initDailyReset } from 'backend/public-api';

$w.onReady(() => {
    // Initialize cron job once
    const styleLink = document.createElement('link');
    styleLink.rel = 'stylesheet';
    styleLink.href = '/public/global-styles.css'; // Path to your CSS file
    document.head.appendChild(styleLink);
    
    initDailyReset();
    // In masterPage.js
async function updateNotificationBadge() {
    const unreadCount = await wixData.query("Notifications")
        .eq("userId", currentUser.id)
        .eq("read", false)
        .count()
        .then(({ totalCount }) => totalCount);
    
    $w('#notificationBadge').text = unreadCount > 0 ? unreadCount : "";
}
});
