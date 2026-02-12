# Backend Implementation Plan

## Objective
Design and implement a Python (FastAPI) backend with SQLite database for the Ecosystem Collaboration System.

## Technology Stack
- **Language**: Python 3
- **Framework**: FastAPI
- **Database**: SQLite
- **ORM/Driver**: SQLAlchemy (for structured table definitions)

## 1. Database Schema Design (SQLite)
We will create the following tables. JSON fields (like arrays of tags) will be stored as JSON strings.

### Tables
1.  **demands**
    *   `id` (Text, PK)
    *   `category` (Text)
    *   `customer_name` (Text)
    *   `industry` (Text)
    *   `project_name` (Text)
    *   `project_types` (Text/JSON)
    *   `budget` (Text)
    *   `deadline` (Text/Date)
    *   `source` (Text)
    *   `description` (Text)
    *   `painpoints` (Text)
    *   `status` (Text)
    *   `owner` (Text)
    *   `created_at` (Text/Datetime)
    *   `updated_at` (Text/Datetime)

2.  **analyses**
    *   `id` (Text, PK)
    *   `demand_id` (Text, FK -> demands.id)
    *   `clarity` (Integer)
    *   `complexity` (Text)
    *   `product_form` (Text)
    *   `estimated_days` (Integer)
    *   `analyst` (Text)
    *   `core_functions` (Text)
    *   `conclusion` (Text)
    *   `status` (Text)
    *   `created_at` (Text/Datetime)

3.  **partners**
    *   `id` (Text, PK)
    *   `company_name` (Text)
    *   `company_size` (Text)
    *   `industries` (Text/JSON)
    *   `skills` (Text/JSON)
    *   `project_types` (Text/JSON)
    *   `history_count` (Integer)
    *   `quality_score` (Integer)
    *   `available_staff` (Integer)
    *   `schedule` (Text)
    *   `cooperation_status` (Text)
    *   `contact` (Text)
    *   `phone` (Text)
    *   `notes` (Text)

4.  **matchings**
    *   `id` (Text, PK)
    *   `group_id` (Text)
    *   `demand_id` (Text, FK)
    *   `partner_id` (Text, FK)
    *   `rank` (Integer)
    *   `tech_score` (Integer)
    *   `industry_score` (Integer)
    *   `scale_score` (Integer)
    *   `schedule_score` (Integer)
    *   `total_score` (Integer)
    *   `cooperation_mode` (Text)
    *   `reason` (Text)
    *   `risks` (Text)
    *   `product_score` (Integer, Nullable)
    *   `presales_score` (Integer, Nullable)
    *   `status` (Text)
    *   `match_date` (Text/Datetime)

5.  **activities**
    *   `id` (Integer, PK, Auto)
    *   `text` (Text)
    *   `color` (Text)
    *   `created_at` (Text/Datetime)

## 2. API Design
*   `GET /demands` - List all
*   `POST /demands` - Create new
*   `GET /demands/{id}` - Get detail
*   `PUT /demands/{id}` - Update
*   `DELETE /demands/{id}` - Delete
*   (Similar CRUD for `analyses`, `partners`, `matchings`)
*   `GET /dashboard/all` - Aggregate data for dashboard initialization
*   `POST /activities` - Log activity

## 3. Implementation Steps
1.  Create `backend/` directory.
2.  Create `backend/main.py` containing the FastAPI app and SQLAlchemy models.
3.  Create `backend/requirements.txt`.
4.  Run the server.
