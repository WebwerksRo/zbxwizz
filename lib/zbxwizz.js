let zbx;

function load_req_tpl(editor, key) {
    if (key.length)
        editor.setText(localStorage.getItem(key));
}


function import_from_api (resource, tpl){
    overlay.show();
    let params;
    return new Promise((resolve,reject)=>{
        try {
            tpl = eval("`" + tpl + "`");
            // console.log(tpl);
            params = JSON.parse(tpl);
            // console.log(params);
            zbx.get(resource, params)
                .then((data) => {
                    if (!data.result)
                        reject(json(data));

                    if (data.result.length === 0)
                        resolve(null);
                    
                    data = {
                        fields: Object.keys(data.result[0]),
                        records:  data.result
                    };
                    for(let i=0;i<data.records.length;i++) {
                        let tmp = Object.assign({},data.records[i]);
                        Object.keys(data.records[i])
                            .forEach(fld=>{
                                data.records[i][fld]=typeof data.records[i][fld] ==="object" ? json(data.records[i][fld]) : data.records[i][fld]
                            });
                        data.records[i] = {
                            flds:data.records[i],
                            data: {
                                'csv':tmp
                            }
                        }
                    }
                    /**
                     * @type {DataTable}
                     */
                    let dt = worksheets.get_active_sheet();
                    dt.reset().load_data(data.fields, data.records,'csv');
                    resolve(data);
                })
                .catch(e=>{
                    reject(e);
                })
                .finally(() => overlay.hide());
        } catch (e) {
            overlay.hide();
            reject(e)      
        }
    });
    
}

// function req_import_from_api(reqTpl, form) {
function req_import_from_api(sheet, form) {

    let reqTpl = form.find(".jsoneditorcontainer").data().editor.getText();
    console.log(reqTpl);
    import_from_api (form[0].resource.value,reqTpl)
        .then((resp)=>{
            console.log(resp);
            if(resp===null) 
                normal_modal({
                    body: 'No records returned'
                })
        })
        .catch((e)=>{
            console.log(e);
            normal_modal({
                body: 'Error perfoming the request:<pre class="pre" style="overflow: scroll">'+reqTpl+"/ "+e+'</pre>'
            })
        })
        .finally(()=>overlay.hide())
}

function req_import_js(template){
    try {
        let data =  ( obj(eval("`" + template + "`")));
        worksheets.get_active_sheet().reset().load_data(data.fields, data.records,'csv');
    }
    catch(e) {
        normal_modal({body: "Error on importing data:<br><pre>"+e.message + "</pre>"});
    }

}

function remove_template(btn) {
    $(btn.form.templates).children().toArray()
        .forEach(opt => {
            if (opt.selected) {
                localStorage.removeItem(opt.value);
                $(opt).remove();
            }
        });
}

/**
 * push data to zabbix
 * @param {DataTable} sheet
 * @param {jquery} form
 */
function push_to_api(sheet, form) {

    let editor = form.find(".jsoneditorcontainer").data().editor;
    form = form[0];
    let template = editor.getText();
    normal_modal({
        body: $("<div>").html("<p>Pushing to Zabbix can lead to damage if the request is not properly configured. Please confirm you have reviewed the request and you are sure you want to perform the operation</p>"+
            (form.operation.value==="delete"?"<div class='alert alert-danger'>You are trying to perform a DELETE operation</div>":""))
            .append($("<button class='btn btn-danger' data-dismiss='modal'>Confirm</button>").on("click",()=>exec_push(template, form)))
    });

    function exec_push(template, form) {
        let method = form.resource.value + "." + form.operation.value;


        let ps = [];
        let err = false;
        let rows = sheet.rows.filter(row => row.isSelected);
        let cnt = 0;
        overlay.show().set_progress(rows.length);
        rows.forEach((row) => {
            row.lastResponse = null;
            if(err) return;
            let data = {
                data: row.data,
                cols: row.vals,
                flds: row.fld_vals
            };

            try {
                let params;
                with (data) {
                    let req = eval("`" + template + "`");
                    params = JSON.parse(req);
                }

                ps.push(zbx.req(method, params)
                    .then((resp) => {
                        cnt++;
                        overlay.progress(cnt);
                        row.lastResponse = resp;
                    })
                    .catch((e) =>{
                        cnt++;
                        overlay.progress(cnt);
                        console.log("syncfailed",e)
                    })
                );

            } catch (e) {
                console.log(e);
                err = {
                    err: e,
                    row: row,
                    tpl: template
                };
            }
        });
        Promise.all(ps).finally(()=>{
            overlay.hide();
            if(err) {
                normal_modal({body: "Some error occured: "+json(err)})
            }
        });
    }
}

