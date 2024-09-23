
class Cell {
    #el;
    #field;
    #value;
    /**
     * @type {Row}
     */
    #rowRef;
    #colIdx;
    #rowIdx;
    select(){
        if(this.#el.attr("contenteditable")) return
        let toggled = this.#el.hasClass("active");
        this.#rowRef.table.unselect_cells();
        if(!toggled) this.#el.addClass("active");
    }
    toString(){
        return this.val;
    }
    constructor(row,col,fld,value) {
        this.#el = $("<td></td>");
        this.#rowRef = row;
        this.#field = fld;
        this.#colIdx = col;
        let self = this;

        this.#el.off("dblclick").off("input").off("blur").off("click")
            .on("dblclick",()=>{
                this.#el.attr('contenteditable',true).addClass("editing").removeClass("active").focus();
                document.getSelection().removeAllRanges();
                this.#el.data("oldval",this.#el.text());
            })
            .on("click",()=>self.select())
            .on("keyup",(event)=>{
                console.log(event);
                if(event.keyCode=13 && event.ctrlKey){
                    $(event.target).trigger("blur");
                }
                if(event.key=="Escape"){
                    this.#el.text(this.#el.data("oldval"));
                    $(event.target).trigger("blur");
                }
            })
            //.on("input",()=>{this.val = this.#el.text()})
            .on("blur",()=>{
                this.#el.removeAttr("contenteditable").removeClass("editing")
                this.#value = this.#el.text();
                this.#el.removeData("oldval");
                this.#rowRef.table.save();
            })
            .data("cellRef",this);

        this.#field = fld;
        this.#colIdx = col;
        this.#value = value;
        this.#el.text(value);
    }

    /**
     *
     * @returns {Row}
     */
    get row() {
        return this.#rowRef;
    }

    /**
     *
     * @param fldName
     */
    set fld(fldName) {
        this.field = fldName;
    }
    get fld (){
        return this.#field;
    }
    get col (){
        return this.#rowRef.cell_coll(this);
    }
    get val() {
        return this.#value;
    }
    set val(value) {
        this.#value = typeof value==="object" ? json(value) : value;
        this.#el.text(this.#value);
    }

    /**
     *
      * @returns {jquery}
     */
    get $el() {
        return this.#el;
    }


}

class Row {
    /**
     * @type {jquery}
     */
    #el;
    /**
     *
     * @type {(Cell)[]}
     */
    #cells = [];
    #cellsByFld = {};
    /**
     *  @type {DataTable}
     */
    #table;
    #filtercols = [];
    #rowIdx;
    data = {};
    hide(){
        this.#el.css("display","none");
    }
    show(){
        this.#el.css("display","");
    }

    /**
     *
     * @returns {boolean}
     */
    get is_hidden(){
        return this.#el.css("display")==="none";
    }
    get isHidden() {
        return this.#el.css("display")==="none";
    }
    toJSON() {
        JSON.stringify(this.cells);
    }

