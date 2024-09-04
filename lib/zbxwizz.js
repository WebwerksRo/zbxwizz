
/**
 * @param string title - modal title
 * @param string body - modal content
 * @param string footer - modal footer
 */
function show_modal(opts={}) {
    let title = opts.title ? opts.title : null;
    let body = opts.body ? opts.body : null;
    let footer = opts.footer ? opts.footer : null;
    let $modal = $("#generic_modal").clone().appendTo("body").removeAttr("id")   // clone modal template
        .on("hidden.bs.modal",()=>$modal.remove())  // setup cleanup after modal is closed
        .modal();   // open modal

    // set modal title if present
    if(!opts.title) {
        $modal.find(".modal-header").remove()
    }
    else {
        $modal.find(".modal-header").html(opts.title);
    }
    // set footer if present
    if(opts.footer) {
        $modal.find(".modal-header").html(opts.footer)
    }
    // set modal content
    $modal.find(".modal-body").html(opts.body ? opts.body : "No content");
    if(opts.size) {
        $modal.find(".modal-dialog").addClass("modal-"+opts.size);
    }
}

let zbx,apiUrl,apiKey;
let specs = {};

function load_req_tpl(editor,key) {
    if(key.length) 
        editor.setText(localStorage.getItem(key));
}


function import_zbx(reqTpl,form) {
    let method = form.resource.value+".get";
    let params = JSON.parse(reqTpl);
    overlay.show();
    zbx.get(form.resource.value,params).then((data)=>{
        if(!data.result)
            return alert("Could not fetch data");
        if(!data.result.length===0)
            return alert("No records found");
        data = {
            fields:Object.keys(data.result[0]),
            records: data.result
        };
        dt.load_data(data);
        localStorage.setItem("tableData",JSON.stringify(data));
    }).finally(()=>overlay.hide());
}

function remove_template(btn) {
    $(btn.form.templates).children().toArray()
        .forEach(opt=>{
            if(opt.selected) {
                localStorage.removeItem(opt.value);
                $(opt).remove();
            }
        });
}


function pull_push(template,form,pull=true) {

}
/**
 * push data to zabbix
 */
function push(template,form) {
    let method = form.resource.value+"."+form.operation.value;
    if(form.operation.value==="update") {
        dt.rows.filter(row=>row.selected).forEach((row)=>{
            row.el
                .removeClass("loading")
                .removeClass("synced")
            with(row.data) {
                let req = eval("`"+template+"`");
                try{
                    let params = JSON.parse(req);
                    // console.log(row.data,params);
                    // return;
                    overlay.show();
                    zbx.req(method,params).then((resp)=>{
                        console.log(resp)
                        if(resp.result) {
                            //row.el.data("zbxData",zbxData)
                            row.el.addClass("synced")
                        }
                    })
                        .catch(()=>row.el.addClass("syncfailed"))
                        .finally(()=>{
                        row.el.removeClass("loading");
                        overlay.hide()
                    });
                    row.el.addClass("loading");
                }
                catch(e) {
                    console.log(e);
                }
                
            }
        });
    }
}

/**
 * pull data from zabbix
 */
function pull(template,form) {
    if(form.postprocess.value==="update") {
        //console.log(dt.rows);
        dt.rows.filter(row=>row.selected).forEach((row)=>{
            //console.log(row);
            row.el
                .removeClass("loading")
                .removeClass("synced")
            with(row.data) {
                let req = eval("`"+template+"`");
                try{
                    overlay.show();
                    zbx.get(form.resource.value,JSON.parse(req)).then((resp)=>{
                        if(resp.result && resp.result.length) {
                            row.el.data("zbxData",resp.result)
                            row.el.addClass("synced")
                        }
                    }).finally(()=>{
                        overlay.hide();
                        row.el.removeClass("loading");
                    });
                }
                catch(e) {
                    console.log(e);
                }
            }
        });
        return;
    }
}

function update_cell(event) {
    let src = event.target;
    let cell = $(src);
    let val = cell.text();
    let row = $(src.parentNode);
    row.data("col"+cell.data("col"),val);
    if(cell.data("fld"))
        row.data(cell.data("fld"),val);
}

function toggle_row_select(inp) {
    if(inp.checked) {
        $(inp).parents("tr").addClass("selected");
    }
    else {
        $(inp).parents("tr").removeClass("selected");
    }
}

