"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const TraceTemplate_1 = require("./TraceTemplate");
const utils_1 = require("../utils");
// CLASS DEFINITION
// ================================================================================================
class LoopBaseTemplate extends TraceTemplate_1.TraceTemplate {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(domain) {
        super(domain);
        this.masks = [];
        this._stepsToIntervals = new Map();
        this._cycleLength = 0;
    }
    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get cycleLength() {
        return this._cycleLength;
    }
    // PUBLIC FUNCTIONS
    // --------------------------------------------------------------------------------------------
    addSegment(intervals) {
        for (let interval of intervals) {
            let start = interval[0], end = interval[1];
            // make sure the interval is valid
            utils_1.validate(start >= 0, errors.intervalStartTooLow(start, end));
            utils_1.validate(end >= start, errors.intervalStartAfterEnd(start, end));
            // make sure the interval does not conflict with previously added intervals
            for (let i = start; i <= end; i++) {
                if (this._stepsToIntervals.has(i)) {
                    utils_1.validate(false, errors.intervalStepOverlap(start, end, this._stepsToIntervals.get(i)));
                }
                this._stepsToIntervals.set(i, interval);
            }
            // update cycle length
            if (end >= this._cycleLength) {
                this._cycleLength = end + 1;
            }
        }
        // make mask in all other segments have the same length
        for (let mask of this.masks) {
            const diff = this._cycleLength - mask.length;
            if (diff > 0) {
                let filling = new Array(diff).fill(0n); // TODO: this.field.zero
                mask.push(...filling);
            }
        }
        // build the mask
        const mask = new Array(this._cycleLength).fill(0n); // TODO: this.field.zero
        for (let [start, end] of intervals) {
            for (let i = start; i <= end; i++) {
                mask[i] = 1n; // TODO: this.field.one
            }
        }
        // build and add the new segment to the list
        this.masks.push(mask);
    }
    validate() {
        utils_1.validate(utils_1.isPowerOf2(this.cycleLength), errors.cycleLengthNotPowerOf2(this.cycleLength));
        for (let i = 1; i < this.cycleLength; i++) {
            utils_1.validate(this._stepsToIntervals.get(i) !== undefined, errors.intervalStepNotCovered(i));
        }
    }
}
exports.LoopBaseTemplate = LoopBaseTemplate;
// ERRORS
// ================================================================================================
const errors = {
    inputNotInOuterLoop: (i) => `input ${i} is missing from the outer loop`,
    intervalStartTooLow: (s, e) => `invalid step interval [${s}..${e}]: start index must be greater than 0`,
    intervalStartAfterEnd: (s, e) => `invalid step interval [${s}..${e}]: start index must be smaller than end index`,
    intervalStepOverlap: (s1, e1, i2) => `step interval [${s1}..${e1}] overlaps with interval [${i2[0]}..${i2[1]}]`,
    cycleLengthNotPowerOf2: (s) => `total number of steps is ${s} but must be a power of 2`,
    intervalStepNotCovered: (i) => `step ${i} is not covered by any expression`
};
//# sourceMappingURL=LoopBaseTemplate.js.map