# TriPlan — Plan Smart. Travel Better.

**A smart trip-planning web application to organise trips, manage activities, track expenses, and monitor travel budgets in one place.**

🌐 Live Demo: https://dhiraj1574.github.io/TriPlan---trip-planning-web-application/

TriPlan is a responsive, front-end web application designed to make trip planning simple, structured, and manageable. From creating a trip to organising daily activities and tracking actual expenses, TriPlan brings the essential parts of travel planning together in one workspace.

Built with **HTML5, CSS3, and vanilla JavaScript**, TriPlan runs directly in the browser without frameworks, backend services, or a build process.

---

## Overview

Planning a trip often involves juggling multiple activities, schedules, and expenses. TriPlan provides a central workspace where travellers can organise their journeys, keep track of spending, and monitor their planning progress.

Users can create an account, manage multiple trips, organise activities by date, record expenses, and review useful insights through a clean, responsive interface.

### Key Highlights

* Account creation and login with protected pages
* Trip creation with destination, dates, traveller details, and budget
* Separate Active and Completed trip sections
* Day-by-day trip planning
* Activity management with estimated and actual costs
* Expense tracking and budget monitoring
* Insights into spending and planning progress
* User-specific trip data stored in browser `localStorage`
* Responsive layouts for desktop, tablet, and mobile

---

## Features

### 1. Account Management and Authentication

* Built-in test account for quick access.
* Sign up using a name, email address, Indian mobile number, and password.
* Password validation requiring at least eight characters, one uppercase letter, and one number.
* Protected application pages with login redirection.
* Return to the originally requested page after successful login.
* Header avatar displaying the user's first initial.
* Profile page displaying account information and trip statistics.
* Logout functionality.

### 2. Create and Manage Trips

Create a trip by entering:

* Trip name
* Destination
* Start and end dates
* Traveller name and mobile number
* Estimated trip budget

**Validation rules include:**

* The end date cannot be earlier than the start date.
* The estimated budget must be greater than ₹0.
* Indian mobile numbers are validated, with certain invalid or placeholder patterns rejected.

### 3. My Trips

Keep all journeys organised in one place.

* View trips in separate **Active** and **Completed** sections.
* Identify trip status through visual badges.
* Open a trip to access its workspace.
* Delete trips when they are no longer needed.
* Keep each user's trip data separate from other accounts.

### 4. Trip Workspace

Each trip has a dedicated workspace with five tabs.

| Tab            | Features                                                                                  |
| -------------- | ----------------------------------------------------------------------------------------- |
| **Overview**   | Activity count, completion percentage, total spending, and remaining budget               |
| **Trip Plan**  | Day-by-day schedule covering the trip dates and planned activities                        |
| **Activities** | Add, edit, delete, and complete activities                                                |
| **Budget**     | Estimated budget, total spending, remaining amount, budget status, and expense management |
| **Insights**   | Average daily spending, top spending category, planning coverage, and activity progress   |

### 5. Activity Management

Organise activities throughout your journey with the following details:

* Activity date and time
* Location
* Category
* Estimated cost
* Actual cost
* Notes
* Completion status

Activities can be added, edited, deleted, and marked as complete. Activity dates must fall within the trip's start and end dates.

### 6. Budget and Expense Tracking

Monitor travel expenses and compare spending against the planned budget.

* View the estimated trip budget.
* Track total spending and the remaining budget.
* Add, edit, and delete expenses.
* Categorise spending to understand where money goes.
* View a budget health indicator: **Healthy**, **Watch Spending**, or **Over Budget**.

**Spending calculation:** When an activity has an actual cost entered, that amount is used. Otherwise, its estimated cost is used. This allows spending summaries to reflect recorded expenses and planned costs for activities that have not yet been finalised.

Expense dates must fall within the trip dates.

### 7. Travel Insights

The Insights tab provides a simple overview of trip planning and spending, including:

* Average daily spending
* Top spending category
* Planning coverage
* Activity completion progress

These indicators help users understand their planning progress and budget usage at a glance.

### 8. Responsive Design

TriPlan uses CSS Grid, Flexbox, and media queries to adapt its layouts to different screen sizes.

* Desktop: spacious layouts and multi-column grids.
* Tablet: adjusted spacing and simplified grid layouts.
* Mobile: stacked forms, full-width buttons, and a compact header.
* Small mobile screens: reduced spacing and simplified navigation.

---

## Tech Stack

| Technology             | Purpose                                                                       |
| ---------------------- | ----------------------------------------------------------------------------- |
| **HTML5**              | Page structure and semantic markup                                            |
| **CSS3**               | Styling, custom properties, Flexbox, Grid, and responsive layouts             |
| **Vanilla JavaScript** | Authentication, application logic, validation, rendering, and data management |
| **localStorage**       | Browser-based storage for accounts, sessions, and trip data                   |
| **Unsplash**           | Destination imagery                                                           |

TriPlan uses no JavaScript frameworks, external UI libraries, backend services, or build tools.

