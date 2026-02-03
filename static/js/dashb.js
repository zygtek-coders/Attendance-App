// ---------- Demo-ready admin dashboard script ----------
// This dashboard expects backend endpoints:
// GET  /api/users            -> returns array of users
// DELETE /api/users/:id      -> delete user
// Optionally: WebSocket at /ws/users to push updates { type: 'update', payload: [...] }

const state = {
  users: [],
  filtered: [],
  selectedForDelete: new Set(),
};

// Utilities
const $ = (s) => document.querySelector(s);
const formatDate = (iso) => new Date(iso).toLocaleDateString();
const formatTime = (iso) => new Date(iso).toLocaleTimeString();

// ----------------- fetch users from backend -----------------
async function fetchUsers() {
  try {
    // declairing a variable and assign it to a function that fetch data from the backend
    const res = await fetch("/api/users");

    //checking the response
    if (!res.ok) throw new Error("Network response was not ok");
    const data = await res.json();
    state.users = data;
  } catch (err) {
    console.warn("Could not load /api/users — falling back to demo data", err);
    state.users = demoUsers();
  }
  state.filtered = [...state.users];
  updateStats();
  renderUsers();
  renderTable();
}



// ----------------- render table -----------------
 function renderTable(){
    const tbody = $('#usersTable');
    tbody.innerHTML='';
     if (state.filtered.length === 0) {
    tb.innerHTML =
      '<div class="muted">No users found. Try different filters.</div>';
    return;
  }
  state.filtered.forEach((u) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><img class="avatar" src="${u.photo || avatar(u.name)}"></td>
        <td>${u.name}</td>
        <td>${u.gender}</td>
        <td>${u.email}</td>
        <td>${u.address}</td>
        <td>${new Date(u.registered).toLocaleDateString()}</td>
        <td>${new Date(u.timeIn).toLocaleTimeString()}</td>
        <td>${new Date(u.timeOut).toLocaleTimeString()}</td>
        <td><button class="btn btn-delete" onclick="deleteUser('${u.id}')">Delete</button></td>
      `;
      tbody.appendChild(tr);
    });
  }





// ----------------- render -----------------
function renderUsers() {
  const grid = $("#usersGrid");
  grid.innerHTML = "";
  if (state.filtered.length === 0) {
    grid.innerHTML =
      '<div class="muted">No users found. Try different filters.</div>';
    return;
  }
  state.filtered.forEach((user) => {
    const card = document.createElement("article");
    card.className = "user-card";
    card.innerHTML = `
          <div class="avatar"><img src="${user.photo || placeholder(user.name)}" alt="photo"/></div>
          <div class="info">
            <h4>${user.name} <span class="muted" style="font-weight:500">• ${user.gender}</span></h4>
            <div class="meta">${user.email} · ${user.address}</div>
            <div class="meta">Registered: ${formatDate(user.registered)} · <span class="muted">${formatTime(user.timeIn)}</span> - <span class="muted">${formatTime(user.timeOut)}</span></div>
            <div class="actions">
              <button class="small ghost" onclick="viewUser('${user.id}')">View</button>
              <button class="small danger" onclick="confirmDelete('${user.id}','${escapeHtml(user.name)}')">Delete</button>
            </div>
          </div>
        `;
    grid.appendChild(card);
  });
}

function updateStats() {
  $("#totalUsers").textContent = state.users.length;
  const active = state.users.filter((u) => isActive(u)).length;
  $("#activeNow").textContent = active;
  const now = new Date();
  const month = state.users.filter(
    (u) => new Date(u.registered).getMonth() === now.getMonth(),
  ).length;
  $("#newMonth").textContent = month;
}

function isActive(u) {
  const now = Date.now();
  return (
    new Date(u.timeIn).getTime() <= now && new Date(u.timeOut).getTime() >= now
  );
}

// ----------------- filters -----------------
function applyFilters() {
  const q = $("#search").value.toLowerCase().trim();
  const gender = $("#genderFilter").value;
  const from = $("#fromDate").value;
  const to = $("#toDate").value;
  const sortBy = $("#sortBy").value;

  let list = [...state.users];
  if (q)
    list = list.filter((u) =>
      (u.name + u.email + u.address).toLowerCase().includes(q),
    );
  if (gender) list = list.filter((u) => u.gender === gender);
  if (from) list = list.filter((u) => new Date(u.registered) >= new Date(from));
  if (to) list = list.filter((u) => new Date(u.registered) <= new Date(to));

  if (sortBy === "newest")
    list.sort((a, b) => new Date(b.registered) - new Date(a.registered));
  if (sortBy === "oldest")
    list.sort((a, b) => new Date(a.registered) - new Date(b.registered));
  if (sortBy === "timein")
    list.sort((a, b) => new Date(a.timeIn) - new Date(b.timeIn));
  if (sortBy === "timeout")
    list.sort((a, b) => new Date(a.timeOut) - new Date(b.timeOut));

  state.filtered = list;
  renderUsers();
  renderTable();
}

// ----------------- actions -----------------
function confirmDelete(id, name) {
  openModal(
    `Delete user`,
    `Are you sure you want to delete <strong>${name}</strong>? This action cannot be undone.`,
    async () => {
      await deleteUser(id);
    },
  );
}

async function deleteUser(id) {
  try {
    const res = await fetch("/api/users/" + id, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete");
    // remove locally
    state.users = state.users.filter((u) => u.id !== id);
    state.filtered = state.filtered.filter((u) => u.id !== id);
    updateStats();
    renderUsers();
    renderTable();
  } catch (err) {
    console.warn("Delete failed, simulating removal", err);
    state.users = state.users.filter((u) => u.id !== id);
    state.filtered = state.filtered.filter((u) => u.id !== id);
    updateStats();
    renderUsers();
    renderTable();
  } finally {
    closeModal();
  }
}

function viewUser(id) {
  const u = state.users.find((x) => x.id === id);
  if (!u) return alert("User not found");
  openModal(
    `User: ${u.name}`,
    `Email: ${u.email}<br/>Address: ${u.address}<br/>Registered: ${formatDate(u.registered)}<br/>Time In: ${formatTime(u.timeIn)}<br/>Time Out: ${formatTime(u.timeOut)}`,
    () => {
      closeModal();
    },
  );
  document.getElementById("confirmAction").style.display = "none";
}

// ----------------- report -----------------
function generateReport() {
  // creates a CSV of currently filtered users
  const rows = [
    ["Name", "Gender", "Email", "Address", "Registered", "TimeIn", "TimeOut"],
  ];
  state.filtered.forEach((u) =>
    rows.push([
      u.name,
      u.gender,
      u.email,
      u.address,
      u.registered,
      u.timeIn,
      u.timeOut,
    ]),
  );
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `streamflow_report_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ----------------- modal helpers -----------------
function openModal(title, body, onConfirm) {
  $("#modalTitle").innerHTML = title;
  $("#modalBody").innerHTML = body;
  const modal = $("#modal");
  modal.style.display = "flex";
  const btn = $("#confirmAction");
  btn.style.display = "inline-block";
  btn.onclick = onConfirm;
}
function closeModal() {
  $("#modal").style.display = "none";
}

// ----------------- quick nav helpers -----------------
function viewAll() {
  state.filtered = [...state.users];
  renderUsers();
  renderTable();
}
function viewActive() {
  state.filtered = state.users.filter(isActive);
  renderUsers();
  renderTable();
}
function viewRecent() {
  const now = new Date();
  state.filtered = state.users.filter(
    (u) => new Date(u.registered) > new Date(now - 1000 * 60 * 60 * 24 * 30),
  );
  renderUsers();
  renderTable();
}
function viewByGender(g) {
  state.filtered = state.users.filter((u) => u.gender === g);
  renderUsers();
  renderTable();
}

// ----------------- theme -----------------
$("#themeToggle").addEventListener("change", (e) => {
  document.body.setAttribute("data-theme", e.target.checked ? "dark" : "light");
});
// ----------------- dashborad display  (displayToggle) -----------------
const chek = $("#displayToggle");
chek.addEventListener("change", () => {
  if (chek.checked){
    $("#usersGrid").style.display ="none" ;
    $("#table-view").style.display ="grid" ;
  }else{
    $("#usersGrid").style.display ="grid" ;
    $("#table-view").style.display ="none" ;
  }
  
});

// ----------------- realtime (optional) -----------------
function connectWS() {
  try {
    const wsProto = location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(wsProto + "//" + location.host + "/ws/users");
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "update") {
          state.users = msg.payload;
          state.filtered = [...state.users];
          updateStats();
          renderUsers();
          renderTable();
        }
        if (msg.type === "delta") {
          /* could apply patch */
        }
      } catch (err) {
        console.warn("ws parse", err);
      }
    };
    ws.onopen = () => console.log("ws connected");
    ws.onclose = () => setTimeout(connectWS, 5000);
  } catch (err) {
    console.info("ws not available", err);
  }
}

