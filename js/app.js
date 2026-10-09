/* =====================================================
   TRIPLAN APP.JS
   ===================================================== */


/* =====================================================
   CONFIGURATION
   ===================================================== */

const TEST_ACCOUNT = {
  email: "admin@triplan.com",
  password: "admin@triplan",
  name: "Admin"
};

const SESSION_KEY = "triplan_session";
const USERS_KEY = "triplan_users";
const TRIPS_KEY_PREFIX = "triplan_trips";

const PROTECTED_PAGES = ["trips", "trip", "create-trip", "profile"];
const WORKSPACE_SECTIONS = ["overview", "plan", "activities", "budget", "insights"];
const REDIRECT_PATTERN = /^(trips|trip|create-trip|profile)\.html(\?[A-Za-z0-9=&_.%-]*)?$/;

const PAGE_BY_FILE = {
  "index.html": "home",
  "login.html": "login",
  "profile.html": "profile",
  "create-trip.html": "create-trip",
  "trips.html": "trips",
  "trip.html": "trip"
};

// Tracks which events are already bound to an element, so nothing is bound twice
const boundEvents = new WeakMap();

let currentTrip = null;


/* =====================================================
   GENERIC HELPERS
   ===================================================== */

function $(id) {
  return document.getElementById(id);
}

function setText(id, value) {
  const element = $(id);

  if (element) {
    element.textContent = value;
  }
}

function setDisplay(element, show) {
  if (element) {
    element.style.display = show ? "" : "none";
  }
}

function bindOnce(element, eventName, handler) {
  if (!element) {
    return;
  }

  const events = boundEvents.get(element) || new Set();

  if (events.has(eventName)) {
    return;
  }

  events.add(eventName);
  boundEvents.set(element, events);
  element.addEventListener(eventName, handler);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatCurrency(amount) {
  const value = Number(amount);

  if (!Number.isFinite(value)) {
    return "₹0";
  }

  return `₹${value.toLocaleString("en-IN")}`;
}

function formatTripDate(dateString) {
  if (!dateString) {
    return "";
  }

  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

function getCurrentFileName() {
  return window.location.pathname.split("/").pop() || "index.html";
}

function getCurrentPage() {
  return PAGE_BY_FILE[getCurrentFileName()] || "unknown";
}

function getUrlParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}


/* =====================================================
   VALIDATION HELPERS
   ===================================================== */

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

// Strict: 8+ characters, 1 uppercase letter, 1 number
function isValidPassword(password) {
  const value = String(password ?? "");

  return value.length >= 8 && /[A-Z]/.test(value) && /[0-9]/.test(value);
}

// Indian mobile: 10 digits, starts with 6-9, rejects obviously fake numbers
function isValidIndianMobile(mobileNumber) {
  const mobile = String(mobileNumber ?? "").trim();

  if (!/^[6-9][0-9]{9}$/.test(mobile)) {
    return false;
  }

  const digits = mobile.split("");

  // Count how often each digit appears
  const counts = {};

  digits.forEach((digit) => {
    counts[digit] = (counts[digit] || 0) + 1;
  });

  // Reject if any single digit appears 6 or more times, e.g. 9111111111, 9999999999
  if (Math.max(...Object.values(counts)) >= 6) {
    return false;
  }

  // Reject if fewer than 4 different digits are used, e.g. 9090909090
  if (Object.keys(counts).length < 4) {
    return false;
  }

  // Reject 5 or more consecutive ascending or descending digits, e.g. 9876543210
  const numbers = digits.map(Number);
  let ascending = 1;
  let descending = 1;

  for (let index = 1; index < numbers.length; index++) {
    ascending = numbers[index] === numbers[index - 1] + 1 ? ascending + 1 : 1;
    descending = numbers[index] === numbers[index - 1] - 1 ? descending + 1 : 1;

    if (ascending >= 5 || descending >= 5) {
      return false;
    }
  }

  return true;
}

function isValidBudget(value) {
  return Number.isFinite(value) && value > 0;
}

function isDateInRange(date, startDate, endDate) {
  return Boolean(date && startDate && endDate && date >= startDate && date <= endDate);
}

// Returns { value, provided }. provided is false when the field is empty or not a number.
function readNumber(formData, fieldName) {
  const raw = formData.get(fieldName);

  if (raw === null || String(raw).trim() === "") {
    return { value: NaN, provided: false };
  }

  const value = Number(raw);

  return { value, provided: Number.isFinite(value) };
}


/* =====================================================
   FORM ERROR HELPERS
   ===================================================== */

function clearFormErrors(form) {
  if (!form) {
    return;
  }

  form.querySelectorAll(".form-error").forEach((element) => {
    element.textContent = "";
    element.classList.remove("visible");
  });

  form.querySelectorAll(".input-error").forEach((field) => {
    field.classList.remove("input-error");
  });
}

// Field errors use the input id and an element with id `${fieldId}Error`
function showFieldError(fieldId, message) {
  const field = $(fieldId);
  const errorElement = $(`${fieldId}Error`);

  if (field) {
    field.classList.add("input-error");
  }

  if (errorElement) {
    errorElement.textContent = message;
    errorElement.classList.add("visible");
  }
}

// errors: [{ field, message }]
function showErrors(errors) {
  errors.forEach(({ field, message }) => showFieldError(field, message));
}


/* =====================================================
   AUTHENTICATION
   ===================================================== */

function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    const session = raw ? JSON.parse(raw) : null;

    return session && session.email ? session : null;
  } catch (error) {
    console.error("Error retrieving session:", error);
    return null;
  }
}

function isLoggedIn() {
  return getSession() !== null;
}

function getCurrentUserEmail() {
  const session = getSession();

  return session ? normalizeEmail(session.email) : null;
}

function createSession(user) {
  const session = {
    email: normalizeEmail(user.email),
    name: user.name || "",
    mobile: user.mobile || "",
    loginTime: Date.now(),
    rememberMe: true
  };

  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return true;
  } catch (error) {
    console.error("Unable to start TriPlan session:", error);
    return false;
  }
}

function logoutUser() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (error) {
    console.error("Error logging out:", error);
  }
}

function getUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    const users = raw ? JSON.parse(raw) : [];

    return Array.isArray(users) ? users : [];
  } catch (error) {
    console.error("Unable to read TriPlan users:", error);
    return [];
  }
}

function saveUsers(users) {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return true;
  } catch (error) {
    console.error("Unable to save TriPlan users:", error);
    return false;
  }
}

