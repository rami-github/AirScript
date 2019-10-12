"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const Expression_1 = require("../Expression");
const SymbolReference_1 = require("../SymbolReference");
const BinaryOperation_1 = require("../operations/BinaryOperation");
const utils_1 = require("../utils");
// CLASS DEFINITION
// ================================================================================================
class InputBlock extends Expression_1.Expression {
    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(id, initExpression, bodyExpression, registers, controller) {
        if (!initExpression.isSameDimensions(bodyExpression)) {
            throw new Error(`init and body expressions must resolve to values of same dimensions`);
        }
        const degree = utils_1.maxDegree(utils_1.sumDegree(initExpression.degree, controller.degree), bodyExpression.degree);
        super(initExpression.dimensions, degree);
        this.id = id;
        this.controller = controller;
        this.initExpression = initExpression;
        this.bodyExpression = bodyExpression;
        this.registers = registers;
    }
    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    toJsCode(assignTo, options = {}) {
        if (!assignTo)
            throw new Error('input loop cannot be reduced to unassigned code');
        const initVar = `init${this.id}`, bodyVar = `body${this.id}`;
        let code = `let ${initVar}, ${bodyVar};\n`;
        code += this.initExpression.toJsCode(initVar);
        code += this.bodyExpression.toJsCode(bodyVar);
        const iRef = new SymbolReference_1.SymbolReference(initVar, this.initExpression.dimensions, this.initExpression.degree);
        const bRef = new SymbolReference_1.SymbolReference(bodyVar, this.bodyExpression.dimensions, this.bodyExpression.degree);
        const result = BinaryOperation_1.BinaryOperation.add(BinaryOperation_1.BinaryOperation.mul(iRef, this.controller), bRef);
        code += result.toJsCode(assignTo, options);
        return `{\n${code}}\n`;
    }
}
exports.InputBlock = InputBlock;
//# sourceMappingURL=InputBlock.js.map