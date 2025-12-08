# SRM Attendance Web

A modern, responsive web application designed for SRM Institute of Science and Technology students to track their attendance and academic performance. This project provides a user-friendly dashboard to view attendance records, internal marks, and predict future grades based on current performance.

## Features

*   **Attendance Tracking:** Real-time synchronization of attendance data from the university portal.
*   **Internal Marks:** view detailed internal assessment scores.
*   **Grade Prediction:** Interactive tool to calculate required scores for desired grades.
*   **Dark Mode UI:** A premium, "Linear-style" dark interface with glassmorphism effects.
*   **Mobile Responsive:** Fully optimized for mobile devices with touch-friendly interactions.
*   **Privacy Focused:** No student credentials are stored on the server. Data is handled locally or via secure session logic.

## Tech Stack

*   **Framework:** Next.js (React)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS
*   **Automation:** Puppeteer (for scraping)

## Getting Started

### Prerequisites

*   Node.js (v18 or higher)
*   npm

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/milind899/srm-attendance-web.git
    cd srm-attendance-web
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Run the development server:
    ```bash
    npm run dev
    ```

4.  Open [http://localhost:3000](http://localhost:3000) with your browser.

## Scraper Information

This application uses Puppeteer to scrape data from the SRM student portal.
*   **ENT Scraper:** Handles scraping for Engineering & Technology students.
*   **FSH Scraper:** Handles scraping for Science & Humanities students (includes specific logic for frame handling).

## License

## License

This project is licensed under the **Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International License (CC BY-NC-ND 4.0)**.

**You are free to:**
*   **Share** — copy and redistribute the material in any medium or format.

**Under the following terms:**
*   **Attribution** — You must give appropriate credit.
*   **NonCommercial** — You may not use the material for commercial purposes.
*   **NoDerivatives** — If you remix, transform, or build upon the material, you may not distribute the modified material.

See the [LICENSE](LICENSE) file for details.

## Disclaimer

This project is a student-built tool and is not affiliated with, endorsed by, or representing SRM Institute of Science and Technology (SRMIST). It is intended only for personal and educational use.