/**
 *
 * pull data from zabbix
 * @param {DataTable} sheet
 * @param {jquery} form
 */
function req_pull(sheet,form) {
    let template = form.find(".jsoneditorcontainer").data().editor.getText();
    form = form[0];
    let rows = sheet.rows.filter(row => row.isSelected);
    if(!rows.length) return alert_modal("No rows selected");

    let resource = form.resource.value;
    let label = form.label.value;

    // perform request
    (new Promise((resolve,reject)=>{
            let ps = [];
            let cnt = 0;
            overlay.show().set_progress(rows.length);
            rows.forEach((row) => {
                // console.log(row);
                let data = {
                    data: row.data,
                    cols: row.vals,
                    flds: row.fld_vals
                };
                let req;
                with (data) {
                    req = eval("`" + template + "`");
                }
                try {
                    row.set_loading();
                    let tmp = JSON.parse(req);
                    let p = new Promise((resolve,reject)=>{
                        zbx.get(resource, tmp)
                            .then((resp) => {
                                if (resp.result) {
                                    if(resp.result.length)
                                        row.data[label] = resp.result.length===1 ? resp.result[0] : resp.result ;
                                    else
                                        row.data[label]  = null;
                                }
                                row.lastResponse = resp;
                                cnt++;
                                overlay.progress(cnt);
                                resolve(row);
                            })
                            .catch(e => {
                                overlay.progress(cnt);
                                console.log(e);
                                reject(e);
                            })
                            .finally(() => {
                                row.unset_loading();
                            });
                    });
                    ps.push(p);
                } catch (e) {
                    row.data.last_error = e.toString();
                }
            });
            Promise.all(ps).then(()=>resolve()).catch((e) => reject(e)).finally(() => overlay.hide());
        }))
        .catch(e=>{
            console.log(e);
            alert("Some error happend:" + e)
        })
        .finally(() => overlay.hide())
}


/**
 *
 * @param filter
 */
function save_data(filter=null) {

    /**
     *
     * @param content
     * @param filename
     * @param contentType
     */
    function downloadBlob(content, filename, contentType) {
        // Create a blob
        let blob = new Blob([content], {type: contentType});
        let url = URL.createObjectURL(blob);

        // Create a link to download it
        let pom = document.createElement('a');
        pom.href = url;
        pom.setAttribute('download', filename);
        pom.click();
    }


    let dt = worksheets.get_active_sheet();
    let data = dt.export(filter);
    let csv = Papa.unparse(data.map(d=>d.flds), {
        quotes: true, //or array of booleans
        quoteChar: '"',
        escapeChar: '"',
        delimiter: ",",
        header: true,
        newline: "\n",
        skipEmptyLines: false, //other option is 'greedy', meaning skip delimiters, quotes, and whitespace.
        columns: null //or array of strings
    });
    downloadBlob(csv, "backup.csv", "text/csv;charset=utf-8;");
}

/**
 *
 * @param event
 * @param apply
 */
function transform_data(event, apply = false) {
    /**
     *
     * @param cell
     * @param expr
     * @returns {string|*}
     */
    function transform_cell(cell, expr) {
        // console.log(cell);
        let data = {
            data: cell.row.data,
            cols: cell.row.vals,
            flds: cell.row.fld_vals,
            self: cell.val,
            ws: worksheets.sheets,
            lastResponse: cell.row.lastResponse
        };

        if (expr !== "")
            try{
                with (data) {
                    let newVal = eval(expr);
                    if (typeof newVal==="object") {
                        newVal = JSON.stringify(newVal)
                    }
                    return newVal;
                }
            }
            catch(e) {
                return e.message
            }
    }

    /**
     *
     * @param colId
     * @param expr
     */
    function transform_col(colId,expr) {
        worksheets.get_active_sheet().col(colId)
            .filter(cell=>!cell.row.isHidden)
            .forEach((cell)=>cell.val = transform_cell(cell,expr))
    }


    // console.log(event)
    let src = event.target;
    let el = src.form.xpression;
    let col = $(el).parents("th").attr("data-col")*1;
    let expr = el.value;

    /**
     *
     * @param {Cell} cell
     * @returns {any}
     */

    if (!apply) {
        let dt = worksheets.get_active_sheet();
        let cell = dt.col(col).filter(cell=>!cell.row.isHidden).shift();

        try {
            el.form.preview.value = transform_cell(cell,expr);
        } catch (e) {
            console.log(e);
            el.form.preview.value = "Error: " + e.message
        }
        return;
    }

    transform_col(col,expr);
    
    minimize_transform(event, true);
}

