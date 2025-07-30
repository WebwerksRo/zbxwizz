




class Sheet {
    #firstheaderCell = `
<th>
    <input type="checkbox" id="selectAll" onclick="$(this).parents('table').data().sheet.toggle_all_visible(this.checked)"><br>
</th>
<th>
    <div class="text-center align-top" style="height: 60px">
        <button class="dropdown-toggle w-100 d-block" style="height: 100%" data-toggle="dropdown"><i class="fa fa-bars"></i></button>
        <div class="dropdown-menu dropdown">
            <h6 class="dropdown-header">Actions</h6>
            <a class="dropdown-item" role="button" href="#" onclick="sheetManager.get_active().add_rows_dialog()">Add rows</a>
            <a class="dropdown-item" role="button" href="#" onclick="sheetManager.get_active().copy_visible_to_new_sheet()">Copy visible to new sheet</a>
            <a class="dropdown-item" role="button" href="#" onclick="sheetManager.get_active().copy_selected_to_new_sheet()">Copy selected to new sheet</a>
            <a class="dropdown-item" role="button" href="#" onclick="confirm_modal('Are you sure you want to delete selected records?',()=>$(this).parents('table').data().sheet.delete_selected())">Delete selected rows</a>
            <a class="dropdown-item" role="button" href="#" onclick="confirm_modal('Are you sure you want to delete unselected records?',()=>$(this).parents('table').data().sheet.delete_unselected())">Delete unselected rows</a>
            <!-- <div class="dropdown-divider"></div> -->
            <!-- <h6 class="dropdown-header">Filtering</h6> -->
            <!-- <a class="dropdown-item" role="button" href="#" onclick="$(this).parents('table').data().sheet.remove_filters()">Remove all filters</a> -->
            <!-- <a class="dropdown-item" role="button" href="#" onclick="$(this).parents('table').data().sheet.filter_selected()">Show selected</a> -->
            <!-- <a class="dropdown-item" role="button" href="#" onclick="$(this).parents('table').data().sheet.filter_unselected()">Show unselected</a> -->
            <!-- <a class="dropdown-item" role="button" href="#" onclick="$(this).parents('table').data().sheet.filter_errors()">Show rows with errors</a> -->
            <!-- <div class="dropdown-divider"></div> -->
            <h6 class="dropdown-header">Filtering</h6>
            <a class="dropdown-item" role="button" href="#" onclick="$(this).parents('table').data().sheet.clear_errors()">Clear errors</a>
            
        </div>
    </div>
</th>
    `;
    #headerCell = `
<th>
    <div class="colnum">
        <div class="dropdown">
            <button class="w-100 colno dropdown-toggle" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
            Col index
            </button>
            <div class="dropdown-menu">
                  <form class="p-2 m-2 border bg-light" onsubmit="event.preventDefault();">
                    <div class="mb-1"><i class="fa fa-filter"></i> Filtering</div>
                    <div class="form-group">
                        <select name="filter" class="custom-select custom-select-sm w-100">
                            <option value="^$">Empty</option>
                            <option value=".+">Not empty</option>
                            <option value="^((?!{value}).)*$">Does not contain</option>
                            <option value="{value}" selected>Contains</option>
                            <option value="^{value}">Starts with</option>
                            <option value="{value}$">Ends with</option>
                            <option value="^{value}$">Exact match</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <input type="text" name="term" class="form-control form-control-sm">
                    </div>
                    <div class="form-group">
                        <select onclick="$(this).parents('table').data().sheet.get_unique(this)" style="width: 100%" onchange="this.form.term.value=this.value;this.form.apply.click()"></select>
                    </div>
                    <div class="btn-group w-100 btn-group-sm" role="group" aria-label="Basic example">
                        <button class="btn btn-primary  w-100" onclick="filter_rows(this.form);$(this).parents('.dropdown-menu').prev().dropdown('hide');" type="button" name="apply">Apply</button>
                        <button class="btn btn-secondary w-100" onclick="this.form.reset();filter_rows(this.form,true);$(this).parents('.dropdown-menu').prev().dropdown('hide')" type="button">Clear</button>
                    </div>
                </form>
                <div class="dropdown-divider"></div>
                <a class="dropdown-item" href="#" onclick="$(this).parents('table').data().sheet.show_transform($(this).parents('th').data().col)"><i class="fa fa-cogs"></i> Transform</a>
                <div class="dropdown-divider"></div>

