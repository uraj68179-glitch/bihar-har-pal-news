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
let heroSlideIndex = 0;
let heroAutoTimer = null;

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

// Top News Left-to-Right Auto Slider
function initHeroSlider(slidesList) {
    const track = document.getElementById("featured-slider-track");
    const dotsContainer = document.getElementById("heroSliderDots");
    const prevBtn = document.getElementById("heroPrevBtn");
    const nextBtn = document.getElementById("heroNextBtn");
    if (!track || slidesList.length === 0) return;

    track.innerHTML = "";
    dotsContainer.innerHTML = "";

    slidesList.forEach((news, idx) => {
        const slide = document.createElement("article");
        slide.className = "main-news hero-slide";
        const imgHtml = news.imageUrl
            ? `<img src="${news.imageUrl}" alt="${news.headline}">`
            : `मुख्य खबर`;

        slide.innerHTML = `
            <div class="news-image">${imgHtml}</div>
            <div class="news-content">
                <span class="category">${news.category || "बिहार"}</span>
                <h2>${news.headline}</h2>
                <p>${news.shortDescription || news.fullNews.substring(0, 145) + "..."}</p>
                <span class="date">📍 ${news.location || "बिहार"}  •  📅 ${news.date || ""}  •  👁️ ${news.views || 0} बार पढ़ा गया</span>
            </div>
        `;
        slide.addEventListener("click", () => openNewsModal(news));
        track.appendChild(slide);

        const dot = document.createElement("button");
        dot.className = "slider-dot" + (idx === 0 ? " active" : "");
        dot.setAttribute("aria-label", `Slide ${idx + 1}`);
        dot.addEventListener("click", (e) => {
            e.stopPropagation();
            goToSlide(idx);
        });
        dotsContainer.appendChild(dot);
    });

    function goToSlide(index) {
        const total = slidesList.length;
        heroSlideIndex = (index + total) % total;
        track.style.transform = `translateX(-${heroSlideIndex * 100}%)`;
        dotsContainer.querySelectorAll(".slider-dot").forEach((d, i) => {
            d.classList.toggle("active", i === heroSlideIndex);
        });
    }

    function startAutoSlide() {
        clearInterval(heroAutoTimer);
        if (slidesList.length > 1) {
            heroAutoTimer = setInterval(() => goToSlide(heroSlideIndex + 1), 4000);
        }
    }

    prevBtn.onclick = (e) => {
        e.stopPropagation();
        goToSlide(heroSlideIndex - 1);
        startAutoSlide();
    };

    nextBtn.onclick = (e) => {
        e.stopPropagation();
        goToSlide(heroSlideIndex + 1);
        startAutoSlide();
    };

    const wrapper = track.parentElement;
    wrapper.addEventListener("mouseenter", () => clearInterval(heroAutoTimer));
    wrapper.addEventListener("mouseleave", startAutoSlide);

    startAutoSlide();
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

        if (allPublishedNews.length === 0) {
            document.getElementById("breaking-news-text").innerText = "अभी कोई खबर उपलब्ध नहीं है।";
            return;
        }

        // Slim Breaking News Headlines (Max 45 chars per headline)
        const breakingList = allPublishedNews.filter(n => n.breakingNews);
        const sourceBreaking = breakingList.length > 0 ? breakingList : allPublishedNews.slice(0, 3);
        const breakingText = sourceBreaking
            .map(n => n.headline.length > 45 ? n.headline.substring(0, 42) + "..." : n.headline)
            .join("   •   ");
        document.getElementById("breaking-news-text").innerText = breakingText;

        // Top 5 News Slider (Featured first, then latest)
        const featuredPriority = allPublishedNews.filter(n => n.featuredNews);
        const otherNews = allPublishedNews.filter(n => !n.featuredNews);
        const topSlides = [...featuredPriority, ...otherNews].slice(0, 5);
        initHeroSlider(topSlides);

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
                    <small>📅 ${news.date || ""} • 👁️ ${news.views || 0}</small>
                </div>
            `;
            item.addEventListener("click", () => openNewsModal(news));
            latestListEl.appendChild(item);
        });

        renderMultiCategoryGrid(["बिहार"], "bihar-news-grid", 4);
        renderMultiCategoryGrid(["भारत", "राजनीति", "बिजनेस"], "india-news-grid", 4);
        renderMultiCategoryGrid(["दुनिया", "खेल", "मनोरंजन", "टेक्नोलॉजी"], "world-news-grid", 4);
        renderTrendingSidebar();

        const urlParams = new URLSearchParams(window.location.search);
        const sharedNewsId = urlParams.get("news");
        if (sharedNewsId) {
            const targetNews = allPublishedNews.find(n => n.id === sharedNewsId);
            if (targetNews) openNewsModal(targetNews);
        }

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
        grid.innerHTML = `<p style="color:#64748b; padding:12px; background:var(--card-bg); border-radius:6px;">इस श्रेणी में अभी कोई खबर नहीं है।</p>`;
        return;
    }

    catNews.slice(0, limitCount).forEach(news => {
        grid.appendChild(createNewsCard(news));
    });
}

// Category Filter
document.querySelectorAll("#category-nav a, [data-cat-link]").forEach(link => {
    link.addEventListener("click", (e) => {
        e.preventDefault();
        const selectedCat = link.getAttribute("data-cat") || link.getAttribute("data-cat-link");

        document.querySelectorAll("#category-nav a").forEach(a => a.classList.remove("active"));
        document.querySelectorAll("#district-filter-bar button").forEach(b => b.classList.remove("active"));
        if (activeDistrictBadge) activeDistrictBadge.style.display = "none";
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
            grid.innerHTML = `<p style="padding:15px; color:#64748b; background:var(--card-bg); border-radius:6px;">${selectedCat} श्रेणी में अभी कोई खबर प्रकाशित नहीं हुई है।</p>`;
        } else {
            matched.forEach(news => grid.appendChild(createNewsCard(news)));
        }

        filteredSec.style.display = "block";
        filteredSec.scrollIntoView({ behavior: "smooth" });
    });
});

// Bihar 38 Districts Collapsible Toggle & Filter
const districtToggleBtn = document.getElementById("districtToggleBtn");
const districtDropdownPanel = document.getElementById("districtDropdownPanel");
const districtArrow = document.getElementById("districtArrow");
const activeDistrictBadge = document.getElementById("activeDistrictBadge");

if (districtToggleBtn && districtDropdownPanel) {
    districtToggleBtn.addEventListener("click", () => {
        const isOpen = districtDropdownPanel.classList.toggle("open");
        districtToggleBtn.classList.toggle("open", isOpen);
        if (districtArrow) districtArrow.innerText = isOpen ? "▴" : "▾";
    });
}

document.querySelectorAll("#district-filter-bar button").forEach(btn => {
    btn.addEventListener("click", () => {
        const district = btn.getAttribute("data-dist");
        document.querySelectorAll("#district-filter-bar button").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        if (districtDropdownPanel) districtDropdownPanel.classList.remove("open");
        if (districtToggleBtn) districtToggleBtn.classList.remove("open");
        if (districtArrow) districtArrow.innerText = "▾";
        if (activeDistrictBadge) {
            activeDistrictBadge.style.display = "inline-block";
            activeDistrictBadge.innerText = `चयनित जिला: ${district}`;
        }

        const matched = allPublishedNews.filter(n =>
            (n.location && n.location.includes(district)) ||
            (n.headline && n.headline.includes(district)) ||
            (n.fullNews && n.fullNews.includes(district))
        );

        const filteredSec = document.getElementById("filtered-section");
        document.getElementById("filtered-title").innerText = `📍 ${district} की खबरें (${matched.length})`;
        const grid = document.getElementById("filtered-grid");
        grid.innerHTML = "";

        if (matched.length === 0) {
            grid.innerHTML = `<p style="padding:15px; color:#64748b; background:var(--card-bg); border-radius:6px;">${district} की अभी कोई खबर प्रकाशित नहीं हुई है।</p>`;
        } else {
            matched.forEach(news => grid.appendChild(createNewsCard(news)));
        }

        filteredSec.style.display = "block";
        filteredSec.scrollIntoView({ behavior: "smooth" });
    });
});

// Toggle Search Icon Dropdown
const searchToggleBtn = document.getElementById("searchToggleBtn");
const searchDropdown = document.getElementById("searchDropdown");
const closeSearchBtn = document.getElementById("closeSearchBtn");

if (searchToggleBtn && searchDropdown) {
    searchToggleBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        searchDropdown.classList.toggle("open");
        if (searchDropdown.classList.contains("open")) {
            document.getElementById("searchInput").focus();
        }
    });

    closeSearchBtn.addEventListener("click", () => {
        searchDropdown.classList.remove("open");
        document.getElementById("searchInput").value = "";
        document.getElementById("filtered-section").style.display = "none";
    });

    document.addEventListener("click", (e) => {
        if (!searchDropdown.contains(e.target) && !searchToggleBtn.contains(e.target)) {
            searchDropdown.classList.remove("open");
        }
    });
}

// Live Search
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
    if (activeDistrictBadge) activeDistrictBadge.style.display = "none";
    document.querySelectorAll("#category-nav a").forEach(a => a.classList.remove("active"));
    document.querySelectorAll("#district-filter-bar button").forEach(b => b.classList.remove("active"));
    document.querySelector('#category-nav a[data-cat="ALL"]').classList.add("active");
});

loadNews();
loadLiveAds();
