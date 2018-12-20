/* eslint-disable no-console */
import * as esprima from 'esprima';
import * as escodegen from 'escodegen';


//-----------------------------------Symbolic substitution :--------------------------------//
let globals = {};
let locals = {};
let fargs = {};
let embeddedLocals = [];
let toColor = false;


//---------------------------helper functions: ------------------//

// general functions:
const generate = (value) => {
    return value === null ? '' : escodegen.generate(value);
};

const contains = (env, key) => {
    return env[key] !== undefined;
};

const discardUndefined = (exps) => {
    return exps.filter(exp => exp !== null);
};

const mapAndDiscard = (exps) => {
    return discardUndefined(exps.map(handle));
};

const isEmpty = (c) =>{
    return c.length === 0;
};

const deepCopy = (tc) => {
    let ret, k, v;
    ret = Array.isArray(tc) ? [] : {};
    for (k in tc) {
        v = tc[k];
        ret[k] = (typeof v === 'object') ? deepCopy(v) : v;
    }
    return ret;
};

// construction of expressions:
const consInit = (type, operator, left, right) => {
    return {
        'type': type,
        'operator': operator,
        'left': left,
        'right': right
    };
};

const consExp = (type, exp) => {
    return {
        'type' : type,
        'expression' : exp
    };
};

const binaryExp = (init) => {
    return consInit(init.type, init.operator, setVals(init.left), setVals(init.right));
};

//managing general & embedded environments :
const setGenEnv = (key, value) =>{
    let currEnv = embeddedLocals.filter(env => env[key] !== undefined);
    return !isEmpty(currEnv) ? currEnv[currEnv.length -1][key] = value :
        (locals[key] !== undefined ? locals[key] = value :
            fargs[key] !== undefined ? fargs[key] = value :
                globals[key] = value);
};

const getGenEnv = (key) =>{
    let currEnv = embeddedLocals.filter(env => env[key] !== undefined);
    return !isEmpty(currEnv) ? currEnv[currEnv.length -1] :
        locals[key] !== undefined ? locals[key]:
            fargs[key] !== undefined ? fargs[key]:
                globals[key];
};

//updating values:
let setValsBranching = {
    'ArrayExpression' : (init) => { return {'type' :'ArrayExpression', 'elements': init.elements.map(setVals)};} ,
    'BinaryExpression' : (init) => binaryExp(init),
    'MemberExpression' : (init) => globals[init.object.name].elements[init.property.value],
    'LogicalExpression' : (init) => consInit('LogicalExpression', init.operator, setVals(init.left), setVals(init.right))
};

const setVals = (init) => {
    let branch = setValsBranching[init.type];
    return init.type === 'Identifier' && (contains(locals, init.name) || toColor) ? getGenEnv(init.name)
        : (branch !== undefined ? branch(init) : init);
};

//block managing:

const blockWrapper = (e) => {
    return e.type !== 'BlockStatement' ?
        blockStatementHandler({'type': 'BlockStatement', 'body': embeddedEnvHandler([e])}) :
        blockStatementHandler(e);
};

//if helper function:

const testHandler = (test) => {
    return test.type === 'Literal' ? test :
        test.type === 'Identifier' ? setVals(test) :
            consInit(test.type ,test.operator, testHandler(test.left), testHandler(test.right));
};

const altHandler = (alt) => {
    return alt === null ? null : blockWrapper(alt);
};

//---------------------------Locals: ------------------//

const varDeclHandler = (e) => {
    e.declarations.map(dec => locals[dec.id.name] = setVals(dec.init));
    return null;
};

const expStateHandler = (e) => {
    let exp = handle(e.expression);
    return exp === null ? null : consExp('ExpressionStatement', exp);
};

const assExpHandler = (e) => {
    let val = setVals(e.right);
    e.left.type === 'MemberExpression' ?
        getGenEnv(e.left.object.name).elements[e.left.property.value] = val :
        setGenEnv(e.left.name, val);
    if (contains(locals, e.left.name))
        return null;
    e.right = val;
    return e;
};

const seqExpHandler = (e) => {
    let calculatedExp = mapAndDiscard(e.expressions);
    return isEmpty(calculatedExp) ? null : consExp('SequenceExpression', calculatedExp);
};

const upExpHandler = (e) => {
    e = upExpHandlerG(e);
    return contains(locals, e.argument.name) ? null : e;
};

const blockStatementHandler = (e) => {
    return {'type': 'BlockStatement', 'body': embeddedEnvHandler(e.body)};
};

const embeddedEnvHandler = (e) => {
    let localTmp = deepCopy(locals);
    let globalTmp = deepCopy(globals);
    let fargsTmp = deepCopy(fargs);
    embeddedLocals.push({});
    let op = mapAndDiscard(e);
    embeddedLocals.pop();
    locals = localTmp;
    globals = globalTmp;
    fargs = fargsTmp;
    return op;
};