/**
 *
 * @param {jquery} form
 * @param {boolean} clear
 */
function filter_rows(form,clear=false) {
    let th = $(form).parents("th");
    let dt = th.parents("table").data().sheet;
    let val = form.filter.value.replaceAll("{value}", form.term.value);
    // th.removeClass("filterActive");

    val = val ? val : ".*";
    let rgx = new RegExp(val, "i");
    let colNo = th.attr("data-col")*1;
    th.addClass("filterActive");

    dt.col(colNo).forEach(cell => {
        if (!rgx.test(cell.val)) {
            // console.log("filterOut", col);
            cell.row.filter_out(cell);
        } else {
            // console.log("filterIn", col);
            cell.row.filter_in(cell);
        }
    });

    if(clear)
        th.removeClass("filterActive");
    worksheets.update_stats();

}


/**
 *
 * @param input
 * @param {DataTable} dt
 */
function load_csv(input,dt=worksheets.get_active_sheet()) {
    return new Promise((resolve)=>{
        console.log("Import CSV");
        $(input).parse({
            config: {
                header: true,
                complete: (data) => {
                    if(data.errors.length) {
                        normal_modal({
                            body: "Some error occured while importing the CSV: <pre class='d-block'>"+json(data.errors,null,4)+"</pre>"
                        })
                    }
                    data = {
                        records: data.data,
                        fields: data.meta.fields
                    };
                    localStorage.setItem("sheet-"+dt.container_id + "-data", JSON.stringify(data));
                    
                    for(let i=0;i<data.records.length;i++) {
                        data.records[i] = {
                            flds: data.records[i]
                        }
                    }
                    console.log(data);
                    
                    dt.reset().load_data(data.fields, data.records);
                    resolve();
                }
            }
        });
    });

}



function save_zbx_config(form) {
    $("#zbxLogo").addClass("notConnected");
    localStorage.setItem("zbxUrl", form.url.value);
    localStorage.setItem("zbxToken", form.token.value);
    zbx_connect();
}

function zbx_connect() {
    let url = localStorage.getItem("zbxUrl");
    let token = localStorage.getItem("zbxToken");
    let form = $("#zbxConfigForm")[0];
    form.url.value = url;
    form.token.value = token;
    zbx = new ZBXApi(url, token);
    overlay.show();
    zbx.get("host", {limit: 1}).then(data => {
        if (typeof data.result !== undefined) {
            $("#zbxLogo").removeClass("notConnected");
        }
    }).finally(() => overlay.hide());
}
function save_req_tpl(prefix, editor) {
    prompt_modal("Template name",(name)=>name?localStorage.setItem(prefix + name, editor.getText()):null);

}


function preview_request(editor,tpl,rowContext=true) {
    
    // console.log(editor);
    try {
        let previewEl = $(editor.container.parentNode).find(".preview>pre");
        if(rowContext) {
            let row = worksheets.get_active_sheet().rows.filter(row => row.isSelected)[0];
            // console.log(row);
            if (row) {
                let data = {
                    data: row.data,
                    cols: row.vals,
                    flds: row.fld_vals
                };
                // console.log(data);
                with (data) {
                    try {
                        previewEl.text(eval("`" + tpl + "`"));
                    } catch (e) {
                        console.log(e);
                        previewEl.text("Invalid JS template: "+e.message)
                    }
                }
            } else {
                previewEl.text("No rows selected");
            }
        }
        else {
            try {
                previewEl.text(eval("`" + tpl + "`"));
            } catch (e) {
                console.log(e);
                previewEl.text("Invalid JS template: "+e.message)
            }
        }
        
    } catch (e) {
        console.log(e);
    }
}

/**
 * @type WorkSheets
 */
let worksheets;

function run() {
    $("#warning").remove();
    //setTimeout(()=>alert("Pull and import is safe always, push can lead to troubles.\nBe carefull! Don't get fired... or sued."),100);

    // load autosaved data
    setTimeout(() => {
        zbx_connect();
        worksheets = new WorkSheets('#worksheets', '#sheetSelector');
        $("#sheetSelector").sortable({
            stop: ()=>worksheets.reorder()
        });
    }, 300);
    return true;
}

$(document).ready(() => {
    if (localStorage.getItem("userlevel") === "courageous") {
        run();
    }
});


let overlay = (($overlay)=>{
    return {
        el: $overlay,
        _progress: $overlay.find("progress"),
        max: 0,
        show: function () {
            this.el.show();
            return this;
        },
        hide: function () {
            this.el.hide();
            this._progress.hide();
            return this;
        },
        set_progress: function(max,val=0) {
            this._progress.attr("max",max).attr("value",val).show().text("0%");
            this.max = max;
            return this;
        },
        progress: function(val) {
            this._progress.attr("value",val).text(Math.round(val/this.max*100)+"%");
            return this;
        }
    }
})($("#overlay"));

