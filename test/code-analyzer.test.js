import assert from 'assert';
import {parseCode} from '../src/js/code-analyzer';

const testCase = (title, code, args,  expectedOutput) =>{
    return it(title, () => assert.equal(JSON.stringify(parseCode(code, args)), expectedOutput));
};

describe('The javascript parser', () => {

    testCase('is parsing an empty code segment', '', '', '""');
    testCase('is parsing variable declaration', 'let x = 1, y = 2; let z = x + y; let a = [1,2,3]; let b = a[1];','', '"let x = 1, y = 2;\\nlet z = x + y;\\nlet a = [\\n    1,\\n    2,\\n    3\\n];\\nlet b = 2;"');
    testCase('is parsing assignment expression', 'let x = 1, y = 2; let z = x + y; let a = [1,2,3]; x++; y = a[0]; a[1] = z; a[y]--; ','', '"let x = 1, y = 2;\\nlet z = x + y;\\nlet a = [\\n    1,\\n    z,\\n    3\\n];\\nx++;\\ny = 1;\\na[1] = z;\\na[y]--;"');
    testCase('is parsing a function correctly', 'function identity(x){return x;}','','"function identity(x) {\\n    return x;\\n}"');
    testCase('is parsing a function correctly', 'function f (x,y){if(x === true){return true;}else {return y;}return false;}','x = true, y = true','"function f(x, y) {\\n    if (x === true) {\\n        return true;\\n    } else {\\n        return y;\\n    }\\n    return false;\\n}"');
    testCase('is parsing a function correctly', 'function f (x,y){let z = 1;if(x === true && y === true){z++;return true;}else{z = true || false;return false;}}','x = true, y = true','"function f(x, y) {\\n    if (x === true && y === true) {\\n        return true;\\n    } else {\\n        return false;\\n    }\\n}"');
    testCase('is parsing a function correctly', 'function foo(x, y, z){ let a = x + 1; let b = a + y; let c = 0; if (b < z) { c = c + 5; return x + y + z + c; } else if (b < z * 2) { c = c + x + 5; return x + y + z + c; } else { c = c + z + 5; return x + y + z + c; } }','x = 1, y = 2, z = 3','"function foo(x, y, z) {\\n    if (x + 1 + y < z) {\\n        return x + y + z + (0 + 5);\\n    } else {\\n        if (x + 1 + y < z * 2) {\\n            return x + y + z + (0 + x + 5);\\n        } else {\\n            return x + y + z + (0 + z + 5);\\n        }\\n    }\\n}"');
    testCase('is parsing a function correctly', 'function foo(x, y, z){let a = x + 1;let b = a + y;let c = 0; while (a < z) {c = a + b;z = c * 2;}return z;}\n', 'x = 1, y = 2, z = 3', '"function foo(x, y, z) {\\n    while (a < z) {\\n        z = (x + 1 + (x + 1 + y)) * 2;\\n    }\\n    return z;\\n}"');
    testCase('is parsing a function correctly', 'let h = 1, g = 2; let l = h + g; let w = [1,2,3]; x++; g = w[0]; w[1] = l; w[h]--; \n function foo(x, y, z){ let a = x + 1; let b = a + y; let c = 0; if (b < z) { c = c + 5; return x + y + z + c; } else if (b < z * 2) { c = c + x + 5; return x + y + z + c; } else { c = c + z + 5; return x + y + z + c; } }', 'x = 1, y = 2, z =3','"let h = 1, g = 2;\\nlet l = h + g;\\nlet w = [\\n    1,\\n    l,\\n    3\\n];\\nx++;\\ng = 1;\\nw[1] = l;\\nw[h]--;\\nfunction foo(x, y, z) {\\n    if (x + 1 + y < z) {\\n        return x + y + z + (0 + 5);\\n    } else {\\n        if (x + 1 + y < z * 2) {\\n            return x + y + z + (0 + x + 5);\\n        } else {\\n            return x + y + z + (0 + z + 5);\\n        }\\n    }\\n}"');
});