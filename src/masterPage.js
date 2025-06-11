import { initDailyReset } from 'backend/public-api';

$w.onReady(() => {
    // Initialize cron job once
    const styleLink = document.createElement('link');
    styleLink.rel = 'stylesheet';
    styleLink.href = '/public/global-styles.css'; // Path to your CSS file
    document.head.appendChild(styleLink);
    
    initDailyReset();
});
