let workSheets = {

};
function new_sheet(wsId) {
    let tabsContainer = $("#sheetSelector");
    if(!wsId) {
        let idx = localStorage.getItem("lastSheetAssigned");
        idx = idx ? idx : 1;
        tabsContainer.attr("data-lastassigned",idx);
        wsId = "sheet"+idx;
        localStorage.setItem("lastSheetAssigned",idx);
    }


    let newTab = tabsContainer.children("li.d-none").clone().appendTo("#sheetSelector").removeClass("d-none");

    let btn = newTab.find("button");
    btn.on("shown.bs.tab",()=>{
        localStorage.setItem("lastActiveSheet",wsId);
    });

    btn.text(wsId)
        .attr("aria-controls",wsId)
        .attr("data-target","#"+wsId)
        .attr("id",wsId+"-tab");

    let container = $("#wsTpl").clone().appendTo("#worksheets").text(wsId)
        .attr("id",wsId)
        .attr("aria-labelledby",wsId+"-tab");
    workSheets[wsId] = new DataTable(container);
    localStorage.setItem("worksheets",JSON.stringify(tabsContainer.find("li:not(.d-none)>button").toArray().map((btn)=>$(btn).data("target").substr(1))));
}

function reset_sheets() {
    let wss;
    try {
        wss = JSON.parse(localStorage.getItem("worksheets"));
    } catch (e) {
        wss = [];
    }
    wss.forEach((ws)=>{
        localStorage.removeItem(ws+"-data");
    });
    window.location.reload()
}

function delete_active_sheet() {
    /**
     *
     * @type {DataTable}
     */
    let dt = get_active_sheet();
    let cont = $("#"+dt.container_id);
    $("#" + cont.attr("aria-labelledby")).parent().remove();
    cont.remove();
    $("#sheet1-tab").trigger("click");
    localStorage.setItem("worksheets",JSON.stringify($("#sheetSelector").find("li:not(.d-none)>button").toArray().map((btn)=>$(btn).data("target").substr(1))));
}

function load_saved_worksheets() {
    let wsNames;
    try {
        wsNames = JSON.parse(localStorage.getItem("worksheets"));
    }
    catch (e) {
        wsNames = [];
    }
    return wsNames.map((wsname)=>{
        let ws = {
            name: wsname
        };
        try {
            ws.data = JSON.parse(localStorage.getItem(wsname+"-data"));
        }
        catch (e) {
            ws.data = {};
        }
        return ws;
    })
}