# 🏦 Apex Core Retail Bank Platform

A modular, production-hardened full-stack retail banking and automated credit underwriting platform. This system utilizes asynchronous multi-part file intake memory buffers, real-time machine risk-scoring algorithms, and strict PostgreSQL transaction controls (`BEGIN`/`COMMIT`/`ROLLBACK`) to process credit applications securely.

---

## 🏗️ System Architecture

The backend has been completely decentralized into a highly scalable, decoupled router layout to isolate concerns and prevent cross-contamination of components:

```text
loan_management_system/
├── config/
│   └── db.js                  # Centralized PostgreSQL Connection Pool
├── middleware/
│   └── authMiddleware.js      # JWT Token & Role Verification Interceptors
├── routes/
│   ├── auth.js                # Registration, Secure Login, & Hashing
│   ├── calculator.js          # Dynamic Product Catalog & FOIR Estimator
│   ├── customer.js            # Secure KYC File Upload & Intake Pipeline
│   └── admin.js               # Underwriter Operations, Metrics, & Provisioning
├── secure_uploads/            # Local Encrypted/Sanitized Disk Storage (Ignored by Git)
├── .env                       # Local Environment Injection Secrets (Ignored by Git)
├── .gitignore                 # Defensive Repository Tracking Guard
├── server.js                  # Central Gateway Proxy Router & Bootstrapper
└── package.json
⚡ Key Architectural Implementations
🛡️ 1. Safe Binary Multi-Part Stream Processing
To defend against legacy formatting vulnerabilities or server buffer dropouts during document evaluation, file intake processes raw incoming forms inside isolated memory buffers (multer.memoryStorage()). Valid binary packages are subsequently converted into immutable sequential structures using Node Buffer.from() copies before being committed to local storage.

📊 2. Algorithmic Machine Credit Risk Engine
Applications are calculated against dynamic metric scoring constraints before being written to state:

Leverage Ratio Evaluation: Flags and alters parameters based on proportional principal-to-income benchmarks.

50% FOIR Protection Rule: Automated constraints throw systemic infeasibility responses if a projected product EMI consumes greater than 50% of an applicant's net monthly income.

🗃️ 3. Atomic Database Consistency
All core applicant workflows wrap inside explicit PostgreSQL transactional shields. If file generation, schema execution, or column mapping fails at any subset point, a complete system ROLLBACK is issued to prevent ledger contamination.

🛠️ Installation & Setup Commands
Run these sequential operational commands inside your terminal window to deploy your dependencies, spin up server layers, and link your code safely to GitHub.

1. Project Initialization & Dependency Deployment
Bash
# Clone or navigate directly into your project workspace root
cd loan_management_system

# Install all localized backend infrastructure engines
npm install

# Move into the frontend workspace environment and install view dependencies
cd frontend
npm install

# Return to the primary workspace root directory path
cd ..
2. Environment Configuration
Create a .env file inside your backend root directory:

Ini, TOML
PORT=5000
JWT_SECRET=YOUR_SECURE_JWT_SIGNATURE_KEY
DB_USER=postgres
DB_HOST=localhost
DB_NAME=loan_system
DB_PASSWORD=YOUR_POSTGRESQL_PASSWORD
DB_PORT=5432
3. Database Schema Setup
Execute these structural migrations inside your pgAdmin query tool or psql terminal to spin up the relational storage matrices:

SQL
-- 1. Users Table
CREATE TABLE public.users (
    user_id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'customer',
    age INT DEFAULT 25,
    monthly_income NUMERIC(12,2) DEFAULT 0.00,
    credit_score INT DEFAULT 650
);

-- 2. Bank Schemes Catalog Table
CREATE TABLE public.bank_schemes (
    scheme_id SERIAL PRIMARY KEY,
    scheme_name VARCHAR(100) NOT NULL,
    interest_rate NUMERIC(5,2) NOT NULL,
    min_income_required NUMERIC(12,2) NOT NULL,
    max_tenure_months INT NOT NULL
);

-- 3. Loan Applications Table
CREATE TABLE public.loan_applications (
    application_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES public.users(user_id) ON DELETE CASCADE,
    scheme_id INT REFERENCES public.bank_schemes(scheme_id),
    amount_applied NUMERIC(12,2) NOT NULL,
    tenure_months INT NOT NULL,
    status VARCHAR(20) DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. KYC Documents Table
CREATE TABLE public.kyc_documents (
    document_id SERIAL PRIMARY KEY,
    application_id INT REFERENCES public.loan_applications(application_id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    file_url VARCHAR(255) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
 Running the Platform Runtime Engines
Start the Decentralized API Backend
Bash
# From the project root folder directory path
node server.js
Expected Output: 🚀 Automated Fullstack Risk Engine serving over Port 5000

Start the React Frontend UI Server
Bash
# Move straight inside your frontend source module directory
cd frontend
npm run dev
