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