function rename_fld(event) {
    console.log(event);
}


function dataTable(id) {
    function cellObj(cell) {
        $(cell).on("input")
        return {
            el: $(cell),
            get val() { return this.el.data("value") },
            get fld() { return this.el.data("fld") },
            get col() { return this.el.data("col") },
            set val(val) { this.el.data("value",val); }
        }
    }
    
    function rowObj(row) {
        let $row = $(row);
        let obj = {
            get data() {return this.el.data()},
            el: $row,
            get cells(){
                return this.el.children(":not(:first-child)").toArray()
            },
        };
        obj.el.data("rowRef",obj);
        return obj;
    }

    return {
        el: $(id),
        get rows(){
            return this.el.find("tbody>tr").toArray()
                .map(rowObj);
        },
        columns: function() {

        },
        load_data: function (data,type="csv") {
            overlay.show();
            if(!data) return;
            console.log(data);
            let thead = this.el.children("thead").empty();
            let colsRow = $("<tr>").appendTo(thead);
            let labelsRow = $("<tr>").appendTo(thead);
            let filterRow = $("<tr>").appendTo(thead);
            let transformRow = $("<tr>").appendTo(thead);
        
            let tbody = this.el.children("tbody").empty();
            let numCols = data.fields.length+5>30 ? data.fields.length+5 : 30;
            $("<th rowspan='4' align='center'>").html("<input type='checkbox' class='form-check-input1' onchange='toggle_all_visible(this)'><button onclick='delete_selected()'>-</button> ").appendTo(colsRow);
            for(let i=0;i<numCols;i++) {
                let col = i+1;
                let fld = i<data.fields.length ? data.fields[i] : ("col" + col);
                $("<th>").data("fldname",fld).attr("data-col",col).append($("#transformTpl").clone().attr("id",null)).appendTo(transformRow).find("textarea[name=xpresion]");
                $("<th>").data("fldname",fld).attr("data-col",col).append($("#filterTpl").clone().attr("id",null)).appendTo(filterRow);
                $("<th>").attr("data-col",i+1).html("<span class='badge badge-primary' onclick='rename_fld(event)'>"+fld +"</span>").appendTo(labelsRow);
                $("<th>").on("click",toggleSmall).attr("data-col",col).html("<span class='badge badge-secondary'>col"+col+"</span>").appendTo(colsRow);

                $("<option>").attr("value",fld).appendTo("#fields");
            }

            $("<th rowspan='4'>").html("<button onclick='addCol()'>+</button>").appendTo(labelsRow);
            
            // populate data
            for(let rowIdx=0;rowIdx<data.records.length;rowIdx++) {
                let row = $("<tr>").appendTo(tbody)
                    .data("rowIdx",rowIdx); // set rowIdx
                    
                // add 1st cell
                $("<td align='center'>").html("<input type='checkbox' class='form-check-input1' onchange='toggle_row_select(this)'> <button onclick='info(this)'>"+rowIdx+"</button>").appendTo(row);
                for(let colIdx=0;colIdx<numCols;colIdx++) {
                    // create cell
                    let cell = $("<td>")
                        .on("input",update_cell)
                        .on("dblclick",(event)=>$(event.target).attr('contenteditable',true).trigger("focus"))
                        .on("blur",(event)=>$(event.target).attr("contenteditable",false))
                        .attr("data-col",colIdx+1)
                        .appendTo(row);

                    
                    if(colIdx<data.fields.length) {
                        // get fieldname
                        let fld = data.fields[colIdx];
                        let val = data.records[rowIdx][fld];

                        if(!fld) fld = "col_"+colIdx;

                        //data.records[rowIdx][colIdx] = data.records[rowIdx][fld];
                        try {
                            row.data(fld,data.records[rowIdx][fld])
                                .data("col"+(rowIdx+1),data.records[rowIdx][fld]);
                                let value = data.records[rowIdx][fld];
                            value = typeof value ==="object" ? JSON.stringify(value) : value;
                            cell.text(value).attr("data-fld",fld);
                        }
                        catch (e) {
                            console.log(data.records[rowIdx]);
                            console.log(e);
                        }
                    }
                    row.data("col"+(colIdx+1),cell.text())
                }
                row.data(type+"Data",data.records[rowIdx]) // set row typeData
                //console.log(data.records[rowIdx]);
            }
            overlay.hide();
            localStorage.setItem("tableData",JSON.stringify(data));
            //$("#preview").colResizable();
        }
    };
}


