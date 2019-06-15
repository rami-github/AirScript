declare module '@guildofweavers/air-script' {

    // IMPORTS AND RE-EXPORTS
    // --------------------------------------------------------------------------------------------
    import { FiniteField } from '@guildofweavers/galois';
    export { FiniteField } from '@guildofweavers/galois';

    // INTERFACES
    // --------------------------------------------------------------------------------------------
    export interface StarkLimits {
        maxMutableRegisters     : number;
        maxReadonlyRegisters    : number;
        maxConstraintCount      : number;
        maxConstraintDegree     : number;
        maxSteps                : number;
    }

    /** Computes the next state of the execution trace */
    export interface TransitionFunction {
        /**
         * @param r Array with values of mutable registers at the current step
         * @param k Array with values of readonly registers at the current step
         * @param g Global constants available at any step
         * @param out Array to hold Values of mutable registers for the next step
         */
        (r: bigint[], k: bigint[], g: any, out: bigint[]): void;
    }

    /** Evaluates transition constraints at a given step of the computation */
    export interface ConstraintEvaluator {
        /**
         * @param r Array with values of mutable registers at the current step
         * @param n Array with values of mutable registers at the next step
         * @param k Array with values of readonly registers at the current step
         * @param g Global constants available at any step
         * @param out Array to hold values of constraint evaluated at the current step
         */
        (r: bigint[], n: bigint[], k: bigint[], g: any, out: bigint[]): void;
    }

    export interface StarkConfig {
        name                : string;
        field               : FiniteField;
        steps               : number;
        registerCount       : number;
        readonlyRegisters   : ConstantDefinition[];
        constraintCount     : number;
        transitionFunction  : TransitionFunction;
        constraintEvaluator : ConstraintEvaluator;
        maxConstraintDegree : number;
        globalConstants     : object;
    }

    export type ConstantPattern = 'repeat' | 'spread';

    export interface ConstantDefinition {
        values  : bigint[];
        pattern : ConstantPattern;
    }

    // PUBLIC FUNCTIONS
    // --------------------------------------------------------------------------------------------
    export function parseScript(text: string, limits: StarkLimits): StarkConfig;

    export function parseStatementBlock(text: string): any; // TODO: define return type
}