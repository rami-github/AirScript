"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const air_assembly_1 = require("@guildofweavers/air-assembly");
const chevrotain_1 = require("chevrotain");
const parser_1 = require("./parser");
const lexer_1 = require("./lexer");
const Module_1 = require("./Module");
const contexts_1 = require("./contexts");
const templates_1 = require("./templates");
const DelegateTemplate_1 = require("./templates/DelegateTemplate");
// MODULE VARIABLES
// ================================================================================================
const BaseCstVisitor = parser_1.parser.getBaseCstVisitorConstructor();
class AirVisitor extends BaseCstVisitor {
    constructor() {
        super();
        this.validateVisitor();
    }
    // ENTRY POINT
    // --------------------------------------------------------------------------------------------
    script(ctx, options) {
        validateScriptSections(ctx);
        // build module
        const moduleName = ctx.starkName[0].image;
        const modulus = this.visit(ctx.fieldDeclaration);
        const traceRegisterCount = Number(ctx.traceRegisterCount[0].image);
        const constraintCount = Number(ctx.constraintCount[0].image);
        const aModule = new Module_1.Module(moduleName, options.basedir, modulus, traceRegisterCount, constraintCount);
        // parse imports
        if (ctx.imports) {
            ctx.imports.forEach((imp) => this.visit(imp, aModule));
        }
        // parse and add constants, inputs, and static registers to the module
        if (ctx.moduleConstants) {
            ctx.moduleConstants.forEach((element) => this.visit(element, aModule));
        }
        if (ctx.staticRegisters) {
            ctx.staticRegisters.forEach((element) => this.visit(element, aModule));
        }
        ctx.inputRegisters.forEach((element) => this.visit(element, aModule));
        // determine transition function structure and use it to create a component object
        const component = this.visit(ctx.transitionFunction, aModule);
        // parse transition function and constraint evaluator
        this.visit(ctx.transitionFunction, component);
        this.visit(ctx.transitionConstraints, component);
        // finalize the component and return the schema
        aModule.setComponent(component, options.name);
        return aModule.schema;
    }
    // FINITE FIELD
    // --------------------------------------------------------------------------------------------
    fieldDeclaration(ctx) {
        const modulus = this.visit(ctx.modulus);
        return BigInt(modulus);
    }
    // MODULE CONSTANTS
    // --------------------------------------------------------------------------------------------
    constantDeclaration(ctx, aModule) {
        const name = ctx.constantName[0].image;
        let value;
        if (ctx.value) {
            value = this.visit(ctx.value, aModule.schema.field);
        }
        else if (ctx.vector) {
            value = this.visit(ctx.vector, aModule.schema.field);
        }
        else if (ctx.matrix) {
            value = this.visit(ctx.matrix, aModule.schema.field);
        }
        else {
            throw new Error(`Failed to parse the value of module constant '${name}'`);
        }
        aModule.addConstant(name, value);
    }
    literalVector(ctx, field) {
        const vector = new Array(ctx.elements.length);
        for (let i = 0; i < ctx.elements.length; i++) {
            let element = this.visit(ctx.elements[i], field);
            vector[i] = element;
        }
        return vector;
    }
    literalMatrix(ctx, field) {
        let colCount = 0;
        const rowCount = ctx.rows.length;
        const matrix = new Array(rowCount);
        for (let i = 0; i < rowCount; i++) {
            let row = this.visit(ctx.rows[i], field);
            if (colCount === 0) {
                colCount = row.length;
            }
            else if (colCount !== row.length) {
                throw new Error('All matrix rows must have the same number of columns');
            }
            matrix[i] = row;
        }
        return matrix;
    }
    // INPUT AND STATIC REGISTERS
    // --------------------------------------------------------------------------------------------
    inputDeclaration(ctx, aModule) {
        const scope = ctx.scope[0].image;
        const inputName = ctx.name[0].image;
        const registerCount = Number(ctx.width[0].image);
        const inputRank = ctx.rank ? Number(ctx.rank[0].image) : 0;
        const binary = ctx.boolean ? true : false;
        aModule.addInput(inputName, registerCount, inputRank, scope, binary);
    }
    staticDeclaration(ctx, aModule) {
        const staticName = ctx.name[0].image;
        const registers = ctx.registers.map((r) => this.visit(r));
        aModule.addStatic(staticName, registers);
    }
    staticRegister(ctx, aModule) {
        if (ctx.values) {
            return this.visit(ctx.values, aModule);
        }
        else {
            return this.visit(ctx.sequence, aModule);
        }
    }
    prngSequence(ctx, aModule) {
        const method = ctx.method[0].image;
        const seed = BigInt(ctx.seed[0].image);
        const count = Number(ctx.count[0].image);
        return new air_assembly_1.PrngSequence(method, seed, count);
    }
    // TRANSITION FUNCTION AND CONSTRAINTS
    // --------------------------------------------------------------------------------------------
    transitionFunction(ctx, mOrC) {
        if (mOrC instanceof Module_1.Module) {
            const rootTemplate = new templates_1.LoopTemplate([0, mOrC.traceWidth - 1]);
            this.visit(ctx.traceLoop, rootTemplate);
            return mOrC.createComponent(rootTemplate);
        }
        else {
            const exc = mOrC.createExecutionContext('transition');
            const result = this.visit(ctx.traceLoop, exc);
            mOrC.setTransitionFunction(exc, result);
        }
    }
    transitionConstraints(ctx, component) {
        // TODO: validate execution template
        const exc = component.createExecutionContext('evaluation');
        if (ctx.allStepBlock) {
            const result = this.visit(ctx.allStepBlock, exc);
            component.setConstraintEvaluator(exc, result);
        }
        else {
            const result = this.visit(ctx.traceLoop, exc);
            component.setConstraintEvaluator(exc, result);
        }
    }
    // LOOPS
    // --------------------------------------------------------------------------------------------
    traceLoop(ctx, templateOrParent) {
        // parse inputs
        const inputs = ctx.inputs.map((input) => input.image);
        // parse loop body
        if (templateOrParent instanceof templates_1.LoopTemplate) {
            templateOrParent.setInputs(inputs);
            ctx.blocks.forEach((b) => this.visit(b, templateOrParent));
        }
        else {
            // create a new context for the loop
            const loopContext = new contexts_1.LoopContext(templateOrParent, inputs);
            // parse outer statements
            if (ctx.statements) {
                ctx.statements.forEach((s) => this.visit(s, loopContext));
            }
            ctx.blocks.forEach((b) => this.visit(b, loopContext));
            return loopContext.result;
        }
    }
    loopBlock(ctx, parent) {
        const domain = (ctx.domain ? this.visit(ctx.domain) : parent.domain);
        if (parent instanceof templates_1.LoopTemplate) {
            if (ctx.traceLoop) {
                const template = new templates_1.LoopTemplate(domain, parent);
                this.visit(ctx.traceLoop, template);
                parent.addLoopBlock(template);
            }
            else if (ctx.traceSegments) {
                const template = new templates_1.LoopBaseTemplate(domain);
                ctx.traceSegments.forEach((segment) => template.addSegment(this.visit(segment)));
                parent.addLoopBaseBlock(template);
            }
            else {
                const template = new DelegateTemplate_1.DelegateTemplate(domain, this.visit(ctx.delegateCall));
                parent.addDelegateBlock(template);
            }
        }
        else if (parent instanceof contexts_1.LoopContext) {
            if (ctx.traceLoop) {
                const blockContext = new contexts_1.ExecutionContext(parent, domain);
                const initResult = this.visit(ctx.initExpression, blockContext);
                const loopResult = this.visit(ctx.traceLoop, blockContext);
                parent.addLoopBlock(initResult, loopResult);
            }
            else if (ctx.traceSegments) {
                const blockContext = new contexts_1.ExecutionContext(parent, domain);
                const initResult = this.visit(ctx.initExpression, blockContext);
                const segmentResults = ctx.traceSegments.map((loop) => this.visit(loop, blockContext));
                parent.addBaseBlock(initResult, segmentResults);
            }
            else {
                const { delegateName, inputs } = this.visit(ctx.delegateCall, parent);
                parent.addDelegateBlock(delegateName, inputs, domain);
            }
        }
        else {
            throw new Error(`invalid parent ${parent} for loop block context`);
        }
    }
    traceSegment(ctx, exc) {
        if (exc)
            return this.visit(ctx.body, exc);
        else
            return ctx.ranges.map((range) => this.visit(range));
    }
    traceDomain(ctx) {
        return this.visit(ctx.range);
    }
    // STATEMENTS
    // --------------------------------------------------------------------------------------------
    statementBlock(ctx, exc) {
        const blockContext = new contexts_1.ExecutionContext(exc);
        if (ctx.statements) {
            ctx.statements.forEach((stmt) => this.visit(stmt, blockContext));
        }
        let result = this.visit(ctx.expression, blockContext);
        if (ctx.constraint) {
            const constraint = this.visit(ctx.constraint, blockContext);
            result = blockContext.buildBinaryOperation('sub', result, constraint);
        }
        return result;
    }
    statement(ctx, exc) {
        const expression = this.visit(ctx.expression, exc);
        exc.setVariableAssignment(ctx.variableName[0].image, expression);
    }
    assignableExpression(ctx, exc) {
        return this.visit(ctx.expression, exc);
    }
    // CONDITIONAL EXPRESSION
    // --------------------------------------------------------------------------------------------
    whenExpression(ctx, exc) {
        const condition = this.visit(ctx.condition, exc);
        const tBlock = this.visit(ctx.tExpression, exc);
        const fBlock = this.visit(ctx.fExpression, exc);
        return exc.buildConditionalExpression(condition, tBlock, fBlock);
    }
    whenCondition(ctx, exc) {
        const symbol = ctx.value[0].image;
        const result = exc.getSymbolReference(symbol);
        return result;
    }
    // FUNCTION CALLS
    // --------------------------------------------------------------------------------------------
    transitionCall(ctx, exc) {
        const registers = ctx.registers[0].image;
        if (registers !== '$r') {
            throw new Error(`expected transition function to be invoked with $r parameter, but received ${registers} parameter`);
        }
        return exc.buildTransitionCall();
    }
    delegateCall(ctx, exc) {
        const delegateName = ctx.delegate[0].image;
        if (!exc)
            return delegateName;
        const inputs = ctx.parameters.map((p) => this.visit(p, exc));
        return { delegateName, inputs };
    }
    // VECTORS AND MATRIXES
    // --------------------------------------------------------------------------------------------
    vector(ctx, exc) {
        const elements = ctx.elements.map((e) => this.visit(e, exc));
        return exc.buildMakeVectorExpression(elements);
    }
    vectorDestructuring(ctx, exc) {
        const vector = this.visit(ctx.vector, exc);
        return vector;
    }
    matrix(ctx, exc) {
        const elements = ctx.rows.map((r) => this.visit(r, exc));
        return exc.buildMakeMatrixExpression(elements);
    }
    matrixRow(ctx, exc) {
        return ctx.elements.map((e) => this.visit(e, exc));
    }
    // EXPRESSIONS
    // --------------------------------------------------------------------------------------------
    expression(ctx, exc) {
        let result = this.visit(ctx.lhs, exc);
        if (ctx.rhs) {
            ctx.rhs.forEach((rhsOperand, i) => {
                let rhs = this.visit(rhsOperand, exc);
                let opToken = ctx.AddOp[i];
                if (chevrotain_1.tokenMatcher(opToken, lexer_1.Plus)) {
                    result = exc.buildBinaryOperation('add', result, rhs);
                }
                else if (chevrotain_1.tokenMatcher(opToken, lexer_1.Minus)) {
                    result = exc.buildBinaryOperation('sub', result, rhs);
                }
                else {
                    throw new Error(`Invalid operator '${opToken.image}'`);
                }
            });
        }
        return result;
    }
    mulExpression(ctx, exc) {
        let result = this.visit(ctx.lhs, exc);
        if (ctx.rhs) {
            ctx.rhs.forEach((rhsOperand, i) => {
                let rhs = this.visit(rhsOperand, exc);
                let opToken = ctx.MulOp[i];
                if (chevrotain_1.tokenMatcher(opToken, lexer_1.Star)) {
                    result = exc.buildBinaryOperation('mul', result, rhs);
                }
                else if (chevrotain_1.tokenMatcher(opToken, lexer_1.Slash)) {
                    result = exc.buildBinaryOperation('div', result, rhs);
                }
                else if (chevrotain_1.tokenMatcher(opToken, lexer_1.Pound)) {
                    result = exc.buildBinaryOperation('prod', result, rhs);
                }
                else {
                    throw new Error(`Invalid operator '${opToken.image}'`);
                }
            });
        }
        return result;
    }
    expExpression(ctx, exc) {
        let result = this.visit(ctx.base, exc);
        if (ctx.exponent) {
            ctx.exponent.forEach((expOperand, i) => {
                let exponent = this.visit(expOperand, exc);
                result = exc.buildBinaryOperation('exp', result, exponent);
            });
        }
        return result;
    }
    vectorExpression(ctx, exc) {
        let result = this.visit(ctx.expression, exc);
        if (ctx.rangeStart) {
            const rangeStart = Number(ctx.rangeStart[0].image);
            const rangeEnd = Number(ctx.rangeEnd[0].image);
            result = exc.buildSliceVectorExpression(result, rangeStart, rangeEnd);
        }
        else if (ctx.index) {
            const index = Number(ctx.index[0].image);
            result = exc.buildGetVectorElementExpression(result, index);
        }
        return result;
    }
    atomicExpression(ctx, exc) {
        let result;
        if (ctx.expression) {
            result = this.visit(ctx.expression, exc);
        }
        else if (ctx.symbol) {
            const symbol = ctx.symbol[0].image;
            result = exc.getSymbolReference(symbol);
        }
        else if (ctx.literal) {
            const value = BigInt(ctx.literal[0].image);
            result = exc.buildLiteralValue(value);
        }
        else {
            throw new Error('Invalid expression syntax');
        }
        if (ctx.neg) {
            result = exc.buildUnaryOperation('neg', result);
        }
        if (ctx.inv) {
            result = exc.buildUnaryOperation('inv', result);
        }
        return result;
    }
    // LITERAL EXPRESSIONS
    // --------------------------------------------------------------------------------------------
    literalExpression(ctx, field) {
        let result = this.visit(ctx.lhs, field);
        if (ctx.rhs) {
            ctx.rhs.forEach((rhsOperand, i) => {
                let rhsValue = this.visit(rhsOperand, field);
                let operator = ctx.AddOp[i];
                if (chevrotain_1.tokenMatcher(operator, lexer_1.Plus)) {
                    result = field ? field.add(result, rhsValue) : (result + rhsValue);
                }
                else if (chevrotain_1.tokenMatcher(operator, lexer_1.Minus)) {
                    result = field ? field.sub(result, rhsValue) : (result - rhsValue);
                }
            });
        }
        return result;
    }
    literalMulExpression(ctx, field) {
        let result = this.visit(ctx.lhs, field);
        if (ctx.rhs) {
            ctx.rhs.forEach((rhsOperand, i) => {
                let rhsValue = this.visit(rhsOperand, field);
                let operator = ctx.MulOp[i];
                if (chevrotain_1.tokenMatcher(operator, lexer_1.Star)) {
                    result = field ? field.mul(result, rhsValue) : (result * rhsValue);
                }
                else if (chevrotain_1.tokenMatcher(operator, lexer_1.Slash)) {
                    result = field ? field.div(result, rhsValue) : (result / rhsValue);
                }
                else if (chevrotain_1.tokenMatcher(operator, lexer_1.Pound)) {
                    throw new Error('Matrix multiplication is supported for literal expressions');
                }
            });
        }
        return result;
    }
    literalExpExpression(ctx, field) {
        let result = this.visit(ctx.base, field);
        if (ctx.exponent) {
            ctx.exponent.forEach((expOperand) => {
                let expValue = this.visit(expOperand, field);
                result = field ? field.exp(result, expValue) : (result ** expValue);
            });
        }
        return result;
    }
    literalAtomicExpression(ctx, field) {
        let result;
        if (ctx.expression) {
            result = this.visit(ctx.expression, field);
        }
        else if (ctx.literal) {
            result = BigInt(ctx.literal[0].image);
        }
        else {
            throw new Error('Invalid expression syntax');
        }
        if (ctx.neg) {
            result = field ? field.neg(result) : (-result);
        }
        if (ctx.inv) {
            result = field ? field.inv(result) : (1n / result);
        }
        return result;
    }
    literalRangeExpression(ctx) {
        let start = Number.parseInt(ctx.start[0].image, 10);
        let end = ctx.end ? Number.parseInt(ctx.end[0].image, 10) : start;
        return [start, end];
    }
    // IMPORTS
    // --------------------------------------------------------------------------------------------
    importExpression(ctx, aModule) {
        const members = ctx.members.map((member) => this.visit(member));
        let path = ctx.path[0].image;
        path = path.substring(1, path.length - 1);
        aModule.addImport(path, members);
    }
    importMember(ctx) {
        const member = ctx.member[0].image;
        const alias = ctx.alias ? ctx.alias[0].image : undefined;
        return { member, alias };
    }
}
// EXPORT VISITOR INSTANCE
// ================================================================================================
exports.visitor = new AirVisitor();
// HELPER FUNCTIONS
// ================================================================================================
function validateScriptSections(ctx) {
    // make sure exactly one input register section is present
    if (!ctx.inputRegisters || ctx.inputRegisters.length === 0) {
        throw new Error('at least one input must be declared');
    }
    // make sure exactly one transition function is present
    if (!ctx.transitionFunction || ctx.transitionFunction.length === 0) {
        throw new Error('transition function section is missing');
    }
    else if (ctx.transitionFunction.length > 1) {
        throw new Error('transition function section is defined more than once');
    }
    // make sure exactly one transition constraints section is present
    if (!ctx.transitionConstraints || ctx.transitionConstraints.length === 0) {
        throw new Error('transition constraints section is missing');
    }
    else if (ctx.transitionConstraints.length > 1) {
        throw new Error('transition constraints section is defined more than once');
    }
}
//# sourceMappingURL=visitor.js.map