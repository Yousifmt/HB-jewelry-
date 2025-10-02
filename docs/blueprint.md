# **App Name**: HB Jewelry Dashboard

## Core Features:

- KPI Dashboard: Displays key performance indicators including total revenue, total cost, total profit, and items sold within a selected date range.
- Interactive Charts: Generates revenue, profit, and sales overview charts, driven by real-time data from Firestore.
- Date Range Filtering: Allows users to select a date range to dynamically update KPIs and charts, providing insights into specific periods.
- Product Management: Enables adding new jewelry items (with image uploads to Firebase Storage), marking items as sold, and deleting items along with their associated images. Image urls stored in Firestore.
- CSV Export: Exports visible rows from the products table to a CSV file for external analysis and reporting.
- Contribution Tracking: Shows each owner's financial contribution in BHD. The amounts may be adjusted through the UI.
- Real-time Data Sync: Keeps the dashboard updated in real-time with data pulled from Firebase Firestore, providing up-to-date metrics without manual refreshing.

## Style Guidelines:

- Primary color: Dark teal (#008080), extracted from the HB logo, to provide a sophisticated and trustworthy feel.
- Accent color: Light teal (#70DBD4), extracted from the HB logo, to highlight interactive elements and important information.
- Background color: Off-white (#FAF9F6) to provide a neutral and clean backdrop, ensuring readability and focus on the data.
- Body and headline font: 'PT Sans' (sans-serif) for a modern yet readable appearance, suitable for both headings and body text. Note: currently only Google Fonts are supported.
- Use minimalist, consistent icons to represent different actions and data categories.
- Employ rounded cards and generous spacing to create a clean, professional, and responsive layout.
- Incorporate subtle transitions and animations to provide a smooth user experience, such as loading spinners and confirmations.