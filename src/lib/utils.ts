import { AttendanceRecord } from "./types";

/**
 * Calculates how many classes can be safely missed to maintain a target percentage.
 */
export function calculateClassesToMiss(
    total: number,
    attended: number,
    targetPercentage: number = 75
): number {
    if (total === 0) return 0;
    const currentPercentage = (attended / total) * 100;
    if (currentPercentage < targetPercentage) return 0;

    // Formula: (Attended) / (Total + x) >= Target%
    // Attended >= Target% * (Total + x)
    // Attended / Target% >= Total + x
    // (Attended / Target%) - Total >= x

    const targetRatio = targetPercentage / 100;
    const maxTotal = attended / targetRatio;
    return Math.floor(maxTotal - total);
}

/**
 * Calculates how many classes must be attended to reach a target percentage.
 */
export function calculateClassesToAttend(
    total: number,
    attended: number,
    targetPercentage: number = 75
): number {
    // Formula: (Attended + x) / (Total + x) >= Target%
    // Attended + x >= Target% * (Total + x)
    // Attended + x >= Target% * Total + Target% * x
    // x - Target% * x >= Target% * Total - Attended
    // x * (1 - Target%) >= Target% * Total - Attended
    // x >= (Target% * Total - Attended) / (1 - Target%)

    const targetRatio = targetPercentage / 100;
    const numerator = targetRatio * total - attended;
    const denominator = 1 - targetRatio;

    if (denominator === 0) return 0; // Avoid division by zero

    const needed = Math.ceil(numerator / denominator);
    return needed > 0 ? needed : 0;
}

/**
 * Calculates the final mark based on internal and external marks.
 * Assumptions:
 * - Internal totals 50 Marks
 * - External totals 100 Marks (scaled down to 50%)
 * OR
 * - Internal totals 100 which is scaled to 50
 */
export function calculateFinalMark(internal: number, external: number, maxInternal: number = 50): number {
    // Normalize internal to 50
    const internalNormalized = (internal / maxInternal) * 50;

    // Normalize external to 50 (assuming exams are out of 100 usually)
    const externalNormalized = (external / 100) * 50;

    return Math.round(internalNormalized + externalNormalized);
}

export function calculateGrade(totalMarks: number): string {
    if (totalMarks >= 91) return 'O';
    if (totalMarks >= 81) return 'A+';
    if (totalMarks >= 71) return 'A';
    if (totalMarks >= 61) return 'B+';
    if (totalMarks >= 56) return 'B';
    if (totalMarks >= 50) return 'C';
    // SRM Pass mark is usually 50% aggregate for some courses, but F is below.
    // Let's assume standard passing is required.
    return 'F';
}

export function getGradePoint(grade: string): number {
    switch (grade) {
        case 'O': return 10;
        case 'A+': return 9;
        case 'A': return 8;
        case 'B+': return 7;
        case 'B': return 6;
        case 'C': return 5;
        default: return 0;
    }
}

/**
 * Calculates the external mark (out of 100) required to reach a target total.
 */
export function calculateRequiredExternal(internal: number, targetTotal: number, maxInternal: number = 50): number {
    // Target <= NormalizedInternal + NormalizedExternal
    // Target <= (Internal/Max * 50) + (External/100 * 50)
    // Target - (Internal/Max * 50) <= External/2
    // 2 * (Target - (Internal/Max * 50)) <= External

    const internalNormalized = (internal / maxInternal) * 50;
    const requiredExternalNormalized = targetTotal - internalNormalized;
    return Math.ceil(requiredExternalNormalized * 2);
}
