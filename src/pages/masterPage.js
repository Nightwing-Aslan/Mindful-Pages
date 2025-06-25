// API Reference: https://www.wix.com/velo/reference/api-overview/introduction
// “Hello, World!” Example: https://learn-code.wix.com/en/article/hello-world
import { currentUser } from 'wix-users';
import wixLocation from 'wix-location'; 

$w.onReady(function () {

    // Use as a guard for all pages
    if (!currentUser.loggedIn) {
        wixLocation.to("/login");
        return;
    }
});
