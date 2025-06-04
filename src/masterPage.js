import { initDailyReset } from 'backend/public-api';

$w.onReady(() => {
    // Initialize cron job once
    initDailyReset();
});
