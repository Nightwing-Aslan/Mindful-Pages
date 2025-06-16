import { currentUser } from 'wix-users';
import wixData from 'wix-data';
import wixLocation from 'wix-location';
import wixWindow from 'wix-window';

$w.onReady(() => {
    if (!currentUser.loggedIn) {
        wixLocation.to("/login");
        return;
    }
    
    // Setup library type options
    const libraryTypes = [
        "Bookstore", 
        "Public Library", 
        "Private Library", 
        "Small Business", 
        "Corporation"
    ];
    
    renderTypeOptions(libraryTypes);
    
    // Setup form submission
    $w('#createLibrary').onClick(createLibrary);
});

function renderTypeOptions(types) {
    const $container = $w('#typeContainer');
    $container.innerHTML = "";
    
    types.forEach(type => {
        const option = document.createElement("div");
        option.className = "type-option";
        option.textContent = type;
        option.onclick = () => {
            // Toggle selection
            document.querySelectorAll('.type-option').forEach(el => 
                el.classList.remove('selected'));
            option.classList.add('selected');
            $w('#libraryType').value = type;
        };
        $container.appendChild(option);
    });
}

async function createLibrary() {
    // Get form values
    const name = $w('#libraryName').value;
    const description = $w('#libraryDescription').value;
    const address = $w('#libraryAddress').value;
    const city = $w('#libraryCity').value;
    const type = $w('#libraryType').value;
    
    // Validation
    if (!name || !address || !city || !type) {
        wixWindow.openLightbox("ErrorLightbox", {
            message: "Please fill all required fields"
        });
        return;
    }
    
    try {
        // Create library
        await wixData.insert("libraries", {
            name,
            description,
            address,
            city,
            type,
            ownerUserId: currentUser.id,
            createdAt: new Date(),
            ratingCount: 0,
            averageRating: 0
        });
        
        // Success
        wixWindow.openLightbox("SuccessLightbox", {
            message: "Library created successfully!",
            redirectUrl: "/libraries"
        });
        
    } catch (error) {
        wixWindow.openLightbox("ErrorLightbox", {
            message: "Error creating library: " + error.message
        });
    }
}
