
class WorkSheets {
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

    #sheetContainerTpl = `<div class="tab-pane fade" role="tabpanel" aria-labelledby="" style="margin-top: 45px; margin-bottom: 70px"></div>`;
    #sheetSelectorTabTpl = `<li class="nav-item" role="presentation">
                    <button class="nav-link" id="sheet1-tab" data-toggle="tab" data-target="#sheet1" 
                    type="button" role="tab" aria-controls="sheet1" aria-selected="true" data-idx="1">Sheet1</button>
                </li>`;

    constructor(sheetsContainer, tabsContainer) {
        this.#sheetsContainer = $(sheetsContainer);
        this.#tabsContainer = $(tabsContainer);

        // load saved config
        let tmp;
        try {
            tmp = JSON.parse(localStorage.getItem("worksheets"));
            tmp = tmp ? tmp : {};
        } catch (e) {
            console.log('No saved ws config')
            tmp = {};
        }

        this.lastAssignedIdx = tmp.lastAssignedIdx ? tmp.lastAssignedIdx : 0;
        this.activeSheet = tmp.activeSheet ? tmp.activeSheet : null;

        console.log(this.activeSheet);
        this.#tabsContainer.empty();
        this.#sheetsContainer.empty();

        // render sheets
        (tmp.sheets ? tmp.sheets : []).forEach((sheetName) => {
            // load sheet data
            try {
                let wsData = JSON.parse(localStorage.getItem(sheetName + "-data"));
                this.new_sheet(sheetName, wsData);
            } catch (e) {
                this.new_sheet(sheetName);
                console.log('Invalid sheet data', e);
            }
        });

        // if no sheets defined, create the default one
        if (this.sheetsNames.length == 0) {
            this.new_sheet();
        } else {
            this.activate_sheet(this.activeSheet);

            $("#"+this.activeSheet+"-tab").trigger('click')
        }
    }

    activate_sheet(wsId) {
        if (!this.sheetsNames.indexOf(wsId)==-1)
            wsId = this.sheetsNames[0];
        //$('#' + wsId + "-tab").trigger('click');
        this.activeSheet = wsId;
        this.save(true);
        return this.sheets[wsId];
    }

    save(justConfig) {
        localStorage.setItem("worksheets", JSON.stringify({
            sheets: this.sheetsNames,
            lastAssignedIdx: this.lastAssignedIdx,
            activeSheet: this.activeSheet
        }));
    }

    new_sheet(wsId, data = null) {

        if (!wsId) {
            this.lastAssignedIdx++;
            wsId = "sheet" + (this.lastAssignedIdx);
        }


        // create tab && anpass
        $(this.#sheetSelectorTabTpl).appendTo(this.#tabsContainer).removeClass("d-none")
            .find("button")
            .on("shown.bs.tab", (event) => {
                this.activate_sheet($(event.target).attr("aria-controls"));
                let activeSheet = this.get_active_sheet()
                window.scroll(activeSheet.scrollX,activeSheet.scrollY)
                console.log(activeSheet.scrollX,activeSheet.scrollY);
            })
            .text(wsId)
            .attr("aria-controls", wsId)
            .attr("data-target", "#" + wsId)
            .attr("id", wsId + "-tab");

        // create sheet container/pane
        let container = $(this.#sheetContainerTpl).appendTo(this.#sheetsContainer)
            .text(wsId)
            .attr("id", wsId)
            .attr("aria-labelledby", wsId + "-tab");
        this.sheets[wsId] = new DataTable(container,60, data);
        return wsId;
    }

    delete_sheet(sheetId) {
        if (!sheetId) {
            sheetId = this.activeSheet;
        }
        $("#" + sheetId).remove();
        $("#" + sheetId + "-tab").parent().remove();
        delete this.sheets[sheetId];
        localStorage.removeItem(sheetId + "-data");
        this.activate_sheet(this.sheetsNames.pop());
    }
    get_active_sheet() {
        return this.sheets[this.activeSheet];
    }

    reset() {

        this.lastAssignedIdx = 0;
        this.sheetsNames.forEach((nm)=>localStorage.removeItem(nm+"-data"));
        this.#sheetsContainer.empty();
        this.#tabsContainer.empty();
        this.new_sheet();
        this.save();
        window.location.reload();
    }
}


window.addEventListener("scroll", (event) => {
    sheet = worksheets.get_active_sheet();
    sheet.scrollY = this.scrollY;
    sheet.scrollX = this.scrollY;
    console.log(sheet);
    
});
