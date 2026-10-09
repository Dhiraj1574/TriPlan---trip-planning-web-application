TriPlan — Plan Smart. Travel Better.

A front-end trip planning web application for organising journeys, activities, and budgets in one place.

Overview

TriPlan helps you plan a trip from start to finish. Create an account, set up a trip, plan activities day by day, and track your budget and expenses. The Insights tab shows simple figures about your spending and planning progress.

TriPlan is built with HTML, CSS, and vanilla JavaScript. It has no backend, no frameworks, and no build step. All data is stored in your browser’s localStorage.

Features
Accounts and Authentication
Built-in test account for quick access.
Sign-up with name, email, Indian mobile number, and password.
Strict password rules: at least 8 characters, 1 uppercase letter, and 1 number.
Protected pages (My Trips, Create Trip, Trip Workspace, Profile) redirect to the login page. After you log in, you return to the page you asked for.
Header avatar button shows your first initial and opens your profile.
Profile page shows your name, email, mobile number, trip counts, and a logout button.
Trip Creation
Enter the trip name, destination, start and end dates, traveler name and mobile number, and estimated budget.
Validation:
The end date cannot be before the start date.
The budget must be greater than ₹0.
The mobile number must be a realistic Indian number. Patterns such as 9111111111 and 9876543210 are rejected.
My Trips
Trips are split into Active and Completed sections.
Each trip card shows a status badge.
Each card has actions to open or delete the trip.
Trip Workspace

The workspace has five tabs:

Tab	What it shows or does
Overview	Activity count, completion percentage, total spent, and remaining budget.
Trip Plan	A day-by-day schedule of all trip dates with planned activities.
Activities	Add, edit, delete, and mark activities complete. Fields: date, time, location, category, estimated cost, actual cost, and notes.
Budget	Estimated budget, total spent, remaining amount, and a health indicator (Healthy, Watch Spending, Over Budget). Add, edit, and delete expenses.
Insights	Average daily spending, top spending category, planning coverage, and activity progress.
Business Rules
Activity and expense dates must fall within the trip dates.
Spending uses the actual cost when one is entered. Otherwise it uses the estimated cost.
Completed trips become read-only.
Data is isolated per user. Each account sees only its own trips.
Tech Stack
HTML5 for page structure
CSS3 with custom properties, Flexbox, Grid, and media queries
Vanilla JavaScript with no frameworks or libraries
localStorage for accounts, sessions, and trip data
Unsplash images for destination cards

Project Structure:

TriPlan/
├── index.html          Landing page
├── login.html          Log in and create an account
├── profile.html        User profile (login required)
├── create-trip.html    Create a new trip (login required)
├── trips.html          My Trips list (login required)
├── trip.html           Trip workspace (login required)
├── css/
│   ├── style.css       Design tokens, global layout, and page sections
│   ├── components.css  Reusable components (buttons, cards, forms, badges, tabs)
│   └── responsive.css  Breakpoints for tablet, mobile, and small mobile
├── js/
│   └── app.js          Authentication, trip storage, rendering, and validation
├── assets/             Logo and destination images
├── .gitignore          Files Git should ignore
└── README.md           Project documentation
Getting Started
Requirements
A modern web browser such as Chrome, Edge, Firefox, or Safari.
No installation or build step is needed.
Run the Project

Option 1: Open the file

Download or clone the repository.
Open the project folder.
Double-click index.html.

Option 2: Use a local server

bash
cd TriPlan
python -m http.server

Then open http://localhost:8000 in your browser.

Test Account
Field	Value
Email	admin@triplan.com
Password	admin@triplan

You can also create your own account from the Create account tab on the login page.

Data Storage

All data is stored in localStorage in your browser.

Key	What it holds
triplan_users	Registered accounts (name, email, mobile, password)
triplan_session	The currently logged-in user
triplan_trips_<email>	The trips belonging to that user
Responsive Design
Breakpoint	Layout changes
Up to 900px	Single-column hero, two-column grids, adjusted spacing
Up to 640px	Stacked forms, full-width buttons, compact header
Up to 400px	Hides header text links and tightens spacing
Known Limitations
No backend, so data does not sync across devices.
Passwords are stored in plain text.
There is no password reset.
Amounts are in Indian rupees (₹) only.
Destination images need an internet connection.
Future Improvements
Server-side authentication with hashed passwords
Cloud storage for accounts and trips
Export trips to PDF or calendar files
Trip sharing with other travellers
Currency conversion
Security Note

TriPlan is a demonstration project. It is not production-ready. Passwords are stored in plain text in the browser, and login checks run on the client side. Do not use a real personal password in this app. A production version would need a server, hashed passwords, and secure session handling.

Author

DHIRAJ MANE
Built as a resume and portfolio project.
