
class WorkSheets {
    /**
     *
     * @type {*:{DataTable}}
     */
    sheets = {};
    lastAssignedIdx;
    activeSheet;
    #sheetsContainer;
    #tabsContainer;

    get s() {
        return this.sheets;
    }
    get sheetsNames() {
        return Object.keys(this.sheets);
    }

    #sheetContainerTpl = `<div aria-labelledby="" style="display: none"></div>`;
    #sheetSelectorTabTpl = `<li class="nav-item" role="presentation">
                    <a class="nav-link" id="sheet1-tab"  data-target="#sheet1" 
                    ondblclick="edit_tab(this)" onclick="worksheets.activate_sheet($(this).attr('data-sheet'))">Sheet1</a>
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
            console.log('No saved ws config')
            config = {};
        }
        console.log(config);

        this.lastAssignedIdx = config.lastAssignedIdx ? config.lastAssignedIdx : 0;
        this.activeSheet = config.activeSheet ? config.activeSheet : null;

        this.#tabsContainer.empty();
        this.#sheetsContainer.empty();

        // render sheets
        (config.sheets ? config.sheets : []).forEach((sheetName,idx) => {
            // load sheet data
            try {
                let wsData = JSON.parse(localStorage.getItem("sheet-"+sheetName + "-data"));
                console.log(idx,wsData);
                this.new_sheet(sheetName, wsData);
            } catch (e) {
                this.new_sheet(sheetName);
                console.log('Invalid sheet data', e);
            }
        });

        // if no sheets defined, create the default one
        if (Object.keys(this.sheets).length===0) {
            console.log("empty workspace -> create default sheet");
            this.new_sheet();
        }
        // } else {
        //     this.activate_sheet(this.activeSheet,"initial load");

        //     // $("#"+this.activeSheet+"-tab").trigger('click')
        // }
    }

    activate_sheet(wsId,event="") {
        console.log("activate_sheet "+wsId);
        if(this.activeSheet===wsId) return ;
        $("#worksheets").children().hide();
        $("#sheetSelector").find("a.nav-link").removeClass("active");
        console.log($("#sheet-"+wsId).show());
        console.log($("#sheet-"+wsId+"-tab").addClass("active"));
        this.activeSheet = wsId;
        this.save(true);
        this.update_stats();
        return this.sheets[wsId];

    }

    save(justConfig) {
        localStorage.setItem("worksheets", JSON.stringify({
            sheets: this.sheetsNames,
            lastAssignedIdx: this.lastAssignedIdx,
            activeSheet: this.activeSheet
        }));
    }

    update_stats() {
        try {
             console.log("Update tats",this);
            let stats = this.get_active().get_stats();
            $("#totalRecs").text(stats.total);
            $("#totalSelected").text(stats.selected);
            $("#totalVisible").text(stats.visible);
        }
        catch(e) {
            console.log(e);
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
     * @param {String} wsId 
     * @param {*} data 
     * @returns 
     */
    new_sheet(wsId, data = null) {

        if (!wsId) {
            this.lastAssignedIdx++;
            wsId = "sheet" + (this.lastAssignedIdx);
        }
        console.log("New sheet",wsId);


        // create tab && anpass
        $(this.#sheetSelectorTabTpl).appendTo(this.#tabsContainer)
            .find("a")
            .text(wsId)
            .attr("data-target", "sheet-"+wsId)
            .attr("data-sheet", wsId)
            .attr("id", "sheet-"+wsId + "-tab");


        // create sheet container/pane
        let container = $(this.#sheetContainerTpl).appendTo(this.#sheetsContainer)
            .text(wsId)
            .attr("id", "sheet-"+wsId)
            .attr("data-sheet", wsId);
        this.sheets[wsId] = new DataTable(wsId,container,30, data);
        this.activate_sheet(wsId,data===null?"initial creation":"create & load");
        return this.sheets[wsId];
    }

    delete(sheetId) {
        return this.delete_sheet(sheetId);
    }
    /**
     *
     * @param sheetId
     * @returns {WorkSheets}
     */
    delete_sheet(sheetId) {
        if (!sheetId) {
            sheetId = this.activeSheet;
        }
        $("#" + sheetId).remove();
        $("#" + sheetId + "-tab").parent().remove();
        delete this.sheets[sheetId];
        localStorage.removeItem("sheet-"+sheetId + "-data");
        this.activate_sheet(this.sheetsNames.pop(),'deletion');
        return this;
    }

    /**
     *
     * @returns {DataTable}
     */
    get_active_sheet() {
        return this.sheets[this.activeSheet];
    }

    get_active() {
        return this.get_active_sheet();
    }

    reset() {
        this.lastAssignedIdx = 0;
        Object.keys(this.sheets).forEach(k=>{
            this.sheets[k].remove();
            delete this.sheets[k];
            this.#tabsContainer.find("li:has(#sheet-"+k+"-tab)").remove();
        });
        // this.#sheetsContainer.empty();
        // this.#tabsContainer.empty();
        this.new_sheet();
        this.save();
        //window.location.reload();
    }
    rename(oldName,newName){
        return rename_sheet(oldName,newName);
    }

    rename_sheet(oldName,newName) {
        if(oldName!==newName && this.sheets.newName) throw "Sheet "+newName+" already exists";

        this.sheets[newName] = this.sheets[oldName];
        delete this.sheets[oldName];
        $("#"+oldName+"-tab")
            .attr("id",newName+"-tab")
            .attr("data-target",newName)
            .text(newName);
        $("#"+oldName)
            .attr("id",newName)
            .attr("aria-labelledby",newName+"-tab");
        return this.activate_sheet(newName,"rename");
    }
}


window.addEventListener("scroll", () => {
    sheet = worksheets.get_active_sheet();
    sheet.scrollY = this.scrollY;
    sheet.scrollX = this.scrollX;
});


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
            if(event.code==="Enter") {
                if(sheetNewName==="")
                    return
                if(sheetNewName===sheetName)
                    return restore();
                if(worksheets.sheets[sheetNewName])
                    return
                restore();
                worksheets.rename_sheet(sheetName,sheetNewName);
            }
        })
        .on("blur",restore);
}