function generateUID() {
    // I generate the UID from two parts here
    // to ensure the random number provide enough bits.
    let firstPart = (Math.random() * 46656) | 0;
    let secondPart = (Math.random() * 46656) | 0;
    firstPart = ("000" + firstPart.toString(36)).slice(-3);
    secondPart = ("000" + secondPart.toString(36)).slice(-3);
    return firstPart + secondPart;
}

function minimize_transform(event, force = false) {
    let slf = event.target;
    if ($(event.relatedTarget).parents(".transform")[0] === $(event.target).parents(".transform")[0] && !force) {
        return;
    }
    setTimeout(() => $(slf).parents('.transform').removeClass('active'), 100)
}

function save_transformation(src) {
    console.log("Save transformation", src.form.xpression.value);
    localStorage.setItem("transfo_" + generateUID(), src.form.xpression.value);
}

function remove_transformation(src) {
    localStorage.removeItem($(src.form.templates).val());
    $(src.form.templates).children(":selected").remove();
}

function list_transformations(src, ev) {
    if (ev.target.tagName === "OPTION")
        return;
    let sel = $(src).empty();
    $("<option>").appendTo(sel);
    Object.keys(localStorage).filter(key => key.indexOf("transfo_") !== -1).forEach(key => {
        $("<option>").val(key).text(localStorage.getItem(key)).appendTo(sel)
    });
}

function load_transfo(src) {
    let xpr = $(src).children(":selected").text();
    if(!xpr) return;
    src.form.xpression.value = xpr;
    $(src.form.xpression).trigger("focus").trigger("change");
    console.log(src);
}

function json(obj,opt1=null,opt2=null) {
    return JSON.stringify(obj,opt1,opt2)
}
function obj(str) {
    return JSON.parse(str);
}


function autosave(stop=false) {
    worksheets.save();
    Object.keys(worksheets.sheets).forEach((name)=>{
        worksheets.sheets[name].save();
    });
    if(!stop) 
        setTimeout(autosave, 60000);
}

setTimeout(autosave, 60000);


function save_structure() {

    let config = json(worksheets.get_active_sheet().fields);
    normal_modal({
        body:`
        Save table structures<br>
        <form  onsubmit="event.preventDefault();console.log(this.structname.value);localStorage.setItem('tbl_struct_'+this.structname.value,this.config.value);">
        <label class="d-block">Name<br>
        <input name="structname" class="w-100" required/>
        </label>
        <label class="d-block">Config<br>
        <textarea name="config" style="width: 100%; height: 100px" required>${config}</textarea>
        </label>
        <button type="submit">Save</button>
        </form>
        `
    });
}
function manage_struct() {
    let tmp = Object.keys(localStorage).filter(s=>s.match(/^tbl_struct/))
        .map(s=>"<option value='"+s+"'>"+s.substr(11)+"</option>");
    normal_modal({
        body:`
        <form>
        <label class="d-block">Saved table structures<br>
        <select name="struct" onchange="this.form.preview.value=localStorage.getItem($(this).val())" class="w-100"><option></option>${tmp ? tmp.join() : ""}</select>
        </label>
        <label class="d-block">
        Preview<br>
        <textarea class="w-100" style="width: 100px" name="preview"></textarea></label>
        <button onclick="localStorage.removeItem(this.form.struct.value)" type="button" data-dismiss="modal">Delete</button>
        <button onclick="restore_structure(this.form.struct.value)" data-dismiss="modal">Restore</button>
        </form>
        `
    });
}

function restore_structure(name) {
    let struct = localStorage.getItem(name);
    let fields = obj(struct);
    worksheets.new_sheet(null,{
        records: worksheets.get_active_sheet().export(),
        fields: fields
    })
}



function download_string(filename, mime, text) {
    const pom = document.createElement('a');
    pom.setAttribute('href', 'data:'+mime+';charset=utf-8,' + encodeURIComponent(text));
    pom.setAttribute('download', filename);

    if (document.createEvent) {
        const event = document.createEvent('MouseEvents');
        event.initEvent('click', true, true);
        pom.dispatchEvent(event);
    }
    else {
        pom.click();
    }
}

function alert_modal(message,callback=new Function) {
    let modal = normal_modal({
        body: message,
        buttons: [
            {
                text: "OK",
                action: ()=>{
                    modal.modal("hide");
                    callback()
                },
                class: "primary"
            }
        ]
    })
}

