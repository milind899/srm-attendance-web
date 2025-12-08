export interface AttendanceRecord {
    subjectName: string;
    subjectCode: string;
    totalHours: number;
    attendedHours: number;
    percentage: number;
    classesToMiss?: number;
    classesToAttend?: number;
}

export interface AttendanceData {
    studentName: string;
    registrationNumber: string;
    records: AttendanceRecord[];
    overallPercentage?: number;
}

// Internal Marks Types
export interface MarkComponent {
    date: string;
    component: string;  // e.g., "Theory CLA1", "Theory CLA2"
    marks: number;
    maxMarks: number;
}

export interface SubjectMarks {
    subjectCode: string;
    subjectName: string;
    totalMarks: number;
    maxTotalMarks: number;
    components: MarkComponent[];
}

export interface InternalMarksData {
    studentName: string;
    registrationNumber: string;
    subjects: SubjectMarks[];
}

export interface ScraperResult {
    success: boolean;
    data?: AttendanceData;
    error?: string;
    captchaNeeded?: boolean;
    captchaImage?: string;
    cookies?: string;
    csrfToken?: string;
}

export interface InternalMarksResult {
    success: boolean;
    data?: InternalMarksData;
    error?: string;
}
