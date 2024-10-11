/**
 *
 * @param opts
 */
function show_modal(opts = {}) {
    let $modal = $("#generic_modal").clone().appendTo("body").removeAttr("id")   // clone modal template
        .on("hidden.bs.modal", () => $modal.remove())  // setup cleanup after modal is closed
        .modal();   // open modal

    // set modal title if present
    if (!opts.title) {
        $modal.find(".modal-header").remove()
    } else {
        $modal.find(".modal-header").html(opts.title);
    }
    // set footer if present
    if (opts.footer) {
        $modal.find(".modal-header").html(opts.footer)
    }
    // set modal content
    $modal.find(".modal-body").empty().append(opts.body ? opts.body : "No content");
    if (opts.size) {
        $modal.find(".modal-dialog").addClass("modal-" + opts.size);
    }
}

let zbx, apiUrl, apiKey;
let specs = {};

function load_req_tpl(editor, key) {
    if (key.length)
        editor.setText(localStorage.getItem(key));
}


function import_zbx (resource,tpl){
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

function req_import_js(reqTpl) {
    // ${json(worksheets.sheets.sheet4.rows.map(r=>({
    //     hostid:r.cell('hostid'),
    //     name:r.cell('host'),
    //   })))}
    try {
        let json = (eval("`" + reqTpl + "`"));
        let data = obj(json);
        worksheets.get_active_sheet().reset().load_data(data.fields, data.records,'csv');
    }
    catch(e) {
        console.log(e);
        show_modal({
            body: "Some error occured"
        })
    }
    


}
function req_import_zbx(reqTpl, form) {
    import_zbx (form.resource.value,reqTpl)
        .then((resp)=>{
            console.log(resp);
            if(resp===null) 
                show_modal({
                    body: 'No records returned'
                })
        })
        .catch((e)=>{
            show_modal({
                body: 'Error perfoming the request:<pre class="pre" style="overflow: scroll">'+reqTpl+"/ "+e+'</pre>'
            })
        })
        .finally(()=>overlay.hide())
    

    
    
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
 */
function push(template, form) {

    show_modal({
        body: $("<div>").html("<p>Pushing to Zabbix can lead to damage if the request is not properly configured. Please confirm you have reviewed the request and you are sure you want to perform the operation</p>"+
            (form.operation.value=="delete"?"<div class='alert alert-danger'>You are trying to perform a DELETE operation</div>":""))
        .append($("<button class='btn btn-danger' data-dismiss='modal'>Confirm</button>").on("click",()=>exec_push(template, form)))
    })

    function exec_push(template, form) {
        let method = form.resource.value + "." + form.operation.value;
        overlay.show();
        let ps = [];
        let err = false;
        worksheets.get_active_sheet().rows.filter(row => row.isSelected)
            .forEach((row) => {
                row.lastResponse = null;
                if(err) return;
                let data = {
                    data: row.data,
                    cols: row.vals,
                    flds: row.fld_vals
                };
                
                    
                try {
                    with (data) {
                        let req = eval("`" + template + "`");
                        console.log(req);
                        let params = JSON.parse(req);
                        
                        
                        ps.push(zbx.req(method, params)
                            .then((resp) => {
                                console.log(resp)
                                row.lastResponse = resp;
                            })
                            .catch((e) => console.log("syncfailed",e))
                        );
                    }
                } catch (e) {
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
                show_modal({body: "Some error occured: "+json(err)})
            }
        });
    }
    
    
}

function pull(rows,resource,label,template) {
    return new Promise((resolve,reject)=>{
        let ps = [];
        overlay.show();
        rows.forEach((row) => {
            // console.log(row);
            let data = {
                data: row.data,
                cols: row.vals,
                flds: row.fld_vals
            };

            with (data) {
                let req = eval("`" + template + "`");
                try {
                    row.set_loading();
                    let tmp = JSON.parse(req);
                    let p = zbx.get(resource, tmp)
                        .then((resp) => {
                            if (resp.result && resp.result.length) {
                                row.data[label] = resp.result.length==1 ? resp.result[0] : resp.result ;
                            }
                            row.lastResponse = resp;
                        })
                        .catch(e => {
                            console.log(e)
                        })
                        .finally(() => {
                            row.unset_loading();
                        });
                    ps.push(p);
                } catch (e) {
                    row.data.last_error = e.toString();
                }
            }

        });
        Promise.all(ps).then(()=>resolve()).catch((e) => reject(e)).finally(() => overlay.hide());
    });
}
/**
 * pull data from zabbix
 */
function req_pull(template, form) {
    let rows = worksheets.get_active().rows.filter(row => row.isSelected);
    if(!rows.length) return alert("No rows selected");
    pull(rows,form.resource.value,form.label.value,template).catch(e=>alert("Some error happend:" + e)).finally(() => overlay.hide())
}


function downloadBlob(content, filename, contentType) {
    // Create a blob
    var blob = new Blob([content], {type: contentType});
    var url = URL.createObjectURL(blob);

    // Create a link to download it
    var pom = document.createElement('a');
    pom.href = url;
    pom.setAttribute('download', filename);
    pom.click();
}

function save_data() {
    let dt = worksheets.get_active_sheet();
    let data = dt.export();
    console.log(data);
    csv = Papa.unparse(data.map(d=>d.flds), {
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
    downloadBlob(csv, "backup.csv", "text/csv;charset=utf-8;");
}

function transform_col(colId,expr) {
    worksheets.get_active_sheet().col(colId)
        .filter(cell=>!cell.row.isHidden)
        .forEach((cell)=>cell.val = transform_cell(cell,expr))
}

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
                if (typeof newVal=="Object") {
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
 * @param event
 * @param apply
 */
function transform_data(event, apply = false) {
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


    /**
     * @type {DataTable}
     */


    if (!apply) {
        let dt = worksheets.get_active_sheet();
        console.log(col,dt.col(col));
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
 * @param form
 */
function filter_rows(form,clear=false) {
    let th = $(form).parents("th");
    let val = form.filter.value.replaceAll("{value}", form.term.value);
    // th.removeClass("filterActive");

    val = val ? val : ".*";
    let rgx = new RegExp(val, "i");
    let col = th.attr("data-col")*1;

    th.addClass("filterActive");
    /**
     *
     * @type {DataTable}
     */
    let dt = worksheets.get_active_sheet();
    dt.col(col).forEach(col => {
        if (!rgx.test(col.val)) {
            // console.log("filterOut", col);
            col.row.filter_out(col);
        } else {
            // console.log("filterIn", col);
            col.row.filter_in(col);
        }
    });

    if(clear) th.removeClass("filterActive");
    worksheets.update_stats();

}




// Array.prototype.unique = function(){
//     function distinct(value, index, array) {
//         return array.indexOf(value) === index;
//     }
//     return this.filter(distinct);
// };
function load_file(src) {

}

/**
 *
 * @param input
 * @param {DataTable} dt
 */
function load_csv(input,dt) {
    if(!dt)
        dt = worksheets.get_active_sheet();
    return new Promise((resolve,reject)=>{
        console.log("Import CSV");
        $(input).parse({
            config: {
                header: true,
                complete: (data) => {
                    console.log(data);
                    if(data.errors.length) {
                        show_modal({
                            body: "Some error occured while importing the CSV: <pre>"+json(data.errors,null,4)+"</pre>"
                        })
                    }
                    data.data.pop();
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
                    
                    dt.reset().load_data(data.fields, data.records)
                    resolve();
                }
            }
        });
    })

    console.log(a);
}


/**
 *
 * @returns {DataTable}
 */
function get_active_sheet() {
    let container = $($("#sheetSelector").find("button.active").attr("data-target"));
    if (container)
        return container.data("dt");
    return;
}

function load_api_key(src) {
    $.get("./zbx_api_key.txt").then(data => {
        src.form.token.value = data;
    });
}

function load_api_url(src) {
    $.get("./zbx_url.txt").then(data => {
        src.form.url.value = data;
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
function save_req_tpl(prefix, selectId, editor) {
    let name = prompt("Template name");
    localStorage.setItem(prefix + name, editor.getText());
    setup_req_tpl_select(selectId, prefix);
}

function setup_req_tpl_select(id, prefix) {
    let sel = $(id).empty().append("<option value=''>Select template</option>");
    let prefixLen = prefix.length;
    Object.keys(localStorage)
        .filter(key => key.indexOf(prefix) !== -1)
        .sort()
        .forEach(key => $("<option>").text(key.substr(prefixLen)).attr("value", key).appendTo(sel));
}

function preview_request(editor,rowContext=false) {
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
                console.log(data);
                with (data) {
                    try {
                        previewEl.text(eval("`" + editor.getText() + "`"));
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
                previewEl.text(eval("`" + editor.getText() + "`"));
            } catch (e) {
                console.log(e);
                previewEl.text("Invalid JS template: "+e.message)
            }
        }
        
    } catch (e) {
        console.log(e);
    }
}

const pullReqTplEditor = new JSONEditor($("#pullReqTplEditor")[0], {
    mode: 'code', onChange: () => {
        preview_request(pullReqTplEditor,true)
    }
});
const pushReqTplEditor = new JSONEditor($("#pushReqTplEditor")[0], {
    mode: 'code', onChange: () => {
        preview_request(pushReqTplEditor,true)
    }
});
const importReqTplEditor = new JSONEditor($("#importReqTplEditor")[0], {
    mode: 'code', onChange: () => {
        preview_request(importReqTplEditor)
    }
});
const importJSTplEditor = new JSONEditor($("#importJSTplEditor")[0], {
    mode: 'code', onChange: () => {
        preview_request(importJSTplEditor)
    }
});


const pullReqTplPfx = "pullReqTpl_"
const pushReqTplPfx = "pushReqTpl_"
const importReqTplPfx = "importReqTpl_"
const importJSTplPfx = "importJSTpl_"


setup_req_tpl_select("#pullReqTemplates", pullReqTplPfx);
setup_req_tpl_select("#pushReqTemplates", pushReqTplPfx);
setup_req_tpl_select("#importReqTemplates", importReqTplPfx);
setup_req_tpl_select("#importJSTemplates", importJSTplPfx);

/**
 * @type WorkSheets
 */
var worksheets;

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
}

$(document).ready(() => {
    if (localStorage.getItem("userlevel") === "courageous") {
        run();
    }
});

let overlay = {
    el: $("#overlay"),
    show: function () {
        this.el.show();
    },
    hide: function () {
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

function minimize_transform(event, force = false) {
    let slf = event.target;
    if ($(event.relatedTarget).parents(".transform")[0] == $(event.target).parents(".transform")[0] && !force) {
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
    console.log(ev);
    let sel = $(src).empty();
    Object.keys(localStorage).filter(key => key.indexOf("transfo_") !== -1).forEach(key => {
        $("<option>").val(key).text(localStorage.getItem(key)).appendTo(sel)
    });
}

function load_transfo(src) {
    src.form.xpression.value = $(src).children(":selected").text();
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

    let config = json(worksheets.get_active_sheet().columnFields);
    show_modal({
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
    console.log(tmp)
    show_modal({
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


function select_all_visible() {
    worksheets.get_active().rows.forEach(row=>row.select(true));
}

function download_string(filename, mime, text) {
    var pom = document.createElement('a');
    pom.setAttribute('href', 'data:'+mime+';charset=utf-8,' + encodeURIComponent(text));
    pom.setAttribute('download', filename);

    if (document.createEvent) {
        var event = document.createEvent('MouseEvents');
        event.initEvent('click', true, true);
        pom.dispatchEvent(event);
    }
    else {
        pom.click();
    }
}

function save_env() {
    let data = {
        worksheets: obj(localStorage.getItem("worksheets")),
        sheets: {},
        name: prompt("File name")
    };
    data.worksheets.sheets.forEach(s=>data.sheets[s]=obj(localStorage.getItem(`sheet-${s}-data`)));
    download_string(data.name+".json","application/json",json(data));
}

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
                Object.keys(localStorage).filter(k=>k.match(/^sheet\-.*-data$/)).forEach(k=>localStorage.removeItem(k));
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
