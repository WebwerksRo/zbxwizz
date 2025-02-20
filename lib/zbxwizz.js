/**
 * @param {ZBXApi}
 */
let zbx;

function load_req_tpl(editor, key) {
    if (key.length) {
        const tpl = JSON.parse(localStorage.getItem(key));
        console.log(tpl);

        try{
            editor.container.parentElement.elements.resource.value = tpl.resource;
        } catch (e) {}
        try{
            editor.container.parentElement.elements.operation.value = tpl.operation;
        } catch (e) {}
        
        editor.setText(tpl.body);
    }
}


function import_from_api (sheet,resource, tpl){
    if(!sheet)
        sheet = sheetManager.new_sheet();
    console.log(sheet);
    
    if(!zbx.status) {
        return alert_modal("Zabbix connection down. Please check configuration <a href='' data-toggle='modal' data-target='#zbxConfigModal' data-dismiss='modal'>here</a>");
    }

    overlay.show();
    let params;
    return new Promise((resolve,reject)=>{
        try {
            tpl = eval("`" + tpl + "`");
            params = JSON.parse(tpl);
            if(typeof params.limit === "undefined")
                params.limit = null;

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
                    sheet.reset().load_data(data.fields, data.records,'csv');
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
function req_import_from_api(sheet, form, validTpl=false,success=new Function()) {
    if(!validTpl) {
        alert_modal("Warning: the request message is not a valid JSON");
        return;
    }
    
    let resource = form[0].resource.value;
    if(!resource) {
        alert_modal("No resource selected");
        return;
    }
    let reqTpl = form.find(".jsoneditorcontainer").data().editor.getText();
    
    import_from_api (sheet,form[0].resource.value,reqTpl)
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
    success();
}

function req_import_js(sheet,form, validTpl=false,success=new Function()) {

    if(!validTpl) {
        alert_modal("Warning: the request message is not a valid JSON");
        return;
    }
    
    let template = form.find(".jsoneditorcontainer").data().editor.getText();
    try {
        let tmp =  ( obj(eval("`" + template + "`")));
        let data = tmp;
        if(tmp.constructor===Array) {
            data.records = tmp.map(r=>({flds:r}));
            data.fields = Object.keys(tmp[0]);
        }

        sheet.reset().load_data(data.fields, data.records,'csv');
    }
    catch(e) {
        normal_modal({body: "Error on importing data:<br><pre>"+e.message + "</pre>"});
    }
    success();
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
 * @param validTpl
 * @param success
 */
function push_to_api(sheet, form, validTpl=false,success=new Function()) {
    console.log("Zabbix sstatus",zbx);
    if(!zbx.status)
        return alert_modal("Zabbix connection down. Please check configuration <a href='' data-toggle='modal' data-target='#zbxConfigModal'>here</a>");

    if(!validTpl) {
        alert_modal("Warning: the request message is not a valid JSON");
        return;
    }
    

    let editor = form.find(".jsoneditorcontainer").data().editor;
    form = form[0];
    let template = editor.getText();
    normal_modal({
        body: $("<div>").html("<p>Pushing to Zabbix can lead to damage if the request is not properly configured. Please confirm you have reviewed the request and you are sure you want to perform the operation</p>"+
            (form.operation.value==="delete"?"<div class='alert alert-danger'>You are trying to perform a DELETE operation</div>":""))
            .append($("<button class='btn btn-danger' data-dismiss='modal'>Confirm</button>").on("click",()=>exec_push(template, form)))
    });

    function exec_push(template, form) {

        if(!form.resource.value) {
            alert_modal("No resource selected");
            return;
        }
        let method = form.resource.value + "." + form.operation.value;

        let err = false;
        sheet.clear_errors();
        let rows = sheet.rows.filter(row => row.isSelected);
        let cnt = 0;
        overlay.show().set_progress(rows.length);
        let reqArr = [];
        rows.forEach((row) => {
            row.lastResponse = null;
            if(err) return;

            let data = row_data(row);
            let params;

            try {
                with (data) {
                    let req = eval("`" + template + "`");
                    params = JSON.parse(req);
                }

            } catch (e) {
                return;
            }
            reqArr.push({params:params,ctx:row})
        });

        // perform request
        zbx.bulk_req(method,reqArr,
            /**
             *
             * @param resp
             * @param {Row} row
             */
            (resp,row)=>{
                if(typeof resp.result!=="undefined" && resp.result.length===0)
                    return row.set_error("Not found");
                if(typeof resp.error!=="undefined")
                    return row.set_error(resp.error);
                row.lastResponse = resp;
            },
            /**
             *
             * @param err
             * @param {Row} row
             */
            (err,row)=>{
                console.log("error",err)
                row.set_error(err);
            },
            (row)=>{
                cnt++;
                overlay.progress(cnt);
            })
            .finally(()=>{
                overlay.hide();
            });
    }
    
}

/**
 *
 * pull data from zabbix
 * @param {DataTable} sheet
 * @param {jquery} form
 * @param validTpl
 * @param success
 */
function pull_from_api(sheet, form, validTpl=false, success=new Function()) {
    console.log("Zabbix sstatus",zbx);
    if(!zbx.status)
        return alert_modal("Zabbix connection down. Please check configuration <a href='' data-toggle='modal' data-target='#zbxConfigModal'>here</a>");

    if(!validTpl) {
        alert_modal("Warning: the request message is not a valid JSON");
        return;
    }
    

    let template = form.find(".jsoneditorcontainer").data().editor.getText();
    form = form[0];
    let rows = sheet.rows.filter(row => row.isSelected);
    if(!rows.length) return alert_modal("No rows selected");

    let resource = form.resource.value;
    if(!resource) {
        alert_modal("No resource selected");
        return;
    }
    let label = form.label.value;


    overlay.show().set_progress(rows.length);
    let reqArr = [];
    rows.forEach(/**
         * @param row
         */(row) => {
            let data = row_data(row);
            row.unset_error();
            let request;
            try {
                with (data) {
                    request = eval("`" + template + "`");
                }
            } catch (e) {
                console.log(e, template, data);
                return;
            }

            row.set_loading();
            reqArr.push({params: obj(request), ctx: row});
        });
    let cnt = 0;
    zbx.bulk_req(resource+".get",reqArr,
        /**
         *
         * @param resp
         * @param {Row} row
         */
        (resp,row) => {
            if (resp.result) {
                if(resp.result.length)
                    row.data[label] = resp.result.length===1 ? resp.result[0] : resp.result ;
                else {
                    row.data[label]  = null;
                    row.set_error("Not found");
                }
            }
            row.lastResponse = resp;
        },
        (err,row)=>{
            row.set_error(err)
        },
        (row)=>{
            cnt++;
            overlay.progress(cnt);
            row.unset_loading();
        })
        .finally(()=>{
            overlay.hide()
        });
}

function update_help_link(src,object,method){
    $(src).parents("form").find(".zbxapihelp").attr("href","https://www.zabbix.com/documentation/current/en/manual/api/reference/"+object+"/"+method).attr("title","Zabbix help on "+object+"."+method)
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


    let dt = sheetManager.get_active_sheet();
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
function row_data(row) {
    let data = {
        data: Object.assign({},row.data),
        cols: row.vals.concat([]),
        flds: Object.assign(row.fld_vals)
    };
    row.vals.forEach((v,idx)=>{
        data["$"+idx] = v;
    });
    Object.keys(row.fld_vals).forEach(k=>{
        data["_"+k]=row.fld_vals[k];
    });
    return data;
}

function dbg(txt) {
    $("#scriptDebug")[0].value += "\n"+txt.toString();
}
/**
 *
 * @param cell
 * @param expr
 * @returns {string|*}
 */
function transform_cell(cell, expr) {
    let data = row_data(cell.row);
    data.self = cell.val;
    data.lastResponse = cell.row.lastResponse;
    data.lastError = cell.row.lastError;
    data.ws = sheetManager.sheets;


    if (expr !== "")
        try{
            if(typeof expr=="function")
                return expr(data);

            with (data) {
                let newVal = eval(expr);
                return typeof newVal === "object" ? json(newVal) : newVal;
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
function transform_col(sheet,colId,expr) {
    sheet.col(colId)
        .filter(cell=>!cell.row.isHidden)
        .forEach((cell)=>cell.val = transform_cell(cell,expr))
}

/**
 *
 * @param form
 * @param apply
 */
function transform_data(form, apply = false) {





    const col = form.col.value*1;
    const expr = form.xpression.value;
    const sheet = $(form).data("sheet");
    const preview = form.preview;

    /**
     *
     * @param {Cell} cell
     * @returns {any}
     */

    if (!apply) {

        let cell = sheet.col(col).filter(cell=>!cell.row.isHidden).shift();

        try {
            preview.value = transform_cell(cell,expr);
        } catch (e) {
            console.log(e);
            preview.value = "Error: " + e.message
        }
        return;
    }

    transform_col(sheet,col,expr);
    
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
    sheetManager.update_stats();

}


/**
 *
 * @param form
 */
function load_csv(form) {
    let input = form.file;
    const sheetName = form.sheet.value!==""?form.sheet.value:null;
    const dt = sheetName ? sheetManager.sheets[sheetName] : sheetManager.new_sheet();
    return new Promise((resolve)=>{
        console.log("Import CSV");
        $(input).parse({
            config: {
                header: true,
                complete: (data) => {
                    console.log(data);
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
                    
                    dt.reset().load_data(data.fields, data.records);$(form).parents(".modal").modal("hide");
                    resolve();
                }
            }
        });
    });

}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function load_xls(form,load=false) {
    console.log(form.file.files[0]);
    const sheetsSelect = $(form.sheets);
    if(!load) {
        const reader = new FileReader();
        sheetsSelect.empty().parent().show();
        $(form.import).show();

        reader.onload = ()=>{
            const wb = XLSX.read(reader.result);
            console.log(wb);
            $(form).data("wb",wb);
            wb.SheetNames.forEach(async  (name)=>{
                $("<option selected>").text(name).appendTo(sheetsSelect);
            });


        };
        reader.readAsArrayBuffer(form.file.files[0]);
    }
    else {
        const wb = $(form).data("wb");
        const selectedSheets = sheetsSelect.val();
        sheetManager.reset();
        wb.SheetNames.forEach( (name)=>{
            if(selectedSheets.indexOf(name)===-1)
                return;

            let sheet = wb.Sheets[name];
            const data = {
                fields: null,
                records:  (XLSX.utils.sheet_to_json(sheet))
            };
            if(data.records.length){
                data.fields = Object.getOwnPropertyNames(data.records[0]);
                data.records = data.records.map(r=>({flds:r}));
            }
            sheetManager.new_sheet(name,data.records.length ? data : null)
        });
        $(form).parent().modal("hide");
    }


}


function save_zbx_config(form) {
    console.log("save config");
    $("#zbxLogo").addClass("notConnected");
    localStorage.setItem("zbxUrl", form.url.value);
    localStorage.setItem("zbxToken", form.token.value);
    console.log(form.bulkquerymode.value)
    localStorage.setItem("zbxBulkQueryMode", form.bulkquerymode.value);
    zbx_connect();
}

function zbx_connect() {
    let url = localStorage.getItem("zbxUrl");
    let token = localStorage.getItem("zbxToken");
    let form = $("#zbxConfigForm")[0];
    let bulkquerymode = localStorage.getItem("zbxBulkQueryMode");
    if(!url) {
        $.get("preset_env.json").done(data=>{
            localStorage.setItem("zbxUrl",data.zbxUrl);
            localStorage.setItem("zbxToken",data.zbxToken);
            localStorage.setItem("zbxBulkQueryMode",data.zbxBulkQueryMode ? data.zbxBulkQueryMode : "sequential");
            zbx_connect();
        });
        return;
    }
    form.url.value = url;
    form.token.value = token;
    form.bulkquerymode.value = bulkquerymode;
    zbx = new ZBXApi(url, token,bulkquerymode);
    overlay.show();
    zbx.get("host", {limit: 1}).then(data => {
        if (typeof data.result !== undefined) {
            $("#zbxLogo").removeClass("notConnected");
            zbx.status = true;
        }
        else {
            zbx.status = false;
        }
    }).finally(() => overlay.hide());
}
function save_req_tpl(prefix, editor) {
    prompt_modal("Template name",(name)=>{
        if(!name) return;
        const tpl = {
            body: editor.getText(),
            resource: editor.container.parentElement.elements.resource ? editor.container.parentElement.elements.resource.value : null,
            operation: editor.container.parentElement.elements.operation ? editor.container.parentElement.elements.operation.value : null   
        };
        localStorage.setItem(prefix + name, JSON.stringify(tpl));
    });

}


function preview_request(editor,tpl,rowContext=true) {
    let previewEl = $(editor.container.parentNode).find(".preview");

    previewEl.addClass("alert-secondary").removeClass("alert-danger").removeClass("alert-success");
    // console.log(editor);
    try {
        if(rowContext) {
            let row = sheetManager.get_active_sheet().rows.filter(row => row.isSelected)[0];
            // console.log(row);
            if (row) {
                let data = row_data(row);
                // console.log(data);
                with (data) {
                    try {
                        let xpr = eval("`" + tpl + "`");
                        previewEl.removeClass("alert-secondary").children().text(xpr);
                        try {
                            obj(xpr);
                            previewEl.addClass("alert-success");
                        }
                        catch (e) {
                            previewEl.addClass("alert-danger");
                        }
                    } catch (e) {
                        previewEl.addClass("alert-danger").children().text("Invalid JS template: "+e.message)
                    }
                }
            } else {
                previewEl.children().text("No rows selected");
            }
        }
        else {
            try {
                let xpr = eval("`" + tpl + "`");
                previewEl.removeClass("alert-secondary").children().text(xpr);
                try {
                    obj(xpr);
                    previewEl.addClass("alert-success");
                }
                catch (e) {
                    previewEl.addClass("alert-danger");
                }
            } catch (e) {
                previewEl.addClass("alert-danger").children().text("Invalid JS template: "+e.message)
            }
        }
        
    } catch (e) {
        console.log(e);
    }
}

/**
 * @type WorkSheets
 */
var sheetManager;
var sheets;


$(document).ready(() => {
    setTimeout(() => {
        zbx_connect();
        sheetManager = new WorkSheets('#worksheets', '#sheetSelector');
        sheets = sheetManager.sheets;
        $("#sheetSelector").sortable({
            stop: ()=>sheetManager.reorder()
        });
    }, 300);
});


let overlay = (($overlay)=>{
    return {
        el: $overlay,
        _progress: $overlay.find("progress"),
        _progressText: $overlay.find("#progressText"),
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
            this._progress.attr("max",max).attr("value",val).show();
            this._progressText.text("0%");
            this.max = max;
            return this;
        },
        progress: function(val) {
            this._progress.attr("value",val).text(Math.round(val/this.max*100)+"%");
            this._progressText.text(val + " / " +this.max);
            return this;
        }
    }
})($("#overlay"));


function save_transformation(src) {
    if(!src.form.xpression.value) {
        return;
    }
    console.log("Save transformation", src.form.xpression.value);
    localStorage.setItem("transfo_" + generateUID(), src.form.xpression.value);
}

function remove_transformation(src) {
    localStorage.removeItem(src.form.templates.value);
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
    $(src.form).find("#transformXpression").data("editor").setValue(xpr);
    $(src.form.xpression).trigger("focus").trigger("change");
    console.log(src);
}



function save_session(stop=false) {
    sheetManager.save();
    Object.keys(sheetManager.sheets).forEach((name)=>{
        sheetManager.sheets[name].save();
    });
    if(!stop) 
        setTimeout(save_session, 60000);
}

setTimeout(save_session, 60000);


function save_structure() {

    let config = json(sheetManager.get_active_sheet().fields);
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
        <select name="struct" onchange="this.form.preview.value=localStorage.getItem(this.value)" class="w-100"><option></option>${tmp ? tmp.join() : ""}</select>
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
    sheetManager.new_sheet(null,{
        records: sheetManager.get_active_sheet().export(),
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
 * @param modal
 */
function load_env(form,modal) {
    if(!form.envfile.files.length) return;
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
                modal.modal("hide");
            }
            catch (e) {
                console.log(e);
            }
        },
        false,
    );
    
    fr.readAsText(form.envfile.files[0]);
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

/**
 *
 * @param sel
 * @param title
 * @param {push_to_api} action
 * @param sheet
 * @param dialogOpts
 * @param rowContext
 */
function req_modal(sel,title,action,sheet,dialogOpts={},rowContext=true){
    let lastSavedTpl = localStorage.getItem(sel+"_tpl");
    let lastSavedRes = localStorage.getItem(sel+"_res");
    let lastSavedReqType = localStorage.getItem(sel+"_reqtype");
    let form = $(sel).clone().attr("id","f"+generateShortUUID());
    form.on("submit",(event)=>{
            event.preventDefault();
            action(sheet,form,!form.find(".preview").hasClass("alert-danger"),()=>modal.remove());
        });
    form.find(".jsoneditorcontainer").toArray().forEach((item)=>{
        let editor = new JSONEditor(item, {
            mode: 'code', onChange: () => {
                let tpl = editor.getText();
                localStorage.setItem(sel+"_tpl",tpl);
                preview_request(editor,tpl,rowContext)
            }
        });

        console.log(form)
        if(lastSavedTpl) editor.setText(lastSavedTpl);
        if(lastSavedRes) form[0].resource.value = lastSavedRes;
        if(lastSavedReqType && form[0].operation) form[0].operation.value = lastSavedReqType;
        let tpl = editor.getText();
        preview_request(editor,tpl,rowContext);
        $(item).data("editor",editor)
    })
        ;
    let opts = {
        title: title,
        body: form,
        attrs:{
            style: "width: 400px; height: 400px !important",
        },
        buttons:[
            {
                text: "Execute",
                attrs:{
                    form: $(form).attr("id"),
                    type: "submit"
                },
                class: "primary"
            },
            {
                text: "Cancel",
                attrs:{
                    type: "button"
                },
                class: "secondary",
                action: ()=>modal.hide()


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

function log(...params) {
    console.log(...params)
}


function playscript(editor) {
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
                action: ()=>playscript(editor),
                class: "primary"
            }
        ]
    });
    //$("#draggableModal").appendTo('body').show().draggable({ handle: ".card-header" }).resizable();
}


const transformModal = (()=>{
    const formId = "f"+generateShortUUID();
    const form = $("#transformForm").attr("id",formId)[0];
    const editor = ace.edit("transformXpression");
    $("#transformXpression").data("editor",editor);
    editor.session.setMode("ace/mode/javascript");
    editor.setTheme("ace/theme/tomorrow");
    editor.session.on("change",function () {
        form.xpression.value = editor.getValue();
        transform_data(form);
    });
    // enable autocompletion and snippets
    editor.setOptions({
        enableBasicAutocompletion: true,
        enableSnippets: true,
        enableLiveAutocompletion: true,
        fontSize: "12pt"
    });

    let modal = dragable_modal({
        body: form,
        title: "Transform column",
        attrs:{
            style: "width: 600px;"
        },
        buttons:[
            {
                text: "Apply",
                attrs:{
                    form: formId,
                    type: "submit"
                },
                class: "primary w-50"
            },
            {
                text: "Cancel",
                attrs:{
                    form: formId
                },
                action: ()=>modal.hide(),
                class: "secondary w-50"
            },

        ]
    });
    modal.load = function (sheet=sheetManager.get_active(), col=0) {
        const form = this.find("form").data('sheet',sheet);
        const colInput = $(form[0].col).empty();
        sheet.fields.forEach((fld,idx)=>{
            $("<option>").val(idx).text("#"+idx+" / "+fld+"").appendTo(colInput);
        });
        colInput.val(col);
        this.show();
    };
    modal.hide();
    return modal;
})();

$("#importXlsModal").on("show.bs.modal",(modal)=>{
    const $modal = $(modal.target);
    $modal.find("button[name=load]").show();
    $modal.find("button[name=import]").hide();
    $modal.find(".sheets2import").hide();
});


