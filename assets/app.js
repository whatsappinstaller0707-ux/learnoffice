/* ============================================================
   Office Basics — shared behavior & navigation
   Progress is stored client-side only (localStorage).
   ============================================================ */

const MANIFEST = {
  windows11: {
    title: "Windows 11",
    short: "Windows 11",
    page: "windows11.html",
    color: "windows",
    lessons: ["nav-taskbar", "multitasking", "file-explorer", "utilities"]
  },
  word: {
    title: "Microsoft Word",
    short: "Word",
    page: "word.html",
    color: "word",
    lessons: ["setup-layout", "typography", "styles-toc", "section-breaks", "track-changes"]
  },
  excel: {
    title: "Microsoft Excel",
    short: "Excel",
    page: "excel.html",
    color: "excel",
    lessons: ["grid-basics", "core-calc", "tables", "lookups", "pivot"]
  },
  powerpoint: {
    title: "Microsoft PowerPoint",
    short: "PowerPoint",
    page: "powerpoint.html",
    color: "powerpoint",
    lessons: ["masters-themes", "alignment-grouping", "charts-callouts", "morph-triggers"]
  }
};

const STORAGE_KEY = "ob_progress_v1";
const LAST_VISIT_KEY = "ob_last_visit_v1";

/* ---------- Progress LocalStorage Helpers ---------- */
function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch(e) { 
    return {}; 
  }
}

function saveProgress(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function setLessonDone(course, lessonId, done) {
  const data = loadProgress();
  if(!data[course]) data[course] = {};
  data[course][lessonId] = done;
  saveProgress(data);
}

function courseStats(course) {
  const manifest = MANIFEST[course];
  if(!manifest) return { done: 0, total: 0, pct: 0 };
  const data = loadProgress();
  const done = manifest.lessons.filter(id => data[course] && data[course][id]).length;
  const total = manifest.lessons.length;
  return { done, total, pct: total ? Math.round((done/total)*100) : 0 };
}

function overallStats() {
  let done = 0, total = 0;
  Object.keys(MANIFEST).forEach(course => {
    const s = courseStats(course);
    done += s.done; 
    total += s.total;
  });
  return { done, total, pct: total ? Math.round((done/total)*100) : 0 };
}

function rememberVisit(course) {
  localStorage.setItem(LAST_VISIT_KEY, course);
}

/* ---------- Lesson Checkboxes (Course Pages) ---------- */
function initLessonTracking(course) {
  document.querySelectorAll('[data-lesson]').forEach(el => {
    const lessonId = el.getAttribute("data-lesson");
    const checkbox = el.querySelector(".complete-toggle");
    const data = loadProgress();
    const isDone = !!(data[course] && data[course][lessonId]);
    
    if(checkbox) {
      checkbox.checked = isDone;
      if(isDone) el.classList.add("done");
      checkbox.addEventListener("click", (e) => e.stopPropagation());
      checkbox.addEventListener("change", () => {
        setLessonDone(course, lessonId, checkbox.checked);
        el.classList.toggle("done", checkbox.checked);
        renderCourseProgress(course);
        renderTaskbarProgress();
      });
    }
  });
  renderCourseProgress(course);
  rememberVisit(course);
}

function renderCourseProgress(course) {
  const stats = courseStats(course);
  document.querySelectorAll(`.course-progress-fill[data-course="${course}"]`).forEach(el => {
    el.style.width = stats.pct + "%";
  });
  document.querySelectorAll(`.course-progress-label[data-course="${course}"]`).forEach(el => {
    el.textContent = `${stats.done} of ${stats.total} lessons complete · ${stats.pct}%`;
  });
}

/* ---------- Home Page Tile Progress ---------- */
function renderAllTileProgress() {
  Object.keys(MANIFEST).forEach(course => {
    const stats = courseStats(course);
    document.querySelectorAll(`.tile-bar-fill[data-course="${course}"]`).forEach(el => {
      el.style.width = stats.pct + "%";
    });
    document.querySelectorAll(`.tile-pct[data-course="${course}"]`).forEach(el => {
      el.textContent = stats.pct + "%";
    });
  });
  
  const last = localStorage.getItem(LAST_VISIT_KEY);
  const strip = document.querySelector(".continue-strip");
  if(strip && last && MANIFEST[last]) {
    const stats = courseStats(last);
    if(stats.done > 0 && stats.done < stats.total) {
      strip.classList.add("show");
      const link = strip.querySelector("a");
      if(link) {
        link.textContent = `Continue ${MANIFEST[last].short} →`;
        link.href = MANIFEST[last].page;
      }
    }
  }
}

/* ---------- Taskbar Navigation ---------- */
function renderTaskbarProgress() {
  const stats = overallStats();
  document.querySelectorAll(".tb-progress").forEach(el => {
    el.style.setProperty("--p", stats.pct);
    const label = el.querySelector(".tb-pct-label");
    if(label) label.textContent = stats.pct + "%";
  });
}

function tickClock() {
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const date = now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  document.querySelectorAll(".tb-clock .time").forEach(el => el.textContent = time);
  document.querySelectorAll(".tb-clock .date").forEach(el => el.textContent = date);
}

function initTaskbar() {
  renderTaskbarProgress();
  tickClock();
  setInterval(tickClock, 15000);

  const startBtn = document.querySelector(".tb-start");
  const startMenu = document.querySelector(".start-menu");
  const scrim = document.querySelector(".tb-scrim");
  
  if(startBtn && startMenu) {
    startBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      startMenu.classList.toggle("open");
      scrim && scrim.classList.toggle("open", startMenu.classList.contains("open"));
      startBtn.classList.toggle("active", startMenu.classList.contains("open"));
    });
    
    document.addEventListener("click", (e) => {
      if(startMenu.classList.contains("open") && !startMenu.contains(e.target)) {
        startMenu.classList.remove("open");
        scrim && scrim.classList.remove("open");
        startBtn.classList.remove("active");
      }
    });
    
    document.addEventListener("keydown", (e) => {
      if(e.key === "Escape") {
        startMenu.classList.remove("open");
        scrim && scrim.classList.remove("open");
        startBtn.classList.remove("active");
      }
    });
  }

  // "Continue learning" line inside start menu
  const last = localStorage.getItem(LAST_VISIT_KEY);
  const contEl = document.querySelector(".sm-continue");
  if(contEl) {
    if(last && MANIFEST[last]) {
      const stats = courseStats(last);
      contEl.innerHTML = `Continuing <a href="${MANIFEST[last].page}">${MANIFEST[last].short} — ${stats.pct}% done</a>`;
    } else {
      contEl.innerHTML = `No course started yet — pick one above.`;
    }
  }
}

