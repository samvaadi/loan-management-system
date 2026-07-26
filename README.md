# 🏦 Apex Core Retail Bank Platform



A full-stack, intelligent loan management and underwriting platform built with Node.js, Express, PostgreSQL, and React (Tailwind CSS). The system features automated repayment workers, data-driven credit risk assessment, and 3-sigma anomaly/fraud detection.

---

##  Key Features

* **Authentication & Role-Based Access (RBAC):** Secure JWT session isolation supporting `customer`, `admin`, and `master_admin` tiers.
* **Smart Financial Calculator:** Dynamic EMI, amortization, and eligibility matrix evaluator.
* **Background Repayment Worker:** Automated cron sweep that processes loan dues, enforces a 3-day grace period, and applies late-fee penalties.
* **Predictive Data Science Engine:**
  * **Risk-Adjusted Revenue Forecast:** Models expected portfolio yield by scaling remaining balances against individual Probability of Default ($PD$) metrics.
  * **3-Sigma Outlier Detection:** Identifies anomalous application requests ($>3\sigma$ above system mean) for underwriting review.
* **Full Data Seeding Suite:** Programmatic mock generator covering safe profiles, delinquent accounts, borderline grace-period entries, and statistical fraud vectors.

---

##  Tech Stack

* **Frontend:** React, Vite, Tailwind CSS
* **Backend:** Node.js, Express.js
* **Database:** PostgreSQL (`pg` connection pool)
* **Authentication:** JSON Web Tokens (JWT), `bcrypt`

---