const ifHandler = (e) => {
    e.test = testHandler(e.test);
    e.consequent = blockWrapper(e.consequent);
    e.alternate = altHandler(e.alternate);
    return e;
};

const loopHandler = (e) => {
    e.body = blockWrapper(e.body);
    return e;
};

const retStatement = (e) => {
    e.argument = setVals(e.argument);
    return e;
};

//--------------------------- Globals: ------------------//

const funcDeclHandler = (e) => {
    e.body.body  = e.body.body.map(handle).filter(x => x !== null);//mapAndDiscard(e.body.body);
    return e;
};

const varDeclaratorG = (ge) => {
    let val = setVals(ge.init);
    globals[ge.id.name] = val;
    ge.init = val;
    return ge;
};

const varDeclHandlerG = (ge) => {
    ge.declarations = ge.declarations.map(varDeclaratorG);
    return ge;
};

const assExpHandlerG = (ge) => {
    let val = setVals(ge.right);
    ge.left.type === 'MemberExpression' ?
        getGenEnv(ge.left.object.name).elements[ge.left.property.value] = val :
        globals[ge.left.name] = val;
    ge.right = val;
    return ge;
};

const upExpHandlerG = (ge) => {
    let operator = ge.operator === '++' ? '+' : '-';
    globals[ge.argument.name] = consInit('BinaryExpression', operator, globals[ge.argument.name],
        {'type': 'Literal', 'value': 1, 'raw': '1'});
    return ge;
};
const ExprStatementHandlerG = (ge) => {
    return globalExpHandle(ge);
};

const SeqExpHandlerG = (ge) => {
    ge.expressions = ge.expressions.map(exp => globalHandlers[exp.type](exp));
    return ge;
};

let globalHandlers = {
    'FunctionDeclaration' : funcDeclHandler,
    'VariableDeclaration': varDeclHandlerG,
    'ExpressionStatement': ExprStatementHandlerG,
    'AssignmentExpression': assExpHandlerG,
    'UpdateExpression': upExpHandlerG,
    'SequenceExpression' : SeqExpHandlerG,
};

let handlers = {
    'VariableDeclaration': varDeclHandler,
    'ExpressionStatement': expStateHandler,
    'AssignmentExpression': assExpHandler,
    'SequenceExpression': seqExpHandler,
    'UpdateExpression': upExpHandler,
    'BlockStatement': blockStatementHandler,
    'WhileStatement': loopHandler,
    'ForStatement': loopHandler,
    'IfStatement': ifHandler,
    'ReturnStatement': retStatement
};


const globalExpHandle = (gExp) => {
    gExp.expression = globalHandlers[gExp.expression.type](gExp.expression);
    return gExp;
};

const handle = (exp) =>{
    return handlers[exp.type](exp);
};

const init = (args) => {
    globals = {};
    fargs = {};
    locals = {};
    if(args === '')
        return;
    let code = esprima.parse(args).body[0].expression;
    if (code.type === 'SequenceExpression')
        code.expressions.map(x => fargs[x.left.name] = x.right);
    else
        fargs[code.left.name] = code.right;
};

//-----------------------------------Coloring :--------------------------------//

let coloringDS = [];

//--------------- helper functions: ----------------//

const getLoc = (tc) => tc.loc.start.line -1;

const testEval = (test) => eval(generate({'type': 'Program', 'body': [test]}));


const blockStatementHandlerC = (tc) => {
    tc.body.map(handleC);
};

const ifStatementHandlerC = (tc) => {
    coloringDS.push([getLoc(tc), testEval(tc.test)]);
    handleC(tc.consequent);
    if (tc.alternate !== null) handleC(tc.alternate);
};

const defHandlerC = (tc) => handleC(tc.body);

let coloringHandlers = {
    'FunctionDeclaration': defHandlerC,
    'BlockStatement': blockStatementHandlerC,
    'IfStatement':ifStatementHandlerC,
    'WhileStatement': defHandlerC
};

const codeEval = (codeSeg) =>  codeSeg.map(handleC);

//TODO Check!!!
const handleC = (e) => {

    return coloringHandlers[e.type] !== undefined ? coloringHandlers[e.type](e) : null;
};

//-----------------------------------main:--------------------------------//


const parseCode = (codeToParse, args) => {
    init(args);
    toColor = false;
    let body = esprima.parseScript(codeToParse).body;
    let symSub = body.map(codeBlock => globalHandlers[codeBlock.type](codeBlock));
    let gen = generate({'type': 'Program', 'body': symSub});
    toColor = true;
    let symSubC = body.map(codeBlock => globalHandlers[codeBlock.type](codeBlock));
    let bodyWLoc = esprima.parse(generate({'type': 'Program', 'body': symSubC}), {loc: true});
    codeEval(bodyWLoc.body);

    return gen;
};

export {parseCode, coloringDS};
