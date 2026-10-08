// Find the theme button by its CSS class; the dot means a class selector.
let theme_toggler = document.querySelector(".theme_toggler");

theme_toggler.addEventListener("click", function () {
  // Add dark_mode to the body if absent, or remove it if already present.
  document.body.classList.toggle("dark_mode");
  // Save the selected theme as a string so it survives page reloads.
  // website_theme is the storage key; dark_mode and default are its values.
  if (document.body.classList.contains("dark_mode")) {
    localStorage.setItem("website_theme", "dark_mode");
  } else {
    localStorage.setItem("website_theme", "default");
  }
});

// Restore the saved theme by applying its CSS class to the body.
function retrieve_theme() {
  var theme = localStorage.getItem("website_theme");
  // getItem returns null if no theme has been saved yet.
  if (theme != null) {
    // Remove the previous theme class before applying the saved one.
    document.body.classList.remove("default", "dark_mode");
    document.body.classList.add(theme);
  }
}

// Apply the saved theme immediately when this script runs.
retrieve_theme();

// Sync the theme when another tab on the same origin changes localStorage.
// The storage event does not fire in the tab that made the change.
window.addEventListener(
  "storage",
  function () {
    retrieve_theme();
  },
  false,
);
