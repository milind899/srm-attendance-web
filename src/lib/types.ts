export interface AttendanceRecord {
    subjectName: string;
    subjectCode: string;
    category?: string; // 'Theory' or 'Practical'
    totalHours: number;
    attendedHours: number;
    percentage: number;
    classesToMiss?: number;
    classesToAttend?: number;
    // ENT-specific fields
    credits?: number;
    faculty?: string;
    slot?: string;
    room?: string;
}

// Profile Data
export interface ProfileData {
    studentName: string;
    studentId: string;
    registerNo: string;
    emailId: string;
    institution: string;
    program: string;
    department?: string;
    semester?: string;
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
    cookies?: any[]; // Allow any structure for cookies (ENT) or string (FSH)
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

// Timetable Types
export interface EnrolledSlot {
    subjectCode: string;
    subjectName: string;
    slot: string; // e.g. "A", "G1", "P1"
}

export interface TimeTableSlot {
    dayOrder: string; // "1", "2", "3", "4", "5"
    period: string;   // "1" to "10" (or time range)
    slotType: string; // "A", "B", "G", etc.
}

export interface TimetableData {
    enrolledSlots: EnrolledSlot[];
    masterSlots: TimeTableSlot[];
    batch: string; // "1" or "2"
}

export interface TimetableResult {
    success: boolean;
    data?: TimetableData;
    error?: string;
    cookies?: any[]; // Added for session reuse
}