function auto_save() {
    let rows = dt.rows;
    let data = {fields:[],records:[]}
    let fields;
    if(rows.length) {
        data.fields = Object.keys(rows[0].data).filter(fld=>fld!=="rowRef");
    }
    
    rows.forEach((row)=>{
        let tmp = Object.assign({},row.data);
        delete tmp.rowRef;
        data.records.push(tmp);
    });
    console.log(data);
}


function downloadBlob(content, filename, contentType) {
    // Create a blob
    var blob = new Blob([content], { type: contentType });
    var url = URL.createObjectURL(blob);

    // Create a link to download it
    var pom = document.createElement('a');
    pom.href = url;
    pom.setAttribute('download', filename);
    pom.click();
}

function save_data() {
    let data = []
    $("#preview>tbody>tr").each((idx,row)=>{
        let rec = {};
        let cells = $(row).children().toArray();
        cells.shift(-1);
        
        cells.forEach((cell)=>{
            let fld = $(cell).data("fld");
            fld = typeof fld==="undefined" ? "col"+$(cell).data("col") : fld;
            rec[fld]=$(cell).text()
        });
        data.push(rec);
    })
    console.log(data);
    csv = Papa.unparse(data,{
        quotes: true, //or array of booleans
        quoteChar: '"',
        escapeChar: '"',
        delimiter: ",",
        header: true,
        newline: "\n",
        skipEmptyLines: false, //other option is 'greedy', meaning skip delimiters, quotes, and whitespace.
        columns: null //or array of strings
    });
    console.log(csv);
    downloadBlob(csv,"backup.csv","text/csv;charset=utf-8;");
}


function transform_data(event,apply=false){
    let src = event.target;
    let el = src.form.xpression;
    let col = $(el).parents("th").data("col");
    let expr = el.value;

    function transform(cell) {
        let data = $(cell.parentNode).data();

        $(cell.parentNode).children().each((idx,cell)=>{
            if(idx==0)return;
            data["col"+idx] = $(cell).text();
        });
        data.self = $(cell).text();
        if(expr!=="")
            with(data){
                return eval(expr);
            }
    }
    
    let colCells = $("#preview>tbody>tr:not(.d-none)>td:nth-child("+(col+1)+")");
    if(!apply)  {
        try {
            let newVal = transform(colCells[0]);
            
            el.form.preview.value = (typeof newVal!=="undefined")? newVal : $(colCells[0]).text()
        }
        catch(e) {
            console.log(e);
            el.form.preview.value = "Error: "+e.message
        }
        return;
    }
    

    colCells.each((idx,cell)=>{
        $(cell).html(transform(cell));
        $(cell).trigger("input");
    });
    src.form.reset();
    minimize_transform(event,true);
}

function filter_rows(form){
    let rgx = form.filter.value.replaceAll("{value}",form.term.value);
    console.log(rgx);
    let th = $(form).parents("th");
    let col = th.data("col");
    $("#preview>tbody>tr").removeClass("d-none");
    console.log("remove filter",th.removeClass("filterActive"));
    if(!rgx.length) return;
    rgx = new RegExp(rgx,"i");

    console.log("add filter",th.addClass("filterActive"));
    $("#preview>tbody>tr>td:nth-child("+(col+1)+")").each((idx,cell)=>{
        let val = $(cell).text();
        if(!rgx.test(val)) {
            $(cell.parentNode).addClass("d-none");
        }
    })
    
}


function delete_selected() {
    $("#preview>tbody input:checked").each((idx,item)=>$(item).parents("tr").remove());
} 

function toggle_all_visible(src){
    let inps = $("#preview>tbody>tr:not(.d-none) input[type=checkbox]");
    
    let checked = src.checked;
    inps.each((idx,inp)=>{
        inp.checked=checked
        $(inp).trigger("change");
    })
}

