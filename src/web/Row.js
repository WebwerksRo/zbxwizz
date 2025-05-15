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
     *  @type {Sheet}
     */
    #table;
    /**
     *
     * @type {Array}
     */
    #filtercols = [];

    /**
     *
     * @type {boolean}
     */
    hasError = false;

    lastError = null;
    /**
     * @type {number}
     */
    #rowIdx;
    data = {};
    #cellsData;
    lastResponse = null;

    #rowMenu = `<a class="dropdown-item" role='button'  href='#' onclick="$(this).parents('tr').data().rowRef.info()">Row info</a>`+
        '<a class="dropdown-item" role="button"  href="#" onclick="$(this).parents(\'tr\').data().rowRef.duplicate()">Duplicate row</a>' +
        '<a class="dropdown-item" role="button"  href="#" onclick="confirm_modal(\'Are you sure you want to delete this record?\',()=>$(this).parents(\'tr\').data().rowRef.delete())">Delete row</a>' +
        '<a class="dropdown-item" role="button"  href="#" onclick="$(this).parents(\'tr\').data().rowRef.insert(\'before\')">Insert empty row before</a>'+
        '<a class="dropdown-item" role="button"  href="#" onclick="$(this).parents(\'tr\').data().rowRef.insert(\'after\')">Insert empty row after</a>'
        ;

    #btnCellTpl = `<button class="dropdown-toggle w-100" role="button" data-toggle="dropdown" aria-expanded="false">Tools</button><div class="dropdown-menu dropdown"></div>`;
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
        // log(this,this.#filtercols);
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
     * @returns {Sheet}
     */
    get table() {
        return this.#table;
    }

    /**
     * @returns {Object}
     */
    get fld_vals() {
        let resp = {};
        // log(this.#cellsByFld);
        Object.keys(this.#cellsByFld).forEach((key)=>resp[key]=this.#cellsByFld[key].val);
        return resp;
    }
    /**
     *
     * @returns {(String)[]}
     */
    get vals() {
        return this.#cells.map(cell=>cell.val);
    }

    val(fld) {
        return this.#cellsByFld[fld].val;
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
        else if(typeof idf==="string") {
            return this.#cellsByFld[idf];
        }
        else {
            throw "Invalid cell id: "+idf;
        }
    }


    /**
     *
     * @param newName
     * @param idx
     * @returns {Row}
     */
    rename_cell(newName,idx){
        if(this.#cellsByFld[newName]) {
            throw "Column name "+newName+" is already used";
        }
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
        // log(checked,this.#el.find("input[type=checkbox]")[0].checked)
        if(this.#el.find("input[type=checkbox]")[0].checked) {
            this.#el.addClass("selected");
        }
        else {
            this.#el.removeClass("selected");
        }
        if(!bulkUpdate)
            sheetManager.update_stats();
    }


    /**
     * @return boolean
     */
    get isSelected() {
        return  this.#el.hasClass("selected");
    }

    get idx() {
        return this.#rowIdx;
    }

    delete() {
        this.#table.delete_row(this.#rowIdx);
        this.#el.remove();
        save_session(true);
    }

    insert(where) {
        this.#table.insert_row(this.#rowIdx,where);
    }
    duplicate() {
        this.#table.duplicate_row(this);
    }

    /**
     *
     */
    info() {
        let data = this.export();
        data.cols = this.cells.map(cell=>cell.val);
        data.lastResponse = this.lastResponse;
        data.lastError = this.lastError;
        let body = $("<div style='width: 100%; height: 100%'>");
        let editor = new JSONEditor($(body)[0], {
            mode: 'code'
        });
        editor.setText(JSON.stringify(data,null,4));
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
     * @param {Sheet} dataTable 
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
     * show row as loading
     */
    set_loading() {
        this.#el.addClass("loading");
    }

    /**
     * return row data as an object
     * @returns {{}}
     */
    get cellsData() {
        return this.#cells.reduce((acc,c)=>{
            acc[c.fld] = c.val;
            return acc;
        },{});
    }

    /**
     * show row as having errors (add error class)
     * @param err
     */
    set_error(err) {
        this.#el.addClass("error");
        this.lastError = err;
        this.hasError = true;
    }

    /**
     * clear row error
     */
    unset_error() {
        this.#el.removeClass("error");
        this.hasError = true;
    }

    /**
     *
     */
    unset_loading() {
        this.#el.removeClass("loading");
        return this;
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
            let cell = new Cell(this,colIdx,fld,(record[fld] ? record[fld] : "").toString());
            this.#cells.push(cell);
            this.#cellsByFld[fld] = cell;
        });
        return this;
    }

    render() {
        let self = this;
        $("<td>").appendTo(this.#el.empty()).append($("<div class=\"input-group-text\"><input type=\"checkbox\"></div>").find("input").on("change",()=>self.select()));
        let menuCell = $("<td class='dropright dropdown'>").appendTo(this.#el)
            .append(this.#btnCellTpl);

        let tpl = this.#rowMenu;
        menuCell.find("button").text(this.#rowIdx).parent().on("show.bs.dropdown",(event=>{
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
        //this.render();
        this.#el.find("button").text(idx);
        return this;
    }
}