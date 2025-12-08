export interface AttendanceRecord {
    subjectName: string;
    subjectCode: string;
    totalHours: number;
    attendedHours: number;
    percentage: number;
    classesToMiss?: number; // Calculated field
    classesToAttend?: number; // Calculated field
}

export interface AttendanceData {
    studentName: string;
    registrationNumber: string;
    records: AttendanceRecord[];
    overallPercentage?: number;
}

export interface ScraperResult {
    success: boolean;
    data?: AttendanceData;
    error?: string;
    captchaNeeded?: boolean;
    captchaImage?: string; // Base64 encoded
    cookies?: string; // Serialized cookies for session maintenance
    csrfToken?: string;
}
