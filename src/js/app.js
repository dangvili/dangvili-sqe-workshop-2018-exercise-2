import $ from 'jquery';
import {coloringDS, parseCode/*, toPaintCodeArr*/} from './code-analyzer';
import * as escodegen from 'escodegen';
import * as esprima from 'esprima';

function paintIfStatements (codeToParse) {
    let htmlBuild = '';
    let defaultColor = 'white';
    let genArr = codeToParse.split('\n');
    for (let i = 0; i<genArr.length; i++){
        let color = defaultColor;
        for (let j =0; j<coloringDS.length; j++){
            if(coloringDS[j][0] === i)
                color = coloringDS[j][1] ? 'green' : 'red';
        }
        htmlBuild += '<div style="background-color: ' + color + '">' + genArr[i] + '</div>';
    }
    document.body.innerHTML = htmlBuild;
}

$(document).ready(function () {
    $('#codeSubmissionButton').click(() => {
        let codeToParse = $('#codePlaceholder').val();
        let args = $('#assignments').val();
        //let parsedCode = parseCode(codeToParse, args);
        // paint(parsedCode);
        //$('#parsedCode').val(JSON.stringify(parsedCode, null, 2));
        //$('#parsedCode').val(parsedCode);
        // $('#parsedCode').val(parsedCode);


        let codeToSub = parseCode(codeToParse , args);
        let final = escodegen.generate(esprima.parse(codeToSub, {loc: true}));
        paintIfStatements(final);
    });
});