function toggleSmall(event) {
    console.log(event);
    if(event.target.tagName!=="TH") return;
    let el = $(event.target);
    let col = el.data("col")+1;
    if(el.hasClass("small")) {
        $("#preview>thead>tr:first-child>th:nth-child("+col+")").removeClass("small");
        $("#preview>thead>tr:not(:first-child)>th:nth-child("+(col-1)+")").removeClass("small");
        $("#preview td:nth-child("+col+")").removeClass("small");
    }
    else {
        $("#preview>thead>tr:first-child>th:nth-child("+col+")").addClass("small");
        $("#preview>thead>tr:not(:first-child)>th:nth-child("+(col-1)+")").addClass("small");
        $("#preview td:nth-child("+col+")").addClass("small");
    }
}

function addCol(){
    let headerLastEl = $("#preview>thead>tr:first-child>th:last-child");
    let transformRow = $("#preview>thead>tr:last-child");
    let filterRow = $("#preview>thead>tr:nth-child(2)");
    
    let col = transformRow.children().length+1;
    $("<th>").data("fldname","col"+col).attr("data-col",col).append($("#transformTpl").clone().attr("id",null)).appendTo(transformRow);
    $("<th>").data("fldname","col"+col).attr("data-col",col).append($("#filterTpl").clone().attr("id",null)).appendTo(filterRow);

    //$("<th>").data("fldname","col"+col).attr("data-col",col).html("<textarea onchange='transform(this)' placeholder='transform' rows=1>").appendTo(transformRow);
    //$("<th>").data("fldname","col"+col).attr("data-col",col).html("<textarea onkeyup='filter(this)' placeholder='filter'>").appendTo(filterRow);
    $("<th>").on("click",toggleSmall).attr("data-col",col).text("col"+col).insertBefore(headerLastEl);
    $("#preview>tbody>tr").each((idx,row)=>{
        $("<td contenteditable='true'>").appendTo(row);
    })
}

function info(src) {
    let data = Object.assign({},$(src).parents('tr').data());
    delete data.rowRef;
    console.log(data);
    show_modal({
        body:"<div class='bg-light'><pre >"+JSON.stringify(data,null,4)+"</pre></div>",
        title: "Record "+data.rowIdx,
        size: "lg"
    })
}






Array.prototype.unique = function(){
    function distinct(value, index, array) {
        return array.indexOf(value) === index;
    }
    return this.filter(distinct);
};

function load_csv(input) {
    let a = $(input).parse({
        config: {
            header: true,
            complete: (data)=>{
                console.log(data);
                data = {
                    records: data.data,
                    fields: data.meta.fields
                };
                localStorage.setItem("tableData",JSON.stringify(data));
                
                dt.load_data(data)
            }
        }
    });
    console.log(a);
}

function load_api_key(src) {
    $.get("./zbx_api_key.txt").then(data=>{
        src.form.token.value = data;
    });
}
function load_api_url(src) {
    $.get("./zbx_url.txt").then(data=>{
        src.form.url.value = data;
    });
}

function save_zbx_config(form) {
    $("#zbxLogo").addClass("notConnected");
    localStorage.setItem("zbxUrl",form.url.value);
    localStorage.setItem("zbxToken",form.token.value);
    zbx_connect();
}

function zbx_connect() {
    let url = localStorage.getItem("zbxUrl");
    let token = localStorage.getItem("zbxToken");
    $("#zbxConfigForm")[0].url.value = url;
    $("#zbxConfigForm")[0].token.value = token;
    zbx = new ZBXApi(url,token);
    overlay.show();
    zbx.get("host",{limit:1}).then(data=>{
        if(typeof data.result!==undefined) {
            $("#zbxLogo").removeClass("notConnected");
        }
    }).finally(()=>overlay.hide());
}


function save_req_tpl(prefix,selectId,editor) {
    let name = prompt("Template name");
    localStorage.setItem(prefix+name,editor.getText());
    setup_req_tpl_select(selectId,prefix);
}

function setup_req_tpl_select(id,prefix) {
    let sel = $(id).empty().append("<option value=''>Select template</option>");
    let prefixLen = prefix.length;
    Object.keys(localStorage)
        .filter(key=>key.indexOf(prefix)!==-1)
        .forEach(key=>$("<option>").text(key.substr(prefixLen)).attr("value",key).appendTo(sel));
}

