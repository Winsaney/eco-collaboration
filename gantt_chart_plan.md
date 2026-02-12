# Gantt Chart Implementation Plan

## Objective
Add a Gantt chart feature to visualizing project schedules based on `Store.demands`.

## Steps

1.  **Modify `index.html`**:
    *   Add a logic entry in the sidebar navigation: `<a href="#" class="nav-item" data-page="gantt" id="nav-gantt">`.
    *   Add a new page section: `<div class="page" id="page-gantt">`.
    *   Inside the page, add a toolbar (filter by status/time) and a container for the chart: `#gantt-chart-container`.

2.  **Modify `style.css`**:
    *   Add styles for `.gantt-container`, `.gantt-header`, `.gantt-body`, `.gantt-row`, `.gantt-bar`, `.gantt-timeline`.
    *   Ensure it matches the existing dark theme (using variables like `--bg-card`, `--primary`, etc).

3.  **Modify `app.js`**:
    *   Update `titles` object to include `gantt: '项目排期'`.
    *   Add `renderGantt()` function.
    *   In `renderGantt()`:
        *   Calculate min/max dates from all demands to define the timeline range.
        *   Generate the timeline header (months/days).
        *   Iterate through demands and generate rows.
        *   Calculate `left` and `width` percentages for each bar based on `createdAt` (start) and `deadline` (end).
        *   Color code bars based on status using `getStatusClass` or similar.
    *   Update `switchPage` to call `renderGantt` when selected.

## Gantt Logic Details
*   **Time Range**: Dynamic, based on the data. Buffer of 7 days before first task and after last task.
*   **Scale**: Day-based logic for positioning.

## Status
- [x] Modify index.html
- [x] Modify style.css
- [x] Modify app.js
- [x] Verify Implementation