function findUserByEmail(email) {
  const emailValue = normalizeEmail(email);

  return getUsers().find((user) => user.email === emailValue) || null;
}

// Returns { success, message }
function loginUser(email, password) {
  const emailValue = normalizeEmail(email);
  const passwordValue = String(password ?? "");

  if (!isValidEmail(emailValue)) {
    return { success: false, message: "Please enter a valid email address." };
  }

  if (!passwordValue) {
    return { success: false, message: "Please enter your password." };
  }

  if (emailValue === TEST_ACCOUNT.email && passwordValue === TEST_ACCOUNT.password) {
    createSession({ email: emailValue, name: TEST_ACCOUNT.name, mobile: "" });

    return { success: true, message: "Login successful!" };
  }

  const user = findUserByEmail(emailValue);

  if (user && user.password === passwordValue) {
    createSession(user);

    return { success: true, message: "Login successful!" };
  }

  return { success: false, message: "Invalid email or password." };
}

// Returns { success, message, field }. field is the signup input id to highlight.
function registerUser(data) {
  const name = String(data.name || "").trim();
  const email = normalizeEmail(data.email);
  const mobile = String(data.mobile || "").trim();
  const password = String(data.password || "");
  const confirmPassword = String(data.confirmPassword || "");

  if (name.length < 2) {
    return { success: false, field: "signupName", message: "Please enter your full name." };
  }

  if (!isValidEmail(email)) {
    return { success: false, field: "signupEmail", message: "Please enter a valid email address." };
  }

  if (email === TEST_ACCOUNT.email || findUserByEmail(email)) {
    return {
      success: false,
      field: "signupEmail",
      message: "An account with this email already exists."
    };
  }

  if (!isValidIndianMobile(mobile)) {
    return {
      success: false,
      field: "signupMobile",
      message: "Enter a valid 10-digit Indian mobile number starting with 6, 7, 8 or 9."
    };
  }

  if (!isValidPassword(password)) {
    return {
      success: false,
      field: "signupPassword",
      message: "Password must be at least 8 characters, contain 1 uppercase letter and 1 number."
    };
  }

  if (password !== confirmPassword) {
    return { success: false, field: "signupConfirmPassword", message: "Passwords do not match." };
  }

  const user = { name, email, mobile, password, createdAt: Date.now() };
  const users = getUsers();

  users.push(user);

  if (!saveUsers(users)) {
    return { success: false, field: "", message: "Unable to create your account. Please try again." };
  }

  createSession(user);

  return { success: true, message: "Account created successfully!" };
}

// Redirects to login only for protected pages
function requireAuth() {
  if (!PROTECTED_PAGES.includes(getCurrentPage()) || isLoggedIn()) {
    return true;
  }

  const target = encodeURIComponent(getCurrentFileName() + window.location.search);

  window.location.href = `login.html?redirect=${target}`;

  return false;
}

function bindLogoutButton(button) {
  bindOnce(button, "click", () => {
    logoutUser();
    window.location.href = "index.html";
  });
}

// Shows a circular avatar button with the user's initial when logged in, or a Log in button when logged out
function renderAuthNav() {
  const authNav = $("authNav");

  if (!authNav) {
    return;
  }

  if (isLoggedIn()) {
    const session = getSession();
    const initial = String(session.name || session.email || "T").trim().charAt(0).toUpperCase();

    authNav.innerHTML = `
      <a href="profile.html" class="profile-button" aria-label="Open profile">
        ${escapeHtml(initial)}
      </a>
    `;
  } else {
    authNav.innerHTML = `<a href="login.html" class="nav-button">Log in</a>`;
  }
}


/* =====================================================
   TRIP STORAGE
   ===================================================== */

// Trips are stored per logged-in user
function getTripsStorageKey() {
  const email = getCurrentUserEmail();

  return email ? `${TRIPS_KEY_PREFIX}_${email}` : `${TRIPS_KEY_PREFIX}_guest`;
}

function readTrips() {
  try {
    const raw = localStorage.getItem(getTripsStorageKey());
    const trips = raw ? JSON.parse(raw) : [];

    return Array.isArray(trips) ? trips : [];
  } catch (error) {
    console.error("Unable to read TriPlan trips:", error);
    return [];
  }
}

function writeTrips(trips) {
  try {
    const key = getTripsStorageKey();
    const serialized = JSON.stringify(trips);

    localStorage.setItem(key, serialized);

    return localStorage.getItem(key) === serialized;
  } catch (error) {
    console.error("Unable to save TriPlan trips:", error);
    return false;
  }
}

function getTripById(tripId) {
  if (!tripId) {
    return null;
  }

  return readTrips().find((trip) => String(trip.id) === String(tripId)) || null;
}

function saveTrip(trip) {
  if (!trip || !trip.id) {
    return false;
  }

  const trips = readTrips();
  const index = trips.findIndex((item) => String(item.id) === String(trip.id));

  if (index === -1) {
    trips.push(trip);
  } else {
    trips[index] = trip;
  }

  return writeTrips(trips);
}

function deleteTripById(tripId) {
  const trips = readTrips();
  const updatedTrips = trips.filter((trip) => String(trip.id) !== String(tripId));

  if (updatedTrips.length === trips.length) {
    return false;
  }

  return writeTrips(updatedTrips);
}

// Builds IDs such as TRIP-001, ACTIVITY-002, EXPENSE-003
function generateSequentialId(items, prefix) {
  let highest = 0;

  (items || []).forEach((item) => {
    if (typeof item.id !== "string") {
      return;
    }

    const match = item.id.match(new RegExp(`^${prefix}-(\\d+)$`));

    if (match && Number(match[1]) > highest) {
      highest = Number(match[1]);
    }
  });

  return `${prefix}-${String(highest + 1).padStart(3, "0")}`;
}


/* =====================================================
   TRIP DATA: NORMALIZATION, BUDGET, PROGRESS, STATUS
   ===================================================== */

function createEmptyBudget(estimated = 0) {
  return {
    estimated,
    spent: 0,
    remaining: estimated
  };
}