function preview_request(editor) {
    try {
        let previewEl = $(editor.container.parentNode).find(".preview>pre");
        let row = dt.rows.filter(row=>row.selected).pop();
        console.log(editor.getText(),$(editor.container.parentNode),row);
        if(row) {
            console.log(row.data);
            with(row.data) {
                try {
                    previewEl.text(eval("`"+editor.getText()+"`"));
                }
                catch(e) {
                    previewEl.text("Invalid template. Fix it!")
                }
            }
        }
        else {
            previewEl.text("No rows selected")
        }
    }
    catch(e) {
        console.log(e);
    }
}
const pullReqTplEditor = new JSONEditor($("#pullReqTplEditor")[0], {mode: 'code',onChange: ()=>{preview_request(pullReqTplEditor)}});
const pushReqTplEditor = new JSONEditor($("#pushReqTplEditor")[0], {mode: 'code',onChange: ()=>{preview_request(pushReqTplEditor)}});
const importReqTplEditor = new JSONEditor($("#importReqTplEditor")[0], {mode: 'code',onChange: ()=>{preview_request(importReqTplEditor)}});

const pullReqTplPfx = "pullReqTpl_"
const pushReqTplPfx = "pushReqTpl_"
const importReqTplPfx = "importReqTpl_"

setup_req_tpl_select("#pullReqTemplates",pullReqTplPfx);
setup_req_tpl_select("#pushReqTemplates",pushReqTplPfx);
setup_req_tpl_select("#importReqTemplates",importReqTplPfx);

let dt = dataTable("#preview");

function run_old() {
    
    $("#warning").remove();
    //setTimeout(()=>alert("Pull and import is safe always, push can lead to troubles.\nBe carefull! Don't get fired... or sued."),100);

    setTimeout(() => {
        zbx_connect();
        let data ;
        try {
            data = JSON.parse(localStorage.getItem("tableData"));
            dt.load_data(data);
        }
        catch(e) {
            console.log("No valid data saved in localstorage",e);
        }
    }, 300);
    
}
function run() {
    $("#warning").remove();
    //setTimeout(()=>alert("Pull and import is safe always, push can lead to troubles.\nBe carefull! Don't get fired... or sued."),100);

    setTimeout(() => {
        zbx_connect();
        let data ;
        try {
            data = JSON.parse(localStorage.getItem("tableData"));
            let dt = new DataTable("#container");
            dt.load_data(data.fields,data.records)
        }
        catch(e) {
            console.log("No valid data saved in localstorage",e);
        }
    }, 300);
}
$(document).ready(()=>{
    if(localStorage.getItem("userlevel")==="courageous") {
        run();
    }
});

let overlay = {
    el: $("#overlay"),
    show: function(){
        this.el.show();
    },
    hide: function(){
        this.el.hide();
    }
};

function generateUID() {
    // I generate the UID from two parts here 
    // to ensure the random number provide enough bits.
    var firstPart = (Math.random() * 46656) | 0;
    var secondPart = (Math.random() * 46656) | 0;
    firstPart = ("000" + firstPart.toString(36)).slice(-3);
    secondPart = ("000" + secondPart.toString(36)).slice(-3);
    return firstPart + secondPart;
}

function minimize_transform(event,force=false) {
    console.log(force)
    let slf = event.target;
    console.log(event,$(event.relatedTarget).parents(".transform")[0]==$(event.target).parents(".transform")[0] );
    if($(event.relatedTarget).parents(".transform")[0]==$(event.target).parents(".transform")[0] && !force) {
        return;
    }
    setTimeout(()=>$(slf).parents('.transform').removeClass('active'),100)
}

function save_transformation(src) {
    console.log("Save transformation",src.form.xpression.value);
    localStorage.setItem("transfo_"+generateUID(),src.form.xpression.value);
}

function remove_transformation(src) {
    localStorage.removeItem($(src.form.templates).val());
    $(src.form.templates).children(":selected").remove();
}

function list_transformations(src,ev) {
    if(ev.target.tagName==="OPTION")
        return;
    console.log(ev);
    let sel = $(src).empty();
    Object.keys(localStorage).filter(key=>key.indexOf("transfo_")!==-1).forEach(key=>{
        $("<option>").val(key).text(localStorage.getItem(key)).appendTo(sel)
    });
}

function load_transfo(src){
    src.form.xpression.value = $(src).children(":selected").text();
    $(src.form.xpression).trigger("focus").trigger("change");
    console.log(src);
}