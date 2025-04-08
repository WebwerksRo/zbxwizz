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
        if(this.#el.attr("contenteditable")) return;
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
        if(this.#el.attr('contenteditable')) return;
        this.#el.attr('contenteditable',true).addClass("editing").removeClass("active").focus();
        document.getSelection().removeAllRanges();
        this.#el.data("oldval",this.#el.text());
    }
    finish_edit() {
        this.#el.removeAttr("contenteditable").removeClass("editing");
        this.#value = this.#el.text();
        this.#el.removeData("oldval");
        this.#rowRef.table.save();
    }
    process_keystrokes(event) {
        // console.log(event);
        if(event.ctrlKey && event.keyCode===13)
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