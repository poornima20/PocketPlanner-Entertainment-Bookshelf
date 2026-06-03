const STORAGE_KEY = "fullmoon.pocketplanner.bookshelf";
let activeFlipId = null;
let editingBookId = null;

const savedBooks =
  JSON.parse(
    localStorage.getItem(STORAGE_KEY)
  );

let books =
  savedBooks?.data || [];

// 🔹 SAVE
function saveBooks() {

  localStorage.setItem(

    STORAGE_KEY,

    JSON.stringify({

      data: books,

      updatedAt: Date.now()

    })

  );

  notifyDashboardSync();

}

function notifyDashboardSync() {

  if (window.parent !== window) {

    window.parent.postMessage(
      {
        type: "plannerChanged",
        planner: STORAGE_KEY
      },
      "*"
    );

  }

}

// 🔹 ICON INIT (FIXES LUCIDE BREAK)
function initIcons() {
  if (window.lucide) lucide.createIcons();
}

// Delete BOOK
document.getElementById("deleteBookBtn").onclick = () => {
  if (!editingBookId) return;

  // optional confirmation
  const confirmDelete = confirm("Delete this book?");
  if (!confirmDelete) return;

  books = books.filter(b => b.id != editingBookId);

  editingBookId = null;

  saveBooks();
  renderBooks();

  document.getElementById("addBookModal").classList.add("hidden");
};

const shelf = document.getElementById("shelf");

// 🔹 MAIN RENDER
function renderBooks(filter = "all") {
  shelf.innerHTML = "";

  let filtered = books.filter(
    b => filter === "all" || b.status === filter
  );

  filtered = [{ type: "add" }, ...filtered];

  filtered.forEach(book => {
    shelf.appendChild(createBookElement(book));
  });

  requestAnimationFrame(() => {
    initIcons();
  });
}

// 🔹 RESPONSIVE ITEMS
function getItemsPerPage() {
  const shelfWidth = shelf.clientWidth;

  const bookWidth = 130;
  const gap = 18;

  const cols = Math.floor((shelfWidth + gap) / (bookWidth + gap));
  return Math.max(cols * 3, 1);
}

// 🔹 DYNAMIC CENTER UI
function getDynamicContent(book) {
  if (book.status === "toread") {
    return `
      <div class="empty-state">
        <i data-lucide="book"></i>
        <div>Start reading</div>
      </div>
    `;
  }

  if (book.status === "reading") {
    const progress = Math.floor((book.currentPage / book.totalPages) * 100);

    return `
      <div class="reading-ui">
        <div class="progress-top">
          <div class="pages">
            <i data-lucide="book-open"></i>
            ${book.currentPage} / ${book.totalPages}
          </div>
          <span class="percent">${progress}%</span>
        </div>

        <input type="range"
        min="0"
        max="${book.totalPages}"
        value="${book.currentPage}"
        data-id="${book.id}"
        class="progress-slider"
        style="--progress:${progress}%;" />
      </div>
    `;
  }

  if (book.status === "finished") {
    return `
      <div class="stars" data-id="${book.id}">
        ${[1,2,3,4,5].map(i => `
          <span class="star ${(book.rating || 0) >= i ? "active" : ""}" data-value="${i}">★</span>
        `).join("")}
      </div>
    `;
  }
}

// 🔹 STATUS BUTTON
function getStatusButton(book) {
  if (book.status === "toread") {
    return `
      <button class="status-btn blue" data-id="${book.id}">
        <i data-lucide="bookmark"></i>
        <span>To Read</span>
      </button>
    `;
  }

  if (book.status === "reading") {
    return `
      <button class="status-btn gold" data-id="${book.id}">
        <i data-lucide="book-open"></i>
        <span>Reading</span>
      </button>
    `;
  }

  if (book.status === "finished") {
    return `
      <button class="status-btn green" data-id="${book.id}">
        <i data-lucide="check-circle"></i>
        <span>Finished</span>
      </button>
    `;
  }
}

// 🔹 CREATE CARD
function createBookElement(book) {
  if (book.type === "add") {
    const addDiv = document.createElement("div");
    addDiv.className = "book add-book";

    addDiv.innerHTML = `
      <div class="add-inner">
        <span>+</span>
        <p>Add Book</p>
      </div>
    `;

addDiv.onclick = () => {
  editingBookId = null;

  // 🔥 CLEAR FORM PROPERLY
  document.getElementById("titleInput").value = "";
  document.getElementById("authorInput").value = "";
  document.getElementById("pagesInput").value = "";
  document.getElementById("coverInput").value = "";

  // 🔥 HIDE DELETE BUTTON (not editing anymore)
  document.getElementById("deleteBookBtn").classList.add("hidden");

  document.getElementById("addBookModal").classList.remove("hidden");
};

    return addDiv;
  }

  const div = document.createElement("div");
  div.className = "book";

  div.innerHTML = `
    <div class="inner">
      
      <div class="front">
        <img src="${book.cover}" class="cover-img"/>
      </div>

      <div class="back">
          <button class="flip-back">
            <i data-lucide="undo-2"></i>
          </button>

          <button class="edit-book" data-id="${book.id}">
            <i data-lucide="square-pen"></i>
          </button>
        

        <div class="back-top">
          <div class="title">${book.title}</div>
          <div class="author">${book.author}</div>
        </div>

        <div class="back-center">
          ${getDynamicContent(book)}
        </div>

        <div class="back-bottom">
          ${getStatusButton(book)}
        </div>
      </div>

    </div>
  `;

  if (book.id === activeFlipId) div.classList.add("flip");

  div.querySelector(".cover-img").onclick = () => {
    div.classList.add("flip");
    activeFlipId = book.id;
  };

  div.querySelector(".flip-back").onclick = (e) => {
    e.stopPropagation();
    div.classList.remove("flip");
    activeFlipId = null;
  };

  return div;
}