                <a class="dropdown-item" href="#" onclick="$(this).parents('table').data().sheet.sort_col($(this).parents('th').attr('data-col'),'asc')" ><i class="fa fa-sort-asc"></i> Sort asc</a>
                <a class="dropdown-item" href="#" onclick="$(this).parents('table').data().sheet.sort_col($(this).parents('th').attr('data-col'),'desc')"><i class="fa fa-sort-desc"></i> Sort desc</a>
                <a class="dropdown-item" href="#" onclick="$(this).parents('table').data().sheet.insert_column($(this).parents('th').data().col*1+1)"><i class="fa fa-arrow-right"></i> Insert column right</a>
                <a class="dropdown-item" href="#" onclick="$(this).parents('table').data().sheet.insert_column($(this).parents('th').data().col*1)"><i class="fa fa-arrow-left"></i> Insert column left</a>
                <a class="dropdown-item" href="#" onclick="confirm_modal('Are you sure you want to delete column '+$(this).parents('th').data().col,()=>$(this).parents('table').data().sheet.delete_column($(this).parents('th').data().col))"><i class="fa fa-remove"></i> Delete column</a>
                <a class="dropdown-item" href='#'>
                    <i class="fa fa-arrows-h"></i> Resize column <input size="3" type="number" name="colWidth" onkeyup="$(this).parents('th').css('width',this.value+'px')">
                </a>
            </div>
        </div>
    </div>
    </div>
    <div class="text-center field">
        <span class="badge badge-primary" ondblclick="$(this).parents('table').data().sheet.rename_fld_dialog(this)">&nbsp;</span>
    </div>
</th>
        `;

    /**
     * @type {SheetsManager}
     */
    #ws;
    /**
     *
     * @type {(Row)[]}
     */
    #rows = [];
    #cols = {};
    #el;
    #thead;
    #tbody;
    #container;
    #minCols;
    #fields = [];
    #name;
    scrollX=0;
    scrollY=0;
    #id;
    unselect_cells() {
        this.#tbody.find("td.active").removeClass("active")
    }

    /**
     * ID of sheet
     * @returns {*}
     */
    get container_id() {
        return this.#container.attr("id");
    }

    /**
     * DataTable table element
     * @returns {*}
     */
    get $el() {
        return this.#el;
    }
    get tmp() {
        return this.#fields;
    }
    /**
     *
     * @returns {(Row)[]}
     */
    get rows() {
        return this.#rows;
    }
    get name () {
        return this.#name;
    }
    /**
     * 
     * @param {Array} fields 
     * @param {Object} record 
     * @param {number} rowIdx 
     * @returns 
     */
    add_row(fields,record,rowIdx) {
        // log(rec);

        return row;
    }
    export(filter) {
        let rows = this.#rows;
        if(filter && typeof filter === "function") {
            log("apply filter",filter);
            rows = rows.filter(filter);
        }
        return rows.map(
            /**
             *
             * @param {Row} row
             * @returns {{flds: {}}}
             */
            row=>row.export())
    }
    /**
     *
     * @param idx
     * @returns {*}
     */
    get_row(idx) {
       return this.#rows[idx];
    }

    clear_errors(){
        this.#rows.filter(row=>row.hasError).forEach(row=>row.unset_error());
    }


    remove_filters() {
        alert_modal("Not yet implemented");
    }
    filter_selected() {
        alert_modal("Not yet implemented");
    }
    filter_unselected() {
        alert_modal("Not yet implemented");
    }
    filter_errors() {
        alert_modal("Not yet implemented");
    }
    /**1889562
     *
     * @param terms
     * @param valueCol
     * @param regexp
     * @param defaultOnEmpty
     * @returns {null|*[]|*}
     */
    lookup2(terms,valueCol=null,regexp=false,defaultOnEmpty=null){
        if(typeof terms=="undefined")
            return;

        if(terms.constructor!==Object)
            throw "Invalid terms. Not an object";

        //let selRows = this.#rows;

        let selCells = this.#rows.filter(row=>{
            let srchFlds = Object.keys(terms);
            for(let i=0;i<srchFlds.length;i++) {
                let col = row.cell(srchFlds[i]);
                if(!col || col.val.match(new RegExp("^"+terms[srchFlds[i]]+"$"))===null)
                    return false;
            }
            return true;
        }).map(r=>(valueCol===null ? r : r.cell(valueCol).val));

        if(selCells.length===1) return selCells.pop();
        if(selCells.length===0) return defaultOnEmpty ? defaultOnEmpty : null;
        return selCells;
    }

    /**
     *
     * @param subject
     * @param searchCol
     * @param valueCol
     * @param regexp
     * @param defaultOnEmpty
     * @returns {String|null|String[]}
     */
    lookup(subject,searchCol,valueCol=null) {
        let cells = this.col(searchCol);
        if(!cells) {
            return null;
        }
        if(subject.constructor!==RegExp) {
            subject = new RegExp("^"+escapeRegExp(subject)+"$","i");
        }

        let selCells = cells.filter(cell=>cell.val.match(subject));
        //log(selCells);
        selCells = selCells.map(cell=>valueCol===null ? cell.row : cell.row.cell(valueCol).val);

        if(selCells.length===1) return selCells.pop();
        if(selCells.length===0) return null;
        return selCells;
    }


    /**
     *
     * @param idf
     * @param justValue
     * @returns {Cell[]}
     */
    col(idf,justValue=false) {

        return this.#rows
            .map(
                /**
                 *
                 * @param {Row} row
                 * @returns {*}
                 */
                row=>justValue?row.cell(idf).val:row.cell(idf));
    }


    /**
     *
     * @param filter
     * @returns {number}
     */
    rows_count(filter){
        return filter ? this.#rows.filter(filter).length : this.#rows.length;
    }

    /**
     *
     * @returns {Cell[][]}
     */
    get cells() {
        return this.rows.map(row=>row.cells);
    }

    delete_row(idx) {
        this.#rows.splice(idx,1);
        for(let i=idx;i<this.#rows.length;i++) {
            this.#rows[i].renumber(i);
        }
        save_session(true)
    }

    /**
     *
     * @param {Row} row
     */
    duplicate_row(row) {
        let newRow = new Row(this,row.idx+1,this.fields,row.export());
        newRow.$el.insertAfter(row.$el);
        this.#rows.splice(row.idx+1,0,newRow);
        for(let i=row.idx+1;i<this.#rows.length;i++) {
            this.#rows[i].renumber(i);
        }
        save_session(true)
    }
    insert_row(idx,where){

        let tmp = this.#rows[idx];

        if(where==="before") {
            let newRow = new Row(this,idx,this.fields,{});
            this.#rows.splice(idx,0,newRow);
            newRow.$el.insertBefore(tmp.$el);

        }
        else if(where==="after") {
            let newRow = new Row(this,idx+1,this.fields,{});
            this.#rows.splice(idx+1,0,newRow);
            newRow.$el.insertAfter(tmp.$el);
        }
        else
            return;


        for(let i=idx;i<this.#rows.length;i++) {
            this.#rows[i].renumber(i);
        }
        save_session(true)
    }
    #setup(empty=true){
        this.#container.removeData("dt").data("dt",this).empty();
        if(empty)
            return $("#emptyDataTable").clone(true).appendTo(this.#container);
        this.#el = $("<table class='dataTable'>").appendTo(this.#container).data("sheet",this);
        this.#thead = $("<thead>").appendTo(this.#el);
        this.#tbody = $("<tbody>").appendTo(this.#el);

    }
    get id() {
        return this.#id;
    }

    constructor(ws,name,container,minCols=30,data=null) {
        this.#id = "sheet-"+generateShortUUID();
        this.#ws = ws;
        this.#name = name;
        this.#minCols = minCols;
        this.#container = $(container).text(name).attr("data-sheet", name).attr("id", this.#id);
        this.#setup();

        if(!data || !data.records.length) return ;

        try {
            this.load_data(data.fields,data.records);
        }
        catch (e) {
            log(e,'Probably invalid data',data);
        }
    }

    /**
     *
     * @param idx
     * @returns {Sheet}
     */
    remove_row(idx) {
        this.#rows.splice(idx,1);
        return this;
    }

    /**
     *
     * @param colIdx
     * @param {String} newName
     * @returns {string|*}
     */
    rename_col(colIdx,newName) {
        if([-1,colIdx].indexOf(this.fields.indexOf(newName))===-1){
            throw "Duplicate field name";
        }
        this.#rows.forEach(
            /**
             * @param {Row} row
             */
            (row)=>{
                row.rename_cell(newName, colIdx)
            }
        );

        this.#fields[colIdx] = newName;
        return newName;
    }

    get fields() {
        return this.#fields;
    }

    
    save() {
        let data = {
            records: this.export(),
            fields: this.#fields,
        };

        localStorage.setItem("sheet-"+this.#name+"-data",JSON.stringify(data));
        return this;
    }
    /**
     * 
     * @returns DataTable
     */
    reset() {
        this.#container.empty();
        this.#rows = [];
        this.#fields = [];
        return this;
    }

    toggle_compress_coll(idx) {
        let colCell = this.#el.find("thead>tr:first-child>th:nth-child("+(idx*1+2)+")");
        let fldCell = this.#el.find("thead>tr:nth-child(2)>th:nth-child("+(idx*1+2)+")");
        let filterCell = this.#el.find("thead>tr:nth-child(3)>th:nth-child("+(idx*1+1)+")");
        let transfoCell = this.#el.find("thead>tr:nth-child(4)>th:nth-child("+(idx*1 + 1)+")");
        let dataCol = this.#el.find("tbody>tr>td:nth-child("+(idx*1 + 3)+")");
        // log(dataCol)
        if(colCell.hasClass("compress")) {
            colCell.removeClass("compress");
            fldCell.removeClass("compress");
            filterCell.removeClass("compress");
            transfoCell.removeClass("compress");
            dataCol.removeClass("compress");
        }
        else {
            colCell.addClass("compress");
            fldCell.addClass("compress");
            filterCell.addClass("compress");
            transfoCell.addClass("compress");
            dataCol.addClass("compress");
        }
    }
    /**
     * 
     * @param {Array} fields 
     * @param {Array} records 
     * @param {String} dataLabel 
     * @returns 
     */
    load_data(fields,records,dataLabel="csv") {
        log(fields,records);
        this.#setup(false);

        return new Promise(((resolve) => {
            this.render_header(fields);

            // render data
            this.#tbody.empty();
            records.forEach((record,rowIdx)=>{
                let row = new Row(this,rowIdx,fields,record);
                this.#tbody.append(row.$el);
                this.#rows.push(row);
            });
            this.save();
            this.update_stats();
            resolve();
        }));
    }

    update_stats() {
        sheetManager.update_stats();
    }

    render_header(fields,minSize=null){
        minSize = minSize ? minSize : this.#minCols;
        let headerRow = $("<tr>").appendTo(this.#thead.empty());

        // header setup
        $(this.#firstheaderCell).appendTo(headerRow);

        let numCols = fields.length > minSize  ? fields.length :   minSize;
        for(let i=0;i<numCols;i++) {
            let fld;
            if(i<fields.length) {
                fld = fields[i];
            }
            else {
                fld = "col" + i;
                fields.push(fld);
            }
            let headerCell = $(this.#headerCell).appendTo(headerRow).attr("data-col",i).attr("data-fld",fld);
            headerCell.find(".dropdown")
                .on('shown.bs.dropdown',(event)=>{
                    const th = $(event.currentTarget).parents("th").css("z-index",10000);
                    $(event.currentTarget).find("input[name='colWidth']").val(th.width())
                })
                .on('hidden.bs.dropdown',(event)=>{
                    $(event.currentTarget).parents("th").css("z-index",'');
                });
            headerCell.find(".colnum button.colno").text(i);
            headerCell.find(".field span.badge").text(fld);
        }
        this.#fields = fields;
    }

    get vals() {
        let tmp = [];
        this.#rows.forEach(row=>{
            let data = [];
            row.cells.forEach(cell=>data.push(cell.val));
            tmp.push(data);
        });
        return tmp;
    }


    sort_col(colNo,direction) {
        colNo = parseInt(colNo);
        if(["asc","desc"].indexOf(direction)===-1) throw "Invalid direction";

        let vals = this.col(colNo,true).sort();
        if(direction==="desc") vals.reverse();

        overlay.show();
        setTimeout(() => {
            vals.forEach((val,idx)=>{
                for(let i = idx; i<this.#rows.length; i++) {
                    if(this.#rows[i].cell(colNo).val===val) {
                        let row = this.#rows[i];
                        
                        if(idx===0){
                            this.#rows[i].$el.insertBefore(this.#rows[0].$el);
                        }
                        else {
                            this.#rows[i].$el.insertAfter(this.#rows[idx-1].$el)
                        }
                        this.#rows.splice(i,1);
                        this.#rows.splice(idx,0,row);
                        row.renumber(idx);
                        break;
                    }
                }
            });
            overlay.hide();
        }, 400);
        
        
    }


    reorder_columns_dialog() {
        let el = $("<div class='fields_reorder'>");
        let sheet = this;
        if(!this.fields.length) return;
        this.fields.forEach((fld,idx)=>{
            $("<div>").attr("data-idx",idx).text(fld).appendTo(el);
        });
        el.sortable();
        dragable_modal({
            title:"Reorder columns",
            body: el,
            buttons:[
                {
                    text: "Save",
                    action: (modal)=>{
                        modal.hide();
                        overlay.show();
                        setTimeout(()=>{
                            let flds = [];
                            el.children().toArray().forEach((item)=>{
                                flds.push(item.innerText);
                            });
                            log(flds);
                            sheet.render_header(flds,flds.length);
                            sheet.rows.forEach(row=>{
                                // log(row.cellsData);
                                row.load_data(flds,row.cellsData).render();
                            });
                            overlay.hide();
                        },300);
                    },
                    class: "primary"
                }
            ]
        });
    }

    copy_to_new_sheet_dialog() {
        let activeSheet = this;
        dragable_modal({
            title: "Copy to new sheet",
            body: `
            <div class="form-group">
                <label>Data to copy</label>
                <select class="custom-select">
                    <option value="all">all rows</option>
                    <option value="visible">visible rows</option>
                    <option value="selected">selected rows</option>
                    <option value="hidden">hidden rows</option>
                </select>
            </div>
            `,
            buttons:[
                {
                    class: "primary",
                    text: "Copy",
                    action: (modal)=>{
                        const data = modal.find("select").val();
                        let tmp;
                        if(data==="all")
                            tmp = activeSheet.export();
                        else if(data==="visible")
                            tmp = activeSheet.export(row=>!row.isHidden);
                        else if(data==="selected")
                            tmp = activeSheet.export(row=>row.isSelected);
                        else if(data==="hidden")
                            tmp = activeSheet.export(row=>row.isHidden);
                        log(tmp);
                        sheetManager.new_sheet(tmp);
                        
                        //alert_modal("Not yet implemented");
                    }
                }
            ]
        })
    }
    copy_visible_to_new_sheet() {
        let tmp = this.export(row=>!row.isHidden);
        let data = {
            fields: this.fields,
            records: tmp
        }
        log(data);
        return sheetManager.new_sheet(null,data);
    }

    copy_selected_to_new_sheet() {
        let tmp = this.export(row=>row.isSelected);
        let data = {
            fields: this.fields,
            records: tmp
        }
        return sheetManager.new_sheet(null,data);
    }

    add_rows_dialog() {
        const formId = "f"+generateShortUUID()
        const el = $(`
            <form id="new_rows_form">
                <div class="form-group">
                <label>How many rows do you want to add?</label>
                <input type="number" step="1" class="form-control" value="1" min="1" required>
                </div>
            </form>`)
            .attr("id",formId)
            .on("submit",(event)=>{
                event.preventDefault();
                let start = sheet.rows.length;
                for(let rowIdx=start;rowIdx<start+el.find("input").val()*1;rowIdx++) {
                    let row = new Row(sheet,rowIdx,sheet.fields,{});
                    sheet.#tbody.append(row.$el);
                    sheet.rows.push(row);
                }
                modal.remove();
            });
        let sheet = this;
        let modal = dragable_modal({
            title: "Add new rows",
            body: el,
            buttons:[
                {
                    class: "primary",
                    text: "Add now",
                    attrs:{
                        type: "submit",
                        form: formId
                    }
                }
            ]
        })
    }

    rename(new_name) {
        localStorage.removeItem("sheet-"+this.#name+"-data");
        this.#name = new_name;
        return this;
    }

    get visibleRows() {
        return this.#rows.filter((row)=>!row.isHidden);
    }
    get selectedRows() {
        return this.#rows.filter((row)=>row.isSelected);
    }

    remove() {
        this.#container.remove();
        localStorage.removeItem("sheet-"+this.#name+"-data");
    }
    

    get_stats() {
        return {
            total: this.#rows.length,
            visible: this.#rows.filter(row=>!row.isHidden).length,
            selected: this.#rows.filter(row=>row.isSelected).length,
        }
    }

    /**
     *
     * @param {number} pos
     * @returns {Sheet}
     */
    delete_column(pos) {
        let flds = this.fields;
        let fldName = flds.splice(pos,1).pop();
        overlay.show();
        setTimeout(()=> {

            log(flds);
            this.render_header(flds, flds.length);
            this.rows.forEach(row => {
                // log(row.cellsData);
                let data = row.cellsData;
                delete data[fldName];
                row.load_data(flds, data).render();
            });
            overlay.hide();
        },200);
        return this;
    }

    show_transform(pos) {
        transformModal.load(this,pos);
    }

    /**
     *
     * @param {number} pos
     * @returns {Sheet}
     */
    insert_column(pos) {
        pos = parseInt(pos);
        let flds = this.fields;
        let newFldName = generateShortUUID();
        flds.splice(pos,0,newFldName);
        overlay.show();
        setTimeout(()=> {

            log(flds);
            this.render_header(flds, flds.length);
            this.rows.forEach(row => {
                // log(row.cellsData);
                let data = row.cellsData;
                data[newFldName] = "";
                row.load_data(flds, data).render();
            });
            overlay.hide();
        },200);
        return this;

    }

    /**
     *
     * @param src
     */
    rename_fld_dialog(src) {
        let fld = $(src);
        let col = parseInt($(src).parents("th").data("col"));
        let oldName = fld.text();
        if(!oldName) return;

        $("<input style='width: 100%' onkeypress='$(this).removeClass(\"bg-danger\")'>")
            .val(oldName)
                .on("keyup",event=>{
                let inp = event.target;
                if(event.key==="Escape") {
                    fld.children().remove();
                    fld.text(oldName);
                    return;
                }
                if(event.keyCode!==13)
                    return;

                let newName = inp.value;

                try {
                    if(!newName) throw new Error("Empty value not allowed");
                    if(newName!==oldName)
                        newName = this.rename_col(col, newName);
                    fld.children().remove();
                    fld.text(newName);
                }
                catch (e) {
                    alert(e);
                    $(inp).addClass("bg-danger")
                }
            })
            .appendTo(fld.empty());
    }

    #renumber_rows() {
        this.rows.forEach((row,idx)=>row.renumber(idx));
        return this;
    }

    /**
     * delete selected rows
     */
    delete_selected() {
        for(let i=this.rows.length-1;i>=0;i--) {
            if(this.rows[i].isSelected)
                this.rows[i].remove();
        }
        this.rows.forEach((row,idx)=>row.renumber(idx));
        this.#renumber_rows();
        this.update_stats();
        save_session(true);
    }

    /**
     * delete unselected rows
     */
    delete_unselected() {
        for(let i=this.rows.length-1;i>=0;i--) {
            if(!this.rows[i].isSelected)
                this.rows[i].remove();
        }
        this.rows.forEach((row,idx)=>row.renumber(idx));
        this.#renumber_rows();
        this.update_stats();
        save_session(true);
    }



    toggle_all_visible(state) {
        this.rows.filter(row=>!row.is_hidden).forEach(row=>row.select(state,true));
        this.#ws.update_stats();
    }


    get_unique(src){
        let sel = $(src).empty();
        this.col(parseInt(sel.parents("th").attr('data-col')))  // get cols
            .map(d=>d.val).unique() // extract values
            .filter(d=>d!==undefined) // remove undefined
            .sort() // sort
            .forEach(o=>{       // create options
                $("<option>").text(o).appendTo(sel);
            })
    }

}




let newUnsavedData = false;

// function showInfo(src) {
//     log($(src).data());
// }


// $(function() {
//
//     let $contextMenu = $("#contextMenu");
//
//     $("body").on("contextmenu", "table tr", function(e) {
//         let oldCtx = $contextMenu.data("contextRow");
//         if(oldCtx) oldCtx.highlight = false;
//         let target = e.target.tagName==="TD" ? $(e.target.parentNode).data("rowRef") : (e.target.tagName==="TR" ? $(e.target).data("rowRef") : null);
//         if(!target) return;
//         $contextMenu.css({
//             display: "block",
//             left: e.pageX,
//             top: e.pageY
//         });
//         $contextMenu.data("contextRow",target).find("a").data("contextRow",target);
//         target.highlight = true;
//         return false;
//     });
//
//     $('html').click(function() {
//         $contextMenu.hide();
//         let row = $contextMenu.data("contextRow");
//         if(!row) return;
//         row.highlight = false;
//     });
//
//   $("#contextMenu li a").click(function(e){
//     let f = $(this);
//     debugger;
//   });
//
// });

// $(
//     `
//       <div id="contextMenu" class="dropdown clearfix" style="position: absolute;display: none; z-index:1000000">
//         <div class="dropdown-menu show">
//             <a class="dropdown-item" role="button" onclick="showInfo(this)">Info</a>
//         </div>
//       </div>`).appendTo("body");
//
// function toggle_compress_col(src){
//     log(src,this);
//     let cell = $(this).parents("th");
//     if(cell.hasClass("compressed"))
//         cell.removeClass("compressed");
//     else
//         cell.addClass("compressed");
// }