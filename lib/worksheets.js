
let $ws = $("#worksheets").on("scroll",()=>{
    let sheet = worksheets.get_active();
    sheet.scrollY = $ws.scrollTop();
    sheet.scrollX = $ws.scrollLeft();
});


class WorkSheets {
    /**
     *
     * @type {String[]}
     */
    #sheetsOrder = [];
    /**
     *
     * @type {{DataTable}}
     */
    sheets = {};
    lastAssignedIdx;
    #activeSheetName;
    #sheetsContainer;
    #tabsContainer;

    get s() {
        return this.sheets;
    }
    get sheetsNames() {
        return this.#sheetsOrder;
    }

    #sheetContainerTpl = `<div aria-labelledby="" style="display: none"></div>`;
    #sheetSelectorTabTpl = `<li class="nav-item mr-1" role="presentation">
<!--<div class="btn-group dropup btn-group-sm">-->
<!--  <button type="button" class="btn btn-danger">Action</button>-->
<!--  <button type="button" class="btn btn-danger dropdown-toggle dropdown-toggle-split" data-toggle="dropdown" aria-expanded="false">-->
<!--    <span class="sr-only">Toggle Dropdown</span>-->
<!--  </button>-->
<!--  <div class="dropdown-menu">-->
<!--    <a class="dropdown-item" href="#">Action</a>-->
<!--    <a class="dropdown-item" href="#">Another action</a>-->
<!--    <a class="dropdown-item" href="#">Something else here</a>-->
<!--    <div class="dropdown-divider"></div>-->
<!--    <a class="dropdown-item" href="#">Separated link</a>-->
<!--  </div>-->
<!--</div>-->




