// IMPORTS
// ================================================================================================
import { Expression } from "../Expression";

// CLASS DEFINITION
// ================================================================================================
export class ExtractVectorElement extends Expression {

    readonly source : Expression;
    readonly index  : number;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(source: Expression, index: number) {
        if (source.isScalar) throw new Error('cannot slice a scalar value');
        if (source.isMatrix) throw new Error('cannot slice a matrix value');
        
        const sourceLength = source.dimensions[0];
        if (index < 0 || index >= sourceLength) {
            throw new Error(`vector index ${index} is out of bounds; expected to be within [${0}, ${sourceLength})`);
        }
        
        super([0, 0], (source.degree as bigint[])[index]);
        this.source = source;
        this.index = index;
    }

    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toJsCode(assignTo?: string): string {
        let code = `${this.source.toJsCode(undefined, { vectorAsArray: true })}[${this.index}]`;
        if (assignTo) {
            code = `${assignTo} = ${code};\n`;
        }
        return code;
    }
}