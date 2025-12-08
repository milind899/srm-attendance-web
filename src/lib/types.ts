export interface AttendanceRecord {
    subjectName: string;
    subjectCode: string;
    category?: string; // 'Theory' or 'Practical'
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
    internalMarks?: InternalMarksData; // Added for ENT separate marks
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

export interface StudentProfile {
    studentName: string;
    studentId: string;
    registrationNumber: string;
    email: string;
    institution: string;
    program: string;
    year?: string;
    semester?: string;
    section?: string;
    batch?: string;
}

export interface ProfileResult {
    success: boolean;
    data?: StudentProfile;
    error?: string;
}
