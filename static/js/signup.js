function validateForm() {
    const name = document.getElementById("name").value.trim();
    const password = document.getElementById("password").value;
    const photo = document.getElementById("photo").files[0];

    if (name.length < 3) {
        alert("Name must be at least 3 characters");
        return false;
    }

    if (password.length < 4) {
        alert("Password must be at least 4 characters");
        return false;
    }

    if (!photo) {
        alert("Please upload a photo");
        return false;
    }

    if (photo.size > 2 * 1024 * 1024) {
        alert("Photo must be less than 2MB");
        return false;
    }

    return true;
}