    /**
     *
     * @returns {jquery}
     */
    get $el(){
        return this.#el;
    }
    filter_in(col) {
        let idx = this.#filtercols.indexOf(col);
        if(idx!==-1)
            this.#filtercols.splice(idx,1);
        // console.log(this,this.#filtercols);
        if(this.#filtercols.length===0)
            this.show();
    }
    filter_out(col) {
        if(this.#filtercols.length===0) {
            this.hide();
            this.#filtercols.push(col);
            return;
        }
        let idx = this.#filtercols.indexOf(col);
        if(idx===-1)
            this.#filtercols.push(col);
    }

    /**
     *
     * @param cell
     * @returns {number}
     */
    cell_coll(cell) {
        return this.#cells.indexOf(cell);
    }

    /**
     * @returns {DataTable}
     */
    get table() {
        return this.#table;
    }

    /**
     * @returns {}
     */
    get fld_vals() {
        let resp = {};
        // console.log(this.#cellsByFld);
        Object.keys(this.#cellsByFld).forEach((key)=>resp[key]=this.#cellsByFld[key].val)
        return resp;
    }
    /**
     *
     * @returns {(String)[]}
     */
    get vals() {
        return this.#cells.map(cell=>cell.val);
    }
    get cells(){
        return this.#cells;
    }
    get_cell_by_col(idx) {
        return this.#cells[idx];
    }

    /**
     *
     * @param idx
     * @returns {Cell}
     */
    cell_by_col(idx) {
        return this.get_cell_by_col(idx);
    }
    cell_by_idx(idx) {
        return this.get_cell_by_col(idx);
    }

    get_cell_by_fld(fld) {
        return this.#cellsByFld[fld];
    }
    cell_by_fld(fld) {
        return this.get_cell_by_fld(fld);
    }
    get_cell(idx) {
        if(typeof  idx==="string") {
            return this.cell_by_fld(idx);
        }
        if(typeof  idx==="number") {
            return this.cell_by_col(idx);
        }
    }

    rename_cell(newName,idx){
        if(this.#cellsByFld[newName]) throw "Column name "+newName+" is already used";
        let cell = this.#cells[idx];
        let oldName = cell.fld;
        console.log(idx,cell,this.#cellsByFld[oldName]);

        cell.fld = newName;
        delete this.#cellsByFld[oldName];
        this.#cellsByFld[newName] = cell;
    }

    get tmp() {
        return this.#cellsByFld;
    }

    select(checked=null) {
        
        if(checked!==null) {
            this.#el.find("input[type=checkbox]")[0].checked = checked;
        }
        console.log(checked,this.#el.find("input[type=checkbox]")[0].checked)
        if(this.#el.find("input[type=checkbox]")[0].checked) {
            this.#el.addClass("selected");
        }
        else {
            this.#el.removeClass("selected");
        }
    }


    /**
     * @return boolean
     */
    get isSelected() {
        return  this.#el.hasClass("selected");
    }
    info() {
        console.log(this);
        let data = this.export();
        data.cols = this.cells.map(cell=>cell.val);
        show_modal({
            body: "<pre>"+JSON.stringify(data,null,4)+"</pre>"
        })
    }
    /**
     * 
     * @param {DataTable} dataTable 
     * @param {number} rowIdx 
     * @param {Array} fields 
     * @param {Object} record 
     */
    constructor(dataTable,rowIdx,fields,record) {
        this.#el = $("<tr>");
        let self = this;
        this.#rowIdx = rowIdx;
        $("<td align='center'>").appendTo(this.#el).append($("<button>").text(rowIdx).on("click",()=>self.info()));
        $("<td align='center'>").appendTo(this.#el).append($("<input type='checkbox'>").on("change",()=>self.select()));
        this.#el.data("rowRef",this);
        this.#table = dataTable;
        this.load_data(fields,record.flds);
        this.data = record.data ?  record.data  : {};
    }
    set_loading() {
        this.#el.addClass("loading");
    }
    unset_loading() {
        this.#el.addClass("loading");
    }
    /**
     *
     * @param fields
     * @param record
     */
    load_data(fields,record) {
        fields.forEach((fld,colIdx)=>{
            let cell = new Cell(this,colIdx,fld,record[fld]);
            cell.$el.appendTo(this.#el);
            this.#cells.push(cell);
            this.#cellsByFld[fld] = cell;
        });
    }
    export() {
        let data = {flds:{}};
        this.#cells.forEach((cell)=>data.flds[cell.fld]=cell.val);
        data.data = this.data;
        return data;
    }
    remove() {
        this.#el.remove();
        this.#table.remove_row(this.#rowIdx)
    }
    renumber(idx) {
        this.#rowIdx = idx;
        this.#el.find("button").text(idx);
    }
    move_col(colIdx,newColIdx) {
        // swap cell elements
        this.cell_by_col(colIdx).$el[newColIdx>colIdx ? "insertAfter" : "insertBefore"](this.cell_by_col(newColIdx).$el);

        // update fields indexes
        this.#cellsByFld[this.#cells[colIdx].fld] = newColIdx;
        this.#cellsByFld[this.#cells[newColIdx].fld] = colIdx;

        // swap array elements
        let tmp = this.#cells[colIdx];
        this.#cells[colIdx] = this.#cells[newColIdx];
        this.#cells[newColIdx] = tmp;

    }
}

class DataTable {
    #firstheaderCell = `
<th>
    <div class="text-center">
        
        <button onclick="delete_selected()">Del Sel</button>
    </div>
</th>
<th>
    <input type="checkbox" id="selectAll" onclick="toggle_all_visible(this.checked)"><br>
</th>
    `;
    #headerCell = `
<th>
    <div class="colnum d-flex">
        <div><button class="badge badge-light" onclick="move_col($(this).parents('th').attr('data-col'),'left')">&lt;</button></div>
        <div class="flex-grow-1"><button class="colno badge badge-secondary w-100">0</button></div>
        <div><button class="badge badge-light" onclick="move_col($(this).parents('th').attr('data-col'),'right')">&gt;</button></div>
    </div>
    <div class="text-center field">
        <span class="badge badge-primary" ondblclick="rename_fld(this)"></span>
    </div>
    <div class="filter dropdown" >
        <a class="btn btn-info dropdown-toggle btn-sm w-100" href="#" role="button" data-toggle="dropdown" aria-expanded="false">
            Filter
        </a>
        <div class="dropdown-menu bg-light">
            <form class="p-2 m-0">
                <div class="form-group">
                    <select onchange="filter_rows(this.form)" name="filter" class="custom-select custom-select-sm w-100">
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
                    <input type="text" name="term" class="form-control form-control-sm" onkeyup="filter_rows(this.form)" onchange="filter_rows(this.form)">
                </div>
                <div class="form-group">
                    <select onclick='get_unique(this)' style="width: 100%" onchange="$(this.form.term).val($(this).val()).trigger('change')"></select>
                </div>
                <div class="btn-group w-100 btn-group-sm" role="group" aria-label="Basic example">
                    <button class="btn btn-primary  w-100" onclick="filter_rows(this.form);$(this).parents('.dropdown-menu').prev().dropdown('hide');" type="button">Apply</button>
                    <button class="btn btn-secondary w-100" onclick="this.form.reset();filter_rows(this.form,true);$(this).parents('.dropdown-menu').prev().dropdown('hide')" type="button">Clear</button>
                </div>
            </form>
        </div>
    </div>
    <div class="transform">
        <form class="p-0 m-0">
            <div>
                <div class="input-group input-group-sm">
                    <select class="custom-select" onchange="load_transfo(this)" name="templates" onblur="console.log('minimize from select'); minimize_transform(event)" onclick="list_transformations(this,event)" ></select>
                    <div class="input-group-append">
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-success" onclick="save_transformation(this)" type="button">+</button>
                            <button class="btn btn-danger" onclick="remove_transformation(this)" type="button">-</button>
                        </div>
                    </div>
                </div>
            </div>
            <textarea name="xpression" placeholder='transform' rows=1 class="form-control w-100"
                onfocus="$(this).parents('.transform').addClass('active')"
                onchange="transform_data(event)"
                onblur="console.log('minimize from xpression');minimize_transform(event)"
                onkeyup='transform_data(event)' ></textarea>
            <div class="mt-0 preview" onblur="console.log('minimize from preview');minimize_transform(event)">
                <textarea class="alert alert-secondary p-1 m-0 w-100" placeholder="preview" name="preview" readonly onblur="console.log('minimize from previewx');minimize_transform(event)"></textarea>
                <button class="btn btn-secondary btn-sm w-100 mt-1" type="button" onclick="transform_data(event,true)">Apply</button>
            </div>
        </form>
    </div>
</th>
        `;

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
    fieldsOrder = {};
    columnFields = []
    unselect_cells() {
        this.#tbody.find("td.active").removeClass("active")
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
    get container_id () {
        return this.#container.attr("id");
    }
    /**
     * 
     * @param {Array} fields 
     * @param {Object} record 
     * @param {number} rowIdx 
     * @returns 
     */
    add_row(fields,record,rowIdx) {
        // console.log(rec);
        let row = new Row(this,rowIdx,fields,record);
        this.#rows.push(row);
        this.#tbody.append(row.$el);
        return row;
    }
    export() {
        return this.#rows.map(
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


    /**
     *
     * @param idx
     * @param filter
     * @returns {*[]}
     */
    get_col_by_num(idx,filter=null) {
        let tmp = this.#rows
            .map((row=>row.get_cell_by_col(idx)));
        if(!filter || typeof filter!=="function")
            return tmp;
        return tmp.filter(filter);
    }
    col_by_num(idx,filter=null){
        return this.get_col_by_num(idx,filter);
    }
    /**
     * 
     * @param {string} fld 
     * @param {Function} filter 
     * @returns {(Cell)[]}
     */
    col_by_name(fld,filter=null){
        return this.get_col_by_fld(fld,filter);
    }

    /**
     *
     * @param {*[]} terms
     * @param {String|Number} valueCol
     * @param {boolean} regexp
     */
    lookup2(terms,valueCol,regexp=false){
        let selRows = this.#rows;
        if(typeof terms=="undefined")
            return;
        if(terms.constructor!==Array)
            terms = [terms];
        
        terms.forEach((term)=>{
            let func = typeof term.col==="number" ? "cell_by_idx" :(typeof term.col==="string" ? "cell_by_fld" : null);
            if(!func) return;
            

            if(!regexp) {
                term.match = new RegExp("^"+term.match+"$","i");
            }
            selRows = selRows.filter(row=>{
                let col = row[func](term.col);
                if(!col) return false;
                return col.val.match(term.match)!==null;
            });
        });

        let selColFnc = typeof valueCol==="number" ? "cell_by_idx" :(typeof valueCol==="string" ? "cell_by_fld" : null);
        if(!selColFnc) return selRows;
        let selCells = selRows.map(row=>{
            let cell = row[selColFnc](valueCol);
            return !cell ? null : cell.val;
        });
        if(selCells.length===1) return selCells[0];
        return selCells;
    }

    /**
     *
     * @param subject
     * @param searchCol
     * @param valueCol
     * @param regexp
     */
    lookup(subject,searchCol,valueCol,regexp=false) {
        let cells;
        if(typeof searchCol==="number") {
            cells = this.col_by_num(searchCol);
        } else if(typeof searchCol==="string") {
            cells = this.col_by_name(searchCol);
        }
        if(!cells) {
            return;
        }
        if(!regexp) {
            subject = new RegExp("^"+subject+"$","i");
        }
         
        for(let i=0;i<cells.length;i++) {
            if(cells[i].val.match(subject)) {
                if(typeof valueCol==="number") {
                    return cells[i].row.cell_by_col(valueCol).val;
                    cells = this.col_by_num(searchCol);
                } else if(typeof valueCol==="string") {
                    return cells[i].row.cell_by_fld(valueCol).val;
                }
                throw 'Invalid valueCol type (not string or number)';
            }
        }
        return null;
    }

    /**
     *
     * @param fld
     * @param filter
     * @returns {*[]}
     */
    get_col_by_fld(fld,filter){
        let tmp = this.#rows
            .map((row=>row.get_cell_by_fld(fld)));
        if(!filter || typeof filter!=="function")
            return tmp;
        return tmp.filter(filter);
    }
    col_by_fld(fld,filter){
        return this.get_col_by_fld(fld,filter);
    }

    /**
     *
     * @param filter
     * @returns {number}
     */
    rows_count(filter){
        return filter ? this.#rows.filter(filter).length : this.#rows.length;
    }
     get cells() {
        return this.rows.map(row=>row.cells);
    }
    #setup(){
        this.#container.removeData("dt").data("dt",this).empty();
        this.#el = $("<table class='dataTable'>").appendTo(this.#container);
        this.#thead = $("<thead>").appendTo(this.#el);
        this.#tbody = $("<tbody>").appendTo(this.#el);
        $("<tr><td>No data</td></tr>").appendTo(this.#tbody);
    }

    constructor(container,minCols=30,data=null) {
        this.#minCols = minCols;
        this.#container = $(container);
        this.#setup();

        if(data) {
            try {

                this.load_data(data.fields,data.records);
            }
            catch (e) {
                console.log(e,'Probably invalid data',data);
            }

        }
    }

    /**
     *
     * @param row
     */
    remove_row(idx) {
        this.#rows.splice(idx,1)
    }
    rename_col(oldName,newName) {
        console.log("Try to rename",oldName,newName);
        if(!oldName)
            throw "Invalid old label";

        if(oldName===newName)
            return newName;

        let colIdx = this.fieldsOrder[oldName];
        console.log("Try to rename",oldName,newName,colIdx);
        if(!newName)
            newName = "col"+colIdx;

        if(Object.hasOwnProperty(this.#cols,newName)){
            throw "Duplicate field name";
        }


        this.#rows.forEach(
            /**
             * @param {Row} row
             */
            (row)=>{
                console.log(newName,colIdx);
                row.rename_cell(newName,colIdx)
            });

        delete this.fieldsOrder[oldName];
        this.fieldsOrder[newName] = colIdx;

        return newName;
    }

    toggle_all_visible() {

    }
    save() {
        let data = {
            records: this.export(),
            fields: this.#fields,
        };
        

        localStorage.setItem(this.container_id+"-data",JSON.stringify(data));
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
        // console.log(dataCol)
        if(colCell.hasClass("compress")) {
            colCell.removeClass("compress")
            fldCell.removeClass("compress")
            filterCell.removeClass("compress")
            transfoCell.removeClass("compress")
            dataCol.removeClass("compress")
        }
        else {
            colCell.addClass("compress")
            fldCell.addClass("compress")
            filterCell.addClass("compress")
            transfoCell.addClass("compress")
            dataCol.addClass("compress")
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
        this.#fields = fields;
        // console.log("fields",fields)
        this.#setup();
        // console.log(fields,records);
        let self = this;






        function hide_col() {
            self.toggle_compress_coll($(this).parents("th").attr("data-col"));
        }

        return new Promise(((resolve, reject) => {
            let headerRow = $("<tr>").appendTo(this.#thead);
            // let colsRow = $("<tr>").appendTo(this.#thead);
            // let labelsRow = $("<tr>").appendTo(this.#thead);
            // let filterRow = $("<tr>").appendTo(this.#thead);
            // let transformRow = $("<tr>").appendTo(this.#thead);

            // header setup
            let ctrlCell = $(this.#firstheaderCell).appendTo(headerRow);

            let numCols = fields.length+10 > this.#minCols  ? fields.length :   this.#minCols;
            // let emptyCell = $("<th colspan='2' rowspan='3'>").appendTo(labelsRow).append(
            //     $("<button>Del Sel</button>").on("click",()=>delete_selected(this))
            // );
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
                headerCell.find(".colnum button.colno").text(i);
                headerCell.find(".field span.badge").text(fld);
            }

            fields.forEach((fld,idx)=>{
                this.fieldsOrder[fld]=idx;
                this.columnFields[idx] = fld;
            });

            let self = this;
            // render data
            this.#tbody.empty();
            records.forEach((record,rowIdx)=>{
                this.add_row(fields,record,rowIdx);
            });
            this.save();
            resolve();
        }));
    }
    move_col(colIdx,newColIdx) {
        colIdx = colIdx*1;
        if(colIdx===0 && direction==="left")
            return;
        this.#rows.forEach(
            /**
             * @param {Row} row
             */
            row=>row.move_col(colIdx,newColIdx)
        );
        this.fieldsOrder[this.columnFields[colIdx]] = newColIdx;
        this.fieldsOrder[this.columnFields[newColIdx]] = colIdx;
        let tmp = this.columnFields[colIdx];
        this.columnFields[colIdx] = this.columnFields[newColIdx];
        this.columnFields[newColIdx] = tmp;
        let tgtTh = this.#el.find("thead th[data-col="+colIdx+"]");
        let swapCol = this.#el.find("thead th[data-col="+newColIdx+"]");
        // console.log(tgtTh,swapCol);
        // return;
        tgtTh[newColIdx<colIdx ? "insertBefore" : "insertAfter"](swapCol);

        tgtTh.attr("data-col",newColIdx).find(".colnum .colno").text(newColIdx)
        swapCol.attr("data-col",colIdx).find(".colnum .colno").text(colIdx)

    }

}


/**
 *
 * @param col
 * @param direction
 */
function move_col(col,direction) {
    col = col*1;
    worksheets.get_active_sheet().move_col(col,direction==="left" ? col-1 : col+1);
}
function compress_col(btn) {
    let cell = $(btn).parents("th");
    let dt = worksheets.get_active_sheet();
    if(cell.hasClass("compressed")) {
        cell.removeClass("compressed");
    }
    $(btn).parents("th").addClass("compressed")
}
function get_unique(src){
    let sel = $(src).empty();    
    worksheets.get_active_sheet().get_col_by_num(sel.parents("th").attr('data-col'))  // get cols
        .map(d=>d.val).unique() // extract values
        .filter(d=>d!==undefined) // remove undefined
        .sort() // sort
        .forEach(o=>{       // create options
            $("<option>").text(o).appendTo(sel);
        })
}
Array.prototype.unique = function(){
    return this.filter((value, index, array)=>{
        return array.indexOf(value) === index;
    });
};

function rename_fld(src) {
    let fld = $(src);
    let oldName = fld.text();
    if(!oldName) return;
    $("<input style='width: 100%'>").val(oldName).on("keyup",event=>{
        let inp = event.target;
        if(event.key==="Escape") {
            fld.children().remove();
            fld.text(oldName);
            return;
        }
        if(event.keyCode!==13)
            return;

        let newName = inp.value;
        if(!newName) return alert("Empty value not allowed");
        try {
            console.log("rename_col",oldName, newName);
            newName = worksheets.get_active_sheet().rename_col(oldName, newName);
            fld.children().remove();
            fld.text(newName);
        }
        catch (e) {
            alert(e);
        }
    }).appendTo(fld.empty());
}

function toggle_all_visible(state,dt) {
    worksheets.get_active_sheet().rows.filter(row=>!row.is_hidden).forEach(row=>row.select(state));
}

/**
 *
 * @param {DataTable} sheet
 */
function delete_selected() {
    let sheet = worksheets.get_active_sheet();
    for(let i=sheet.rows.length-1;i>=0;i--) {
        if(sheet.rows[i].isSelected)
            sheet.rows[i].remove();
    }
    sheet.rows.forEach((row,idx)=>row.renumber(idx));
    autosave(false);
}