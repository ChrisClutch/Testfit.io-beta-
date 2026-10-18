if (new URLSearchParams(location.search).has("legacy")) import("./main.js");
else import("./studio.js");
