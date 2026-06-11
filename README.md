# ATBU Smart Bus Reservation System (SBRS)

A modern, full-stack bus reservation system designed for the Abubakar Tafawa Balewa University (ATBU) Yelwa and Gubi campuses. It allows students to book tickets, simulate payments, view ticket histories, and receive QR codes. Administrators can manage buses, view real-time statistics, manage other admin users, and scan student tickets to authorize boarding.

---

## 🚀 Technical Stack

### Core Framework & Language
*   **Next.js 15.5 (App Router)**: Fast, server-side rendered React 19 framework.
*   **TypeScript**: Type safety across client components, API routes, and database operations.

### Database & ORM
*   **PostgreSQL (Neon Serverless)**: Scalable cloud-hosted SQL database.
*   **Prisma Client & Prisma Migrate (v6)**: Database ORM to model schemas, generate client types, and run migrations.

### Security & Authentication
*   **Custom Cookie-Based Session Store**: Lightweight custom session engine inside `lib/auth.ts` encrypting JSON payloads with a `crypto` HMAC-SHA256 token verification (similar to `iron-session`).
*   **Bcrypt.js**: Salting and hashing administrator passwords.
*   **Zod**: Runtime schema validation for forms, APIs, and environment variables.

### Styling & UI Components
*   **TailwindCSS v4**: Premium utility-first styling with PostCSS.
*   **Custom Design System**: Harmonic typography, sleek card layouts, micro-animations, and glassmorphic attributes.

### QR Code & Scanner
*   **qrcode**: Generates high-quality QR code PNG buffers server-side for tickets.
*   **html5-qrcode**: Integrated client-side scanner using the device camera to validate QR codes.

### Notifications
*   **Nodemailer**: For configuring SMTP transport and dispatching email receipts/tickets to students.

---

## ✨ Features & How They Work

### 1. Student Portal (`app/(student)`)
*   **Real-time Bus Registry**: Students can view active, full, or departed buses, check remaining seats, and choose between the two main campus routes:
    *   **Yelwa to Gubi**
    *   **Gubi to Yelwa**
*   **Payment Checkout (Paystack Sandbox)**:
    *   Initiates a payment transaction using Paystack's API.
    *   **Dev Stub Mode**: Can switch to a mock payment checkout system (via `USE_PAYSTACK_STUB=true`) that simulates a live checkout and hooks up webhooks locally.
*   **Ticket History**: Displays active tickets, expired tickets, and already boarded (used) tickets.
*   **Dynamic QR Ticket**: Generates a live QR code representing the ticket token.

### 2. Administrator Portal (`app/(admin)`)
*   **Admin Authentication**: Protected with custom session cookies. Route middleware blocks unauthenticated attempts to access dashboard panels.
*   **Analytics Dashboard**: Visualizes bus occupancies, active scans, and revenue generated from ticket purchases.
*   **Bus Management**: Add new buses, configure seats, set fares, and adjust status (`ACTIVE`, `FULL`, `DEPARTED`).
*   **Live QR Scanner**: Uses the camera to scan student tickets on the spot. If a bus departs, the scanner automatically logs validation status.
*   **Global Settings**: Allows updating variables like the standard bus ticket fare (configured in Kobo, e.g. `60000` Kobo = ₦600).

### 3. Automated Reservation Float & Sweep (`lib/float.ts`)
To prevent students from getting stranded due to bus departures or full buses, a backend scheduling mechanism handles ticket forwarding:
*   **Float**: If an admin marks a bus as departed or if it fills up, paid tickets that haven't been scanned are automatically "floated" to the next oldest active bus on the same route.
*   **Sweep**: A background sweep function checks for stranded passengers from departed buses and moves them forward when a new bus is created.

---

## 🛠️ Getting Started (Local Development)

### 1. Prerequisites
Ensure you have **Node.js v20+** and **npm** installed.

### 2. Environment Setup
Create a `.env` file in the root directory and configure the variables:
```env
# --- Database ---
DATABASE_URL="postgresql://dora:12345678@localhost:5432/smart_bus?schema=public"

# --- Session secret (32+ chars required for encryption) ---
IRON_SESSION_PASSWORD="your_secure_development_secret_key_32_chars_long"

# --- Super-admin seed credentials ---
SUPER_ADMIN_EMAIL="admin@atbu.edu.ng"
SUPER_ADMIN_PASSWORD="admin123"
SUPER_ADMIN_NAME="Super Admin"

# --- App Settings ---
APP_BASE_URL="http://localhost:3000"
DEFAULT_FARE_KOBO="60000"

# --- Paystack Stub Settings ---
USE_PAYSTACK_STUB=true

# --- SMTP Email Stub Settings ---
USE_EMAIL_STUB=true
```

### 3. Setup Database
1. Grant the Postgres user the ability to create databases (needed for the Prisma shadow database locally):
   ```bash
   sudo -u postgres psql -c "ALTER USER dora CREATEDB;"
   ```
2. Run migrations:
   ```bash
   npm run db:migrate
   ```
3. Run the database seed (creates the default admin account):
   ```bash
   npm run db:seed
   ```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🚀 Production Deployment (Render)

### 1. Environment Settings
In the **Render Project Dashboard > Environment**, configure the following variables:
*   `DATABASE_URL`: Your **direct** Neon database connection string (do *not* use a pooled connection string, as migrations cannot run on pooled connections).
*   `IRON_SESSION_PASSWORD`: A secure 32+ character random string.
*   `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`, `SUPER_ADMIN_NAME`: Admin account details for the live database.
*   `RENDER_EXTERNAL_URL`: (Automatically set by Render) Used for webhook callback routing.

### 2. Build Settings
*   **Build Command**: `npm install && npm run build` (This automatically runs database migrations and seeds, then builds the Next.js bundle).
*   **Start Command**: `npm run start`
