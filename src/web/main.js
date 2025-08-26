

function load_req_tpl(editor, key) {
    if (key.length) {
        const tpl = JSON.parse(localStorage.getItem(key));
        log(tpl);

        try{
            editor.container.parentElement.elements.resource.value = tpl.resource;
        } catch (e) {}
        try{
            editor.container.parentElement.elements.operation.value = tpl.operation;
        } catch (e) {}
        
        editor.setText(tpl.body);
    }
}


async function import_from_api (sheet,resource, tpl){
    if(!sheet)
        sheet = sheetManager.new_sheet();
    
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
                     * @type {Sheet}
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
// function req_import_from_api(sheet, form, validTpl=false,success=new Function()) {
function req_import_from_api(sheet, resource, operation, template,success=new Function()) {
    if(!zbx.status)
        return alert_modal("Zabbix connection down. Please check configuration <a href='' data-toggle='modal' data-target='#zbxConfigModal'>here</a>");

    if(!resource) {
        alert_modal("No resource selected");
        return;
    }
    // let reqTpl = form.find(".jsoneditorcontainer").data().editor.getText();
    
    import_from_api (sheet,resource,template)
        .then((resp)=>{
            if(resp===null) 
                normal_modal({
                    body: 'No records returned'
                })
        })
        .catch((e)=>{
            log(e);
            normal_modal({
                body: 'Error perfoming the request:<pre class="pre" style="overflow: scroll">'+template+"/ "+e+'</pre>'
            })
        })
        .finally(()=>overlay.hide())
    success();
}

/**
 * 
 * @param {JSONEditor} editor 
 * @param {String} template 
 */
function preview_req_import_js(editor,template) {
    let previewEl = $(editor.container.parentNode).find(".preview");

    previewEl.addClass("alert-secondary").removeClass("alert-danger").removeClass("alert-success");
    // log(editor);
    try {
        let tmpFunc = eval("()=>{"+ template + "}");
        let data = tmpFunc();
        previewEl.removeClass("alert-secondary").children().text(data);
        previewEl.addClass("alert-success");
    } catch (e) {
        previewEl.addClass("alert-danger").children().text("Invalid JS template: "+e.message)
    }
}

/**
 * 
 * @param {Sheet} sheet 
 * @param {String} resource 
 * @param {String} operation 
 * @param {String} template 
 * @param {*} success 
 * @returns 
 */
function req_import_js(sheet, resource,operation,template,success=new Function()) {

    try {
        let tmpFunc = eval("()=>{"+ template + "}");
        let data = tmpFunc();
        if(data.constructor===Array) {
            sheet.reset().load_data(Object.keys(data[0]), data.map(r=>({flds:r})),'csv');
        }

    }
    catch(e) {
        console.log("error",e);
        normal_modal({body: "Error on importing data:<br><pre>"+e.message + "</pre>"});
    }
    success();
}

/**
 * 
 * @param {*} btn 
 */
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
 * @param {Sheet} sheet
 * @param {jquery} form
 * @param validTpl
 * @param success
 */
// function push_to_api(sheet, form, validTpl=false,success=new Function()) {
async function push_to_api(sheet, resource, operation, template,success=new Function()) {
    return new Promise((resolve,reject)=>{
        if(!zbx.status)
            return alert_modal("Zabbix connection down. Please check configuration <a href='' data-toggle='modal' data-target='#zbxConfigModal'>here</a>");

        normal_modal({
            buttons: [],
            body: $("<div>").html("<p>Pushing to Zabbix can lead to damage if the request is not properly configured. Please confirm you have reviewed the request and you are sure you want to perform the operation</p>"+
                (operation==="delete"?"<div class='alert alert-danger'>You are trying to perform a DELETE operation</div>":""))
                .append($("<button class='btn btn-danger' data-dismiss='modal'>Confirm</button>").on("click",()=>exec_push(template)))
                .append($("<button class='btn btn-secondary ml-1' data-dismiss='modal'>Cancel</button>").on("click",()=>reject()))
        });

        function exec_push(template) {

            if(!resource) {
                alert_modal("No resource selected");
                return;
            }
            let method = resource + "." + operation;

            let err = false;
            sheet.clear_errors();
            let rows = sheet.rows.filter(row => row.isSelected && !row.isHidden);
            let cnt = 0;
            overlay.show().set_progress(rows.length);
            let reqArr = [];
            rows.forEach((row) => {
                row.lastResponse = null;
                if(err) return;

                let data = row.script_data;
                let params;
                let req;
                try {
                    with (data) {
                        req = eval("`" + template + "`");
                        params = JSON.parse(req);
                    }

                } catch (e) {
                    console.log(e);
                    console.log("Request",req);
                    console.log("Template",template);
                    console.log("Data",data);
                    reject(e);
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
                    log("error",err)
                    row.set_error(err);
                },
                (row)=>{
                    cnt++;
                    overlay.progress(cnt);
                })
                .finally(()=>{
                    overlay.hide();
                    resolve("ok");
                });
        }
    });
}

/**
 *
 * pull data from zabbix
 * @param {Sheet} sheet
 * @param {string} resource
 * @param {string} operation
 * @param {string} template
 * @param success
 */
async function pull_from_api(sheet, resource, operation,template, success=new Function(),label=null) {
    return new Promise((resolve,reject)=>{
        if(!zbx.status) {
            alert_modal("Zabbix connection down. Please check configuration <a href='' data-toggle='modal' data-target='#zbxConfigModal'>here</a>");
            return reject();
        }

    
        let rows = sheet.rows.filter(row => row.isSelected && !row.isHidden);
        if(!rows.length) return alert_modal("No rows selected");

        if(!resource) {
            alert_modal("No resource selected");
            return reject();
        }

        overlay.show().set_progress(rows.length);
        let reqArr = [];
        rows.forEach(/**
            * @param row
            */(row) => {
                let data = row.script_data;
                row.unset_error();
                let request;
                try {
                    with (data) {
                        request = eval("`" + template + "`");
                    }
                    row.set_loading();
                    reqArr.push({params: obj(request), ctx: row});
                } catch (e) {
                    log(e, template, request,data);
                    return;
                }

                
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
                resolve("ok");
            });
    });
}

function update_help_link(src){
    const form = $(src).parents('form')[0];
    let resource = form.resource.value;
    let operation = form.operation ? form.operation.value : "get";
    $(src).attr("href","https://www.zabbix.com/documentation/current/en/manual/api/reference/"+resource+"/"+operation)
        .attr("title","Zabbix help on "+resource+"."+operation)
    log(src);
}

/**
 * export data in current active sheet to csv
 * @param filter
 */
function save_data(filter=null,columns=null) {
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


    let data = sheetManager.get_active_sheet().export(filter,columns);
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
    downloadBlob(csv, "export.csv", "text/csv;charset=utf-8;");
}


/**
 * 
 * @param {String} txt 
 */
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
    console.log(expr);
    let data = obj(json(cell.row.script_data));
    data.self = cell.val;
    data.lastResponse = obj(json(cell.row.lastResponse));
    data.lastError = obj(json(cell.row.lastError));
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
            console.log(e);
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
    console.log(form);
    
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
            // log("filterOut", col);
            cell.row.filter_out(cell);
        } else {
            // log("filterIn", col);
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
function load_csv(form,loadType="file") {
    
    const sheetName = form.sheet.value!==""?form.sheet.value:null;
    const dt = sheetName ? sheetManager.sheets[sheetName] : sheetManager.new_sheet();

    function load_data(data){
        log(data);
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
        log(data);
        

        dt.reset().load_data(data.fields, data.records);
        $(form).parents(".modal").modal("hide");
        
        
    }

    if(loadType==="text") {
        try{
            let data = Papa.parse(form.csvtext.value, {header: true});
            if(data.data.length)
                return load_data(data);
            if(data.errors.length)
                throw new Error("<pre>"+json(data.errors,null,4)+"</pre>");
        }
            catch(e){
                log(e);
                alert_modal("Error loading data from CSV text: "+e.message);
        }
        
        $(form).parents(".modal").modal("hide");
        return;
    }
    let input = form.file;
    return new Promise((resolve)=>{
        log("Import CSV");
        $(input).parse({
            config: {
                header: true,
                complete: load_data
            }
        });
    });

}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function load_xls(form,load=false) {
    log(form.file.files[0]);
    const sheetsSelect = $(form.sheets);
    if(!load) {
        const reader = new FileReader();
        sheetsSelect.empty().parent().show();
        $(form.import).show();

        reader.onload = ()=>{
            const wb = XLSX.read(reader.result);
            log(wb);
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
        if(form.overwrite.checked) {
            sheetManager.reset();
        }
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
                data.fields.splice(data.fields.indexOf("__rowNum__"),1);
                data.records = data.records.map(r=>{
                    delete r["__rowNum__"];
                    return {flds:r};
                });
            }
            sheetManager.new_sheet(name,data.records.length ? data : null)
        });
        $(form).parent().modal("hide");
    }


}


