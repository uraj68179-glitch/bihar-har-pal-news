import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, getDocs, doc, updateDoc, increment, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
let currentFontSize = 17.5;

// Live Hindi Date
const liveDateEl = document.getElementById("live-date");
if (liveDateEl) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    liveDateEl.innerText = new Date().toLocaleDateString("hi-IN", options);
}

// Dark Mode Toggle
const darkToggleBtn = document.getElementById("darkModeToggle");
if (localStorage.getItem("bhp_dark_mode") === "true") {
    document.body.classList.add("dark-mode");
    if (darkToggleBtn) darkToggleBtn.innerText = "☀️ लाइट मोड";
}

if (darkToggleBtn) {
    darkToggleBtn.addEventListener("click", () => {
        document.body.classList.toggle("dark-mode");
        const isDark = document.body.classList.contains("dark-mode");
        localStorage.setItem("bhp_dark_mode", isDark);
        darkToggleBtn.innerText = isDark ? "☀️ लाइट मोड" : "🌙 डार्क मोड";
    });
}

// Font Size Controls in Reader Modal
document.getElementById("fontIncreaseBtn").addEventListener("click", () => {
    if (currentFontSize < 24) {
        currentFontSize += 1.5;
        document.getElementById("modalFullNews").style.fontSize = currentFontSize + "px";
    }
});

document.getElementById("fontDecreaseBtn").addEventListener("click", () => {
    if (currentFontSize > 14) {
        currentFontSize -= 1.5;
        document.getElementById("modalFullNews").style.fontSize = currentFontSize + "px";
    }
});

// Live Ads Load Function
async function loadLiveAds() {
    try {
        const adsSnap = await getDocs(collection(db, "ads"));
        adsSnap.forEach((docSnap) => {
            const ad = docSnap.data();
            const slotEl = document.getElementById(ad.slotId);
            if (slotEl && ad.imageUrl) {
                slotEl.style.padding = "0";
                slotEl.style.border = "1px solid #cbd5e1";
                slotEl.style.background = "#fff";
                slotEl.innerHTML = `
                    <span class="ad-tag" style="background:rgba(0,0,0,0.6); color:#fff; padding:1px 5px; border-radius:2px;">विज्ञापन</span>
                    <img src="${ad.imageUrl}" alt="${ad.title || 'Advertisement'}" style="width:100%; height:100%; max-height:420px; object-fit:contain; display:block;">
                `;
            }
        });
    } catch (err) {
        console.error("Ads load error:", err);
    }
}

// Direct Share URL Helper (?news=ID)
function getDirectNewsUrl(newsId) {
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set("news", newsId);
    return url.toString();
}

// Full News Reader Modal + Live View Increment
async function openNewsModal(news) {
    currentOpenNews = news;
    const updatedViews = (news.views || 0) + 1;
    news.views = updatedViews;

    window.history.replaceState({}, "", `?news=${news.id}`);

    document.getElementById("modalCategory").innerText = news.category || "समाचार";
    document.getElementById("modalHeadline").innerText = news.headline;
    document.getElementById("modalMeta").innerText = `📍 ${news.location || "बिहार"}  |  📅 ${news.date || ""}  |  👁️ ${updatedViews} बार पढ़ा गया`;

    const modalImg = document.getElementById("modalImage");
    if (news.imageUrl) {
        modalImg.src = news.imageUrl;
        modalImg.style.display = "block";
    } else {
        modalImg.style.display = "none";
    }

    document.getElementById("modalFullNews").innerText = news.fullNews;
    document.getElementById("newsModal").style.display = "block";

    try {
        await updateDoc(doc(db, "news", news.id), {
            views: increment(1)
        });
    } catch (e) {
        console.warn("View count update skipped:", e.message);
    }
}

function closeNewsModal() {
    document.getElementById("newsModal").style.display = "none";
    window.history.replaceState({}, "", window.location.pathname);
}

document.getElementById("whatsappShareBtn").addEventListener("click", () => {
    if (!currentOpenNews) return;
    const directLink = getDirectNewsUrl(currentOpenNews.id);
    const text = `📰 *${currentOpenNews.headline}*\n\nपूरी खबर पढ़ें Bihar Har Pal News पर:\n${directLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
});

document.getElementById("copyLinkBtn").addEventListener("click", () => {
    if (!currentOpenNews) return;
    const directLink = getDirectNewsUrl(currentOpenNews.id);
    navigator.clipboard.writeText(directLink);
    alert("✅ इस खबर का डायरेक्ट लिंक कॉपी हो गया है!");
});

document.getElementById("closeModal").addEventListener("click", closeNewsModal);
window.addEventListener("click", (e) => {
    if (e.target.id === "newsModal") closeNewsModal();
});

function createNewsCard(news) {
    const card = document.createElement("article");
    card.className = "news-card";

    const imageHtml = news.imageUrl
        ? `<img src="${news.imageUrl}" alt="${news.headline}" loading="lazy">`
        : `${news.category || "NEWS"}`;

    card.innerHTML = `
        <div class="card-image">${imageHtml}</div>
        <div class="card-body">
            <div class="card-meta-row">
                <span class="card-meta-tag">📍 ${news.location ? news.location : news.category}</span>
                <span class="card-views">👁️ ${news.views || 0}</span>
            </div>
            <h3>${news.headline}</h3>
            <p>${news.shortDescription || news.fullNews.substring(0, 95) + "..."}</p>
        </div>
    `;

    card.addEventListener("click", () => openNewsModal(news));
    return card;
}

function renderTrendingSidebar() {
    const trendEl = document.getElementById("trending-news-list");
    if (!trendEl) return;

    const sortedByViews = [...allPublishedNews]
        .sort((a, b) => (b.views || 0) - (a.views || 0))
        .slice(0, 5);

    trendEl.innerHTML = "";
    sortedByViews.forEach((news, index) => {
        const div = document.createElement("div");
        div.className = "trending-item";
        div.innerHTML = `
            <span class="trend-rank">${index + 1}</span>
            <div>
                <h4>${news.headline}</h4>
                <small>📍 ${news.location || news.category} • 👁️ ${news.views || 0} views</small>
            </div>
        `;
        div.addEventListener("click", () => openNewsModal(news));
        trendEl.appendChild(div);
    });
}

async function loadNews() {
    try {
        const q = query(collection(db, "news"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);

        allPublishedNews = [];
        querySnapshot.forEach((docSnap) => {
            allPublishedNews.push({ id: docSnap.id, views: 0, ...docSnap.data() });
        });

        if (allPublishedNews.length