// ----------------- events -----------------
$("#apply").addEventListener("click", applyFilters);
$("#clear").addEventListener("click", () => {
  $("#search").value = "";
  $("#genderFilter").value = "";
  $("#fromDate").value = "";
  $("#toDate").value = "";
  $("#sortBy").value = "newest";
  state.filtered = [...state.users];
  renderUsers();
  renderTable();
});
$("#reportBtn").addEventListener("click", generateReport);
$("#refreshBtn").addEventListener("click", fetchUsers);
$("#quickSearch").addEventListener("input", (e) => {
  state.filtered = state.users.filter((u) =>
    u.name.toLowerCase().includes(e.target.value.toLowerCase()),
  );
  renderUsers();
  renderTable();
});

// ----------------- small helpers/demo data -----------------
function placeholder(name) {
  // generate avatar from initials via ui-avatars
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=EDEFF6&color=333&size=128`;
}

function escapeHtml(s) {
  return s.replace(/'/g, "\\'");
}

function demoUsers() {
  const now = Date.now();
  return [
    {
      id: "u_1",
      name: "Amina Kato",
      gender: "female",
      email: "amina.kato@example.com",
      address: "Kampala, Uganda",
      registered: new Date(now - 1000 * 60 * 60 * 24 * 20).toISOString(),
      timeIn: new Date(now - 1000 * 60 * 60).toISOString(),
      timeOut: new Date(now + 1000 * 60 * 60 * 3).toISOString(),
      photo: "",
    },
    {
      id: "u_2",
      name: "John Mwangi",
      gender: "male",
      email: "john.mwangi@example.com",
      address: "Nairobi, Kenya",
      registered: new Date(now - 1000 * 60 * 60 * 24 * 40).toISOString(),
      timeIn: new Date(now - 1000 * 60 * 60 * 4).toISOString(),
      timeOut: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
      photo: "",
    },
    {
      id: "u_3",
      name: "Sofia Martinez",
      gender: "female",
      email: "sofia@example.com",
      address: "Lagos, Nigeria",
      registered: new Date(now - 1000 * 60 * 60 * 24 * 4).toISOString(),
      timeIn: new Date(now - 1000 * 60 * 10).toISOString(),
      timeOut: new Date(now + 1000 * 60 * 60 * 2).toISOString(),
      photo: "",
    },
    {
      id: "u_4",
      name: "Lee Chang",
      gender: "other",
      email: "lee.chang@example.com",
      address: "Kigali, Rwanda",
      registered: new Date(now - 1000 * 60 * 60 * 24 * 70).toISOString(),
      timeIn: new Date(now - 1000 * 60 * 60 * 48).toISOString(),
      timeOut: new Date(now - 1000 * 60 * 60 * 24).toISOString(),
      photo: "",
    },
  ];
}
function avatar(name){return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2563eb&color=fff`;}


// ----------------- CSV download helper for older browsers -----------------
// Not required; modern browsers handle blob downloads.

// ----------------- init -----------------
(function init() {
  fetchUsers();
  connectWS();
})();