/**
 * 
 * @param {HTMLFormElement} form 
 */
function save_zbx_config(form) {
    log("save config");
    $("#zbxLogo").addClass("notConnected");
    localStorage.setItem("zbxUrl", form.url.value);
    localStorage.setItem("zbxToken", form.token.value);
    log(form.bulkquerymode.value)
    localStorage.setItem("zbxBulkQueryMode", form.bulkquerymode.value);
    zbx_connect();
}

/**
 * 
 */
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
    })
    .catch(e=>log("could not connect to zabbix. Invalid URL or token?")).finally(() => overlay.hide());
}

/**
 * 
 * @param {String} prefix 
 * @param {JSONEditor} editor 
 */
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

/**
 * 
 * @param {*} editor 
 * @param {*} tpl 
 * @param {*} rowContext 
 */
function preview_request(editor,tpl,rowContext=true) {
    let previewEl = $(editor.container.parentNode).find(".preview");

    previewEl.addClass("alert-secondary").removeClass("alert-danger").removeClass("alert-success");
    // log(editor);
    try {
        if(rowContext) {
            let row = sheetManager.get_active_sheet().rows.filter(row => row.isSelected)[0];
            // log(row);
            if (row) {
                let data = row.script_data;
                // log(data);
                with (data) {
                    try {
                        let xpr = eval("`" + tpl + "`");
                        previewEl.removeClass("alert-secondary").children().text(xpr);
                        try {
                            obj(xpr);
                            previewEl.addClass("alert-success");
                        }
                        catch (e) {
                            previewEl.addClass("alert-danger").children().text(e.message);
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
        log(e);
    }
}

function save_transformation(src) {
    if(!src.form.xpression.value) {
        return;
    }
    log("Save transformation", src.form.xpression.value);
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
    log(src);
}



function save_session(stop=false) {
    sheetManager.save();
    
    if(!stop) 
        setTimeout(save_session, 60000);
}





function save_structure() {

    let config = json(sheetManager.get_active_sheet().fields);
    normal_modal({
        body:`
        Save table structures<br>
        <form  onsubmit="event.preventDefault();log(this.structname.value);localStorage.setItem('tbl_struct_'+this.structname.value,this.config.value);">
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
    try {
        let fields = obj(struct);
        sheetManager.new_sheet(null,{
            records: sheetManager.get_active_sheet().export(),
            fields: fields
        })
    }
    catch(e) {
        alert_modal("Error restoring structure: "+e.message);
    }
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


/**
 *
 */
function save_env() {
    prompt_modal("Enter file name to save",(filename)=>{
        if(!filename) return;
        try {
            let data = {
                    worksheets: obj(localStorage.getItem("worksheets")),
                    sheets: {},
                    name: filename
            };
            data.worksheets.sheets.forEach(s=>data.sheets[s]=obj(localStorage.getItem(`sheet-${s}-data`)));
            download_string(data.name+".json","application/json",json(data));
        }
        catch(e) {
            alert_modal("Error retrieving environment for export: "+e.message);
        }
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
                log(e);
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
function req_modal(sel,title,action,sheet,dialogOpts={},rowContext=true,preview=preview_request,tpl=null){
    let lastSavedTpl = localStorage.getItem(sel+"_tpl");
    let lastSavedRes = localStorage.getItem(sel+"_res");
    let lastSavedReqType = localStorage.getItem(sel+"_reqtype");
    let form = $(sel).clone().attr("id","f"+generateShortUUID());
    
    
    form.on("submit",(event)=>{
            event.preventDefault();
            if(form.find(".preview").hasClass("alert-danger")) {
                alert_modal("Warning: the request message is not a valid JSON 1");
                return;
            }
            
            const resource = typeof form[0].resource === "object" ? form[0].resource.value : null;
            const operation = typeof form[0].operation === "object" ? form[0].operation.value : null;
            const template = $(form).find(".jsoneditorcontainer").data().editor.getText();
            const label = typeof form[0].label === "object" ? form[0].label.value : null;
            action(sheet,resource,operation,template,()=>modal.remove(),label);
            modal.remove();
        });

    form.find(".jsoneditorcontainer").toArray().forEach((item)=>{
        let editor = new JSONEditor(item, {
            mode: 'code', onChange: () => {
                let tpl = editor.getText();
                localStorage.setItem(sel+"_tpl",tpl);
                preview(editor,tpl,rowContext)
            }
        });

        if(tpl) editor.setText(tpl);
        else if(lastSavedTpl) editor.setText(lastSavedTpl);

        if(lastSavedRes) form[0].resource.value = lastSavedRes;
        if(lastSavedReqType && form[0].operation) form[0].operation.value = lastSavedReqType;
        let tpl = editor.getText();
        preview(editor,tpl,rowContext);
        
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




async function playscript(content,editor) {
    let params = {};
    content.find(".param").each((idx,el)=>{
        let paramName = $(el).find("input[name='param_name']").val()
        if(!paramName) return;
        params[paramName] = $(el).find("input[name='param_value']").val(); 
    });
    let script = editor.getValue();
    localStorage.setItem("script",script);
    try {
        with(params) {
            let val = await eval("(async function() {"+script+"})()")
            $("#scriptDebug").val(val);
        }
    }
    catch(e) {
        $("#scriptDebug").val(e);
    }
}


function prompt_save_data() {
    let $el = $("#exportToCSVDialog").clone();
    let colSel = $el.find("select[name='columns']");
    sheetManager.get_active().fields.forEach(field=>{
        $("<option selected>").text(field).appendTo(colSel);
    });
    
    dragable_modal({
        title:"Export CSV",
        body: $el,
        buttons:[
            {
                text: "Export",
                action: ()=>{
                    let columns = $el.find("select[name=columns]").val();
                    let records = $el.find("select[name=records]").val();
                    switch(records) {
                        case "selected":
                            save_data(row=>row.isSelected,columns);
                            break;
                        case "visible":
                            save_data(row=>!row.isHidden,columns);
                            break;
                        default:
                            save_data(null,columns);
                    }
                },
                class: "primary"
            }
        ]
    });
}

function open_play_editor(  ) {
    
    let content = $("#scriptPlayer");

    log(content.find(".editor")[0]);
    

    
    dragable_modal({
        title:"Script player",
        body: content,
        afterCreate: (modal)=>{
            let $editor = modal.find(".editor");
            let editor = ace.edit($editor[0]);
            $editor.data("editor",editor);
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
        },
        buttons:[
            {
                text: "Play",
                action: ()=>playscript(content,content.find(".editor").data("editor")),
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


function documentation_modal() {
    dragable_modal({
        title: "Documentation",
        body: `
        <a class="btn btn-primary mb-2 btn-sm" href="documentation.html" target="_blank">Open in new window</a>
        <iframe src='documentation.html' width='100%' height='100%' style='min-width: 700px; min-height: 600px;'></iframe>`,
        buttons: []
    })
}

function contact_modal() {
    dragable_modal({
        title: "Contact the developer",
        body: `
        <ul>
        <li>Email: <a href="mailto:support@zbxwizz.app">support@zbxwizz.app</a></li>
        </ul>
        `,
        buttons: []
    })
}
function list_scripts(sel,event) {
    if(event.target.tagName==="OPTION") return;
    sel = $(event.target).empty().append("<option value=''>Select script</option>");
    Object.keys(localStorage).filter(key => key.indexOf("script_") !== -1).forEach(key => {
        try {
            let script = obj(localStorage.getItem(key));
            $("<option>").text(script.name).attr("value", key).appendTo(sel);
        }
        catch(e) {
            log(e);
        }
    });
}

function load_script(sel) {
    if(!sel.value) return;
    
    let modal = $(sel).parents(".draggableModal");
    
    let paramProto = $(modal.find(".param")[0]).clone();
    let paramsContainer = modal.find(".params").empty();
    try {
        let script = obj(localStorage.getItem(sel.value));
        script.params.forEach(param=>{
            $(paramProto).find("input[name='param_name']").val(param.name);
            $(paramProto).find("input[name='param_value']").val(param.value);
            $(paramProto).clone().appendTo(paramsContainer);
            });
        modal.find(".editor").data("editor").setValue(script.script);
    }
    catch(e) {
        log(e);
    }

}

function save_script(el) {
    prompt_modal("Script name",(name)=>{
        if(!name) return;
        let hash = btoa(name);
        let script = $(el).parents(".draggableModal").find(".editor").data("editor").getValue();
        let params = $(el).parents(".draggableModal").find(".param").toArray().map(param=>(
            {
                name: $(param).find("input[name='param_name']").val(),
                value: $(param).find("input[name='param_value']").val()
            })
        );

        function save_script_to_local(name,script,params) {
            let data = {
                script: script,
                name: name,
                params: params
            };
            console.log(data);
            
            localStorage.setItem("script_"+hash,json(data));
        }
        if(localStorage.getItem("script_"+hash)) {
            confirm_modal("Script with this name already exists",()=>{
                save_script_to_local(name,script,params);
            });
            return;
        }
        save_script_to_local(name,script,params);
        $(el).parents(".draggableModal").find("[name='templates']").val(name);
        $(el).parents(".draggableModal").find("[name='templates']").trigger("change");
    });
}

function remove_script(el) {
    localStorage.removeItem($(el).parents(".draggableModal").find("[name='templates']").val());
    $(el).parents(".draggableModal").find("[name='templates']").val("");
}






ace.require("ace/ext/language_tools");
let options = ["action","alert","apiinfo","auditlog","authentication","autoregistration","configuration","connector","correlation",
    "dashboard","dcheck","dhost","discoveryrule","drule","dservice","event","graph","graphitem","graphprototype","hanode","history","host",
    "hostgroup","hostinterface","hostprototype","housekeeping","httptest","iconmap","image","item","itemprototype","maintenance","map",
    "mediatype","mfa","module","problem","proxy","proxygroup","regexp","report","role","script","service","settings","sla","task","template",
    "templatedashboard","templategroup","token","trend","trigger","triggerprototype","user","userdirectory","usergroup","usermacro","valuemap"]
$("select[name='resource']").each((idx,el)=>{
    $(el).empty();
    $(el).append("<option></option>");
    options.forEach(o=>$(el).append("<option>"+o+"</option>"));
});




/**
 * @param {ZBXApi}
 */




let zbx;
zbx_connect();
var sheetManager = new SheetsManager('#worksheets', '#sheetSelector');
overlay.show("Loading sheets...");
$(document).ready(()=>{
    sheetManager.init();
    overlay.hide();
});

$("#sheetSelector").sortable({
    stop: ()=>sheetManager.reorder()
});

var sheets = sheetManager.sheets;
setTimeout(save_session, 60000);
