// IMPORTS
// ================================================================================================
import { ExpressionDegree } from "./Expression";
import { InputLoop } from "./loops/InputLoop";
import { SegmentLoopBlock } from "./loops/SegmentLoopBlock";

// INTERFACES
// ================================================================================================
export interface DegreeOp {
    (d1: bigint, d2: bigint): bigint;
}

// LOOPS
// ================================================================================================
export function getLoopStructure(loop: InputLoop) {
    const inputTemplate = new Array<number>(loop.registers.size).fill(0);
    const segmentMasks: number[][] = [];

    while (true) {
        if (loop.bodyExpression instanceof InputLoop) {
            loop = loop.bodyExpression;
            for (let register of loop.registers) {
                inputTemplate[register]++;
            }
        }
        else if (loop.bodyExpression instanceof SegmentLoopBlock) {
            loop.bodyExpression.masks.forEach(mask => segmentMasks.push(mask));
            break;
        }
        else {
            throw Error('TODO');
        }
    }

    return { inputTemplate, segmentMasks };
}

// DEGREE
// ================================================================================================
export function maxDegree(d1: ExpressionDegree, d2: ExpressionDegree): ExpressionDegree {
    if (typeof d1 === 'bigint') {
        if (typeof d2 !== 'bigint') throw new Error('cannot infer max degree');
        return (d1 > d2 ? d1 : d2);
    }
    else if (typeof d1[0] === 'bigint') {
        return vectorDegree((a, b) => (a > b ? a : b), d1 as bigint[], d2 as bigint | bigint[]);
    }
    else {
        return matrixDegree((a, b) => (a > b ? a : b), d1 as bigint[][], d2 as bigint | bigint[][]);
    }
}

export function sumDegree(d1: ExpressionDegree, d2: ExpressionDegree): ExpressionDegree {
    if (typeof d1 === 'bigint') {
        if (typeof d2 !== 'bigint') throw new Error('cannot infer sum degree');
        return d1 + d2;
    }
    else if (typeof d1[0] === 'bigint') {
        return vectorDegree((a, b) => (a + b), d1 as bigint[], d2 as bigint | bigint[]);
    }
    else {
        return matrixDegree((a, b) => (a + b), d1 as bigint[][], d2 as bigint | bigint[][]);
    }
}

export function mulDegree(d1: ExpressionDegree, d2: ExpressionDegree): ExpressionDegree {
    if (typeof d1 === 'bigint') {
        if (typeof d2 !== 'bigint') throw new Error('cannot infer mul degree');
        return d1 * d2;
    }
    else if (typeof d1[0] === 'bigint') {
        return vectorDegree((a, b) => (a * b), d1 as bigint[], d2 as bigint | bigint[]);
    }
    else {
        return matrixDegree((a, b) => (a * b), d1 as bigint[][], d2 as bigint | bigint[][]);
    }
}

export function linearCombinationDegree(d1: bigint[], d2: bigint[]): bigint {
    let result = 0n;
    for (let i = 0; i < d1.length; i++) {
        let d = d1[i] + d2[i];
        if (d > result) { result = d; }
    }
    return result;
}

export function matrixVectorProductDegree(d1: bigint[][], d2: bigint[]): bigint[] {
    const result = new Array<bigint>();
    for (let row of d1) {
        result.push(linearCombinationDegree(row, d2));
    }
    return result;
}

export function matrixMatrixProductDegree(d1: bigint[][], d2: bigint[][]): bigint[][] {
    const n = d1.length;
    const m = d1[0].length;
    const p = d2[0].length;

    const result = new Array<bigint[]>(n);
    for (let i = 0; i < n; i++) {
        let row = result[i] = new Array<bigint>(p);
        for (let j = 0; j < p; j++) {
            let s = 0n;
            for (let k = 0; k < m; k++) {
                let d = d1[i][k] + d2[k][j];
                if (d > s) { s = d };
            }
            row[j] = s;
        }
    }
    return result;
}

// HELPER FUNCTIONS
// ================================================================================================
function vectorDegree(op: DegreeOp, d1: bigint[], d2: bigint[] | bigint): bigint[] {
    const result = new Array<bigint>(d1.length);
    for (let i = 0; i < d1.length; i++) {
        let v2 = (typeof d2 === 'bigint'? d2 : d2[i]);
        result[i] = op(d1[i], v2);
    }
    return result;
}

function matrixDegree(op: DegreeOp, d1: bigint[][], d2: bigint[][] | bigint) {
    const result = new Array<bigint[]>(d1.length);
    for (let i = 0; i < d1.length; i++) {
        result[i] = new Array<bigint>(d1[i].length);
        for (let j = 0; j < d1[i].length; j++) {
            let v2 = (typeof d2 === 'bigint'? d2 : d2[i][j]);
            result[i][j] = op(d1[i][j], v2);
        }
    }
    return result;
}