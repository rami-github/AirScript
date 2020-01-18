"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const air_assembly_1 = require("@guildofweavers/air-assembly");
const Component_1 = require("./Component");
const utils_1 = require("./utils");
// CLASS DEFINITION
// ================================================================================================
class Module {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(name, modulus, traceWidth, constraintCount) {
        this.name = name;
        this.schema = new air_assembly_1.AirSchema('prime', modulus);
        this.traceWidth = traceWidth;
        this.constraintCount = constraintCount;
        this.inputRegisters = new Map();
        this.staticRegisters = new Map();
        this.symbols = new Map();
    }
    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get field() {
        return this.schema.field;
    }
    get inputRegisterCount() {
        return this.inputRegisters.size;
    }
    get staticRegisterCount() {
        return this.staticRegisters.size;
    }
    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    addConstant(name, value) {
        utils_1.validateSymbolName(name);
        utils_1.validate(!this.symbols.has(name), errors.constSymbolReDeclared(name));
        this.symbols.set(name, { type: 'const' });
        this.schema.addConstant(value, `$${name}`);
    }
    addInput(name, index, scope, binary) {
        utils_1.validate(!this.symbols.has(name), errors.inputRegisterOverlap(name));
        utils_1.validate(index === this.inputRegisterCount, errors.inputRegisterOutOfOrder(name));
        this.symbols.set(name, { type: 'input' });
        this.inputRegisters.set(name, { scope, binary });
    }
    addStatic(name, index, values) {
        utils_1.validate(!this.symbols.has(name), errors.staticRegisterOverlap(name));
        utils_1.validate(index === this.staticRegisterCount, errors.staticRegisterOutOfOrder(name));
        this.symbols.set(name, { type: 'static' });
        this.staticRegisters.set(name, values);
    }
    createComponent(template) {
        // make sure the template is valid
        utils_1.validate(utils_1.isPowerOf2(template.cycleLength), errors.cycleLengthNotPowerOf2(template.cycleLength));
        for (let i = 1; i < template.cycleLength; i++) {
            utils_1.validate(template.getIntervalAt(i) !== undefined, errors.intervalStepNotCovered(i));
        }
        const loopDrivers = template.loops.map(loop => loop.driver);
        const segmentMasks = template.segments.map(s => s.mask);
        const procedureSpecs = this.buildProcedureSpecs(segmentMasks.length, loopDrivers.length);
        const inputRegisters = this.buildInputRegisters(template);
        return new Component_1.Component(this.schema, procedureSpecs, segmentMasks, inputRegisters, loopDrivers);
    }
    setComponent(component, componentName) {
        // create component object
        const c = this.schema.createComponent(componentName, this.traceWidth, this.constraintCount, component.cycleLength);
        // add static registers to the component
        component.inputRegisters.forEach(r => c.addInputRegister(r.scope, r.binary, r.parent, r.steps, -1));
        component.loopDrivers.forEach(d => c.addMaskRegister(d, false));
        component.segmentMasks.forEach(m => {
            // rotate the mask by one position to the left, to align it with input position
            m = m.slice();
            m.push(m.shift());
            c.addCyclicRegister(m);
        });
        this.staticRegisters.forEach(v => c.addCyclicRegister(v));
        // set trace initializer to return a result of applying transition function to a vector of all zeros
        const initContext = c.createProcedureContext('init');
        const initParams = this.buildProcedureParams(initContext, component.segmentCount, component.loopDrivers.length);
        const initCall = initContext.buildCallExpression(component.procedures.transition.name, initParams);
        c.setTraceInitializer(initContext, [], initCall);
        // set transition function procedure to call transition function
        const tfContext = c.createProcedureContext('transition');
        const tfParams = this.buildProcedureParams(tfContext, component.segmentCount, component.loopDrivers.length);
        const tfCall = tfContext.buildCallExpression(component.procedures.transition.name, tfParams);
        c.setTransitionFunction(tfContext, [], tfCall);
        // set constraint evaluator procedure to call constraint evaluator function
        const evContext = c.createProcedureContext('evaluation');
        const evParams = this.buildProcedureParams(evContext, component.segmentCount, component.loopDrivers.length);
        const evCall = evContext.buildCallExpression(component.procedures.evaluation.name, evParams);
        c.setConstraintEvaluator(evContext, [], evCall);
        // add component to the schema
        this.schema.addComponent(c);
    }
    // HELPER METHODS
    // --------------------------------------------------------------------------------------------
    buildProcedureSpecs(segmentCount, loopCount) {
        const cVar = utils_1.CONTROLLER_NAME;
        return {
            transition: {
                name: `$${this.name}_transition`,
                result: [this.traceWidth, 0],
                params: [
                    { name: '$_r', dimensions: [this.traceWidth, 0] },
                    { name: '$_i', dimensions: [this.inputRegisters.size, 0] },
                    { name: cVar, dimensions: [segmentCount + loopCount, 0] },
                    { name: '$_k', dimensions: [this.staticRegisters.size, 0] }
                ]
            },
            evaluation: {
                name: `$${this.name}_evaluation`,
                result: [this.constraintCount, 0],
                params: [
                    { name: '$_r', dimensions: [this.traceWidth, 0] },
                    { name: '$_n', dimensions: [this.traceWidth, 0] },
                    { name: '$_i', dimensions: [this.inputRegisters.size, 0] },
                    { name: cVar, dimensions: [segmentCount + loopCount, 0] },
                    { name: '$_k', dimensions: [this.staticRegisters.size, 0] }
                ]
            }
        };
    }
    buildProcedureParams(context, segmentCount, loopCount) {
        const params = [];
        if (context.name === 'init') {
            const zeroElement = context.buildLiteralValue(this.schema.field.zero);
            const zeroArray = new Array(this.traceWidth).fill(zeroElement);
            params.push(context.buildMakeVectorExpression(zeroArray));
        }
        else {
            params.push(context.buildLoadExpression('load.trace', 0));
            if (context.name === 'evaluation') {
                params.push(context.buildLoadExpression('load.trace', 1));
            }
        }
        let startIdx = 0, endIdx = this.inputRegisters.size - 1;
        let loadExpression = context.buildLoadExpression('load.static', 0);
        params.push(context.buildSliceVectorExpression(loadExpression, startIdx, endIdx));
        startIdx = endIdx + 1;
        endIdx = startIdx + segmentCount + loopCount - 1;
        loadExpression = context.buildLoadExpression('load.static', 0);
        params.push(context.buildSliceVectorExpression(loadExpression, startIdx, endIdx));
        if (this.staticRegisters.size > 0) {
            startIdx = endIdx + 1;
            endIdx = startIdx + this.staticRegisters.size - 1;
            loadExpression = context.buildLoadExpression('load.static', 0);
            params.push(context.buildSliceVectorExpression(loadExpression, startIdx, endIdx));
        }
        return params;
    }
    buildInputRegisters(template) {
        const registers = [];
        const registerSet = new Set();
        let previousInputsCount = 0;
        for (let i = 0; i < template.loops.length; i++) {
            let inputs = template.loops[i].inputs;
            // TODO: handle multiple parents
            let parentIdx = (i === 0 ? undefined : registers.length - previousInputsCount);
            inputs.forEach(input => {
                utils_1.validate(!registerSet.has(input), errors.overusedInputRegister(input));
                const register = this.inputRegisters.get(input);
                utils_1.validate(register !== undefined, errors.undeclaredInputRegister(input));
                const isLeaf = (i === template.loops.length - 1);
                registers.push({
                    scope: register.scope,
                    binary: register.binary,
                    parent: parentIdx,
                    steps: isLeaf ? template.cycleLength : undefined
                });
                registerSet.add(input);
            });
            previousInputsCount = inputs.size;
        }
        return registers;
    }
}
exports.Module = Module;
// ERRORS
// ================================================================================================
const errors = {
    undeclaredInputRegister: (r) => `input register ${r} is used without being declared`,
    overusedInputRegister: (r) => `input register ${r} cannot resurface in inner loops`,
    constSymbolReDeclared: (s) => `symbol '${s}' is declared multiple times`,
    inputRegisterOverlap: (r) => `input register ${r} is declared more than once`,
    inputRegisterOutOfOrder: (r) => `input register ${r} is declared out of order`,
    staticRegisterOverlap: (r) => `static register ${r} is declared more than once`,
    staticRegisterOutOfOrder: (r) => `static register ${r} is declared out of order`,
    cycleLengthNotPowerOf2: (s) => `total number of steps is ${s} but must be a power of 2`,
    intervalStepNotCovered: (i) => `step ${i} is not covered by any expression`
};
//# sourceMappingURL=Module.js.map