/**
 *
 */
function save_env() {

    prompt_modal("Enter file name to save",(filename)=>{
        if(!filename) return;
        let data = {
            worksheets: obj(localStorage.getItem("worksheets")),
            sheets: {},
            name: filename
        };
        data.worksheets.sheets.forEach(s=>data.sheets[s]=obj(localStorage.getItem(`sheet-${s}-data`)));
        download_string(data.name+".json","application/json",json(data));
    })

}

/**
 *
 * @param form
 */
function load_env(form) {
    console.log(form);
    let fr = new FileReader();
    fr.addEventListener(
        "load",
        () => {
            // this will then display a text file
            try {
                let data = obj(fr.result);
                // cleanup localstorage
                Object.keys(localStorage).filter(k=>k.match(/^sheet-.*-data$/)).forEach(k=>localStorage.removeItem(k));
                // load  new data
                localStorage.setItem("worksheets",json(data.worksheets));
                Object.keys(data.sheets).forEach(s=>localStorage.setItem("sheet-"+s+"-data",json(data.sheets[s])));
                // reload app
                window.location.reload();
            }
            catch (e) {
                console.log(e);
            }
        },
        false,
    );
    fr.readAsText(form.envfile.files[0]);
}


function generateShortUUID() {
    return Math.random().toString(36).substr(2, 7); // Generates a random string of 9 characters
}

function load_templates(event,prefix) {
    if(event.target.tagName==="OPTION") return;
    let sel = $(event.target).empty().append("<option value=''>Select template</option>");
    let prefixLen = prefix.length;
    Object.keys(localStorage)
        .filter(key => key.indexOf(prefix) !== -1)
        .sort()
        .forEach(key => $("<option>").text(key.substr(prefixLen)).attr("value", key).appendTo(sel));
}

function req_modal(sel,title,action,sheet,dialogOpts={},rowContext=true){
    console.log(sel)
    let lastSaved = localStorage.getItem(sel+"_tpl");
    let form = $(sel).clone();
    form.find(".jsoneditorcontainer").toArray().forEach((item)=>{
        let editor = new JSONEditor(item, {
            mode: 'code', onChange: () => {
                let tpl = editor.getText();
                localStorage.setItem(sel+"_tpl",tpl);
                preview_request(editor,tpl,rowContext)
            }
        });
        if(lastSaved) editor.setText(lastSaved);
        $(item).data("editor",editor)
    });
    let opts = {
        title: title,
        body: form,
        attrs:{
            style: "width: 400px; height: 400px !important"
        },
        buttons:[
            {
                text: "Execute",
                action: ()=>{
                    action(sheet,form);
                    modal.remove();
                },
                class: "primary"
            }
        ]
    };
    opts = Object.assign(opts,dialogOpts);
    let modal = dragable_modal(opts);
}


function under_development() {
    dragable_modal({
        title: "Help",
        body: "Under development"
    })
}



function playscript() {
    let script = editor.getValue();
    localStorage.setItem("script",script);
    try {
        $("#scriptDebug").val(eval(script));
    }
    catch(e) {
        $("#scriptDebug").val(e);
    }
}


function prompt_save_data() {
    let $el = $(`
        <div>
            What do you want to export
            <select>
                <option value="">all records</option>
                <option value="selected">only selected</option>
                <option value="visible">only visible</option>
            </select>
        </div>
            `);
    dragable_modal({
        title:"Export CSV",
        body: $el,
        buttons:[
            {
                text: "Export",
                action: ()=>{
                    console.log($el.children("select").val());
                    switch($el.children("select").val()) {
                        case "selected":
                            save_data(row=>row.isSelected);
                            break;
                        case "visible":
                            save_data(row=>!row.isHidden);
                            break;
                        default:
                            save_data();
                    }
                },
                class: "primary"
            }
        ]
    });
}

function open_play_editor(    ) {
    ace.require("ace/ext/language_tools");
    let editor = ace.edit("editor");
    editor.session.setMode("ace/mode/javascript");
    editor.setTheme("ace/theme/tomorrow");
    // enable autocompletion and snippets
    editor.setOptions({
        enableBasicAutocompletion: true,
        enableSnippets: true,
        enableLiveAutocompletion: true,
        fontSize: "12pt"
    });
    editor.setValue(localStorage.getItem("script"));

    dragable_modal({
        title:"Script player",
        body: $("#scriptPlayer"),
        buttons:[
            {
                text: "Play",
                action: playscript,
                class: "primary"
            }
        ]
    });
    //$("#draggableModal").appendTo('body').show().draggable({ handle: ".card-header" }).resizable();
}


