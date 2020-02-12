"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../utils");
// CLASS DEFINITION
// ================================================================================================
class Context {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(id, domain, inputs, statements, staticRegisters, base) {
        this.id = id;
        this.domain = domain;
        this.inputs = inputs;
        this.base = base;
        this.statements = statements;
        this.staticRegisters = staticRegisters;
        this.locals = new Map();
    }
    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get loopOffset() {
        return this.staticRegisters.inputs;
    }
    get segmentOffset() {
        return this.staticRegisters.inputs + this.staticRegisters.loops;
    }
    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    hasLocal(variable) {
        return this.locals.has(`${this.id}_${variable}`);
    }
    setLocal(variable, value) {
        const handle = `${this.id}_${variable}`;
        if (!this.locals.has(handle)) {
            this.locals.set(handle, this.locals.size);
            this.base.addLocal(value.dimensions, handle);
        }
        return this.base.buildStoreOperation(handle, value);
    }
    loadLocal(variable) {
        const handle = `${this.id}_${variable}`;
        utils_1.validate(this.locals.has(handle), errors.undeclaredVarReference(variable));
        return this.base.buildLoadExpression(`load.local`, handle);
    }
    getLocalIndex(variable) {
        return this.locals.get(`${this.id}_${variable}`);
    }
    // CONTROLLERS
    // --------------------------------------------------------------------------------------------
    getLoopController(loopIdx) {
        loopIdx = this.loopOffset + loopIdx;
        let result = this.base.buildLoadExpression('load.param', utils_1.ProcedureParams.staticRow);
        result = this.base.buildGetVectorElementExpression(result, loopIdx);
        const one = this.base.buildLiteralValue(this.base.field.one);
        for (let i = loopIdx - 1; i >= this.loopOffset; i--) {
            let parent = this.base.buildLoadExpression('load.param', utils_1.ProcedureParams.staticRow);
            parent = this.base.buildGetVectorElementExpression(parent, i);
            parent = this.base.buildBinaryOperation('sub', one, parent);
            result = this.base.buildBinaryOperation('mul', result, parent);
        }
        return result;
    }
    getSegmentController(segmentIdx) {
        segmentIdx = this.segmentOffset + segmentIdx;
        let result = this.base.buildLoadExpression('load.param', utils_1.ProcedureParams.staticRow);
        result = this.base.buildGetVectorElementExpression(result, segmentIdx);
        return result;
    }
}
exports.Context = Context;
// ERRORS
// ================================================================================================
const errors = {
    undeclaredVarReference: (s) => `variable ${s} is referenced before declaration`
};
//# sourceMappingURL=Context.js.map