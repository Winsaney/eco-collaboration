# Backend Setup Instructions

## Prerequisites
- Python 3.8+
- pip

## Quick Start
1.  Navigate to the project root:
    ```bash
    cd c:/Users/wangye.vendor/docs/plans/ecosystem-collaboration
    ```

2.  Install dependencies:
    ```bash
    pip install -r backend/requirements.txt
    ```

3.  Run the server:
    ```bash
    python backend/main.py
    ```
    The server works on `http://localhost:8000`.

## Database
The SQLite database `ecosystem.db` is automatically created in the root directory upon the first run of the application.

## API Documentation
Once the server is running, visit **http://localhost:8000/docs** to see the interactive Swagger UI and test the API endpoints.

## Frontend Integration
To use this backend with the frontend, modify `app.js` to replace the local `Store` operations with `fetch()` calls to `http://localhost:8000/api/...`.

Example `loadData` replacement:
```javascript
async function loadData() {
    try {
        const res = await fetch('http://localhost:8000/api/store');
        const data = await res.json();
        Object.assign(Store, data);
        renderDashboard(); // and other renders
    } catch (e) {
        console.error("Failed to load backend data", e);
        initSampleData(); // Fallback
    }
}
```
