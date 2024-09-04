class Cell {
    #el;
    #field;
    #value;
    #rowRef;
    #colIdx;
    constructor(row,col,fld,value) {
        console.log(row,col,fld,value)
        this.#el = $("<td>");
        this.#rowRef = row;

        this.#el.off("dblclick").off("input").off("blur")
            .on("dblclick",()=>this.#el.attr('contenteditable',true).focus())
            .on("input",()=>{this.val = this.#el.text()})
            .on("blur",()=>this.#el.attr("contenteditable",false))
            .data("cellRef",this)

        this.#field = fld;
        this.#colIdx = col;
        this.#value = value;
        this.#el.text(value);
    }
    get row() {
        return this.#rowRef;
    }
    set fld(fldName) {
        this.field = fldName;
    }
    get val() {
        return this.value;
    }
    set val(value) {
        this.value = value;
        this.#el.text(value);
    }
    get $el() {
        return this.#el;
    }
}

class Row {
    #el;
    #cells = [];
    #table;
    get $el(){
        return this.#el;
    }
    get data() {

    }
    highlight_selected_row() {
        if(this.#el.find("input[type=checkbox]")[0].checked) {
            this.#el.addClass("selected");
        }
        else {
            this.#el.removeClass("selected");
        }
    }
    info() {
        console.log(this);
    }
    constructor(dataTable,rowIdx,fields,record) {
        this.#el = $("<tr>");
        let self = this;
        $("<td align='center'>").appendTo(this.#el).append($("<input type='checkbox'>").on("change",()=>self.highlight_selected_row()));
        $("<td align='center'>").appendTo(this.#el).append($("<button>").text(rowIdx).on("click",()=>self.info()));
        this.#el.data("rowRef",this);
        this.#table = dataTable;
        this.load_data(fields,record)
    }
    load_data(fields,record) {
        fields.forEach((fld,colIdx)=>{
            let cell = new Cell(this,colIdx,fld,record[fld]);
            cell.$el.appendTo(this.#el);
            this.#cells.push(cell);
        });
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
                <textarea name="xpression" placeholder='transform' rows=1 class="form-control"
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

    rows = [];
    cols = [];
    #el;
    #thead;
    #tbody;
    get tbody() {
        return this.#el.children("tbody");
    }
    get cells() {
        return this.rows.map(row=>row.cells);
    }

    constructor(container,minCols=30) {
        this.#el = $("<table>").appendTo(container);
        this.#thead = $("<thead>").appendTo(this.#el);
        this.#tbody = $("<tbody>").appendTo(this.#el);
        this.minCols=minCols;
    }

    rename_fld() {

    }
    toggle_small() {

    }
    delete_selected() {

    }

    toggle_all_visible() {

    }
    load_data(fields,records) {
        return new Promise(((resolve, reject) => {
            let colsRow = $("<tr>").appendTo(this.#thead);
            let labelsRow = $("<tr>").appendTo(this.#thead);
            let filterRow = $("<tr>").appendTo(this.#thead);
            let transformRow = $("<tr>").appendTo(this.#thead);

            // header setup
            let ctrlCell = $("<th align='center' id='actionMenu' colspan='2'>").appendTo(colsRow);

            let numCols = fields.length+10 > this.minCols  ? fields.length+10 :   this.minCols;
            let emptyCell = $("<th colspan='2' rowspan='3'>").appendTo(labelsRow);
            for(let i=0;i<numCols;i++) {
                let fld = i<fields.length ? fields[i] : ("col" + i);
                $("<th>").appendTo(colsRow).attr("data-col",i).append($("<span>").addClass("badge badge-secondary").text(i).on("dblclick",this.rename_fld));
                $("<th>").appendTo(labelsRow).attr("data-col",i).append($("<span>").addClass("badge badge-primary").text(fld).on("click",this.toggleSmall));
                $("<th>").appendTo(filterRow).attr("data-fld",fld).attr("data-col",i).append(this.#filterTpl);
                $("<th>").appendTo(transformRow).attr("data-fld",fld).attr("data-col",i).append($(this.#transformTpl));
            }

            // render data
            records.forEach((record,rowIdx)=>{
                let row = new Row(this,rowIdx,fields,record);
                this.rows.push(row);
                this.tbody.append(row.$el);

            });
            $('<input type="checkbox">').appendTo(ctrlCell);
        }));
    }
}