                    <a class="nav-link" ondblclick="edit_tab(this)" onclick="worksheets.activate_sheet($(this).attr('data-sheet'))"></a>
                    </li>`;

    constructor(sheetsContainer, tabsContainer) {
        this.#sheetsContainer = $(sheetsContainer);
        this.#tabsContainer = $(tabsContainer);

        // load saved config
        let config;
        try {
            config = JSON.parse(localStorage.getItem("worksheets"));
            config = config ? config : {};
        } catch (e) {
            console.log('No saved ws config');
            config = {};
        }
        // console.log(config);

        this.lastAssignedIdx = config.lastAssignedIdx ? config.lastAssignedIdx : 0;
        //this.#activeSheetName = config.activeSheet ? config.activeSheet : null;

        this.#tabsContainer.empty();
        //this.#sheetsContainer.empty();


        // render sheets
        console.log(config);
        (config.sheets ? config.sheets : []).forEach((sheetName) => {
            // load sheet data
            try {
                let wsData = JSON.parse(localStorage.getItem("sheet-"+sheetName + "-data"));
                this.new_sheet(sheetName, wsData);
            } catch (e) {
                this.new_sheet(sheetName);
                console.log('Invalid sheet data', e);
            }
        });


        if(config.activeSheet) this.activate_sheet(config.activeSheet);
    }

    activate_sheet(sheetName) {
        
        try {
            console.log("activate_sheet "+sheetName);
            const sheetId = this.sheets[sheetName].id;
            $ws.children().hide();
            $("#sheetSelector").find("a.nav-link").removeClass("active");
            $("#"+sheetId).show();
            $("#"+sheetId+"-tab").addClass("active");
            if(this.#activeSheetName===sheetName) return ;
            this.#activeSheetName = sheetName;
            let activeSheet = this.get_active();

            if(activeSheet)
                $ws.scrollTop(activeSheet.scrollY).scrollLeft(activeSheet.scrollX);
            //this.save(true);
            this.update_stats();    
        }
        catch (e) {
            console.log(e)
        }
        
        return this.sheets[sheetName];

    }

    save() {
        let cfg = {
            sheets: this.#sheetsOrder,
            lastAssignedIdx: this.lastAssignedIdx,
            activeSheet: this.#activeSheetName
        };
        // console.log("save cfg",cfg)
        localStorage.setItem("worksheets", JSON.stringify(cfg));
    }

    update_stats() {
        try {
            let stats = this.get_active().get_stats();
            $("#totalRecs").text(stats.total);
            $("#totalSelected").text(stats.selected);
            $("#totalVisible").text(stats.visible);
        }
        catch(e) {
            //console.log(e);
        }
    }

    /**
     *
     * @param {String} wsId
     * @param {*} data
     * @returns
     */
    new(wsId, data = null) {
        return this.new_sheet(wsId, data);
    }

    /**
     * 
     * @param {String} sheetName 
     * @param {*} data 
     * @returns 
     */
    new_sheet(sheetName=null, data = null) {
        console.log("New sheet",sheetName,data);
        if (!sheetName) {
            this.lastAssignedIdx++;
            sheetName = "sheet" + (this.lastAssignedIdx);
        }
        let container = $(this.#sheetContainerTpl).appendTo(this.#sheetsContainer);
        this.sheets[sheetName] = new DataTable(this,sheetName,container,30, data);
        const sheetId = this.sheets[sheetName].id;
        this.sheetsNames.push(sheetName);

        // create tab && anpass
        $(this.#sheetSelectorTabTpl).appendTo(this.#tabsContainer)
            .find("a")
            .text(sheetName)
            .attr("data-target", sheetId)
            .attr("data-sheet", sheetName)
            .attr("id", sheetId + "-tab");


        // create sheet container/pane
        
        
        this.activate_sheet(sheetName);
        return this.sheets[sheetName];
    }

    delete(sheetId) {
        return this.delete_sheet(sheetId);
    }
    /**
     *
     * @param sheetName
     * @returns {WorkSheets}
     */
    delete_sheet(sheetName) {
        if (!sheetName) {
            sheetName = this.#activeSheetName;
        }
        const sheetId = this.sheets[sheetName].id;
        // console.log("delete "+sheetId)

        this.sheets[sheetName].remove();
        delete this.sheets[sheetName];
        $("#"+sheetId+"-tab").parent().remove();
        this.reorder();
        this.save();
        console.log("new list",this.#sheetsOrder);

        this.activate_sheet(this.sheetsNames.pop());

        return this;
    }

    /**
     *
     * @returns {DataTable}
     */
    get_active_sheet() {
        return this.sheets[this.#activeSheetName];
    }

    /**
     *
     * @returns {DataTable}
     */
    get_active() {
        return this.get_active_sheet();
    }

    reset() {
        this.lastAssignedIdx = 0;
        Object.keys(this.sheets).forEach(sheetName=>{
            const sheetId = this.sheets[sheetName].id;
            this.sheets[sheetName].remove();
            delete this.sheets[sheetName];
            this.#tabsContainer.find("li:has(#"+sheetId+"-tab)").remove();
        });
        this.#sheetsOrder = [];
        this.save();
        //window.location.reload();
    }
    rename(oldName,newName){
        return this.rename_sheet(oldName,newName);
    }

    rename_sheet(oldName,newName) {
        if(oldName!==newName && this.sheets.newName) throw "Sheet "+newName+" already exists";

        this.sheets[newName] = this.sheets[oldName];
        const sheetId = this.sheets[newName].id;
        this.sheets[newName].rename(newName);
        delete this.sheets[oldName];
        this.sheetsNames[this.sheetsNames.indexOf(oldName)] = newName;
        $("#"+sheetId+"-tab").text(newName);
        // $("#sheet-"+oldName+"-tab")
        //     .attr("id","sheet-"+newName+"-tab")
        //     .attr("data-target","sheet-"+newName)
        //     .attr("data-sheet",newName)
        //     .text(newName);
        // $("#sheet-"+oldName)
        //     .attr("id","sheet-"+newName)
        //     .attr("data-sheet",newName);
        return this.activate_sheet(newName);
    }

    reorder() {
        let newOrder = [];
        $("#sheetSelector").find("a").toArray().forEach(a=>newOrder.push($(a).attr("data-sheet")));
        console.log("reorder",newOrder);
        this.#sheetsOrder = newOrder;
        this.save();
    }
}


function edit_tab(src) {
    function restore() {
        inp.remove();
            lnk.css("display","");
    }
    let lnk = $(src).css("display","none");
    let sheetName = lnk.text();
    let inp = $("<input>").val(sheetName).insertAfter(lnk)
        .trigger("focus")
        .on("keyup",(event)=>{
            let sheetNewName = inp.val();
            console.log(event);
            if(event.code==="Escape") {
                restore();
                return;
            }
            if(event.code==="Enter" || event.code==="NumpadEnter") {
                // console.log(sheetNewName)
                if(sheetNewName==="")
                    return;
                if(sheetNewName===sheetName)
                    return restore();
                if(worksheets.sheets[sheetNewName])
                    return;
                // console.log("Perfom rename")
                restore();
                worksheets.rename_sheet(sheetName,sheetNewName);
            }
        })
        .on("blur",restore);
}

$('#importCsvModal').on('show.bs.modal', function (event) {
    let sel = $(event.target).find("select").empty();
    $("<option>").val("").text("New sheet").appendTo(sel);
    Object.getOwnPropertyNames(worksheets.sheets).forEach((name)=>{
        $("<option>").text(name).appendTo(sel);
    });
    const active = worksheets.get_active();
    if(active) {
        sel.val(active.name);
    }
});