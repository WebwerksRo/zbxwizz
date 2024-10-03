
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
        return this.#sheetsContainer.children().toArray().map((sheet) => $(sheet).attr('id'));
    }

    #sheetContainerTpl = `<div class="tab-pane fade" role="tabpanel" aria-labelledby="" style=""></div>`;
    #sheetSelectorTabTpl = `<li class="nav-item" role="presentation">
                    <a class="nav-link" id="sheet1-tab" data-toggle="tab" data-target="#sheet1" 
                    role="tab" aria-controls="sheet1" aria-selected="true" ondblclick="edit_tab(this)">Sheet1</a>
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
        if (this.sheetsNames.length == 0) {
            console.log("asdasd");
            this.new_sheet();
        }
        // } else {
        //     this.activate_sheet(this.activeSheet,"initial load");

        //     // $("#"+this.activeSheet+"-tab").trigger('click')
        // }
    }

    activate_sheet(wsId,event="") {
        console.log("activate_sheet "+wsId);
        if(typeof dbg!=="undefined")
            throw "Debgu";
        let tab = $("#"+wsId+"-tab");

        this.activeSheet = wsId;
        this.save(true);
        this.update_stats();
        tab.trigger('click');
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
            // console.log(this.get_active_sheet().get_stats());
            let stats = this.get_active_sheet().get_stats();
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


        // create tab && anpass
        $(this.#sheetSelectorTabTpl).appendTo(this.#tabsContainer).removeClass("d-none")
            .find("[role=tab]")
            .text(wsId)
            .attr("aria-controls", wsId)
            .attr("data-target", "#" + wsId)
            .attr("id", wsId + "-tab")
            .on("shown.bs.tab", (event) => {
                this.activeSheet = $(event.target).attr("aria-controls");
                this.update_stats()
                let activeSheet = this.get_active_sheet()
                //activeSheet = this.activate_sheet(,"click");
                window.scroll(activeSheet.scrollX,activeSheet.scrollY);
            });

        // create sheet container/pane
        let container = $(this.#sheetContainerTpl).appendTo(this.#sheetsContainer)
            .text(wsId)
            .attr("id", wsId)
            .attr("aria-labelledby", wsId + "-tab");
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
        this.sheetsNames.forEach((nm)=>localStorage.removeItem(nm+"-data"));
        this.#sheetsContainer.empty();
        this.#tabsContainer.empty();
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
            .attr("aria-controls",newName)
            .attr("data-target","#"+newName)
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