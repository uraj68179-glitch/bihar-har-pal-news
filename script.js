import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Aapka Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyAcZtid0O23fr5J1AySK6ptZfPveITMReU",
    authDomain: "bihar-har-pal-news-52a25.firebaseapp.com",
    projectId: "bihar-har-pal-news-52a25",
    storageBucket: "bihar-har-pal-news-52a25.firebasestorage.app",
    messagingSenderId: "25215359679",
    appId: "1:25215359679:web:3c069cb8d7cdaa2e32040a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let allPublishedNews = [];

// Top bar mein aaj ki live Hindi tarikh set karein
const liveDateEl = document.getElementById("live-date");
if (liveDateEl) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    liveDateEl.innerText = new Date().toLocaleDateString("hi-IN", options);
}

// Modal kholne ka function (Full news padhne ke liye)
function openNewsModal(news) {
    document.getElementById("modalCategory").innerText = news.category || "समाचार";
    document.getElementById("modalHeadline").innerText = news.headline;
    document.getElementById("modalMeta").innerText = `📍 ${news.location || "बिहार"}  |  📅 ${news.date || ""}`;

    const modalImg = document.getElementById("modalImage");
    if (news.imageUrl) {
        modalImg.src = news.imageUrl;
        modalImg.style.display = "block";
    } else {
        modalImg.style.display = "none";
    }

    document.getElementById("modalFullNews").innerText = news.fullNews;
    document.getElementById("newsModal").style.display = "block";
}

// Modal band karne ke events
document.getElementById("closeModal").addEventListener("click", () => {
    document.getElementById("newsModal").style.display = "none";
});
window.addEventListener("click", (e) => {
    if (e.target.id === "newsModal") {
        document.getElementById("newsModal").style.display = "none";
    }
});

// Ek News Card HTML banane ka helper function
function createNewsCard(news) {
    const card = document.createElement("article");
    card.className = "news-card";

    const imageHtml = news.imageUrl
        ? `<img src="${news.imageUrl}" alt="${news.headline}">`
        : `${news.category || "NEWS"}`;

    card.innerHTML = `
        <div class="card-image">${imageHtml}</div>
        <span>${news.location ? news.location : news.category}</span>
        <h3>${news.headline}</h3>
        <p>${news.shortDescription || news.fullNews.substring(0, 90) + "..."}</p>
    `;

    card.addEventListener("click", () => openNewsModal(news));
    return card;
}

// Firestore se saari news load karein
async function loadNews() {
    try {
        const q = query(collection(db, "news"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);

        allPublishedNews = [];
        querySnapshot.forEach((doc) => {
            allPublishedNews.push({ id: doc.id, ...doc.data() });
        });

        if (allPublishedNews.length === 0) {
            document.getElementById("breaking-news-text").innerText = "अभी कोई खबर उपलब्ध नहीं है।";
            return;
        }

        // 1. Breaking News set karein
        const breakingList = allPublishedNews.filter(n => n.breakingNews);
        const breakingText = breakingList.length > 0
            ? breakingList.map(n => n.headline).join("   🔴   ")
            : allPublishedNews[0].headline;
        document.getElementById("breaking-news-text").innerText = breakingText;

        // 2. Main Featured News set karein
        const featuredNews = allPublishedNews.find(n => n.featuredNews) || allPublishedNews[0];
        const featuredMain = document.getElementById("featured-main");
        const featImgHtml = featuredNews.imageUrl
            ? `<img src="${featuredNews.imageUrl}" alt="${featuredNews.headline}">`
            : `मुख्य खबर`;

        featuredMain.innerHTML = `
            <div class="news-image">${featImgHtml}</div>
            <div class="news-content">
                <span class="category">${featuredNews.category || "बिहार"}</span>
                <h2>${featuredNews.headline}</h2>
                <p>${featuredNews.shortDescription || featuredNews.fullNews.substring(0, 140) + "..."}</p>
                <span class="date">📍 ${featuredNews.location || "बिहार"} | 📅 ${featuredNews.date || ""}</span>
            </div>
        `;
        featuredMain.onclick = () => openNewsModal(featuredNews);

        // 3. Latest News Sidebar (Top 5 khabrein)
        const latestListEl = document.getElementById("latest-news-list");
        latestListEl.innerHTML = "";
        allPublishedNews.slice(0, 5).forEach(news => {
            const item = document.createElement("article");
            item.className = "latest-item";
            item.innerHTML = `
                <span>${news.category}</span>
                <h3>${news.headline}</h3>
                <small>📅 ${news.date || ""}</small>
            `;
            item.addEventListener("click", () => openNewsModal(news));
            latestListEl.appendChild(item);
        });

        // 4. Category Grids bharna (बिहार, भारत, दुनिया)
        renderCategoryGrid("बिहार", "bihar-news-grid");
        renderCategoryGrid("भारत", "india-news-grid");
        renderCategoryGrid("दुनिया", "world-news-grid");

    } catch (error) {
        console.error("Error loading news:", error);
    }
}

function renderCategoryGrid(categoryName, gridId) {
    const grid = document.getElementById(gridId);
    if (!grid) return;

    const catNews = allPublishedNews.filter(n => n.category === categoryName);
    grid.innerHTML = "";

    if (catNews.length === 0) {
        grid.innerHTML = `<p style="color:#777; padding:10px;">इस श्रेणी में अभी कोई खबर नहीं है।</p>`;
        return;
    }

    catNews.slice(0, 3).forEach(news => {
        grid.appendChild(createNewsCard(news));
    });
}

// Navbar Category Filter
document.querySelectorAll("#category-nav a, [data-cat-link]").forEach(link => {
    link.addEventListener("click", (e) => {
        e.preventDefault();
        const selectedCat = link.getAttribute("data-cat") || link.getAttribute("data-cat-link");

        const filteredSec = document.getElementById("filtered-section");
        if (selectedCat === "ALL") {
            filteredSec.style.display = "none";
            return;
        }

        const matched = allPublishedNews.filter(n => n.category === selectedCat);
        document.getElementById("filtered-title").innerText = `${selectedCat} की खबरें (${matched.length})`;
        const grid = document.getElementById("filtered-grid");
        grid.innerHTML = "";

        if (matched.length === 0) {
            grid.innerHTML = `<p style="padding:15px; color:#666;">${selectedCat} श्रेणी में अभी कोई खबर प्रकाशित नहीं हुई है।</p>`;
        } else {
            matched.forEach(news => grid.appendChild(createNewsCard(news)));
        }

        filteredSec.style.display = "block";
        filteredSec.scrollIntoView({ behavior: "smooth" });
    });
});

document.getElementById("reset-filter").addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("filtered-section").style.display = "none";
});

// Page load hote hi news fetch karein
loadNews();