function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}
const { exclude, Separators, Patterns } = require('./preset.js')

class PerformanceMeasurer{
    constructor(){
        this.measures = [new Date().getTime()];
    }
    lap(){
        this.measures.push(new Date().getTime())
    }
    diffs(){
        let toReturn = [];
        for(let c=1;c<this.measures.length;c++)
        {
            toReturn.push(Math.round((this.measures[c]-this.measures[c-1])));
        }

        return toReturn;
    }
}

/**
 * Replace all occurences, chronologically
 * @param {*} object 
 * @param {*} Patterns 
 */
function findAndReplaceAll(object, Patterns){
    for(let pattern of Patterns)
    {
        while(findAndReplace(object, pattern))
        {
            
        }
    }
}

/**
 * Safely check if object has children
 * @param {object} el 
 */
function checkChildren(el){
    try{
        el.children[0].length;
        return 1;
    }catch(e){
        return 0;
    }
}

/**
 * Check if object's name or facade fits the pattern
 * @param {*} object 
 * @param {string} name name to be checked 
 */
function checkName(object, name)
{
    if(object.name == name)
        return 1;

    if(object.facade == name)
        return 1

    return 0;
}

/**
 * Find and replace all occurences of objects that fit the pattern with a higher-order token
 * @param {array} array 
 * @param {object} pattern 
 * @return {bool} returns 1 if it replaced sth, instantly quits for safety (TODO could be more efficient by not instantly quit)
 */
function findAndReplace(array, pattern){
    for(let c=0;c<array.length;c++){
        //Check if it fits the pattern
        if(c<=array.length-pattern.in.length){
            // console.log(array[c]);
            let correct = 1;
            for(let p=0;p<pattern.in.length;p++)
            {
                let selected = array[c+p];
                if(typeof selected == 'string')
                    {correct = 0; break;}
                if(!checkName(selected, pattern.in[p]))
                    {correct = 0; break;}
            }

            //If it fits the pattern - replace it
            if(correct)
            {
                // console.log('Correcto')
                let toOut = JSON.parse(JSON.stringify(pattern));
                for(let i=0;i<toOut.out.length;i++)
                {
                    let el = toOut.out[i]
                    if(typeof el == 'string')
                        continue;

                    if(typeof el == 'number') //automatic type support
                    {
                        if(checkChildren(array[c+el]))
                        {
                            toOut.out[i] = {type: 'inside', from: el};
                        }
                        else{
                            toOut.out[i] = {type: 'literal', from: el};
                        }
                    }

                    el = toOut.out[i];
                    if(el.type == 'inside')
                    {
                        el.children = JSON.parse(JSON.stringify(array[c+el.from].children[0]));
                    }
                    if(el.type == 'literal')
                    {
                        el.object = JSON.parse(JSON.stringify(array[c+el.from]));
                    }
                }

                array.splice(c, pattern.in.length, toOut);

                return 1;

            }
        }
        
        //Go check it's children
        let selected = array[c];
        if(typeof selected == 'object')
        {
            // console.log(11, selected)
            if(selected.children)
                if(findAndReplace(selected.children[0], pattern))
                    return 1;
            if(selected.out)
                for(let el of selected.out)
                {
                    // console.log('asd');
                    if(el.children)
                        if(findAndReplace(el.children, pattern))
                            return 1;
                }

        }
                
    }
    return 0;
}

/**
 * Get token's value to out
 * @param {object} token 
 */
function getTokenValue(token){
    if(token.mode == 'choose name')
        return token.name;
    if(token.mode == 'ignore_borders')
        return token.value.slice(...token.range)
    if(token.mode == '##')
        return '\\'+token.name.slice(1,-1)+'{'+token.value.slice(...token.range)+'}'

    return token.value;
}

/**
 * Recursively stringify tokens
 * @param {array} tokenArray 
 * @param {*} isDisabled TODO: I honestly don't remember what it does
 */
function builder(tokenArray, isDisabled = 0){
    let out = "";
    
    for(let token of tokenArray)
    {
        if(typeof token == 'string')
        {
            out = out+token;
            continue;
        }
        if(token.type)
        {
            if(token.type == 'paired')
            {
                if(token.name == 'latex')
                {
                    out += builder(token.children[0], 1);
                }
                else{
                    out +=token.val
                    + builder(token.children[0], isDisabled)
                    + token.closingVal;
                
                }

            
                continue;
            }
        }
        if(token.out)
        {
            for(let el of token.out)
            {
                if(typeof el == 'string')
                    {out += el; continue;}
                if(el.children){
                    if(el.children.length)
                    {
                        out += builder(el.children, isDisabled); 	
                    }
                }
                
                if(el.object)
                {
                    if(typeof el.object.value == 'string')
                    {
                        out += getTokenValue(el.object);
                    }
                    else{ // I don't remember if it's needed XD
                        for(let deepEl of el.object.out)
                        {
                            if(typeof deepEl == 'string')
                            {
                                out += deepEl;
                                continue;
                            }
                            if(!deepEl.object)
                            {
                                out += builder(deepEl.children, isDisabled)
                                continue;
                            }
                            
                            if(deepEl.object.type)
                                out += builder(deepEl.object.children[0], isDisabled)
                            else
                                out += getTokenValue(deepEl.object)
                        }
                        
                    }
                    
                }

            }
            continue;
        }
        
        out += getTokenValue(token);
        
        
    }
    
    return out;
}