/* ---------- Fix-It How-To Filter/Search ---------- */
function initHowto() {
  const search = document.querySelector(".howto-search");
  const chips = document.querySelectorAll(".filter-chip");
  const cards = document.querySelectorAll(".fix-card");
  const noResults = document.querySelector(".no-results");
  let activeFilter = "all";

  function applyFilters() {
    const q = (search && search.value || "").trim().toLowerCase();
    let visible = 0;
    cards.forEach(card => {
      const cat = card.getAttribute("data-cat");
      const text = card.textContent.toLowerCase();
      const matchesCat = activeFilter === "all" || cat === activeFilter;
      const matchesQuery = !q || text.includes(q);
      const show = matchesCat && matchesQuery;
      card.classList.toggle("hidden", !show);
      if(show) visible++;
    });
    if(noResults) noResults.classList.toggle("show", visible === 0);
  }

  if(search) search.addEventListener("input", applyFilters);
  chips.forEach(chip => {
    chip.addEventListener("click", () => {
      chips.forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      activeFilter = chip.getAttribute("data-filter");
      applyFilters();
    });
  });
  applyFilters();
}

/* ---------- Mobile Menu & Responsive Navigation ---------- */
function toggleMobileMenu() {
  const toggleBtn = document.querySelector('.mobile-menu-toggle');
  const navMenu = document.querySelector('.ribbon-nav');
  
  if(toggleBtn && navMenu) {
    toggleBtn.classList.toggle('is-active');
    navMenu.classList.toggle('is-open');
  }
}

function initMobileNav() {
  const dropdowns = document.querySelectorAll('.ribbon-dropdown');
  const toggleBtn = document.querySelector('.mobile-menu-toggle');
  const navMenu = document.querySelector('.ribbon-nav');

  // Handle mobile accordion toggle clicks
  dropdowns.forEach(dropdown => {
    const trigger = dropdown.querySelector('.ribbon-item');
    if(!trigger) return;

    trigger.addEventListener('click', (e) => {
      if (window.innerWidth <= 768) {
        // First click opens sub-menu accordion; second click navigates
        if (!dropdown.classList.contains('is-expanded')) {
          e.preventDefault();
          dropdowns.forEach(d => d.classList.remove('is-expanded'));
          dropdown.classList.add('is-expanded');
        }
      }
    });
  });

  // Close mobile drawer when clicking outside header navigation
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768 && navMenu && navMenu.classList.contains('is-open')) {
      if (!navMenu.contains(e.target) && !toggleBtn.contains(e.target)) {
        navMenu.classList.remove('is-open');
        toggleBtn.classList.remove('is-active');
      }
    }
  });

  // Clear expanded mobile states if window resizes to desktop
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
      dropdowns.forEach(d => d.classList.remove('is-expanded'));
      if(navMenu) navMenu.classList.remove('is-open');
      if(toggleBtn) toggleBtn.classList.remove('is-active');
    }
  });
}

/* ---------- Unified DOM Content Loaded Initializer ---------- */
document.addEventListener("DOMContentLoaded", () => {
  initTaskbar();
  initMobileNav();

  if(document.body.dataset.page === "home") renderAllTileProgress();
  if(document.body.dataset.course) initLessonTracking(document.body.dataset.course);
  if(document.body.dataset.page === "howto") initHowto();
});