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
let currentOpenNews = null;

// Top bar mein aaj ki live Hindi tarikh set karein
const liveDateEl = document.getElementById("live-date");
if (liveDateEl) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    liveDateEl.innerText = new Date().toLocaleDateString("hi-IN", options);
}

// Modal kholne ka function (Full news padhne ke liye)
function openNewsModal(news) {
    currentOpenNews = news;
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

// WhatsApp & Copy Link Share Buttons
document.getElementById("whatsappShareBtn").addEventListener("click", () => {
    if (!currentOpenNews) return;
    const text = `📰 *${currentOpenNews.headline}*\n\nपूरी खबर पढ़ें Bihar Har Pal News पर:\n${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
});

document.getElementById("copyLinkBtn").addEventListener("click", () => {
    navigator.clipboard.writeText(window.location.href);
    alert("✅ वेबसाइट लिंक कॉपी हो गया है!");
});

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
        ? `<img src="${news.imageUrl}" alt="${news.headline}" loading="lazy">`
        : `${news.category || "NEWS"}`;

    card.innerHTML = `
        <div class="card-image">${imageHtml}</div>
        <div class="card-body">
            <span class="card-meta-tag">📍 ${news.location ? news.location : news.category}</span>
            <h3>${news.headline}</h3>
            <p>${news.shortDescription || news.fullNews.substring(0, 95) + "..."}</p>
        </div>
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
                <p>${featuredNews.shortDescription || featuredNews.fullNews.substring(0, 150) + "..."}</p>
                <span class="date">📍 ${featuredNews.location || "बिहार"}  •  📅 ${featuredNews.date || ""}</span>
            </div>
        `;
        featuredMain.onclick = () => openNewsModal(featuredNews);

        // 3. Latest News Sidebar (Top 5 khabrein Thumbnail ke saath)
        const latestListEl = document.getElementById("latest-news-list");
        latestListEl.innerHTML = "";
        allPublishedNews.slice(0, 5).forEach(news => {
            const item = document.createElement("article");
            item.className = "latest-item";
            const thumbHtml = news.imageUrl
                ? `<img class="latest-thumb" src="${news.imageUrl}" alt="">`
                : `<div class="latest-thumb" style="display:flex;align-items:center;justify-content:center;font-weight:bold;color:#64748b;font-size:11px;">NEWS</div>`;

            item.innerHTML = `
                ${thumbHtml}
                <div class="latest-info">
                    <span>${news.category}</span>
                    <h3>${news.headline}</h3>
                    <small>📅 ${news.date || ""}</small>
                </div>
            `;
            item.addEventListener("click", () => openNewsModal(news));
            latestListEl.appendChild(item);
        });

        // 4. Category Grids bharna
        renderMultiCategoryGrid(["बिहार"], "bihar-news-grid", 4);
        renderMultiCategoryGrid(["भारत", "राजनीति", "बिजनेस"], "india-news-grid", 4);
        renderMultiCategoryGrid(["दुनिया", "खेल", "मनोरंजन", "टेक्नोलॉजी"], "world-news-grid", 4);

    } catch (error) {
        console.error("Error loading news:", error);
    }
}

function renderMultiCategoryGrid(categoriesArray, gridId, limitCount) {
    const grid = document.getElementById(gridId);
    if (!grid) return;

    const catNews = allPublishedNews.filter(n => categoriesArray.includes(n.category));
    grid.innerHTML = "";

    if (catNews.length === 0) {
        grid.innerHTML = `<p style="color:#64748b; padding:12px; background:#fff; border-radius:6px;">इस श्रेणी में अभी कोई खबर नहीं है।</p>`;
        return;
    }

    catNews.slice(0, limitCount).forEach(news => {
        grid.appendChild(createNewsCard(news));
    });
}

// Navbar & Sidebar Category Filter
document.querySelectorAll("#category-nav a, [data-cat-link]").forEach(link => {
    link.addEventListener("click", (e) => {
        e.preventDefault();
        const selectedCat = link.getAttribute("data-cat") || link.getAttribute("data-cat-link");

        // Active class highlight karein
        document.querySelectorAll("#category-nav a").forEach(a => a.classList.remove("active"));
        const matchingNav = document.querySelector(`#category-nav a[data-cat="${selectedCat}"]`);
        if (matchingNav) matchingNav.classList.add("active");

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
            grid.innerHTML = `<p style="padding:15px; color:#64748b; background:#fff; border-radius:6px;">${selectedCat} श्रेणी में अभी कोई खबर प्रकाशित नहीं हुई है।</p>`;
        } else {
            matched.forEach(news => grid.appendChild(createNewsCard(news)));
        }

        filteredSec.style.display = "block";
        filteredSec.scrollIntoView({ behavior: "smooth" });
    });
});

// Live Search Filter
const searchInput = document.getElementById("searchInput");
if (searchInput) {
    searchInput.addEventListener("input", (e) => {
        const term = e.target.value.trim().toLowerCase();
        const filteredSec = document.getElementById("filtered-section");
        if (!term) {
            filteredSec.style.display = "none";
            return;
        }

        const matched = allPublishedNews.filter(n =>
            (n.headline && n.headline.toLowerCase().includes(term)) ||
            (n.location && n.location.toLowerCase().includes(term)) ||
            (n.fullNews && n.fullNews.toLowerCase().includes(term))
        );

        document.getElementById("filtered-title").innerText = `"${e.target.value}" की खोज (${matched.length})`;
        const grid = document.getElementById("filtered-grid");
        grid.innerHTML = "";
        matched.forEach(news => grid.appendChild(createNewsCard(news)));
        filteredSec.style.display = "block";
    });
}

document.getElementById("reset-filter").addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("filtered-section").style.display = "none";
    document.querySelectorAll("#category-nav a").forEach(a => a.classList.remove("active"));
    document.querySelector('#category-nav a[data-cat="ALL"]').classList.add("active");
});

// Page load hote hi news fetch karein
loadNews();
