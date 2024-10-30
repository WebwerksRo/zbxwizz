
class Cell {
    /**
     * @type {jquery}
     */
    #el;
    /**
     * @type {String}
     */
    #field;
    /**
     * @type {String}
     */
    #value;
    /**
     * @type {Row}
     */
    #rowRef;
    /**
     * @type {Number}
     */
    #colIdx;
    /**
     * @type {Number}
     */
    #rowIdx;

    /**
     *
     */
    select(){
        if(this.#el.attr("contenteditable")) return
        let toggled = this.#el.hasClass("active");
        this.#rowRef.table.unselect_cells();
        if(!toggled) this.#el.addClass("active");
    }

    /**
     *
     * @returns {*}
     */
    toString(){
        return this.val;
    }

    /**
     *
     * @returns {String}
     */
    toJSON() {
        return this.val;
    }

    edit() {
        console.log(this);
        this.#el.attr('contenteditable',true).addClass("editing").removeClass("active").focus();
        document.getSelection().removeAllRanges();
        this.#el.data("oldval",this.#el.text());
    }
    finish_edit() {
        this.#el.removeAttr("contenteditable").removeClass("editing")
        this.#value = this.#el.text();
        this.#el.removeData("oldval");
        this.#rowRef.table.save();
    }
    process_keystrokes(event) {
        console.log(event)
        if(event.ctrlKey && event.keyCode==13)
            this.finish_edit();
    }

    constructor(row,col,fld,value) {
        this.#rowRef = row;
        this.#colIdx = col;
        this.#field = fld;
        this.#value = value;
        this.render();
    }

    /**
     *
     * @returns {jquery}
     */
    render() {
        let $cell = $("<td class='cell' onclick='$(this).data().cell.select()' ondblclick='$(this).data().cell.edit()' onkeyup='$(this).data().cell.process_keystrokes(event)' onblur='$(this).data().cell.finish_edit()'></td>").data("cell",this).text(this.#value);
        if(this.#el) {
            $cell.insertBefore(this.#el);
            this.#el.remove();
        }
        this.#el = $cell;
        return this.#el;
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
        this.#field = fldName;
    }

    /**
     *
     * @returns {String}
     */
    get fld (){
        return this.#field;
    }

    /**
     *
     * @returns {number}
     */
    get col (){
        return this.#rowRef.cell_coll(this);
    }

    /**
     *
     * @returns {String}
     */
    get val() {
        return this.#value;
    }
    set val(value) {
        this.#value = typeof value==="object" ? json(value) : value;
        this.#el.text(this.#value);
        newUnsavedData = true;
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
    /**
     * @type {number}
     */
    #rowIdx;
    data = {};
    #cellsData;
    lastResponse = null;

    #rowMenu = "<a class='dropdown-item' role='button'  href='#' onclick='$(this).parents(\"tr\").data().rowRef.info()'>Row info</a>"+
                '<a class="dropdown-item" role="button"  href="#" onclick="alert(\'Not implemented\')">Delete row</a>'+
                '<a class="dropdown-item" role="button"  href="#" onclick="alert(\'Not implemented\')">Insert empty row after</a>'+
                '<a class="dropdown-item" role="button"  href="#" onclick="alert(\'Not implemented\')">Insert empty row before</a>'+
                '<a class="dropdown-item" role="button"  href="#" onclick="alert(\'Not implemented\')">Duplicate row</a>';

    #btnCellTpl = `<button class="dropdown-toggle w-100" href="#" role="button" data-toggle="dropdown" aria-expanded="false">Tools</button><div class="dropdown-menu"></div>`;
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

    /**
     *
     * @returns {boolean}
     */
    get isHidden() {
        return this.#el.css("display")==="none";
    }

    /**
     *
     */
    toJSON() {
        return JSON.stringify(this.cells);
    }

    /**
     *
     * @returns {jquery}
     */
    get $el(){
        return this.#el;
    }

    set highlight(state) {
        if(state) this.#el.addClass("highlight");
        else  this.#el.removeClass("highlight");
    }

    /**
     *
     * @param {String|number} col
     */
    filter_in(col) {
        let idx = this.#filtercols.indexOf(col);
        if(idx!==-1)
            this.#filtercols.splice(idx,1);
        // console.log(this,this.#filtercols);
        if(this.#filtercols.length===0)
            this.show();
    }

    /**
     *
     * @param {String|number} col
     */
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

    /**
     *
     * @returns {Cell[]}
     */
    get cells(){
        return this.#cells;
    }

    /**
     *
     * @param idf
     * @returns {Cell}
     */
    cell(idf) {
        
        if(typeof idf==="number") {
            return this.#cells[idf];
        }
        else {
            return this.#cellsByFld[idf];
        }
    }


    /**
     *
     * @param newName
     * @param idx
     * @returns {Row}
     */
    rename_cell(newName,idx){
        console.log(newName,idx)
        if(this.#cellsByFld[newName]) throw "Column name "+newName+" is already used";
        let cell = this.#cells[idx];
        let oldName = cell.fld;
        cell.fld = newName;
        this.#cellsByFld[newName] = cell;
        delete this.#cellsByFld[oldName];
        return this;
    }

    select(checked=null,bulkUpdate = false) {
        if(checked!==null) {
            this.#el.find("input[type=checkbox]")[0].checked = checked;
        }
        // console.log(checked,this.#el.find("input[type=checkbox]")[0].checked)
        if(this.#el.find("input[type=checkbox]")[0].checked) {
            this.#el.addClass("selected");
        }
        else {
            this.#el.removeClass("selected");
        }
        if(!bulkUpdate)
            worksheets.update_stats();
    }


    /**
     * @return boolean
     */
    get isSelected() {
        return  this.#el.hasClass("selected");
    }

    /**
     *
     */
    info() {
        let data = this.export();
        data.cols = this.cells.map(cell=>cell.val);
        data.lastResponse = this.lastResponse;
        let body = $("<div style='width: 100%; height: 100%'>")
        let editor = new JSONEditor($(body)[0], {
            mode: 'code'
        });
        editor.setText(JSON.stringify(data,null,4))
        dragable_modal({
            body: body,
            title: "Row data",
            attrs:{
                style: "width: 600px; height: 500px;"
            }
        });
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
        this.#rowIdx = rowIdx;
        this.#el.data("rowRef",this);
        this.#table = dataTable;
        Object.assign(this.data,record.data ?  record.data  : {});
        if(!record.flds || !Object.keys(record.flds)) {
            record.flds = {};
            fields.forEach(fld=>record.flds[fld]=null);
        }
        this.data.csv = record.flds;
        this.load_data(fields,record.flds).render();
    }

    /**
     *
     */
    set_loading() {
        this.#el.addClass("loading");
    }

    get cellsData() {
        return this.#cellsData;
    }

    /**
     *
     */
    unset_loading() {
        this.#el.removeClass("loading");
    }
    /**
     *
     * @param fields
     * @param record
     */
    load_data(fields,record) {
        this.#cellsData = record;
        this.#cells=[];
        fields.forEach((fld,colIdx)=>{
            let cell = new Cell(this,colIdx,fld,record[fld]);
            this.#cells.push(cell);
            this.#cellsByFld[fld] = cell;
        });
        return this;
    }

    render() {
        let self = this;
        $("<td align='center'>").appendTo(this.#el.empty()).append($("<input type='checkbox'>").on("change",()=>self.select()));
        let menuCell = $("<td class='dropright'>").appendTo(this.#el)
            .append(this.#btnCellTpl);

        let tpl = this.#rowMenu;
        menuCell.find("button").text(this.#rowIdx).parent().on("show.bs.dropdown",(event=>{
            console.log(event);
            $(event.target).children(".dropdown-menu").empty().append(tpl).parents("tr").css("z-index",1000);
        }));

        this.#cells.forEach(cell=>cell.render().appendTo(this.#el));
    }

    /**
     *
     * @returns {{flds: {}}}
     */
    export() {
        let data = {flds:{}};
        this.#cells.forEach((cell)=>data.flds[cell.fld]=cell.val);
        data.data = this.data;
        return data;
    }

    /**
     *
     */
    remove() {
        this.#el.remove();
        this.#table.remove_row(this.#rowIdx);
    }
    renumber(idx) {
        this.#rowIdx = idx;
        this.render();
        return this;
    }
    move_col(colIdx,newColIdx) {
        // swap cell elements
        this.cell(colIdx).$el[newColIdx>colIdx ? "insertAfter" : "insertBefore"](this.cell(newColIdx).$el);

        // update fields indexes
        this.#cellsByFld[this.#cells[colIdx].fld] = newColIdx;
        this.#cellsByFld[this.#cells[newColIdx].fld] = colIdx;

        // swap array elements
        let tmp = this.#cells[colIdx];
        this.#cells[colIdx] = this.#cells[newColIdx];
        this.#cells[newColIdx] = tmp;
        return this.#cells[newColIdx];

    }

    save_order(newOrder) {

        let oldCells = this.#cells;
        this.#cells = [];
        let cells = [];
        let cellsByFld = this.#cellsByFld;
        newOrder.forEach((col,idx)=>{
            cells.push(oldCells[col]);
            cellsByFld[oldCells[col].fld] = idx;
        });
        this.#cells = cells;
        this.render();

    }
}

class DataTable {
    #firstheaderCell = `
<th>
    <input type="checkbox" id="selectAll" onclick="toggle_all_visible(this.checked)"><br>
</th>
<th>
    <div class="text-center">
        <button onclick="delete_selected()">Del Sel</button>
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
                <a class="dropdown-item" href="#" onclick="$(this).parents('table').data().sheet.sort_col($(this).parents('th').attr('data-col'),'asc')" ><i class="fa fa-sort-asc"></i> Sort asc</a>
                <a class="dropdown-item" href="#" onclick="$(this).parents('table').data().sheet.sort_col($(this).parents('th').attr('data-col'),'desc')"><i class="fa fa-sort-desc"></i> Sort desc</a>
                <a class="dropdown-item" href="#" onclick="$(this).parents('table').data().sheet.insert_column($(this).parents('th').data().col*1+1)"><i class="fa fa-arrow-right"></i> Insert column right</a>
                <a class="dropdown-item" href="#" onclick="$(this).parents('table').data().sheet.insert_column($(this).parents('th').data().col*1)"><i class="fa fa-arrow-left"></i> Insert column left</a>
                <a class="dropdown-item" href="#" onclick="$(this).parents('table').data().sheet.delete_column($(this).parents('th').data().col)"><i class="fa fa-remove"></i> Delete column</a>
            </div>
        </div>
    </div>
    </div>
    <div class="text-center field">
        <span class="badge badge-primary" ondblclick="$(this).parents('table').data().sheet.rename_fld_dlg(this)">&nbsp;</span>
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
                    <select class="custom-select" onchange="load_transfo(this)" name="templates" onblur="minimize_transform(event)" onclick="list_transformations(this,event)" ></select>
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
                onblur="minimize_transform(event)"
                onkeyup='transform_data(event)' ></textarea>
            <div class="mt-0 preview" onblur="minimize_transform(event)">
                <textarea class="alert alert-secondary p-1 m-0 w-100" placeholder="preview" name="preview" readonly onblur="minimize_transform(event)"></textarea>
                <button class="btn btn-secondary btn-sm w-100 mt-1" type="button" onclick="transform_data(event,true)">Apply</button>
            </div>
        </form>
    </div>
<!--    <div><button onclick="tranform(this)">Transform</button></div>-->
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
    #name;
    scrollX=0;
    scrollY=0;
    #placeholder;
    unselect_cells() {
        this.#tbody.find("td.active").removeClass("active")
    }

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
        // console.log(rec);
        let row = new Row(this,rowIdx,fields,record);
        this.#rows.push(row);
        this.#tbody.append(row.$el);
        return row;
    }
    export(filter) {
        let rows = this.#rows;
        if(filter && typeof filter === "function") {
            console.log("apply filter",filter);
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


    /**
     *
     * @param terms
     * @param valueCol
     * @param regexp
     * @param defaultOnEmpty
     * @returns {null|*[]|*}
     */
    lookup2(terms,valueCol,regexp=false,defaultOnEmpty=null){
        if(typeof terms=="undefined")
            return;

        if(terms.constructor!==Object)
            throw "Invalid terms. Not an object"

        //let selRows = this.#rows;

        let selCells = this.#rows.filter(row=>{
            let srchFlds = Object.keys(terms);
            //console.log(terms,srchFlds);
            for(let i=0;i<srchFlds.length;i++) {
                let col = row.cell(srchFlds[i]);
                //console.log(row,srchFlds[i],terms[srchFlds[i]],col);
                if(!col || col.val.match(new RegExp("^"+terms[srchFlds[i]]+"$"))===null)
                    return false;
            }
            return true;
        }).map(r=>r.cell(valueCol).val);

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
    lookup(subject,searchCol,valueCol,regexp=false,defaultOnEmpty=null) {
        let cells = this.col(searchCol);
        if(!cells) {
            return;
        }
        if(!regexp) {
            subject = new RegExp("^"+subject+"$","i");
        }

        let selCells = cells.filter(cell=>cell.val.match(subject));
        //console.log(selCells);
        selCells = selCells.map(cell=>cell.row.cell(valueCol).val)

        if(selCells.length===1) return selCells.pop();
        if(selCells.length===0) return defaultOnEmpty ? defaultOnEmpty : null;
        return selCells;
    }


    /**
     *
     * @param idf
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
     * @returns {Cell[]}
     */
    get cells() {
        return this.rows.map(row=>row.cells);
    }
    #setup(empty=true){
        this.#container.removeData("dt").data("dt",this).empty();
        if(empty)
            return $("#emptyDataTable").clone(true).appendTo(this.#container);
        this.#el = $("<table class='dataTable'>").appendTo(this.#container).data("sheet",this);
        this.#thead = $("<thead>").appendTo(this.#el);
        this.#tbody = $("<tbody>").appendTo(this.#el);

    }

    constructor(name,container,minCols=30,data=null) {
        this.#name = name;
        this.#minCols = minCols;
        this.#container = $(container);
        this.#setup();

        if(!data || !data.records.length) return ;

        try {
            this.load_data(data.fields,data.records);
        }
        catch (e) {
            console.log(e,'Probably invalid data',data);
        }
    }

    /**
     *
     * @param idx
     * @returns {DataTable}
     */
    remove_row(idx) {
        this.#rows.splice(idx,1);
        return this;
    }

    /**
     *
     * @param {String} oldName
     * @param {String} newName
     * @returns {string|*}
     */
    rename_col(colIdx,newName) {
        if(Object.hasOwnProperty(this.#cols,newName)){
            throw "Duplicate field name";
        }

        this.#rows.forEach(
            /**
             * @param {Row} row
             */
            (row)=>{
                row.rename_cell(newName,colIdx)
            });

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


        // console.log("fields",fields)
        this.#setup(false);
        //this.#placeholder.hide();
        // console.log(fields,records);
        let self = this;

        return new Promise(((resolve, reject) => {
            this.render_header(fields);

            // render data
            this.#tbody.empty();
            records.forEach((record,rowIdx)=>{
                this.add_row(fields,record,rowIdx);
            });
            this.save();
            resolve();
        }));
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
                    $(event.currentTarget).parents("th").css("z-index",10000)
                })
                .on('hidden.bs.dropdown',(event)=>{
                    $(event.currentTarget).parents("th").css("z-index",'')
                });
            headerCell.find(".colnum button.colno").text(i);
            headerCell.find(".field span.badge").text(fld);
        }
        this.#fields = fields;
    }

    get vals() {
        let tmp = [];
        this.#rows.forEach(row=>{
            let data = []
            row.cells.forEach(cell=>data.push(cell.val));
            tmp.push(data);
        });
        return tmp;
    }


    sort_col(colNo,direction) {
        colNo=colNo*1
        if(["asc","desc"].indexOf(direction)===-1) throw "Invalid direction";

        let vals = this.col(colNo,true).sort();
        if(direction=="desc") vals.reverse();

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
            })
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
                            el.children().toArray().forEach((item,idx)=>{
                                flds.push(item.innerText);
                            });
                            console.log(flds);
                            sheet.render_header(flds,flds.length);
                            sheet.rows.forEach(row=>{
                                // console.log(row.cellsData);
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
        dragable_modal({
            title: "Copy to new sheet",
            body: `
            <div class="form-group">
                <label>Data to copy</label>
                <select class="custom-select">
                    <option>all rows</option>
                    <option>visible rows</option>
                    <option>selected rows</option>
                </select>
            </div>
            `,
            buttons:[
                {
                    class: "primary",
                    text: "Copy",
                    action: ()=>{
                        let start = sheet.rows.length;
                        for(let rowIdx=start;rowIdx<start+el.find("input").val()*1;rowIdx++)
                            sheet.add_row(sheet.fields,{},rowIdx);
                    }
                }
            ]
        })
    }

    add_rows_dialog() {
        let el = $(`
            <form id="new_rows_form">
                <div class="form-group">
                <label>How many rows do you want to add?</label>
                <input type="number" step="1" class="form-control" value="1">
                </div>
            </form>`);
        let sheet = this;
        let modal = dragable_modal({
            title: "Add new rows",
            body: el,
            buttons:[
                {
                    class: "primary",
                    text: "Add now",
                    action: ()=>{
                        let start = sheet.rows.length;
                        for(let rowIdx=start;rowIdx<start+el.find("input").val()*1;rowIdx++)
                            sheet.add_row(sheet.fields,{},rowIdx);
                        modal.remove();
                    }
                }
            ]
        })
    }

    rename(new_name) {
        localStorage.removeItem("sheet-"+this.#name+"-data");
        this.#name = new_name;
        this.save();

    }

    get visibleRows() {
        return this.#rows.filter((row)=>row.isHidden==false);
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
     * @returns {DataTable}
     */
    delete_column(pos) {
        let flds = this.fields;
        let fldName = flds.splice(pos,1).pop();
        overlay.show();
        setTimeout(()=> {

            console.log(flds);
            this.render_header(flds, flds.length);
            this.rows.forEach(row => {
                // console.log(row.cellsData);
                let data = row.cellsData;
                delete data[fldName];
                row.load_data(flds, data).render();
            });
            overlay.hide();
        },200);
        return this;
    }

    /**
     *
     * @param {Number} pos
     * @returns {DataTable}
     */
    insert_column(pos) {
        pos = pos*1;
        let flds = this.fields;
        let newFldName = generateShortUUID();
        flds.splice(pos,0,newFldName);
        overlay.show();
        setTimeout(()=> {

            console.log(flds);
            this.render_header(flds, flds.length);
            this.rows.forEach(row => {
                // console.log(row.cellsData);
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
    rename_fld_dlg(src) {
        let fld = $(src);
        let col = $(src).parents("th").data("col")*1;
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
                if(newName!==oldName)
                    newName = this.rename_col(col, newName);
                fld.children().remove();
                fld.text(newName);
            }
            catch (e) {
                console.log(e);
            }
        }).appendTo(fld.empty());
    }

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
    worksheets.get_active_sheet().col(sel.parents("th").attr('data-col')*1)  // get cols
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


function toggle_all_visible(state,dt) {
    worksheets.get_active_sheet().rows.filter(row=>!row.is_hidden).forEach(row=>row.select(state,true));
    worksheets.update_stats();
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
    autosave(true);
}
newUnsavedData = false;

function showInfo(src) {
    console.log($(src).data());
}
$(function() {

    var $contextMenu = $("#contextMenu");

    $("body").on("contextmenu", "table tr", function(e) {
        let oldCtx = $contextMenu.data("contextRow");
        if(oldCtx) oldCtx.highlight = false;
        let target = e.target.tagName==="TD" ? $(e.target.parentNode).data("rowRef") : (e.target.tagName==="TR" ? $(e.target).data("rowRef") : null);
        if(!target) return;
        $contextMenu.css({
            display: "block",
            left: e.pageX,
            top: e.pageY
        });
        $contextMenu.data("contextRow",target).find("a").data("contextRow",target);
        target.highlight = true;
        return false;
    });

    $('html').click(function() {
        $contextMenu.hide();
        let row = $contextMenu.data("contextRow");
        if(!row) return;
        row.highlight = false;
    });
  
  $("#contextMenu li a").click(function(e){
    var  f = $(this);
    debugger;
  });

});

$(
    `
      <div id="contextMenu" class="dropdown clearfix" style="position: absolute;display: none; z-index:1000000">
        <div class="dropdown-menu show">
            <a class="dropdown-item" role="button" onclick="showInfo(this)">Info</a>
        </div>
      </div>`).appendTo("body");

function toggle_compress_col(src){
    console.log(src,this);
    let cell = $(this).parents("th");
    if(cell.hasClass("compressed")) 
        cell.removeClass("compressed")
    else
        cell.addClass("compressed")
}