// 🔹 ADD BOOK
document.getElementById("saveBookBtn").onclick = () => {
  const title = document.getElementById("titleInput").value.trim();
const author = document.getElementById("authorInput").value.trim();
const totalPages = parseInt(document.getElementById("pagesInput").value);
const cover = document.getElementById("coverInput").value.trim();

// 🚫 VALIDATION
if (!title || !author || !totalPages || !cover) {
  alert("Please fill all fields properly");
  return;
}

  if (editingBookId) {
    // ✏️ UPDATE
    const book = books.find(b => b.id == editingBookId);

    if (book) {
      book.title = title;
      book.author = author;
      book.totalPages = totalPages;
      book.cover = cover;
    }

    editingBookId = null;
    document.getElementById("deleteBookBtn").classList.add("hidden");

  } else {
    // ➕ ADD
    books.push({
      id: Date.now(),
      title,
      author,
      totalPages,
      currentPage: 0,
      status: "toread",
      rating: null,
      cover
    });
  }

  saveBooks();
  renderBooks();

  document.getElementById("addBookModal").classList.add("hidden");

  // ✅ CLEAR HERE ONLY
  document.getElementById("titleInput").value = "";
  document.getElementById("authorInput").value = "";
  document.getElementById("pagesInput").value = "";
  document.getElementById("coverInput").value = "";
};

// 🔹 PAGINATION
function setupPagination(totalPages) {
  let currentPage = 0;

  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const indicator = document.getElementById("pageIndicator");

  function update() {
    indicator.textContent = `${currentPage + 1} / ${totalPages}`;
  }

  function goTo(index) {
    currentPage = index;

    const pageWidth = shelf.querySelector(".page").offsetWidth;

    shelf.scrollTo({
      left: index * pageWidth,
      behavior: "smooth"
    });

    update();
  }

  prevBtn.onclick = () => currentPage > 0 && goTo(currentPage - 1);
  nextBtn.onclick = () => currentPage < totalPages - 1 && goTo(currentPage + 1);

  shelf.onscroll = () => {
    const pageWidth = shelf.querySelector(".page").offsetWidth;
    const index = Math.floor((shelf.scrollLeft + pageWidth / 2) / pageWidth);

    if (index !== currentPage) {
      currentPage = index;
      update();
    }
  };

  update();
}

// 🔹 GLOBAL EVENTS
document.addEventListener("click", (e) => {

  // ✏️ EDIT BOOK
const editBtn = e.target.closest(".edit-book");
if (editBtn) {
  const id = editBtn.dataset.id;
  const book = books.find(b => b.id == id);

  if (!book) return;

  editingBookId = id;
  document.getElementById("deleteBookBtn").classList.remove("hidden");

  // prefill modal
  document.getElementById("titleInput").value = book.title;
  document.getElementById("authorInput").value = book.author;
  document.getElementById("pagesInput").value = book.totalPages;
  document.getElementById("coverInput").value = book.cover;

  document.getElementById("addBookModal").classList.remove("hidden");
  

}

  // STATUS TOGGLE
  const statusBtn = e.target.closest(".status-btn");
  if (statusBtn) {
    const id = statusBtn.dataset.id;
    const book = books.find(b => b.id == id);

    if (!book) return;

    if (book.status === "toread") book.status = "reading";
    else if (book.status === "reading") book.status = "finished";
    else {
      book.status = "toread";
      book.rating = null;
      book.currentPage = 0;
    }

    saveBooks();
    renderBooks();
  }

  // STAR RATING
  const star = e.target.closest(".star");
  if (star) {
    const id = star.closest(".stars").dataset.id;
    const value = parseInt(star.dataset.value);

    const book = books.find(b => b.id == id);
    if (!book) return;

    book.rating = value;

    saveBooks();
    renderBooks();
  }
});

// 🔹 SLIDER
document.addEventListener("input", (e) => {
  if (!e.target.classList.contains("progress-slider")) return;

  const id = e.target.dataset.id;
  const book = books.find(b => b.id == id);

  const value = parseInt(e.target.value);
  book.currentPage = value;

  const percent = (value / book.totalPages) * 100;

  // ✅ Update slider fill
  e.target.style.setProperty("--progress", percent + "%");

  // ✅ Update % text LIVE (no render)
  const card = e.target.closest(".back");
  const percentEl = card.querySelector(".percent");
  const pagesEl = card.querySelector(".pages");

  if (percentEl) percentEl.textContent = Math.floor(percent) + "%";
  if (pagesEl) pagesEl.innerHTML = `
    <i data-lucide="book-open"></i> ${value} / ${book.totalPages}
  `;

  // 🔥 Refresh ONLY icons inside this card
  initIcons();

  saveBooks();
});

document.addEventListener("change", (e) => {
  if (!e.target.classList.contains("progress-slider")) return;

  saveBooks(); // save only when user stops dragging
});

// 🔹 FILTER
document.querySelectorAll(".segmented-control button").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".segmented-control button")
      .forEach(b => b.classList.remove("active"));

    btn.classList.add("active");
    renderBooks(btn.dataset.filter);
  };
});

// 🔹 RESIZE
window.addEventListener("resize", () => {
  const active = document.querySelector(".segmented-control .active");
  renderBooks(active ? active.dataset.filter : "all");
});

// 🔹 MODAL CLOSE
document.getElementById("closeModal").onclick = () => {
  document.getElementById("addBookModal").classList.add("hidden");
};

document.getElementById("addBookModal").onclick = (e) => {
  if (e.target.id === "addBookModal") {
    e.currentTarget.classList.add("hidden");
  }
};

// 🔹 INIT
renderBooks();