/**
 * Parses - structures by Separators rules
 * @param {array} arr 
 * @param {integer} index 
 */
function parseTokenize(arr, index=0){
    let c = index;
    let out=[];
    let until = 0;
    
    try{
        if(arr[index].type == 'paired')
        {
            until = 'right_'+arr[index].name;
            c++;
        }
    }catch(e){}
    
    while(c<arr.length)
    {
        if(typeof arr[c] == 'string')
        {
            out.push( arr[c] );
            c++;
            continue;
        }
        if(arr[c].name == until)
            break;
        
        if(arr[c].type)
        {
            if(arr[c].type == 'paired')
            {
                let result = parseTokenize(arr, c);
                let obj = Object.assign({}, arr[c]);
                obj.children = [];
                obj.children[0] = result;
                obj.sum = 2;
                
                result.forEach(el=>{
                    if(typeof el == 'string')
                        obj.sum++;
                    else
                        obj.sum+=el.sum;
                })
                
                c=c+obj.sum;
                out.push(obj);
                
                continue;
            }
        }
        
        let obj = Object.assign({}, arr[c]);
        obj.sum = 1;
        out.push( obj );
        c++;
    }
    
    return out;
}

/**
 * transformed passed array by using provided Separators
 * @param {*} array 
 * @param {*} Separators 
 */
function splitTokenize(array, Separators)
{
    didSomething=true;
    while(didSomething){
        didSomething = false;
        for(let c=0;c<array.length;c++)
        {
            let el = array[c];
            if(typeof el != 'string')
                continue;
            
            for(let separator of Separators)
            {
                let matched = el.match(separator.reg);
                if(!matched)
                    continue;
                
                
                let token = Object.assign({}, separator)
                token.value = matched[0];
                token.reg = null;
                delete token.reg;
                
                let result = [
                    el.substring(0,matched.index),
                    token,
                    el.substring(matched.index+token.value.length)
                ];
                
                result = result.filter(el=>{return el!=""})
                
                array.splice(c, 1, ...result);
                
                didSomething=true;
                break;
            }

            if(didSomething)
                break;
        }
        
        
        
        
    }
}

/**
 * CacheMap - doubles the size of keys (for index) so might not be the best option for large cache, but for small it's worth it
 * Adds index that keeps track of size and chronologically removes old things from the cache
 */
class CacheMap extends Map{
    #maxSize;
    #index = [];

    constructor(maxSize = 256, iterable=[]){
        super(iterable)
        this.maxSize = maxSize;
    }

    unshift(key, value){
        if(this.#index.indexOf(key) > -1){
            this.#index.splice(this.#index.indexOf(key), 1)            
        }
        this.#index.unshift(key)
        this.set(key, value)

        if(this.#index.length >= this.#maxSize){
            this.delete(this.#index[this.#maxSize-1])
            this.#index.splice(this.#maxSize-1)
        }
    }

    /**
     * Puts called key at the top of the cache
     * @param {*} key 
     */
    get(key){
        let returnValue = super.get(key)
        if(this.#index.indexOf(key) > -1){
            this.#index.splice(this.#index.indexOf(key), 1)
            this.#index.unshift(key)
        }
        return returnValue;
    }

    clear(){
        super.clear()
        this.#index = [];
    }
}
module.exports.CacheMap = CacheMap;
module.exports.MexTranspiler = class MexTranspiler {
    debug
    Separators = Separators;
    Patterns = Patterns;
    cache = new CacheMap();

    //Compiles/prepares separators (regex-wise)
    prepSeparators(){
        this.Separators.forEach(sep=>{
            if(sep.val && !sep.reg)
                sep.reg = new RegExp(exclude+' ?'+escapeRegExp(sep.val)+' ?');
            if(typeof sep.reg == 'string')
                sep.reg = new RegExp(exclude+' ?'+escapeRegExp(sep.reg)+' ?');
        })
    }

    constructor(debug = 0, separators = Separators, patterns = Patterns){
        this.debug = debug
        this.Separators = separators
        this.Patterns = patterns
        this.prepSeparators()
    }

    log(...args){
        if(this.debug){
            console.log(...args)
        }
    }

    /**
     * Transpile MeX string to LaTeX string
     * @param {string} text MeX
     * @return {string} LaTeX
     */
    transpile(text)
    {
        if(this.cache.has(text)){
            return this.cache.get(text);
        }
        //To work a new line needs to be added
        let arr = ["", text]
        let perf = new PerformanceMeasurer();

        splitTokenize(arr, this.Separators)
        perf.lap(); this.log(arr);
        
        let object = parseTokenize(arr);
        perf.lap();

        findAndReplaceAll(object, this.Patterns);
        perf.lap(); this.log(object);
        
        this.log('Performance[ms]: ',perf.diffs());
        
        let builtLatex = builder(object)
        this.cache.unshift(text, builtLatex)
        return builtLatex;
    }
}