game-hub-reservation/
│
├── client/                          # React frontend (Vite)
│   ├── public/
│   │   └── favicon.ico
│   ├── src/
│   │   ├── assets/                  # images, icons, logos
│   │   │
│   │   ├── components/
│   │   │   ├── ui/                  # shadcn/ui components (auto-generated)
│   │   │   │   ├── button.jsx
│   │   │   │   ├── card.jsx
│   │   │   │   ├── dialog.jsx
│   │   │   │   ├── calendar.jsx
│   │   │   │   ├── form.jsx
│   │   │   │   ├── input.jsx
│   │   │   │   ├── select.jsx
│   │   │   │   ├── table.jsx
│   │   │   │   ├── toast.jsx
│   │   │   │   └── ...
│   │   │   ├── layout/
│   │   │   │   ├── Navbar.jsx
│   │   │   │   ├── Footer.jsx
│   │   │   │   ├── Sidebar.jsx
│   │   │   │   └── DashboardLayout.jsx
│   │   │   ├── booking/
│   │   │   │   ├── BookingForm.jsx
│   │   │   │   ├── TimeSlotPicker.jsx
│   │   │   │   ├── BookingCard.jsx
│   │   │   │   └── BookingSummary.jsx
│   │   │   ├── stations/
│   │   │   │   ├── StationCard.jsx
│   │   │   │   ├── StationGrid.jsx
│   │   │   │   └── StationFilters.jsx
│   │   │   └── common/
│   │   │       ├── Loader.jsx
│   │   │       ├── ProtectedRoute.jsx
│   │   │       └── ErrorBoundary.jsx
│   │   │
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Stations.jsx
│   │   │   ├── BookStation.jsx
│   │   │   ├── MyBookings.jsx
│   │   │   ├── Profile.jsx
│   │   │   ├── NotFound.jsx
│   │   │   └── admin/
│   │   │       ├── Dashboard.jsx
│   │   │       ├── ManageStations.jsx
│   │   │       ├── ManageBookings.jsx
│   │   │       └── ManageUsers.jsx
│   │   │
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   │
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   ├── useBookings.js
│   │   │   └── useStations.js
│   │   │
│   │   ├── services/                # API calls
│   │   │   ├── api.js               # axios instance + interceptors
│   │   │   ├── authService.js
│   │   │   ├── bookingService.js
│   │   │   └── stationService.js
│   │   │
│   │   ├── lib/
│   │   │   └── utils.js             # shadcn `cn()` helper
│   │   │
│   │   ├── utils/
│   │   │   ├── formatDate.js
│   │   │   └── constants.js
│   │   │
│   │   ├── routes/
│   │   │   └── AppRoutes.jsx
│   │   │
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css                # Tailwind + shadcn CSS variables
│   │
│   ├── components.json              # shadcn/ui config
│   ├── jsconfig.json                # "@/*" path alias
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── .env
│   └── package.json
│
├── server/                          # Node + Express backend
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js                # MongoDB connection
│   │   │   └── env.js
│   │   │
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── Station.js           # PC / PS5 / Xbox / VR station
│   │   │   ├── Booking.js
│   │   │   └── Payment.js           # optional
│   │   │
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── stationController.js
│   │   │   ├── bookingController.js
│   │   │   └── adminController.js
│   │   │
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── stationRoutes.js
│   │   │   ├── bookingRoutes.js
│   │   │   └── adminRoutes.js
│   │   │
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js    # verify JWT
│   │   │   ├── roleMiddleware.js    # admin / user check
│   │   │   ├── errorHandler.js
│   │   │   └── validate.js          # request validation
│   │   │
│   │   ├── validators/
│   │   │   ├── authValidator.js
│   │   │   └── bookingValidator.js
│   │   │
│   │   ├── utils/
│   │   │   ├── generateToken.js
│   │   │   ├── checkSlotAvailability.js
│   │   │   └── sendEmail.js         # optional
│   │   │
│   │   ├── app.js                   # Express app setup
│   │   └── server.js                # entry point
│   │
│   ├── .env
│   └── package.json
│
├── .gitignore
├── README.md
└── package.json                     # optional root scripts (concurrently)