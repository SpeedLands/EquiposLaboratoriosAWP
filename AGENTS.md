# AGENTS.md

## Tools available in this repository

### 1. DB Connection Agent
- **File:** `db.php`
- **Description:** Handles PDO connection to MySQL.
- **Usage:** Use strictly for database interactions using prepared statements.

### 2. Service Worker Manager
- **File:** `sw.js`
- **Description:** Manages offline caching strategy.
- **Capabilities:** Handles 'Network First' logic for API calls and 'Cache First' for assets.
- **Conventions:** Any updates to static assets require version bump in this file.

### 3. API Handler
- **File:** `api.php`
- **Description:** Returns JSON responses for frontend requests.
- **Inputs:** Expects GET/POST parameters validated against SQL injection.