function normalizeActivity(activity) {
  activity.name = String(activity.name ?? "");
  activity.category = typeof activity.category === "string" ? activity.category : "";
  activity.date = String(activity.date ?? "");
  activity.time = String(activity.time ?? "");
  activity.location = String(activity.location ?? "");
  activity.notes = typeof activity.notes === "string" ? activity.notes : "";
  activity.completed = activity.completed === true;

  const estimated = Number(activity.estimatedCost);

  activity.estimatedCost = Number.isFinite(estimated) && estimated >= 0 ? estimated : 0;

  const hasActual =
    activity.actualCost !== null &&
    activity.actualCost !== undefined &&
    activity.actualCost !== "";

  const actual = hasActual ? Number(activity.actualCost) : NaN;

  activity.actualCostProvided = Number.isFinite(actual) && actual >= 0;
  activity.actualCost = activity.actualCostProvided ? actual : null;

  return activity;
}

function normalizeTrip(trip) {
  trip.activities = Array.isArray(trip.activities)
    ? trip.activities.map(normalizeActivity)
    : [];

  trip.expenses = Array.isArray(trip.expenses) ? trip.expenses : [];
  trip.travelers = Array.isArray(trip.travelers) ? trip.travelers : [];

  if (!trip.budget || typeof trip.budget !== "object") {
    trip.budget = createEmptyBudget(0);
  }

  recalculateTrip(trip);

  return trip;
}

function getActivitySpending(activity) {
  return activity.actualCostProvided ? activity.actualCost : activity.estimatedCost;
}

// Recalculates progress and budget from activities and expenses
function recalculateTrip(trip) {
  const total = trip.activities.length;
  const completed = trip.activities.filter((activity) => activity.completed).length;

  trip.progress = {
    totalActivities: total,
    completedActivities: completed,
    percentage: total === 0 ? 0 : Math.round((completed / total) * 100)
  };

  const activitySpent = trip.activities.reduce(
    (sum, activity) => sum + getActivitySpending(activity),
    0
  );

  const expenseSpent = trip.expenses.reduce((sum, expense) => {
    const amount = Number(expense.amount);

    return sum + (amount > 0 ? amount : 0);
  }, 0);

  const estimated = Number(trip.budget.estimated) || 0;
  const spent = activitySpent + expenseSpent;

  trip.budget.estimated = estimated;
  trip.budget.spent = spent;
  trip.budget.remaining = estimated - spent;
}

