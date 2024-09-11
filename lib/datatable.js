class Cell {
    #el;
    #field;
    #value;
    /**
     * @type {Row}
     */
    #rowRef;
    #colIdx;
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
        // console.log(row,col,fld,value)
        this.#el = $("<td>");
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
        let val = this.#el.text();
        try {
            val = JSON.parse(val)
            return val

        }
        catch (e) {
            return val;
        }
    }
    set val(value) {
        this.#el.text(value);
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
        console.log(this,this.#filtercols);
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
        console.log(this.#cellsByFld);
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
    cell_by_col(idx) {
        return get_cell_by_col(idx);
    }

    get_cell_by_fld(fld) {
        return this.#cellsByFld[fld];
    }
    cell_by_fld(fld) {
        return get_cell_by_fld(fld);
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
        let cell = this.#cells[idx];
        console.log(idx,cell);
        let oldName = cell.fld;
        cell.fld = newName;
        delete this.#cellsByFld[oldName];
        this.#cellsByFld[newName] = idx;
    }
    select(checked=null) {
        let status = checked===null ? this.#el.find("input[type=checkbox]")[0].checked : checked;
        if(status) {
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
    }
    constructor(dataTable,rowIdx,fields,record) {
        this.#el = $("<tr>");
        let self = this;
        $("<td align='center'>").appendTo(this.#el).append($("<button>").text(rowIdx).on("click",()=>self.info()));
        $("<td align='center'>").appendTo(this.#el).append($("<input type='checkbox'>").on("change",()=>self.select()));
        this.#el.data("rowRef",this);
        this.#table = dataTable;
        this.load_data(fields,record)
    }
    set_loading() {
        this.#el.addClass("loading");
    }
    unset_loading() {
        this.#el.addClass("loading");
    }

    load_data(fields,record) {
        fields.forEach((fld,colIdx)=>{
            let cell = new Cell(this,colIdx,fld,record[fld]);
            cell.$el.appendTo(this.#el);
            this.#cells.push(cell);
            this.#cellsByFld[fld] = cell;
        });
    }
    export() {
        let data = {};
        this.#cells.forEach((cell)=>data[cell.fld]=cell.val);
        return data;
    }
}

class DataTable {
    #filterTpl = `<div class="dropdown" >
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
                        <input type="text" name="term" class="form-control form-control-sm" onkeyup="filter_rows(this.form)">
                    </div>
                    <div class="btn-group w-100 btn-group-sm" role="group" aria-label="Basic example">
                        <button class="btn btn-primary  w-100" onclick="filter_rows(this.form);$(this).parents('.dropdown-menu').prev().dropdown('hide');" type="button">Apply</button>
                        <button class="btn btn-secondary w-100" onclick="this.form.reset();filter_rows(this.form);$(this).parents('.dropdown-menu').prev().dropdown('hide')" type="button">Clear</button>
                    </div>
                </form>
            </div>
        </div>`;
    #transformTpl = `<div class="transform">
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
                    <textarea class="alert alert-secondary p-1 m-0" placeholder="preview" name="preview" readonly onblur="minimize_transform(event)"></textarea>
                    <button class="btn btn-secondary btn-sm w-100 mt-1" type="button" onclick="transform_data(event,true)">Apply</button>
                </div>
            </form>
        </div>`;

    #dropDownTpl = `<div class="dropdown">
  <button>&#x274E</button>
  <input type="checkbox">
</div>`;

    /**
     *
     * @type {(DataTable)[]}
     */
    #rows = [];
    #cols = {};
    #el;
    #thead;
    #tbody;
    #container;
    #minCols;
    #fields = [];
    unselect_cells() {
        this.#tbody.find("td.active").removeClass("active")
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
    add_row(fields,record,rowIdx) {
        let row = new Row(this,rowIdx,fields,record);
        this.#rows.push(row);
        this.#tbody.append(row.$el);
        return row;
    }
    export() {
        return this.#rows.map(row=>row.export())
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
    col_by_name(fld,filter=null){
        return this.get_col_by_fld(fld,filter);
    }

    /**
     *
     * @param Regexp subject
     * @param String|integer searchCol
     * @param valueCol
     * @param singleResult
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
                return cells[i].row.vals[valueCol];
                // .cells(valueCol);
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

    constructor(container,minCols=60,data=null) {
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

    rename_col(oldName,newName) {
        if(!oldName)
            throw "Invalid old label"

        if(oldName===newName)
            return newName;

        if(!newName)
            newName = "col"+idx;

        if(Object.hasOwnProperty(this.#cols,newName)){
            throw "Duplicate field name";
        }

        let colIdx = this.#cols[oldName];
        console.log(oldName,newName,this.#cols)
        delete this.#cols[oldName];
        this.#cols[newName] = colIdx;

        this.#rows.forEach(row=>{
            row.rename_cell(newName,colIdx)
        });

        return newName;
    }
    toggle_small() {

    }
    delete_selected() {

    }

    toggle_all_visible() {

    }
    save() {
        let data = {
            records: this.export(),
            fields: this.#fields
        };
        console.log(data);

        localStorage.setItem(this.container_id+"-data",JSON.stringify(data));
    }
    load_data(fields,records,dataLabel="csv") {
        this.#fields = fields;
        // console.log("fields",fields)
        this.#setup();
        // console.log(fields,records);
        let self = this;

        function rename_fld(event) {
            let fld = $(event.target);
            console.log(fld);
            let oldName = fld.text();
            let inp = $("<input style='width: 100%'>").val(oldName).on("keyup",event=>{
                let inp = event.target;
                if(event.keyCode!==13)
                    return;
                let newName = inp.value;
                newName = self.rename_col(oldName, newName);
                fld.children().remove();
                fld.text(newName);
            }).appendTo(fld.empty());
        }

        function hide_col() {

        }

        return new Promise(((resolve, reject) => {
            let colsRow = $("<tr>").appendTo(this.#thead);
            let labelsRow = $("<tr>").appendTo(this.#thead);
            let filterRow = $("<tr>").appendTo(this.#thead);
            let transformRow = $("<tr>").appendTo(this.#thead);

            // header setup
            let ctrlCell = $("<th align='center' id='actionMenu' colspan='2'>").appendTo(colsRow);

            let numCols = fields.length+10 > this.#minCols  ? fields.length+10 :   this.#minCols;
            let emptyCell = $("<th colspan='2' rowspan='3'>").appendTo(labelsRow);
            for(let i=0;i<numCols;i++) {

                let fld;
                if(i<fields.length) {
                    fld = fields[i];
                }
                else {
                    fld = "col" + i;
                    fields.push(fld);
                }



                let colCell = $("<th>").appendTo(colsRow).attr("col",i);
                $("<span>").addClass("badge badge-secondary").text(i).on("click",hide_col).appendTo(colCell);

                let lblCell = $("<th>").appendTo(labelsRow).data("col",i);
                $("<span>").addClass("badge badge-primary").text(fld).on("dblclick",rename_fld).appendTo(lblCell);

                $("<th>").appendTo(filterRow).attr("fld",fld).attr("data-col",i).append(this.#filterTpl);
                $("<th>").appendTo(transformRow).attr("fld",fld).attr("data-col",i).append($(this.#transformTpl));
            }

            // render data
            $('<input type="checkbox">').appendTo(ctrlCell);
            this.#tbody.empty();
            // this.add_row(fields,records[0],0);
            // resolve();
            // return;
            records.forEach((record,rowIdx)=>{
                this.add_row(fields,record,rowIdx).data[dataLabel] = records;
            });

            resolve();
        }));
    }
}

function delete_selected() {
    $("#preview>tbody input:checked").each((idx,item)=>$(item).parents("tr").remove());
}