---

## Project Structure

```text
TriPlan/
├── index.html
├── login.html
├── profile.html
├── create-trip.html
├── trips.html
├── trip.html
├── css/
│   ├── style.css
│   ├── components.css
│   └── responsive.css
├── js/
│   └── app.js
├── assets/
├── .gitignore
└── README.md
```

### File Responsibilities

* `index.html` — Landing page.
* `login.html` — Login and account registration.
* `profile.html` — User profile and trip statistics.
* `create-trip.html` — Trip creation form.
* `trips.html` — Active and completed trip listings.
* `trip.html` — Trip workspace and its five tabs.
* `css/style.css` — Design tokens, global styles, and page layouts.
* `css/components.css` — Reusable UI components, including buttons, cards, forms, badges, and tabs.
* `css/responsive.css` — Responsive rules for different screen sizes.
* `js/app.js` — Application logic, authentication, storage, rendering, and validation.
* `assets/` — Logo and other project assets.

---

## Getting Started

### Prerequisites

* A modern web browser such as Google Chrome, Microsoft Edge, Firefox, or Safari.
* Python installed if you want to use the optional local development server.

No dependency installation or build process is required.

### 1. Clone the Repository

```bash
git clone <YOUR_REPOSITORY_URL>
```

Replace `<YOUR_REPOSITORY_URL>` with your actual GitHub repository URL.

### 2. Open the Project Folder

```bash
cd TriPlan
```

### 3. Run TriPlan

**Option A — Open directly**

Open `index.html` in your browser.

**Option B — Use a local development server (recommended)**

```bash
python -m http.server 8000
```

Open the following address in your browser:

```text
http://localhost:8000
```

Using a local server provides a consistent environment for testing the application.

---

## Test Account

Use the following demonstration credentials if the built-in account is available in your current version.

| Field    | Value               |
| -------- | ------------------- |
| Email    | `admin@triplan.com` |
| Password | `admin@triplan`     |

You can also register a new account through the **Create account** tab on the login page.

> **Note:** The test account credentials are for demonstration purposes only. Do not use them for any real or sensitive information.

---

## Data Storage

TriPlan stores application data in the browser's `localStorage`. No external database or cloud storage is used.

| Storage key             | Purpose                                        |
| ----------------------- | ---------------------------------------------- |
| `triplan_users`         | Registered account information                 |
| `triplan_session`       | Current login session                          |
| `triplan_trips_<email>` | Trips associated with a specific account email |

### Important Storage Behaviour

* Data remains in the browser until it is cleared or removed by the application.
* Data does not automatically synchronise across browsers or devices.
* Different browsers and browser profiles maintain separate storage.
* Clearing site data can remove locally stored accounts and trips.
* User-specific storage keys provide application-level data separation, not strong security isolation.

---

## Business Rules

TriPlan follows these core application rules:

1. Trip end dates cannot precede start dates.
2. Budgets must be positive values.
3. Activity and expense dates must fall within the associated trip dates.
4. Actual activity costs take precedence over estimated costs when calculating spending.
5. Completed trips are read-only.
6. Trip data is associated with the relevant account.
7. Budget indicators reflect spending in relation to the estimated budget.

---

## Known Limitations

TriPlan is a front-end demonstration project. Its current limitations include:

* No backend or database.
* No cloud synchronisation or cross-device access.
* Passwords are stored in plain text in browser storage.
* Authentication and access checks run entirely on the client side.
* No password reset or email verification system.
* No server-side authorisation or secure session management.
* Currency is limited to Indian rupees (₹).
* Destination images require an internet connection.
* Browser storage can be lost when site data is cleared.

**Security warning:** Do not enter real or reused passwords, sensitive personal information, or confidential travel details. Client-side authentication and `localStorage` are not suitable for securing a production application.

---

## Future Improvements

Potential enhancements for future versions include:

* Backend authentication with securely hashed passwords.
* Server-side authorisation and session management.
* Database integration and cloud synchronisation.
* Password recovery and email verification.
* Exporting trip plans to PDF and calendar formats.
* Sharing trips with other travellers.
* Currency conversion for international travel.
* Enhanced spending visualisations and analytics.
* Automated testing and improved accessibility.

---

## Learning Outcomes

TriPlan demonstrates practical front-end development skills, including:

* Building a multi-page web application.
* Designing responsive interfaces with CSS.
* Implementing form validation and user interactions.
* Managing application state with vanilla JavaScript.
* Using browser storage for persistent data.
* Creating CRUD operations for trips, activities, and expenses.
* Implementing client-side authentication flows.
* Calculating budget summaries and planning insights.
* Organising a project into reusable stylesheets and application logic.

---

## Author

**Dhiraj Mane**

Built as a resume and portfolio project to demonstrate front-end web development, application design, and practical JavaScript skills.

---

**TriPlan — Plan Smart. Travel Better.**

*Plan your journeys. Organise your activities. Stay on top of your budget.*