function getTripStatus(trip) {
  if (!trip || !trip.startDate || !trip.endDate) {
    return "upcoming";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(`${trip.startDate}T00:00:00`);
  const endDate = new Date(`${trip.endDate}T23:59:59`);

  if (today < startDate) {
    return "upcoming";
  }

  if (today > endDate) {
    return "completed";
  }

  return "ongoing";
}

function isCompletedTrip(trip = currentTrip) {
  return getTripStatus(trip) === "completed";
}

function getStatusLabel(status) {
  const labels = {
    upcoming: "Upcoming",
    ongoing: "Ongoing",
    completed: "Completed"
  };

  return labels[status] || "Upcoming";
}

function getTripDayCount(trip) {
  if (!trip || !trip.startDate || !trip.endDate) {
    return 0;
  }

  const start = new Date(`${trip.startDate}T00:00:00`);
  const end = new Date(`${trip.endDate}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 0;
  }

  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

function getTripDates(trip) {
  const dates = [];

  if (!trip || !trip.startDate || !trip.endDate) {
    return dates;
  }

  const current = new Date(`${trip.startDate}T00:00:00`);
  const end = new Date(`${trip.endDate}T00:00:00`);

  if (Number.isNaN(current.getTime()) || Number.isNaN(end.getTime())) {
    return dates;
  }

  while (current <= end) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, "0");
    const day = String(current.getDate()).padStart(2, "0");

    dates.push(`${year}-${month}-${day}`);

    current.setDate(current.getDate() + 1);
  }

  return dates;
}


/* =====================================================
   CREATE TRIP PAGE
   ===================================================== */

function readCreateTripForm(form) {
  const formData = new FormData(form);

  return {
    tripName: String(formData.get("tripName") || "").trim(),
    destination: String(formData.get("destination") || "").trim(),
    startDate: String(formData.get("startDate") || ""),
    endDate: String(formData.get("endDate") || ""),
    travelerName: String(formData.get("travelerName") || "").trim(),
    travelerMobile: String(formData.get("travelerMobile") || "").trim(),
    estimatedBudget: Number(formData.get("estimatedBudget"))
  };
}

function validateCreateTrip(data) {
  const errors = [];

  if (!data.tripName) {
    errors.push({ field: "tripName", message: "Please enter a trip name." });
  }

  if (!data.destination) {
    errors.push({ field: "destination", message: "Please enter your destination." });
  }

  if (!data.startDate) {
    errors.push({ field: "startDate", message: "Please select a start date." });
  }

  if (!data.endDate) {
    errors.push({ field: "endDate", message: "Please select an end date." });
  }

  if (data.startDate && data.endDate && data.endDate < data.startDate) {
    errors.push({ field: "endDate", message: "End date cannot be before the start date." });
  }

  if (!data.travelerName) {
    errors.push({ field: "travelerName", message: "Please enter the traveler name." });
  }

  if (!isValidIndianMobile(data.travelerMobile)) {
    errors.push({
      field: "travelerMobile",
      message: "Enter a valid 10-digit Indian mobile number starting with 6, 7, 8 or 9."
    });
  }

  if (!isValidBudget(data.estimatedBudget)) {
    errors.push({
      field: "estimatedBudget",
      message: "Please enter an estimated budget greater than ₹0."
    });
  }

  return errors;
}

function createTrip(data) {
  const trip = {
    id: generateSequentialId(readTrips(), "TRIP"),
    tripName: data.tripName,
    destination: data.destination,
    startDate: data.startDate,
    endDate: data.endDate,
    travelers: [
      {
        name: data.travelerName,
        mobile: data.travelerMobile
      }
    ],
    budget: createEmptyBudget(data.estimatedBudget),
    activities: [],
    expenses: [],
    progress: {
      totalActivities: 0,
      completedActivities: 0,
      percentage: 0
    },
    insights: {}
  };

  recalculateTrip(trip);

  if (!saveTrip(trip)) {
    return null;
  }

  return getTripById(trip.id);
}

function setupCreateTripForm() {
  const form = $("createTripForm");

  if (!form) {
    return;
  }

  const startField = $("startDate");
  const endField = $("endDate");
  const mobileField = $("travelerMobile");

  if (mobileField) {
    bindOnce(mobileField, "input", () => {
      mobileField.value = mobileField.value.replace(/\D/g, "").slice(0, 10);
    });
  }

  if (startField && endField) {
    const syncEndMin = () => {
      if (startField.value) {
        endField.min = startField.value;
      }
    };

    bindOnce(startField, "change", syncEndMin);
    bindOnce(endField, "change", syncEndMin);
  }

  bindOnce(form, "submit", (event) => {
    event.preventDefault();

    clearFormErrors(form);

    const data = readCreateTripForm(form);
    const errors = validateCreateTrip(data);

    if (errors.length) {
      showErrors(errors);
      return;
    }

    const trip = createTrip(data);

    if (!trip) {
      alert("Unable to save your trip. Please try again.");
      return;
    }

    window.location.href = buildTripUrl(trip.id);
  });
}


/* =====================================================
   TRIP URLS
   ===================================================== */

function buildTripUrl(tripId, section = "overview") {
  const params = new URLSearchParams();

  params.set("id", tripId);
  params.set("section", section);

  return `trip.html?${params.toString()}`;
}


/* =====================================================
   MY TRIPS PAGE
   ===================================================== */

function createTripCardMarkup(trip) {
  const status = getTripStatus(trip);

  return `
    <article class="trip-card">

      <div class="trip-card-content">

        <span class="trip-card-label">TRIP</span>

        <div class="trip-card-title-row">
          <h3>${escapeHtml(trip.tripName || "Untitled Trip")}</h3>

          <span class="status-badge status-badge-trip-${status}">
            ${getStatusLabel(status)}
          </span>
        </div>

        <p class="trip-card-destination">
          ${escapeHtml(trip.destination || "Destination not set")}
        </p>

        <div class="trip-card-details">
          <span>${formatTripDate(trip.startDate)}</span>
          <span>→</span>
          <span>${formatTripDate(trip.endDate)}</span>
        </div>

      </div>

      <div class="trip-card-actions">

        <a href="${buildTripUrl(trip.id)}" class="button button-primary">
          Open Trip
        </a>

        <button
          type="button"
          class="button button-secondary trip-delete-button"
          data-trip-id="${escapeHtml(trip.id)}"
        >
          Delete
        </button>

      </div>

    </article>
  `;
}

function handleTripDeleteClick(event) {
  const deleteButton = event.target.closest(".trip-delete-button");

  if (!deleteButton) {
    return;
  }

  const tripId = deleteButton.dataset.tripId;

  if (!tripId) {
    return;
  }

  if (!window.confirm("Are you sure you want to delete this trip?")) {
    return;
  }

  if (!deleteTripById(tripId)) {
    alert("Unable to delete this trip. Please try again.");
    return;
  }

  renderTripsPage();
}

function renderTripsPage() {
  const activeContainer = $("activeTripsContainer");
  const completedContainer = $("completedTripsContainer");

  if (!activeContainer || !completedContainer) {
    return;
  }

  const trips = readTrips().map(normalizeTrip);

  const activeTrips = trips
    .filter((trip) => getTripStatus(trip) !== "completed")
    .sort((first, second) => String(first.startDate).localeCompare(String(second.startDate)));

  const completedTrips = trips
    .filter((trip) => getTripStatus(trip) === "completed")
    .sort((first, second) => String(second.endDate).localeCompare(String(first.endDate)));

  activeContainer.innerHTML = activeTrips.map(createTripCardMarkup).join("");
  completedContainer.innerHTML = completedTrips.map(createTripCardMarkup).join("");

  const activeEmpty = $("activeTripsEmptyState");
  const completedEmpty = $("completedTripsEmptyState");

  if (activeEmpty) activeEmpty.hidden = activeTrips.length !== 0;
  if (completedEmpty) completedEmpty.hidden = completedTrips.length !== 0;

  bindOnce(activeContainer, "click", handleTripDeleteClick);
  bindOnce(completedContainer, "click", handleTripDeleteClick);
}


/* =====================================================
   TRIP WORKSPACE: LOAD AND SAVE
   ===================================================== */

function showTripWorkspaceError(message) {
  const workspaceSection = document.querySelector(".workspace-section");

  if (!workspaceSection) {
    return;
  }

  workspaceSection.innerHTML = `
    <div class="container">
      <div class="empty-state">
        <div class="empty-state-content">
          <span class="empty-state-number">!</span>
          <h2>Trip unavailable</h2>
          <p>${escapeHtml(message)}</p>
          <a href="trips.html" class="button button-primary">Back to My Trips</a>
        </div>
      </div>
    </div>
  `;
}

// Recalculates, saves and re-renders the current trip
function persistCurrentTrip() {
  if (!currentTrip) {
    return false;
  }

  recalculateTrip(currentTrip);

  const saved = saveTrip(currentTrip);

  if (saved) {
    renderWorkspace();
  }

  return saved;
}

function renderWorkspace() {
  if (!currentTrip) {
    return;
  }

  recalculateTrip(currentTrip);

  renderTripHeader();
  renderOverview();
  renderBudget();
  renderActivities();
  renderExpenses();
  renderTripPlan();
  renderInsights();
  refreshReadOnlyState();
}

// Hides add buttons and forms for completed trips
function refreshReadOnlyState() {
  const readOnly = isCompletedTrip();

  setDisplay($("addActivityButton"), !readOnly);
  setDisplay($("addExpenseButton"), !readOnly);

  if (readOnly) {
    const activityContainer = $("activityFormContainer");
    const expenseContainer = $("expenseFormContainer");

    if (activityContainer) activityContainer.hidden = true;
    if (expenseContainer) expenseContainer.hidden = true;
  }
}


/* =====================================================
   TRIP WORKSPACE: RENDERING
   ===================================================== */

function renderTripHeader() {
  setText("tripTitle", currentTrip.tripName);
  setText("tripDestination", currentTrip.destination);
  setText(
    "tripDates",
    `${formatTripDate(currentTrip.startDate)} → ${formatTripDate(currentTrip.endDate)}`
  );

  const badge = $("tripStatusBadge");

  if (badge) {
    const status = getTripStatus(currentTrip);

    badge.textContent = getStatusLabel(status);
    badge.className = `status-badge status-badge-trip-${status}`;
  }
}

function renderOverview() {
  setText("overviewActivityCount", currentTrip.activities.length);
  setText("overviewCompletedActivityCount", currentTrip.progress.completedActivities);
  setText("overviewProgress", `${currentTrip.progress.percentage}%`);
  setText("overviewSpent", formatCurrency(currentTrip.budget.spent));
  setText("overviewRemaining", formatCurrency(currentTrip.budget.remaining));
}

function renderBudget() {
  const estimated = Number(currentTrip.budget.estimated) || 0;
  const spent = Number(currentTrip.budget.spent) || 0;
  const remaining = Number(currentTrip.budget.remaining) || 0;

  setText("budgetEstimated", formatCurrency(estimated));
  setText("budgetSpent", formatCurrency(spent));
  setText("budgetRemaining", formatCurrency(remaining));

  const healthElement = $("budgetHealth");

  if (!healthElement) {
    return;
  }

  healthElement.classList.remove(
    "budget-health-good",
    "budget-health-warning",
    "budget-health-danger"
  );

  if (estimated <= 0) {
    healthElement.textContent = "No Budget";
  } else if (spent > estimated) {
    healthElement.textContent = "Over Budget";
    healthElement.classList.add("budget-health-danger");
  } else if (spent >= estimated * 0.7) {
    healthElement.textContent = "Watch Spending";
    healthElement.classList.add("budget-health-warning");
  } else {
    healthElement.textContent = "Healthy";
    healthElement.classList.add("budget-health-good");
  }
}

function emptyStateMarkup(title, message) {
  return `
    <div class="empty-state">
      <div class="empty-state-content">
        <span class="empty-state-number">01</span>
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(message)}</p>
      </div>
    </div>
  `;
}

function activityCardMarkup(activity, readOnly) {
  const completed = activity.completed === true;
  const id = escapeHtml(activity.id);

  return `
    <article class="activity-card ${completed ? "activity-completed" : ""}">

      <div class="activity-card-content">

        <span class="activity-card-date">${formatTripDate(activity.date)}</span>

        <div class="activity-title-row">
          <h3>${escapeHtml(activity.name)}</h3>

          <span
            class="status-badge ${completed ? "status-badge-completed" : "status-badge-upcoming"}"
            aria-label="Activity status: ${completed ? "Completed" : "Upcoming"}"
          >
            ${completed ? "Completed" : "Upcoming"}
          </span>
        </div>

        <p>Category: ${escapeHtml(activity.category)}</p>

        <p>${escapeHtml(activity.time)} · ${escapeHtml(activity.location)}</p>

        <p>Estimated: ${formatCurrency(activity.estimatedCost)}</p>

        ${
          activity.actualCostProvided
            ? `<p>Spent: ${formatCurrency(activity.actualCost)}</p>`
            : ""
        }

        ${activity.notes ? `<p>Notes: ${escapeHtml(activity.notes)}</p>` : ""}

        ${completed ? `<span class="activity-completed-label">✓ Completed</span>` : ""}

      </div>

      ${
        readOnly
          ? ""
          : `
            <div class="activity-card-actions">
              <button
                type="button"
                class="button button-secondary activity-edit-button"
                data-action="edit"
                data-activity-id="${id}"
              >
                Edit
              </button>

              <button
                type="button"
                class="button button-secondary activity-complete-button"
                data-action="toggle"
                data-activity-id="${id}"
              >
                ${completed ? "Mark Incomplete" : "Mark Complete"}
              </button>

              <button
                type="button"
                class="button button-secondary activity-delete-button"
                data-action="delete"
                data-activity-id="${id}"
              >
                Delete
              </button>
            </div>
          `
      }

    </article>
  `;
}

function renderActivities() {
  const list = $("activitiesList");

  if (!list) {
    return;
  }

  const readOnly = isCompletedTrip();

  if (!currentTrip.activities.length) {
    list.innerHTML = emptyStateMarkup(
      "No activities yet",
      readOnly
        ? "This completed trip is read-only."
        : "Add your first activity to start building your trip plan."
    );

    return;
  }

  const sorted = [...currentTrip.activities].sort((first, second) =>
    `${first.date}T${first.time}`.localeCompare(`${second.date}T${second.time}`)
  );

  list.innerHTML = sorted.map((activity) => activityCardMarkup(activity, readOnly)).join("");

  bindOnce(list, "click", handleActivityListClick);
}

function expenseCardMarkup(expense, readOnly) {
  const id = escapeHtml(expense.id);

  return `
    <article class="expense-card">

      <div class="expense-card-content">

        <span class="expense-card-date">${formatTripDate(expense.date)}</span>

        <h3>${escapeHtml(expense.name)}</h3>

        <p>${escapeHtml(expense.category)}</p>

        <strong>${formatCurrency(expense.amount)}</strong>

      </div>

      ${
        readOnly
          ? ""
          : `
            <div class="expense-card-actions">
              <button
                type="button"
                class="button button-secondary expense-edit-button"
                data-action="edit"
                data-expense-id="${id}"
              >
                Edit
              </button>

              <button
                type="button"
                class="button button-secondary expense-delete-button"
                data-action="delete"
                data-expense-id="${id}"
              >
                Delete
              </button>
            </div>
          `
      }

    </article>
  `;
}

function renderExpenses() {
  const list = $("expensesList");

  if (!list) {
    return;
  }

  const readOnly = isCompletedTrip();

  if (!currentTrip.expenses.length) {
    list.innerHTML = emptyStateMarkup(
      "No expenses yet",
      readOnly
        ? "This completed trip is read-only."
        : "Add your first expense to start tracking your trip spending."
    );

    return;
  }

  const sorted = [...currentTrip.expenses].sort((first, second) =>
    String(first.date || "").localeCompare(String(second.date || ""))
  );

  list.innerHTML = sorted.map((expense) => expenseCardMarkup(expense, readOnly)).join("");

  bindOnce(list, "click", handleExpenseListClick);
}

function renderTripPlan() {
  const container = $("tripPlanContainer");

  if (!container) {
    return;
  }

  const dates = getTripDates(currentTrip);

  if (!dates.length) {
    container.innerHTML = emptyStateMarkup(
      "Trip dates unavailable",
      "Add valid trip dates to build your daily plan."
    );

    return;
  }

  container.innerHTML = dates
    .map((date, index) => {
      const dayActivities = currentTrip.activities
        .filter((activity) => activity.date === date)
        .sort((first, second) => String(first.time).localeCompare(String(second.time)));

      const activitiesMarkup = dayActivities.length
        ? dayActivities
            .map(
              (activity) => `
                <div class="trip-plan-activity">
                  <div>
                    <strong>${escapeHtml(activity.name)}</strong>
                    <span>
                      ${escapeHtml(activity.category)} · ${escapeHtml(activity.time)} · ${escapeHtml(activity.location)}
                    </span>
                  </div>

                  <span>${activity.completed ? "✓ Completed" : "Planned"}</span>
                </div>
              `
            )
            .join("")
        : `<p>No activities planned for this day.</p>`;

      return `
        <article class="trip-plan-day">
          <div class="trip-plan-day-header">
            <span class="eyebrow">DAY ${index + 1}</span>
            <h3>${formatTripDate(date)}</h3>
          </div>

          <div class="trip-plan-day-content">
            ${activitiesMarkup}
          </div>
        </article>
      `;
    })
    .join("");
}

function calculateTopSpendingCategory() {
  const totals = {};

  const add = (category, amount) => {
    if (amount > 0) {
      totals[category] = (totals[category] || 0) + amount;
    }
  };

  currentTrip.activities.forEach((activity) => {
    add(String(activity.category || "Activities").trim(), getActivitySpending(activity));
  });

  currentTrip.expenses.forEach((expense) => {
    add(String(expense.category || "Other").trim(), Number(expense.amount) || 0);
  });

  const entries = Object.entries(totals).sort((first, second) => second[1] - first[1]);

  return entries.length ? entries[0][0] : "—";
}

function calculatePlanningCoverage() {
  const totalDays = getTripDayCount(currentTrip);

  if (!totalDays) {
    return 0;
  }

  const plannedDays = new Set(currentTrip.activities.map((activity) => activity.date).filter(Boolean))
    .size;

  return Math.min(100, Math.round((plannedDays / totalDays) * 100));
}

function renderInsights() {
  const totalDays = getTripDayCount(currentTrip);
  const totalSpent = Number(currentTrip.budget.spent) || 0;
  const dailySpending = totalDays > 0 ? Math.round(totalSpent / totalDays) : 0;

  setText("insightDailySpending", formatCurrency(dailySpending));
  setText("insightTopCategory", calculateTopSpendingCategory());
  setText("insightPlanningCoverage", `${calculatePlanningCoverage()}%`);
  setText("insightActivityProgress", `${currentTrip.progress.percentage}%`);
}


/* =====================================================
   TRIP WORKSPACE: TABS
   ===================================================== */

function activateWorkspaceSection(section, updateUrl = true) {
  const active = WORKSPACE_SECTIONS.includes(section) ? section : "overview";

  document.querySelectorAll(".workspace-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.workspaceTab === active);
  });

  document.querySelectorAll(".workspace-panel").forEach((panel) => {
    const isActive = panel.dataset.workspacePanel === active;

    panel.classList.toggle("active", isActive);
    panel.hidden = !isActive;
  });

  if (updateUrl && currentTrip) {
    window.history.pushState({}, "", buildTripUrl(currentTrip.id, active));
  }
}

function setupWorkspaceTabs() {
  document.querySelectorAll(".workspace-tab").forEach((tab) => {
    bindOnce(tab, "click", () => activateWorkspaceSection(tab.dataset.workspaceTab));
  });

  bindOnce(window, "popstate", () => {
    activateWorkspaceSection(getUrlParam("section"), false);
  });
}


/* =====================================================
   ACTIVITY FORM
   ===================================================== */

function setDateLimits(fieldId) {
  const field = $(fieldId);

  if (!field || !currentTrip) {
    return;
  }

  field.min = currentTrip.startDate || "";
  field.max = currentTrip.endDate || "";
}

function fillField(id, value) {
  const element = $(id);

  if (element) {
    element.value = value ?? "";
  }
}

function openActivityForm(activity = null) {
  const form = $("activityForm");
  const container = $("activityFormContainer");

  if (!form || !container) {
    return;
  }

  form.reset();
  clearFormErrors(form);

  fillField("editingActivityId", activity ? activity.id : "");

  if (activity) {
    fillField("activityName", activity.name);
    fillField("activityCategory", activity.category);
    fillField("activityDate", activity.date);
    fillField("activityTime", activity.time);
    fillField("activityLocation", activity.location);
    fillField("activityEstimatedCost", activity.estimatedCost);
    fillField("activityActualCost", activity.actualCostProvided ? activity.actualCost : "");
    fillField("activityNotes", activity.notes);
  }

  setDateLimits("activityDate");

  setText("activityFormTitle", activity ? "Edit activity" : "Add activity");
  setText(
    "activityFormDescription",
    activity ? "Update the details of this activity." : "Add an activity to your trip plan."
  );

  const saveButton = $("saveActivityButton");

  if (saveButton) {
    saveButton.textContent = activity ? "Update Activity" : "Save Activity";
  }

  container.hidden = false;
  container.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeActivityForm() {
  const form = $("activityForm");
  const container = $("activityFormContainer");

  if (form) {
    form.reset();
    clearFormErrors(form);
  }

  fillField("editingActivityId", "");

  if (container) {
    container.hidden = true;
  }
}

function readActivityForm() {
  const formData = new FormData($("activityForm"));

  return {
    id: String(formData.get("editingActivityId") || ""),
    name: String(formData.get("activityName") || "").trim(),
    category: String(formData.get("activityCategory") || "").trim(),
    date: String(formData.get("activityDate") || ""),
    time: String(formData.get("activityTime") || ""),
    location: String(formData.get("activityLocation") || "").trim(),
    estimatedCost: readNumber(formData, "activityEstimatedCost"),
    actualCost: readNumber(formData, "activityActualCost"),
    notes: String(formData.get("activityNotes") || "").trim()
  };
}

function validateActivity(data) {
  const errors = [];

  if (!data.name) {
    errors.push({ field: "activityName", message: "Please enter an activity name." });
  }

  if (!data.category) {
    errors.push({ field: "activityCategory", message: "Please select an activity category." });
  }

  if (!data.date) {
    errors.push({ field: "activityDate", message: "Please select an activity date." });
  } else if (!isDateInRange(data.date, currentTrip.startDate, currentTrip.endDate)) {
    errors.push({
      field: "activityDate",
      message: "Activity date must be within your trip dates."
    });
  }

  if (!data.time) {
    errors.push({ field: "activityTime", message: "Please select a start time." });
  }

  if (!data.location) {
    errors.push({ field: "activityLocation", message: "Please enter the activity location." });
  }

  if (!data.estimatedCost.provided || data.estimatedCost.value < 0) {
    errors.push({
      field: "activityEstimatedCost",
      message: "Please enter the estimated cost."
    });
  }

  if (data.actualCost.provided && data.actualCost.value < 0) {
    errors.push({
      field: "activityActualCost",
      message: "Please enter a valid actual cost."
    });
  }

  return errors;
}

function handleActivitySubmit(event) {
  event.preventDefault();

  if (!currentTrip || isCompletedTrip()) {
    return;
  }

  clearFormErrors($("activityForm"));

  const data = readActivityForm();
  const errors = validateActivity(data);

  if (errors.length) {
    showErrors(errors);
    return;
  }

  const payload = {
    name: data.name,
    category: data.category,
    date: data.date,
    time: data.time,
    location: data.location,
    estimatedCost: data.estimatedCost.value,
    actualCostProvided: data.actualCost.provided,
    actualCost: data.actualCost.provided ? data.actualCost.value : null,
    notes: data.notes
  };

  const existing = data.id
    ? currentTrip.activities.find((activity) => String(activity.id) === String(data.id))
    : null;

  if (existing) {
    Object.assign(existing, payload);
  } else {
    currentTrip.activities.push({
      id: generateSequentialId(currentTrip.activities, "ACTIVITY"),
      completed: false,
      ...payload
    });
  }

  if (!persistCurrentTrip()) {
    alert("Unable to save the activity. Please try again.");
    return;
  }

  closeActivityForm();

  alert(existing ? "Activity updated successfully." : "Activity saved successfully.");
}

function editActivity(activityId) {
  const activity = currentTrip.activities.find((item) => String(item.id) === String(activityId));

  if (activity && !isCompletedTrip()) {
    openActivityForm(activity);
  }
}

function toggleActivityComplete(activityId) {
  if (isCompletedTrip()) {
    return;
  }

  const activity = currentTrip.activities.find((item) => String(item.id) === String(activityId));

  if (!activity) {
    return;
  }

  activity.completed = !activity.completed;

  if (!persistCurrentTrip()) {
    activity.completed = !activity.completed;
    alert("Unable to update activity status. Please try again.");
  }
}

function deleteActivity(activityId) {
  if (isCompletedTrip()) {
    return;
  }

  const activity = currentTrip.activities.find((item) => String(item.id) === String(activityId));

  if (!activity || !window.confirm(`Delete "${activity.name}" from your trip?`)) {
    return;
  }

  const original = [...currentTrip.activities];

  currentTrip.activities = currentTrip.activities.filter(
    (item) => String(item.id) !== String(activityId)
  );

  if (!persistCurrentTrip()) {
    currentTrip.activities = original;
    alert("Unable to delete the activity. Please try again.");
  }
}

function handleActivityListClick(event) {
  const button = event.target.closest("button[data-action][data-activity-id]");

  if (!button) {
    return;
  }

  const { action, activityId } = button.dataset;

  if (action === "edit") editActivity(activityId);
  if (action === "toggle") toggleActivityComplete(activityId);
  if (action === "delete") deleteActivity(activityId);
}

function setupActivityForm() {
  const form = $("activityForm");

  if (!form) {
    return;
  }

  bindOnce($("addActivityButton"), "click", () => {
    if (!isCompletedTrip()) {
      openActivityForm();
    }
  });

  bindOnce($("cancelActivityButton"), "click", closeActivityForm);
  bindOnce(form, "submit", handleActivitySubmit);
}


/* =====================================================
   EXPENSE FORM
   ===================================================== */

function openExpenseForm(expense = null) {
  const form = $("expenseForm");
  const container = $("expenseFormContainer");

  if (!form || !container) {
    return;
  }

  form.reset();
  clearFormErrors(form);

  fillField("editingExpenseId", expense ? expense.id : "");

  if (expense) {
    fillField("expenseName", expense.name);
    fillField("expenseAmount", expense.amount);
    fillField("expenseCategory", expense.category);
    fillField("expenseDate", expense.date);
  }

  setDateLimits("expenseDate");

  setText("expenseFormTitle", expense ? "Edit expense" : "Add expense");
  setText(
    "expenseFormDescription",
    expense
      ? "Update the details of this expense."
      : "Record money you have actually spent during the trip."
  );

  const saveButton = $("saveExpenseButton");

  if (saveButton) {
    saveButton.textContent = expense ? "Update Expense" : "Save Expense";
  }

  container.hidden = false;
  container.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeExpenseForm() {
  const form = $("expenseForm");
  const container = $("expenseFormContainer");

  if (form) {
    form.reset();
    clearFormErrors(form);
  }

  fillField("editingExpenseId", "");

  if (container) {
    container.hidden = true;
  }
}

function readExpenseForm() {
  const formData = new FormData($("expenseForm"));

  return {
    id: String(formData.get("editingExpenseId") || ""),
    name: String(formData.get("expenseName") || "").trim(),
    amount: readNumber(formData, "expenseAmount"),
    category: String(formData.get("expenseCategory") || "").trim(),
    date: String(formData.get("expenseDate") || "")
  };
}

function validateExpense(data) {
  const errors = [];

  if (!data.name) {
    errors.push({ field: "expenseName", message: "Please enter an expense name." });
  }

  if (!data.amount.provided || data.amount.value <= 0) {
    errors.push({
      field: "expenseAmount",
      message: "Please enter an expense amount greater than ₹0."
    });
  }

  if (!data.category) {
    errors.push({ field: "expenseCategory", message: "Please select an expense category." });
  }

  if (!data.date) {
    errors.push({ field: "expenseDate", message: "Please select an expense date." });
  } else if (!isDateInRange(data.date, currentTrip.startDate, currentTrip.endDate)) {
    errors.push({
      field: "expenseDate",
      message: "Expense date must be within your trip dates."
    });
  }

  return errors;
}

function handleExpenseSubmit(event) {
  event.preventDefault();

  if (!currentTrip || isCompletedTrip()) {
    return;
  }

  clearFormErrors($("expenseForm"));

  const data = readExpenseForm();
  const errors = validateExpense(data);

  if (errors.length) {
    showErrors(errors);
    return;
  }

  const existing = data.id
    ? currentTrip.expenses.find((expense) => String(expense.id) === String(data.id))
    : null;

  if (existing) {
    existing.name = data.name;
    existing.amount = data.amount.value;
    existing.category = data.category;
    existing.date = data.date;
  } else {
    currentTrip.expenses.push({
      id: generateSequentialId(currentTrip.expenses, "EXPENSE"),
      name: data.name,
      amount: data.amount.value,
      category: data.category,
      date: data.date
    });
  }

  if (!persistCurrentTrip()) {
    alert("Unable to save the expense. Please try again.");
    return;
  }

  closeExpenseForm();

  alert(existing ? "Expense updated successfully." : "Expense saved successfully.");
}

function editExpense(expenseId) {
  const expense = currentTrip.expenses.find((item) => String(item.id) === String(expenseId));

  if (expense && !isCompletedTrip()) {
    openExpenseForm(expense);
  }
}

function deleteExpense(expenseId) {
  if (isCompletedTrip()) {
    return;
  }

  const expense = currentTrip.expenses.find((item) => String(item.id) === String(expenseId));

  if (!expense || !window.confirm(`Delete "${expense.name}" from your expenses?`)) {
    return;
  }

  const original = [...currentTrip.expenses];

  currentTrip.expenses = currentTrip.expenses.filter(
    (item) => String(item.id) !== String(expenseId)
  );

  if (!persistCurrentTrip()) {
    currentTrip.expenses = original;
    alert("Unable to delete the expense. Please try again.");
  }
}

function handleExpenseListClick(event) {
  const button = event.target.closest("button[data-action][data-expense-id]");

  if (!button) {
    return;
  }

  const { action, expenseId } = button.dataset;

  if (action === "edit") editExpense(expenseId);
  if (action === "delete") deleteExpense(expenseId);
}

function setupExpenseForm() {
  const form = $("expenseForm");

  if (!form) {
    return;
  }

  bindOnce($("addExpenseButton"), "click", () => {
    if (!isCompletedTrip()) {
      openExpenseForm();
    }
  });

  bindOnce($("cancelExpenseButton"), "click", closeExpenseForm);
  bindOnce(form, "submit", handleExpenseSubmit);
}


/* =====================================================
   TRIP WORKSPACE: INITIALIZATION
   ===================================================== */

function initializeTripWorkspacePage() {
  const tripId = getUrlParam("id");

  if (!tripId) {
    showTripWorkspaceError("No trip was selected.");
    return;
  }

  const storedTrip = getTripById(tripId);

  if (!storedTrip) {
    showTripWorkspaceError("The requested trip could not be found.");
    return;
  }

  currentTrip = normalizeTrip(storedTrip);
  saveTrip(currentTrip);

  setupWorkspaceTabs();
  setupActivityForm();
  setupExpenseForm();

  renderWorkspace();

  activateWorkspaceSection(getUrlParam("section"), false);
}


/* =====================================================
   LOGIN PAGE
   ===================================================== */

function switchAuthTab(tabName) {
  const isSignup = tabName === "signup";

  document.querySelectorAll("[data-auth-tab]").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.authTab === tabName);
  });

  const loginPanel = $("loginPanel");
  const signupPanel = $("signupPanel");

  if (loginPanel) loginPanel.hidden = isSignup;
  if (signupPanel) signupPanel.hidden = !isSignup;
}

// After login, return to the protected page the user asked for, or My Trips
function getRedirectTarget() {
  const redirect = getUrlParam("redirect");

  return redirect && REDIRECT_PATTERN.test(redirect) ? redirect : "trips.html";
}

function setupLoginForm() {
  const form = $("loginForm");

  if (!form) {
    return;
  }

  bindOnce(form, "submit", (event) => {
    event.preventDefault();

    clearFormErrors(form);

    const result = loginUser($("loginEmail").value, $("loginPassword").value);

    if (!result.success) {
      const formError = $("loginFormError");

      if (formError) {
        formError.textContent = result.message;
        formError.classList.add("visible");
      }

      return;
    }

    window.location.href = getRedirectTarget();
  });
}

function setupSignupForm() {
  const form = $("signupForm");

  if (!form) {
    return;
  }

  const mobileField = $("signupMobile");

  if (mobileField) {
    bindOnce(mobileField, "input", () => {
      mobileField.value = mobileField.value.replace(/\D/g, "").slice(0, 10);
    });
  }

  bindOnce(form, "submit", (event) => {
    event.preventDefault();

    clearFormErrors(form);

    const result = registerUser({
      name: $("signupName").value,
      email: $("signupEmail").value,
      mobile: $("signupMobile").value,
      password: $("signupPassword").value,
      confirmPassword: $("signupConfirmPassword").value
    });

    if (!result.success) {
      if (result.field) {
        showFieldError(result.field, result.message);
      } else {
        const formError = $("signupFormError");

        if (formError) {
          formError.textContent = result.message;
          formError.classList.add("visible");
        }
      }

      return;
    }

    window.location.href = getRedirectTarget();
  });
}

function initializeLoginPage() {
  document.querySelectorAll("[data-auth-tab]").forEach((tab) => {
    bindOnce(tab, "click", () => switchAuthTab(tab.dataset.authTab));
  });

  switchAuthTab(getUrlParam("mode") === "signup" ? "signup" : "login");

  setupLoginForm();
  setupSignupForm();
}


/* =====================================================
   PROFILE PAGE
   ===================================================== */

function initializeProfilePage() {
  const session = getSession();

  if (!session) {
    return;
  }

  const displayName = session.name || "Traveler";
  const trips = readTrips().map(normalizeTrip);
  const activeCount = trips.filter((trip) => getTripStatus(trip) !== "completed").length;
  const completedCount = trips.length - activeCount;

  setText("profileInitial", displayName.charAt(0).toUpperCase());
  setText("profileName", displayName);
  setText("profileNameDetail", displayName);
  setText("profileEmail", session.email);
  setText("profileEmailDetail", session.email);
  setText("profileMobile", session.mobile || "Not added");
  setText("profileTotalTrips", trips.length);
  setText("profileActiveTrips", activeCount);
  setText("profileCompletedTrips", completedCount);

  bindLogoutButton($("profileLogoutButton"));
}


/* =====================================================
   PAGE INITIALIZATION
   ===================================================== */

function initializeTriPlan() {
  if (!requireAuth()) {
    return;
  }

  renderAuthNav();

  switch (getCurrentPage()) {
    case "login":
      initializeLoginPage();
      break;

    case "profile":
      initializeProfilePage();
      break;

    case "create-trip":
      setupCreateTripForm();
      break;

    case "trips":
      renderTripsPage();
      break;

    case "trip":
      initializeTripWorkspacePage();
      break;

    default:
      break;
  }
}

document.addEventListener("DOMContentLoaded", initializeTriPlan);